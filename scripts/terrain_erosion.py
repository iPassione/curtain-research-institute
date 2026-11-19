# 地形侵蚀与汇流（供 derive-terrain.py 调用，用 numba 编译）。
# · erode：水滴侵蚀。大量水滴从随机位置落下，沿坡度滚动，冲刷并搬运泥沙，在缓处沉积；
#   山坡上冲出树枝状的沟谷，谷底与河口淤出平地。方法见 Hans Theobald Beyer 2015
#   《Implementation of a method for hydraulic erosion》（Sebastian Lague 的公开讲解同此）。
# · fill_depressions：优先队列填洼（Barnes 2014 Priority-Flood），洼地的水能流出去；填平的深度即湖泊。
# · flow_accumulation：按 D8（八邻域最陡方向）累计每格上游的汇水面积，汇水大的地方就是河。
# 高度单位与格子边长一致（「格」），坡度才有意义。
import heapq
import numpy as np
from numba import njit


@njit(cache=True)
def _grad(h, x, y):
    n = h.shape[0]
    ix, iy = int(x), int(y)
    if ix < 0 or iy < 0 or ix >= n - 1 or iy >= n - 1:
        return 0.0, 0.0, 0.0
    fx, fy = x - ix, y - iy
    a, b, c, d = h[iy, ix], h[iy, ix + 1], h[iy + 1, ix], h[iy + 1, ix + 1]
    gx = (b - a) * (1 - fy) + (d - c) * fy
    gy = (c - a) * (1 - fx) + (d - b) * fx
    hh = a * (1 - fx) * (1 - fy) + b * fx * (1 - fy) + c * (1 - fx) * fy + d * fx * fy
    return hh, gx, gy


@njit(cache=True)
def erode(h, solid, drops, seed, radius=3, inertia=0.05, capacity=4.0, min_slope=0.01, erode_rate=0.3,
          deposit_rate=0.3, evaporate=0.015, gravity=4.0, lifetime=48):
    """solid：可被侵蚀的程度（0–1，海面为 0，水滴入海即止）。原地修改 h。"""
    n = h.shape[0]
    np.random.seed(seed)
    # 侵蚀笔刷：半径内按距离加权
    offs = []
    weights = []
    total = 0.0
    for dy in range(-radius, radius + 1):
        for dx in range(-radius, radius + 1):
            d = (dx * dx + dy * dy) ** 0.5
            if d <= radius:
                w = radius - d
                offs.append((dx, dy))
                weights.append(w)
                total += w
    for i in range(len(weights)):
        weights[i] /= total
    for _ in range(drops):
        x = np.random.random() * (n - 2)
        y = np.random.random() * (n - 2)
        if solid[int(y), int(x)] <= 0.0:
            continue
        dx, dy, speed, water, sed = 0.0, 0.0, 1.0, 1.0, 0.0
        for _step in range(lifetime):
            ix, iy = int(x), int(y)
            fx, fy = x - ix, y - iy
            hh, gx, gy = _grad(h, x, y)
            dx = dx * inertia - gx * (1 - inertia)
            dy = dy * inertia - gy * (1 - inertia)
            l = (dx * dx + dy * dy) ** 0.5
            if l < 1e-9:
                break
            dx /= l
            dy /= l
            x += dx
            y += dy
            if x < 0 or y < 0 or x >= n - 1 or y >= n - 1 or solid[int(y), int(x)] <= 0.0:
                break
            nh, _a, _b = _grad(h, x, y)
            dh = nh - hh
            cap = max(-dh, min_slope) * speed * water * capacity
            if sed > cap or dh > 0:
                amt = min(dh, sed) if dh > 0 else (sed - cap) * deposit_rate
                sed -= amt
                h[iy, ix] += amt * (1 - fx) * (1 - fy)
                h[iy, ix + 1] += amt * fx * (1 - fy)
                h[iy + 1, ix] += amt * (1 - fx) * fy
                h[iy + 1, ix + 1] += amt * fx * fy
            else:
                amt = min((cap - sed) * erode_rate, -dh)
                for k in range(len(offs)):
                    ox, oy = offs[k]
                    px, py = ix + ox, iy + oy
                    if px < 0 or py < 0 or px >= n or py >= n:
                        continue
                    take = amt * weights[k] * solid[py, px]
                    if h[py, px] < take:
                        take = max(h[py, px], 0.0)
                    h[py, px] -= take
                    sed += take
            speed = (max(speed * speed + dh * gravity, 0.0)) ** 0.5
            water *= 1 - evaporate


def fill_depressions(h, sea):
    """Priority-Flood：从海面向内灌水，洼地被填到出口高度；返回填平后的高度（略带坡度，保证有去路）。"""
    n = h.shape[0]
    out = h.copy()
    done = np.zeros(h.shape, bool)
    heap = []
    ys, xs = np.nonzero(sea)
    for y, x in zip(ys, xs):
        done[y, x] = True
        heapq.heappush(heap, (float(out[y, x]), int(y), int(x)))
    return _flood(out, done, heap)


def _flood(out, done, heap):
    n = out.shape[0]
    eps = 1e-4
    while heap:
        z, y, x = heapq.heappop(heap)
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                yy, xx = y + dy, x + dx
                if (dy == 0 and dx == 0) or yy < 0 or xx < 0 or yy >= n or xx >= n or done[yy, xx]:
                    continue
                done[yy, xx] = True
                if out[yy, xx] <= z:
                    out[yy, xx] = z + eps
                heapq.heappush(heap, (float(out[yy, xx]), yy, xx))
    return out


@njit(cache=True)
def flow_accumulation(z, land):
    """D8 汇流：从高到低把每格的水（陆地 1）交给最陡的下游邻格。"""
    n = z.shape[0]
    acc = np.zeros(z.shape, np.float64)
    for i in range(n):
        for j in range(n):
            if land[i, j]:
                acc[i, j] = 1.0
    order = np.argsort(-z.ravel())
    for k in range(order.size):
        idx = order[k]
        i, j = idx // n, idx % n
        if not land[i, j]:
            continue
        best, bi, bj = 0.0, -1, -1
        for di in range(-1, 2):
            for dj in range(-1, 2):
                if di == 0 and dj == 0:
                    continue
                ii, jj = i + di, j + dj
                if ii < 0 or jj < 0 or ii >= n or jj >= n:
                    continue
                drop = (z[i, j] - z[ii, jj]) / (1.4142 if di != 0 and dj != 0 else 1.0)
                if drop > best:
                    best, bi, bj = drop, ii, jj
        if bi >= 0:
            acc[bi, bj] += acc[i, j]
    return acc


@njit(cache=True)
def _fill_numba(h, sea):
    """Priority-Flood（numba 版）。"""
    n = h.shape[0]
    out = h.copy()
    done = np.zeros(h.shape, np.bool_)
    heap = [(0.0, 0, 0)]
    heap.pop()
    for i in range(n):
        for j in range(n):
            if sea[i, j]:
                done[i, j] = True
                heapq.heappush(heap, (out[i, j], i, j))
    while len(heap) > 0:
        z, y, x = heapq.heappop(heap)
        for dy in range(-1, 2):
            for dx in range(-1, 2):
                yy, xx = y + dy, x + dx
                if (dy == 0 and dx == 0) or yy < 0 or xx < 0 or yy >= n or xx >= n or done[yy, xx]:
                    continue
                done[yy, xx] = True
                if out[yy, xx] <= z:
                    out[yy, xx] = z + 1e-4
                heapq.heappush(heap, (out[yy, xx], yy, xx))
    return out


@njit(cache=True)
def _stream_step(h, land, uplift, k, m, dt):
    n = h.shape[0]
    z = _fill_numba(h, ~land)
    rec = np.full(n * n, -1, np.int64)
    dist = np.ones(n * n)
    for i in range(n):
        for j in range(n):
            if not land[i, j]:
                continue
            best, bk, bd = 0.0, -1, 1.0
            for di in range(-1, 2):
                for dj in range(-1, 2):
                    if di == 0 and dj == 0:
                        continue
                    ii, jj = i + di, j + dj
                    if ii < 0 or jj < 0 or ii >= n or jj >= n:
                        continue
                    d = 1.4142 if di != 0 and dj != 0 else 1.0
                    s = (z[i, j] - z[ii, jj]) / d
                    if s > best:
                        best, bk, bd = s, ii * n + jj, d
            rec[i * n + j] = bk
            dist[i * n + j] = bd
    flat = z.ravel()
    order = np.argsort(flat)  # 由低到高
    acc = np.zeros(n * n)
    for idx in range(n * n):
        if land.ravel()[idx]:
            acc[idx] = 1.0
    for t in range(n * n - 1, -1, -1):  # 由高到低累计汇水
        idx = order[t]
        r = rec[idx]
        if r >= 0:
            acc[r] += acc[idx]
    hf = z.ravel().copy()
    up = uplift.ravel()
    for t in range(n * n):  # 由低到高隐式求解：下游先定，上游跟着它下切
        idx = order[t]
        r = rec[idx]
        hf[idx] += up[idx] * dt
        if r >= 0:
            f = k * dt * acc[idx] ** m / dist[idx]
            hf[idx] = (hf[idx] + f * hf[r]) / (1.0 + f)
    return hf.reshape((n, n)), acc.reshape((n, n))


def stream_power(h, land, uplift, iters=40, k=0.002, m=0.5, dt=1.0, diffuse=0.08):
    """河流下切侵蚀（Braun & Willett 2013 的隐式解法）加少量坡面扩散。h 以「格」为单位，返回 (高度, 汇水面积)。"""
    from scipy import ndimage as nd
    acc = None
    for _ in range(iters):
        h, acc = _stream_step(h, land, uplift, k, m, dt)
        lap = nd.laplace(h)
        h = np.where(land, h + diffuse * lap, h)
    return h, acc
