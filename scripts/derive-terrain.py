# 首页「穹顶之下」五大陆的地形高度图（离线一次性运行，产物提交进仓库）：
#   python scripts/derive-terrain.py
# 与地理馆浮雕用的 nautical-height.png 分开：那张只求「羊皮纸上隆起」，这张要撑得起斜俯视的立体地形。
# 方法（只读航海图本身，不添加图上没有的地物）：
#   1. 陆地遮罩：与羊皮纸底色的色差 + 局部纹理密度（陆地画满山林城镇），去掉近岸的蓝色浅海；
#      开闭运算去碎点、补内部空洞，排除罗盘与上下两处纹饰。
#   2. 海岸抬升：到海岸的距离 → 1 - exp(-d/18)，海岸是缓坡，内陆逐渐升高。
#   3. 山地：细尺度亮度方差（山的笔触密），绿色林地压低，平滑成连绵的山体。
#   4. 地表：林地（偏绿的深色笔触）、积雪（低饱和的亮白），模糊成连片的分布；城镇取红屋顶聚成的团块。
#   输出：
#     nautical-terrain.webp 1024² RGB（无损 WebP）：R 高度（黑为海面）、G 林地、B 积雪
#     nautical-regions.png  256² 灰度：每处属于哪块大陆（序号 × 60），供选中时整块抬起
#     nautical-tint.png     256² RGB：陆地的整体色调（中值滤波去掉笔触后再模糊，海上延伸最近陆地的颜色）
#     src/gl/scenes/terrain-towns.ts  城镇灯火的位置与大小（图上百分比）
import numpy as np
from PIL import Image
from scipy import ndimage as nd

SRC = 'assets-src/nautical-chart.png'
OUT = 'assets-src/data/nautical-terrain.webp'
TINT = 'assets-src/data/nautical-tint.png'
REGIONS = 'assets-src/data/nautical-regions.png'
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

# 2. 海岸抬升
rise = 1 - np.exp(-nd.distance_transform_edt(land) / 18)

# 3. 山地
green = np.clip((g - np.maximum(r, b)) * 4, 0, 1)
fine = nd.gaussian_filter(lum ** 2, 1.5) - nd.gaussian_filter(lum, 1.5) ** 2
mount = nd.gaussian_filter(np.sqrt(np.maximum(fine, 0)) * (1 - 0.5 * nd.gaussian_filter(green, 3)), 15)
lo, hi = np.percentile(mount[land], [5, 97])
mount = np.clip((mount - lo) / (hi - lo), 0, 1)

height = rise * (0.25 + 0.75 * mount ** 1.6)
height = nd.gaussian_filter(nd.gaussian_filter(height, 2.0) * land, 1.4)
height /= height.max()

# 4. 地表
mx, mn = np.maximum(np.maximum(r, g), b), np.minimum(np.minimum(r, g), b)
sat = (mx - mn) / (mx + 1e-4)
inner = nd.binary_erosion(land, iterations=3)
forest = nd.gaussian_filter(((g > r * 0.97) & (g > b * 1.2) & (lum < 0.5)).astype(np.float32), 4) * inner
forest = np.clip(forest / np.percentile(forest[land], 99), 0, 1)
snow = nd.gaussian_filter(np.clip((lum - 0.68) * 5, 0, 1) * np.clip(1 - sat * 3, 0, 1), 3) * land
snow = np.clip(snow / np.percentile(snow[land], 99.5), 0, 1)
rgb = np.dstack([height, forest, snow])
Image.fromarray((rgb * 255).round().astype('uint8'), 'RGB').save(OUT, lossless=True, quality=100, method=6)

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

# 城镇：红屋顶聚成的团块
red = (r > 0.42) & (r - g > 0.22) & (r - b > 0.25) & (sat > 0.45) & inner
lab, n = nd.label(nd.binary_dilation(red, iterations=2))
centers = nd.center_of_mass(red, lab, range(1, n + 1))
sizes = nd.sum(red, lab, range(1, n + 1))
towns = sorted([(c[1] / N * 100, c[0] / N * 100, float(sz)) for c, sz in zip(centers, sizes) if sz > 18], key=lambda t: -t[2])[:40]
with open(TOWNS, 'w', encoding='utf-8', newline='\n') as f:
    f.write('// 由 scripts/derive-terrain.py 生成，勿手改：航海图上红屋顶聚成的城镇（u、v 为图上百分比，s 为相对大小 0–1）。\n')
    f.write('export const TOWNS: [number, number, number][] = [\n')
    top = towns[0][2] if towns else 1
    for u, v, sz in towns: f.write(f'  [{u:.2f}, {v:.2f}, {min(1, (sz / top) ** 0.5):.2f}],\n')
    f.write('];\n')
print(f'地形图已写入 {OUT}（{N}×{N}），陆地约占图内 {land[inside].mean() * 100:.0f}%；色调图 {TINT}；城镇 {len(towns)} 处。')
