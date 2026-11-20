# 首页「穹顶之下」五大陆的地形（离线一次性运行，产物提交进仓库）：
#   python scripts/derive-terrain.py        （需要 numpy、scipy、Pillow、numba；约三分钟）
# 首页「穹顶之下」与地理馆立体航海图共用这一套数据。
# 只读航海图本身，不添加图上没有的地物：
#   1. 陆地遮罩：与羊皮纸底色的色差 + 局部纹理密度（陆地画满山林城镇），去掉近岸的蓝色浅海；
#      开闭运算去碎点、补内部空洞，排除罗盘与上下两处纹饰。
#   2. 地表：林地（偏绿的深色笔触）、积雪（低饱和的亮白）；山区取山的笔触密集处（林地压低）。
#   3. 初始地形：离海岸越远越高的缓坡平原 + 山区的抬升，叠少量噪声作为起伏的种子。
#      卡莫瑞亚在航海图上是中央平原，山区抬升减半。
#   4. 侵蚀（scripts/terrain_erosion.py）：先做河流下切（Braun & Willett 2013），冲出树枝状的河谷与冲积平原；
#      再用水滴侵蚀补上坡面的细沟。最后按汇水面积得到河流，填洼的深度得到湖泊。
#   输出：
#     nautical-terrain.webp 2048² RGB（无损 WebP）：R、G 高度的整数与小数部分（h×255 = R + G/256，G 取 2 位；两通道分别插值后相加仍精确）（B 不用）
#     nautical-cover.webp   1024² RGB（无损 WebP）：R 河流与湖泊、G 积雪、B 林地
#     nautical-regions.png  256² 灰度：每处属于哪块大陆（序号 × 60），供选中时整块抬起
#     nautical-tint.png     256² RGB：陆地的整体色调（中值滤波去掉笔触后再模糊，海上延伸最近陆地的颜色）
#     src/gl/scenes/terrain-towns.ts  城镇灯火的位置与大小（图上百分比）
import numpy as np
from PIL import Image
from scipy import ndimage as nd
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from terrain_erosion import erode, fill_depressions, flow_accumulation, stream_power

SRC = 'assets-src/nautical-chart.png'
OUT = 'assets-src/data/nautical-terrain.webp'
TINT = 'assets-src/data/nautical-tint.png'
REGIONS = 'assets-src/data/nautical-regions.png'
COVER = 'assets-src/data/nautical-cover.webp'
TOWNS = 'src/gl/scenes/terrain-towns.ts'
N = 1024

img = np.asarray(Image.open(SRC).convert('RGB').resize((N, N), Image.LANCZOS)).astype(np.float32) / 255
r, g, b = img[..., 0], img[..., 1], img[..., 2]
lum = 0.299 * r + 0.587 * g + 0.114 * b
yy, xx = np.mgrid[0:N, 0:N] / N
inside = np.hypot(xx - .5, yy - .5) < .462
ornament = (np.hypot(xx - .5, yy - .14) < .085) | (np.hypot(xx - .5, yy - .05) < .04) | (np.hypot(xx - .5, yy - .955) < .04)
region = inside & ~ornament

def norm(a):
    lo, hi = np.percentile(a[region], [2, 98])
    return np.clip((a - lo) / (hi - lo), 0, 1)

# 1. 陆地遮罩
parchment = np.array([0.87, 0.78, 0.62])
dpar = np.sqrt(((img - parchment) ** 2).sum(-1))
var = nd.gaussian_filter(lum ** 2, 2) - nd.gaussian_filter(lum, 2) ** 2
tex = np.sqrt(np.maximum(nd.gaussian_filter(var, 5), 0))
blue = nd.gaussian_filter(np.clip(b - r + 0.02, 0, 1), 2)
score = 0.5 * norm(nd.gaussian_filter(dpar, 3)) + 0.7 * norm(tex)
hist, edges = np.histogram(score[region], 256)  # Otsu 阈值
c = (edges[:-1] + edges[1:]) / 2
w, m = np.cumsum(hist), np.cumsum(hist * c)
t = c[np.nanargmax((m[-1] * w / w[-1] - m) ** 2 / (w * (w[-1] - w) + 1e-9))]
land = (score > t) & (blue < 0.05) & region
land = nd.binary_opening(land, iterations=2)
land = nd.binary_closing(land, iterations=5)
land = nd.binary_fill_holes(land)
lab, n = nd.label(land)
size = nd.sum(land, lab, range(1, n + 1))
keep = np.zeros(n + 1, bool)
keep[1:] = size > N * N * 0.0005
land = keep[lab]

# 2. 地表与山区
mx, mn = np.maximum(np.maximum(r, g), b), np.minimum(np.minimum(r, g), b)
sat = (mx - mn) / (mx + 1e-4)
inner = nd.binary_erosion(land, iterations=3)
forest = nd.gaussian_filter(((g > r * 0.97) & (g > b * 1.2) & (lum < 0.5)).astype(np.float32), 4) * inner
forest = np.clip(forest / np.percentile(forest[land], 99), 0, 1)
snow = nd.gaussian_filter(np.clip((lum - 0.68) * 5, 0, 1) * np.clip(1 - sat * 3, 0, 1), 3) * land
snow = np.clip(snow / np.percentile(snow[land], 99.5), 0, 1)
green = np.clip((g - np.maximum(r, b)) * 4, 0, 1)
fine = nd.gaussian_filter(lum ** 2, 1.5) - nd.gaussian_filter(lum, 1.5) ** 2
mount = nd.gaussian_filter(np.sqrt(np.maximum(fine, 0)) * (1 - 0.5 * nd.gaussian_filter(green, 3)), 15)
lo, hi = np.percentile(mount[land], [5, 97])
mount = np.clip((mount - lo) / (hi - lo), 0, 1)
mt = np.clip((mount - 0.35) / 0.5, 0, 1)
mt = nd.gaussian_filter(mt * mt * (3 - 2 * mt) * (1 - 0.6 * forest), 3)
lab, n = nd.label(land)
for k, (cy, cx) in enumerate(nd.center_of_mass(land, lab, range(1, n + 1))):
    if np.hypot(cx / N - .5, cy / N - .5) < .12:
        mt[lab == k + 1] *= 0.5  # 卡莫瑞亚：中央平原

# 3. 初始地形：在 2048² 上做（高度图一个像素 = 一「格」），海岸由 1024 的遮罩模糊后放大再取阈值，轮廓平滑
M = 2 * N
up = lambda a, order=1: nd.zoom(a.astype(np.float32), 2, order=order)
land2 = up(nd.gaussian_filter(land.astype(np.float32), 1.2)) > 0.5
mt2, forest2, snow2 = np.clip(up(mt), 0, 1), np.clip(up(forest), 0, 1) * land2, np.clip(up(snow), 0, 1) * land2
rng = np.random.default_rng(1077)
def fbm(octaves, base):
    s, a, total = np.zeros((M, M)), 1.0, 0.0
    for o in range(octaves):
        z = nd.gaussian_filter(rng.standard_normal((M, M)), base / 2 ** o, mode='wrap')
        s += z / (z.std() + 1e-9) * a; total += a; a *= 0.5
    return s / total
dist = nd.distance_transform_edt(land2)
coast = 1 - np.exp(-dist / 20)
plains = 1 - np.exp(-dist / 90)
ridges = np.clip(1 - np.abs(fbm(7, 112)) * 0.8, 0, 1) ** 2.5
C = 140.4 / M  # 格子边长（世界单位）
h0 = coast * (0.18 + 0.5 * plains + 0.2 * fbm(7, 160) * plains) + mt2 * (1.6 + 2.4 * ridges)
h0 = np.where(land2, np.maximum(h0, 0.02), -0.3) / C

# 4. 侵蚀、河流与湖泊
h1, _ = stream_power(h0.astype(np.float64), land2, mt2 * 1.6 * land2, iters=70, k=0.02)
erode(h1, land2.astype(np.float64), 6000000, 7, radius=4)
h1 = np.where(land2, np.maximum(h1, 0.02 / C), -0.3 / C)
filled = fill_depressions(h1, ~land2)
acc = flow_accumulation(filled, land2)
river = np.clip((np.log(np.maximum(acc, 1)) - np.log(1200)) / 3.2, 0, 1)
river = np.maximum(river, nd.grey_dilation(river, size=3) * 0.6) * land2
lake = nd.gaussian_filter((((filled - h1) * C > 0.12) & land2).astype(np.float32), 1.5)
water = np.clip(np.maximum(river, lake), 0, 1)
height = np.where(land2, h1, 0)
height = np.clip(height / np.percentile(height[land2], 99.7), 0, 1) * land2
scaled = height * 255
hi = np.floor(scaled)
lo = np.minimum(np.round((scaled - hi) * 4), 3) * 64  # 小数部分取 2 位（共 10 位高度）：足够消除台阶，体积也小得多
rgb = np.dstack([hi, lo, np.zeros_like(hi)]).astype('uint8')
Image.fromarray(rgb, 'RGB').save(OUT, lossless=True, quality=100, method=6)
cover = np.dstack([water, snow2, forest2])
Image.fromarray((cover * 255).round().astype('uint8'), 'RGB').resize((N, N), Image.LANCZOS).save(COVER, lossless=True, quality=100, method=6)

# 色调：去掉笔触，海上延伸最近的陆地颜色，边缘不会混进羊皮纸色
small = (img * 255).astype('uint8')
med = np.dstack([nd.median_filter(small[..., k], size=11) for k in range(3)]).astype(np.float32) / 255
_, (iy, ix) = nd.distance_transform_edt(~land, return_indices=True)
filled = med[iy, ix]
tint = np.dstack([nd.gaussian_filter(filled[..., k], 6) for k in range(3)])
Image.fromarray((tint * 255).round().astype('uint8'), 'RGB').resize((256, 256), Image.LANCZOS).save(TINT, optimize=True)

# 大陆分区：每块陆地（连通区域）归到离它最近的大陆中心，海上延伸最近的陆地；值 = 序号 × 60（顺序同 manifest.regions）
CENTERS = [(.5, .5), (.29, .29), (.71, .29), (.29, .71), (.71, .71)]
lab, n = nd.label(land)
region_id = np.zeros((N, N), np.uint8)
for k, (cy, cx) in enumerate(nd.center_of_mass(land, lab, range(1, n + 1))):
    region_id[lab == k + 1] = int(np.argmin([np.hypot(cx / N - u, cy / N - v) for u, v in CENTERS]))
region_id = region_id[iy, ix]  # 海上取最近陆地所属的大陆
Image.fromarray(region_id * 60, 'L').resize((256, 256), Image.NEAREST).save(REGIONS, optimize=True)

# 城镇：红屋顶聚成的团块（较小的也算）
red = (r > 0.42) & (r - g > 0.22) & (r - b > 0.25) & (sat > 0.45) & inner
lab, n = nd.label(nd.binary_dilation(red, iterations=2))
centers = nd.center_of_mass(red, lab, range(1, n + 1))
sizes = nd.sum(red, lab, range(1, n + 1))
towns = sorted([(c[1] / N * 100, c[0] / N * 100, float(sz)) for c, sz in zip(centers, sizes) if sz > 8], key=lambda t: -t[2])[:60]

# 村落：按地形散布的零星灯火——低平、不在雪地与密林、靠近河流与海岸、靠近城镇的地方更多；
# 航海图上少有城镇的大陆（北方冻土、东南森林）也就少有村落。只作夜景的点缀，不对应具体地名。
hgt = height[::2, ::2]
gy, gx = np.gradient(hgt * 2.4 / 0.137)
slope = np.hypot(gx, gy)
wat = nd.gaussian_filter(water[::2, ::2], 3)
coastal = np.exp(-nd.distance_transform_edt(land) / 25)
townish = nd.gaussian_filter(red.astype(np.float32), 45)
townish /= townish.max() + 1e-9
suit = inner & (hgt < 0.5) & (slope < 0.2) & (snow < 0.3) & (forest < 0.65) & (water[::2, ::2] < 0.2)
weight = suit * (0.3 + 1.6 * np.clip(wat * 4, 0, 1) + 0.8 * coastal) * (0.15 + 2.0 * townish ** 0.7)
vr = np.random.default_rng(1254)
flat = weight.ravel() / weight.sum()
picks = vr.choice(flat.size, size=4000, replace=False, p=flat)
villages, taken = [], np.zeros((N // 8, N // 8), bool)
for idx in picks:
    y, x = divmod(int(idx), N)
    if taken[y // 8, x // 8]:
        continue
    taken[max(0, y // 8 - 1):y // 8 + 2, max(0, x // 8 - 1):x // 8 + 2] = True  # 相邻约 16 像素内只留一处
    villages.append((x / N * 100, y / N * 100, 0.25 + 0.35 * float(townish[y, x]) ** 0.5 * vr.random()))
    if len(villages) >= 420:
        break

with open(TOWNS, 'w', encoding='utf-8', newline='\n') as f:
    f.write('// 由 scripts/derive-terrain.py 生成，勿手改。u、v 为图上百分比，s 为相对大小 0–1。\n')
    f.write('// TOWNS：航海图上红屋顶聚成的城镇。VILLAGES：按地形散布的零星村落灯火（夜景点缀，不对应具体地名）。\n')
    f.write('export const TOWNS: [number, number, number][] = [\n')
    top = towns[0][2] if towns else 1
    for u, v, sz in towns: f.write(f'  [{u:.2f}, {v:.2f}, {min(1, (sz / top) ** 0.5):.2f}],\n')
    f.write('];\n')
    f.write('export const VILLAGES: [number, number, number][] = [\n')
    for u, v, sz in villages: f.write(f'  [{u:.2f}, {v:.2f}, {sz:.2f}],\n')
    f.write('];\n')
print(f'地形图已写入 {OUT}（{M}×{M}），陆地约占图内 {land[inside].mean() * 100:.0f}%；色调图 {TINT}；城镇 {len(towns)} 处，村落 {len(villages)} 处。')
