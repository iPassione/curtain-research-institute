# 首页「穹顶之下」五大陆的地形高度图（离线一次性运行，产物提交进仓库）：
#   python scripts/derive-terrain.py
# 与地理馆浮雕用的 nautical-height.png 分开：那张只求「羊皮纸上隆起」，这张要撑得起斜俯视的立体地形。
# 方法（只读航海图本身，不添加图上没有的地物）：
#   1. 陆地遮罩：与羊皮纸底色的色差 + 局部纹理密度（陆地画满山林城镇），去掉近岸的蓝色浅海；
#      开闭运算去碎点、补内部空洞，排除罗盘与上下两处纹饰。
#   2. 海岸抬升：到海岸的距离 → 1 - exp(-d/18)，海岸是缓坡，内陆逐渐升高。
#   3. 山地：细尺度亮度方差（山的笔触密），绿色林地压低，平滑成连绵的山体。
#   4. 输出 1024×1024 的 8 位灰度 PNG：黑为海面，白为最高处。
import numpy as np
from PIL import Image
from scipy import ndimage as nd

SRC = 'assets-src/nautical-chart.png'
OUT = 'assets-src/data/nautical-terrain.png'
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
mount = nd.gaussian_filter(np.sqrt(np.maximum(fine, 0)) * (1 - 0.5 * nd.gaussian_filter(green, 3)), 9)
lo, hi = np.percentile(mount[land], [5, 97])
mount = np.clip((mount - lo) / (hi - lo), 0, 1)

height = rise * (0.2 + 0.8 * mount ** 2.0)
height = nd.gaussian_filter(nd.gaussian_filter(height, 2.0) * land, 1.4)
height /= height.max()

Image.fromarray((height * 255).round().astype('uint8')).save(OUT, optimize=True)
print(f'地形高度图已写入 {OUT}（{N}×{N}），陆地约占图内 {land[inside].mean() * 100:.0f}%。')
