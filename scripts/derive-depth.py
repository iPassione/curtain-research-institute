# 为城市切片与造物陈列室生成深度图（离线一次性运行，产物提交进仓库），供指针视差使用：
#   set HF_HOME=Y:\AI\models\huggingface   （模型缓存位置；没有时会自动下载约 94 MB）
#   python scripts/derive-depth.py
# 模型：Depth Anything V2 Small（depth-anything/Depth-Anything-V2-Small-hf，Apache-2.0 许可）。
# 输出相对深度：越近越亮。三张街景构图相同，只用午后图生成一张，三个时段共用，视差不会随时段跳动。
# 输出为原图一半尺寸的 8 位灰度 PNG，轻微模糊，避免边缘在视差时撕裂。
import os, sys
import numpy as np
import torch
from PIL import Image, ImageFilter
from transformers import AutoImageProcessor, AutoModelForDepthEstimation

MODEL = 'depth-anything/Depth-Anything-V2-Small-hf'
JOBS = [('assets-src/street/prunoiva-noon.png', 'assets-src/data/street-depth.png')] + [
    (f'assets-src/painted-specimens/{k}.png', f'assets-src/data/specimen-{k}-depth.png') for k in ['wand', 'staff', 'stone', 'spent', 'lamp', 'gate']]

dev = 'cuda' if torch.cuda.is_available() else 'cpu'
proc = AutoImageProcessor.from_pretrained(MODEL)
model = AutoModelForDepthEstimation.from_pretrained(MODEL).to(dev).eval()
for src, out in JOBS:
    img = Image.open(src).convert('RGB')
    w, h = img.size
    # 稍高的推理分辨率保留更多细节（边长取 14 的倍数）
    inputs = proc(images=img, return_tensors='pt', size={'height': 812, 'width': 644}, keep_aspect_ratio=False).to(dev)
    with torch.no_grad():
        d = model(**inputs).predicted_depth
    d = torch.nn.functional.interpolate(d.unsqueeze(1), size=(h // 2, w // 2), mode='bicubic', align_corners=False)[0, 0].cpu().numpy()
    lo, hi = np.percentile(d, 1), np.percentile(d, 99)
    d = np.clip((d - lo) / (hi - lo), 0, 1)
    Image.fromarray((d * 255).astype('uint8')).filter(ImageFilter.GaussianBlur(1.2)).save(out, optimize=True)
    print(out, os.path.getsize(out) // 1024, 'KB')
