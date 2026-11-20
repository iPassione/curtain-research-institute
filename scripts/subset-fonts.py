# 字体按需裁剪：python scripts/subset-fonts.py        （需要 fonttools、brotli）
# fonts-src/ 是从 Google Fonts 原样镜像的切片（scripts/fetch-fonts.mjs，SIL Open Font License 1.1）。
# 中文字体按 unicode-range 切成约一百片，页面用到哪片的字就下载哪片；但每片都含大量站内用不到的字。
# 这里收集站内所有可能显示的文字（内容数据、源码里的界面文字、首页 HTML、样式里的 content），
# 把每片裁到只剩这些字（可变字重保留），一个字都用不到的切片整片去掉，unicode-range 也改成实际包含的字，
# 浏览器就不会为用不到的切片发请求。产物写到 public/fonts/。
# 内容（文章、展室文字）有增改时重新运行一次；检索框里输入站内没有的字，会退回系统字体显示。
import glob
import os
import re
from fontTools.ttLib import TTFont
from fontTools import subset

SRC, OUT = 'fonts-src', 'public/fonts'
CJK_FAMILIES = ('notosanssc', 'notoserifsc')  # 西文字体很小，原样复制

# 1. 站内文字
chars = set()
files = glob.glob('public/data/**/*.json', recursive=True) + glob.glob('src/**/*.ts', recursive=True) + \
    glob.glob('src/**/*.css', recursive=True) + ['index.html']
for f in files:
    with open(f, encoding='utf-8') as fh:
        chars.update(fh.read())
chars.update(chr(c) for c in range(0x20, 0x7F))  # ASCII 全保留
chars.update('，。、；：？！“”‘’（）《》〈〉【】—…·「」『』～')
codes = {ord(c) for c in chars if ord(c) >= 0x20}

# 2. 解析 fonts.css
css = open(os.path.join(SRC, 'fonts.css'), encoding='utf-8').read()
blocks = re.findall(r'(/\*[^*]*\*/\s*)?@font-face\s*\{(.*?)\}', css, re.S)

def parse_range(text):
    out = set()
    for part in text.split(','):
        part = part.strip().replace('U+', '')
        if '-' in part:
            a, b = part.split('-')
            out.update(range(int(a, 16), int(b, 16) + 1))
        elif '?' in part:
            out.update(range(int(part.replace('?', '0'), 16), int(part.replace('?', 'F'), 16) + 1))
        elif part:
            out.add(int(part, 16))
    return out

def to_range(cps):
    cps, out, i = sorted(cps), [], 0
    while i < len(cps):
        j = i
        while j + 1 < len(cps) and cps[j + 1] == cps[j] + 1:
            j += 1
        out.append(f'U+{cps[i]:X}' if i == j else f'U+{cps[i]:X}-{cps[j]:X}')
        i = j + 1
    return ', '.join(out)

done, faces, before, after = {}, [], 0, 0
for comment, body in blocks:
    url = re.search(r'url\(([^)]+)\)', body).group(1)
    family_dir = url.split('/')[0]
    rng = parse_range(re.search(r'unicode-range:\s*([^;]+);', body).group(1))
    src_path, out_path = os.path.join(SRC, url), os.path.join(OUT, url)
    if url not in done:
        os.makedirs(os.path.dirname(out_path), exist_ok=True)
        size0 = os.path.getsize(src_path)
        if family_dir not in CJK_FAMILIES:
            with open(src_path, 'rb') as a, open(out_path, 'wb') as b:
                b.write(a.read())
            done[url] = rng
            before += size0; after += size0
        else:
            font = TTFont(src_path)
            keep = (codes & rng) & set(font.getBestCmap())
            if not keep:
                done[url] = None
                before += size0
            else:
                opts = subset.Options()
                opts.flavor = 'woff2'
                opts.layout_features = ['*']
                opts.name_IDs = ['*']
                opts.notdef_outline = True
                sub = subset.Subsetter(opts)
                sub.populate(unicodes=keep)
                sub.subset(font)
                font.flavor = 'woff2'
                font.save(out_path)
                done[url] = keep
                before += size0; after += os.path.getsize(out_path)
    keep = done[url]
    if keep is None:
        continue
    body = re.sub(r'unicode-range:\s*[^;]+;', f'unicode-range: {to_range(keep)};', body)
    faces.append(f'@font-face {{{body}}}')

header = ('/* 自托管字体：Google Fonts 镜像（SIL Open Font License 1.1），中文切片已按站内文字裁剪。\n'
          '   由 scripts/subset-fonts.py 从 fonts-src/ 生成，勿手改；内容有增改时重新运行。 */\n')
with open(os.path.join(OUT, 'fonts.css'), 'w', encoding='utf-8', newline='\n') as f:
    f.write(header + '\n'.join(faces) + '\n')
kept = sum(1 for v in done.values() if v is not None)
print(f'站内文字 {len(codes)} 个；字体文件 {len(done)} 个 → 保留 {kept} 个；总量 {before / 1e6:.1f} MB → {after / 1e6:.1f} MB')
