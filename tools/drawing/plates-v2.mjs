// 器物结构图版 V2（造物陈列室的六张）：node tools/drawing/plates-v2.mjs [输出目录]，ONLY=wand,lamp 只生成其中几张
// 设计依据见 docs/专题/器物图版V2.md：每一处标注都来自知识库或公开馆藏里写明的设定，不标尺寸、不编机制。
// 不依赖第三方库，直接输出 SVG。版式 900×1125（4:5，与藏品插画同比例），沿用旧图版的研究所档案格式。
import fs from 'node:fs';

const W = 900, H = 1125;
const C = { paper: '#eeead9', ink: '#263f32', line: '#4a5a49', faint: '#a3a089', rule: '#9e9d83', brass: '#8b754c', brassLight: '#b89c66', teal: '#5d8780', soft: '#d9d3bd', note: '#596554' };
const SERIF = `'Noto Serif SC','Source Han Serif SC','Songti SC','SimSun',serif`;
const LATIN = `Georgia,'Times New Roman',serif`;

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const f = n => Math.round(n * 10) / 10;
const text = (x, y, s, o = {}) => `<text x="${f(x)}" y="${f(y)}" fill="${o.fill || C.ink}" font-family="${o.latin ? LATIN : SERIF}" font-size="${o.size || 14}"${o.anchor ? ` text-anchor="${o.anchor}"` : ''}${o.ls ? ` letter-spacing="${o.ls}"` : ''}${o.weight ? ` font-weight="${o.weight}"` : ''}${o.italic ? ' font-style="italic"' : ''}>${esc(s)}</text>`;
const path = (d, o = {}) => `<path d="${d}" fill="${o.fill || 'none'}" stroke="${o.stroke || C.line}" stroke-width="${o.w || 1.2}"${o.dash ? ` stroke-dasharray="${o.dash}"` : ''}${o.op != null ? ` opacity="${o.op}"` : ''} stroke-linecap="round" stroke-linejoin="round"/>`;
const line = (x1, y1, x2, y2, o = {}) => path(`M${f(x1)} ${f(y1)}L${f(x2)} ${f(y2)}`, o);
const circle = (cx, cy, r, o = {}) => `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="${o.fill || 'none'}" stroke="${o.stroke || C.line}" stroke-width="${o.w || 1.2}"${o.dash ? ` stroke-dasharray="${o.dash}"` : ''}${o.op != null ? ` opacity="${o.op}"` : ''}/>`;
const rect = (x, y, w, h, o = {}) => `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" fill="${o.fill || 'none'}" stroke="${o.stroke || C.line}" stroke-width="${o.w || 1.2}"${o.dash ? ` stroke-dasharray="${o.dash}"` : ''}${o.rx ? ` rx="${o.rx}"` : ''}${o.op != null ? ` opacity="${o.op}"` : ''}/>`;
const arrow = (x1, y1, x2, y2, o = {}) => {
  const a = Math.atan2(y2 - y1, x2 - x1), s = o.head || 6;
  return line(x1, y1, x2, y2, o) + path(`M${f(x2 - s * Math.cos(a - 0.45))} ${f(y2 - s * Math.sin(a - 0.45))}L${f(x2)} ${f(y2)}L${f(x2 - s * Math.cos(a + 0.45))} ${f(y2 - s * Math.sin(a + 0.45))}`, o);
};
/** 主视图上的标注：小圆点 + 折线引线 + 文字（标题与一行说明）。 */
const callout = (px, py, tx, ty, title, sub, side = 'right') => {
  const end = side === 'right' ? tx - 6 : tx + 6, anchor = side === 'right' ? undefined : 'end';
  return circle(px, py, 2.6, { fill: C.brass, stroke: C.brass }) + path(`M${f(px)} ${f(py)}L${f(end - (side === 'right' ? 14 : -14))} ${f(ty - 4)}L${f(end)} ${f(ty - 4)}`, { stroke: C.brass, w: 0.9 })
    + text(tx, ty, title, { size: 14, anchor, fill: C.ink }) + (sub ? text(tx, ty + 18, sub, { size: 11, anchor, fill: C.note }) : '');
};
/** 右栏细节注释的编号与标题。 */
const note = (n, y, title, sub) => circle(612, y, 10, { stroke: C.brass, w: 1 }) + text(612, y + 4, n, { size: 11, latin: true, anchor: 'middle', fill: C.brass })
  + text(632, y + 5, title, { size: 15 }) + (sub ? text(632, y + 23, sub, { size: 11, fill: C.note }) : '');
/** 一段细排线（填充斜线），用来表示「已填充」或阴影。 */
const hatch = (id, angle, gap, color, op = 0.7) => `<pattern id="${id}" width="${gap}" height="${gap}" patternUnits="userSpaceOnUse" patternTransform="rotate(${angle})"><line x1="0" y1="0" x2="0" y2="${gap}" stroke="${color}" stroke-width="0.9" opacity="${op}"/></pattern>`;

function frame({ title, number, keywords, defs = '' }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><defs><pattern id="paper" width="7" height="7" patternUnits="userSpaceOnUse"><circle cx="1" cy="2" r=".45" fill="#9e9475" opacity=".15"/></pattern>${hatch('h-brass', 45, 5, C.brass)}${hatch('h-brass2', -45, 5, C.brass)}${hatch('h-ink', 45, 4, C.line, 0.45)}${hatch('h-teal', 0, 5, C.teal, 0.6)}${defs}</defs>`
    + `<rect width="${W}" height="${H}" fill="${C.paper}"/><rect width="${W}" height="${H}" fill="url(#paper)"/>`
    + line(45, 106, 855, 106, { stroke: C.rule, w: 1 }) + line(45, 1005, 855, 1005, { stroke: C.rule, w: 1 }) + line(575, 140, 575, 975, { stroke: C.rule, w: 1 })
    + text(48, 55, 'THE CURTAIN INSTITUTE / OBJECT ARCHIVE', { latin: true, size: 12, ls: 3, fill: C.note })
    + text(48, 90, `${title} · 结构绘录`, { size: 23 }) + text(848, 88, number, { latin: true, size: 28, anchor: 'end', fill: C.brass })
    + text(600, 140, 'DETAIL NOTES', { latin: true, size: 11, ls: 2, fill: C.brass })
    + text(48, 1035, '研究所藏品图版 / 器物与材料 · 依据馆藏与研究记录绘制，不表示实际尺寸', { size: 12, fill: C.note })
    + text(48, 1062, keywords, { latin: true, size: 10, ls: 2, fill: C.note }) + text(852, 1062, `PLATE ${number}`, { latin: true, size: 10, ls: 2, anchor: 'end', fill: C.note });
}

// ———————————————————————— 现代短杖 ————————————————————————
function wand() {
  let s = frame({ title: '现代短杖', number: '01', keywords: 'WOOD / CONDUIT / STABILISER / FINAL SHAPING' });
  // 主视图：竖直的短杖，杖端在上。宽度沿长度渐细，握部略鼓并有一道木质收口。
  const x0 = 250, top = 190, bot = 900, L = bot - top;
  const half = t => { // t: 0 杖端 → 1 杖尾
    const taper = 3.4 + 7.5 * Math.pow(t, 0.9);
    const grip = t > 0.7 ? 3.2 * Math.sin(Math.min(1, (t - 0.7) / 0.27) * Math.PI) : 0;
    const neck = t > 0.66 && t < 0.71 ? -1.6 * Math.sin((t - 0.66) / 0.05 * Math.PI) : 0;
    return taper + grip + neck;
  };
  const pts = [];
  for (let i = 0; i <= 140; i++) { const t = i / 140; pts.push([t, top + t * L]); }
  const left = pts.map(([t, y]) => `${f(x0 - half(t))} ${f(y)}`), right = pts.map(([t, y]) => `${f(x0 + half(t))} ${f(y)}`).reverse();
  const outline = `M${left.join('L')}Q${x0} ${bot + 14} ${right[0]}L${right.join('L')}Q${x0} ${top - 10} ${left[0]}Z`;
  s += path(outline, { fill: '#e6dfca', stroke: C.ink, w: 1.4 });
  // 连贯木纹：几条沿杖身的细线，随宽度收拢
  for (const k of [-0.62, -0.25, 0.12, 0.5]) {
    const d = pts.filter((_, i) => i % 4 === 0).map(([t, y], i) => `${i ? 'L' : 'M'}${f(x0 + half(t) * k + Math.sin(y * 0.045 + k * 5) * 0.8)} ${f(y)}`).join('');
    s += path(d, { stroke: C.brass, w: 0.7, op: 0.75 });
  }
  // 握部的磨合痕迹：几块淡淡的排线
  s += `<ellipse cx="${x0 - 3}" cy="${top + L * 0.8}" rx="7" ry="26" fill="url(#h-ink)" opacity=".7"/><ellipse cx="${x0 + 4}" cy="${top + L * 0.9}" rx="6" ry="18" fill="url(#h-ink)" opacity=".7"/>`;
  // 末端：释放点的一圈细放射线
  for (let i = 0; i < 9; i++) { const a = -Math.PI / 2 + (i - 4) * 0.22; s += line(x0 + Math.cos(a) * 12, top - 6 + Math.sin(a) * 12, x0 + Math.cos(a) * (24 + (i % 2) * 8), top - 6 + Math.sin(a) * (24 + (i % 2) * 8), { stroke: C.brassLight, w: 0.8 }); }
  // 左侧三段括注
  const seg = [[0, 0.12, '杖端', '最终塑形 · 释放'], [0.12, 0.68, '杖身', '导管 · 导出路径'], [0.7, 1, '握部', '回路与工具相接']];
  for (const [a, b, t1, t2] of seg) {
    const y1 = top + a * L + 4, y2 = top + b * L - 4, xm = 150;
    s += path(`M${xm + 10} ${f(y1)}L${xm} ${f(y1)}L${xm} ${f(y2)}L${xm + 10} ${f(y2)}`, { stroke: C.brass, w: 0.9 });
    s += text(xm - 10, (y1 + y2) / 2 - 2, t1, { size: 15, anchor: 'end' }) + text(xm - 10, (y1 + y2) / 2 + 16, t2, { size: 11, anchor: 'end', fill: C.note });
  }
  // 剖面 A/B/C：同心年轮，越往杖端越细
  const secs = [['A', 0.06], ['B', 0.42], ['C', 0.84]];
  secs.forEach(([n, t], i) => {
    const y = top + t * L, r = half(t) * 2.6, cx = 420, cy = 250 + i * 250;
    s += line(x0 - half(t) - 6, y, x0 + half(t) + 6, y, { stroke: C.brass, w: 0.8, dash: '3 3' }) + text(x0 + half(t) + 10, y + 4, n, { latin: true, size: 12, fill: C.brass });
    s += path(`M${f(x0 + half(t) + 22)} ${f(y)}C${f(cx - 70)} ${f(y)} ${f(cx - 70)} ${f(cy)} ${f(cx - r - 10)} ${f(cy)}`, { stroke: C.faint, w: 0.8, dash: '2 3' });
    s += circle(cx, cy, r, { fill: '#e6dfca', stroke: C.ink, w: 1.2 });
    for (let k = 1; k < 5; k++) s += circle(cx + k * 0.25, cy - k * 0.15, r * (1 - k * 0.2), { stroke: C.brass, w: 0.6, op: 0.8 });
    s += circle(cx + 1.2, cy - 0.8, 1.2, { fill: C.brass, stroke: C.brass });
    s += text(cx, cy + r + 22, `剖面 ${n}`, { size: 12, anchor: 'middle', fill: C.note });
  });
  s += text(420, 900, '同一段木料，年轮连贯', { size: 11, anchor: 'middle', fill: C.note }) + text(420, 917, '不镶石，不加金属箍', { size: 11, anchor: 'middle', fill: C.note });
  s += text(250, 955, '正面形制（示意）', { size: 12, anchor: 'middle', fill: C.note });

  // 右栏注释
  // 1 三重角色
  s += note(1, 180, '三重角色', '导管 · 进阶稳定器 · 最终塑形器');
  const flow = [['回路', 632], ['稳定', 694], ['导出', 756], ['定型', 818]];
  flow.forEach(([n, x], i) => { s += rect(x - 26, 222, 52, 26, { stroke: i ? C.brass : C.line, w: 0.9, rx: 3 }) + text(x, 240, n, { size: 12, anchor: 'middle' }); if (i < 3) s += arrow(x + 27, 235, x + 34, 235, { stroke: C.brass, w: 0.9, head: 4 }); });
  s += text(632, 268, '力量从回路进入杖身，杖辅助稳定、完成导出，', { size: 11, fill: C.note }) + text(632, 284, '在末端最后定型后释放。', { size: 11, fill: C.note });
  // 2 长杖与短杖
  s += note(2, 330, '长杖与短杖', '只比较相对长短，不表示尺寸');
  s += line(650, 372, 650, 520, { stroke: C.ink, w: 3.2 }) + line(720, 450, 720, 520, { stroke: C.ink, w: 2.4 });
  s += arrow(668, 515, 668, 378, { stroke: C.brass, w: 0.9, head: 5 }) + arrow(738, 515, 738, 456, { stroke: C.brass, w: 0.9, head: 5 });
  s += text(680, 395, '导出路径长', { size: 11, fill: C.note }) + text(680, 411, '共鸣强、宜远距离', { size: 11, fill: C.note });
  s += text(750, 474, '导出快', { size: 11, fill: C.note }) + text(750, 490, '宜近距离、街巷', { size: 11, fill: C.note });
  s += text(650, 538, '长杖', { size: 11, anchor: 'middle' }) + text(720, 538, '短杖', { size: 11, anchor: 'middle' });
  // 3 握部的磨合
  s += note(3, 590, '握部的磨合', '长期使用，与回路形成默契');
  s += path('M636 650C660 640 760 640 820 646L822 664C760 670 660 670 636 662Z', { fill: '#e6dfca', stroke: C.ink, w: 1 });
  s += `<ellipse cx="690" cy="656" rx="22" ry="7" fill="url(#h-ink)"/><ellipse cx="760" cy="656" rx="16" ry="6" fill="url(#h-ink)"/>`;
  s += text(632, 692, '常握处颜色变深、木面变光。换一柄新杖，', { size: 11, fill: C.note }) + text(632, 708, '再好的做工也要重新磨合。', { size: 11, fill: C.note });
  // 4 在四阶段中的位置
  s += note(4, 760, '在施法四阶段中', '辅助稳定，主导导出');
  ['起势', '塑形', '稳定', '导出'].forEach((n, i) => {
    const x = 632 + i * 54, on = i >= 2;
    s += rect(x, 800, 46, 34, { stroke: on ? C.brass : C.faint, w: on ? 1.2 : 0.8, fill: i === 3 ? 'url(#h-brass)' : 'none' }) + text(x + 23, 822, n, { size: 12, anchor: 'middle', fill: on ? C.ink : C.note });
  });
  s += text(632, 856, '起势与塑形在回路中完成；稳定由咒文承担，', { size: 11, fill: C.note }) + text(632, 872, '魔杖从旁辅助；导出由魔杖完成。', { size: 11, fill: C.note });
  return s + '</svg>';
}

// ———————————————————————— 封咒蕴法石 ————————————————————————
function stone() {
  let s = frame({ title: '封咒蕴法石', number: '03', keywords: 'MINERAL / COMPLETE SPELL / SINGLE RELEASE / MAGAZINE', defs: '<clipPath id="crystal"><path d="M300 220L400 270L410 560L310 640L200 590L190 300Z"/></clipPath>' });
  // 主视图：一块六棱晶体，内部分格；左下的格子是已填充的同一道咒语，右上是尚可填充的空间
  const body = 'M300 220L400 270L410 560L310 640L200 590L190 300Z';
  s += path(body, { fill: '#e4ddc8', stroke: C.ink, w: 1.5 });
  s += path('M300 220L298 300L190 300M298 300L410 330M298 300L300 640', { stroke: C.line, w: 0.8, op: 0.6 });
  // 内部格：用规则的斜格表示「体量」，填充的部分加排线
  let cells = '';
  for (let gy = 0; gy < 9; gy++) for (let gx = 0; gx < 6; gx++) {
    const x = 195 + gx * 36 + (gy % 2) * 18, y = 255 + gy * 44;
    const filled = gy * 6 + gx >= 22;
    cells += rect(x, y, 30, 36, { stroke: C.brass, w: 0.6, op: 0.55, fill: filled ? 'url(#h-brass)' : 'none' });
  }
  s += `<g clip-path="url(#crystal)">${cells}</g>`;
  s += path(body, { stroke: C.ink, w: 1.5 });
  // 托架（展具）
  s += path('M230 610L215 680M380 600L398 680', { stroke: C.line, w: 1.2 }) + rect(170, 680, 270, 26, { stroke: C.line, w: 1.2 }) + rect(150, 706, 310, 22, { stroke: C.line, w: 1.2 });
  s += text(305, 760, '展台托爪（展具）', { size: 11, anchor: 'middle', fill: C.note });
  s += callout(350, 300, 440, 250, '尚可填充的空间', '没有填满时，剩余部分还能再用');
  s += callout(320, 520, 440, 470, '已填充的咒语', '同一道咒语，一次释放消耗一份');
  s += callout(196, 420, 160, 380, '石材本体', '', 'left');
  s += text(160, 400, '体积只与所存咒语的', { size: 11, anchor: 'end', fill: C.note }) + text(160, 416, '数量和体量有关', { size: 11, anchor: 'end', fill: C.note });
  s += path('M300 210L300 180', { stroke: C.brass, w: 0.8, dash: '2 3' }) + text(300, 172, '触发后无损耗地释放', { size: 11, anchor: 'middle', fill: C.brass });
  s += text(305, 800, '正面形制（示意）', { size: 12, anchor: 'middle', fill: C.note });
  // 下方：一次性的流转
  s += text(60, 860, '一次性的流转', { size: 15 });
  const life = [['原石', '开采、分拣'], ['填充', '封入完整咒语'], ['释放', '每次消耗一份'], ['废石', '不能再填咒']];
  life.forEach(([a, b], i) => { const x = 70 + i * 125; s += rect(x - 10, 880, 100, 50, { stroke: i === 3 ? C.faint : C.brass, w: 1 }) + text(x + 40, 902, a, { size: 14, anchor: 'middle' }) + text(x + 40, 920, b, { size: 10, anchor: 'middle', fill: C.note }); if (i < 3) s += arrow(x + 92, 905, x + 112, 905, { stroke: C.brass, w: 0.9, head: 4 }); });
  s += text(60, 958, '废石去向：建材（曾承载防御咒语者有被动防护）、研磨料、炼金原料', { size: 11, fill: C.note });

  // 右栏
  s += note(1, 180, '体量决定占用', '与咒语等级无关');
  s += path('M640 230L680 222L690 268L650 280Z', { fill: '#e4ddc8', stroke: C.ink, w: 1 }) + path('M646 258L688 249L690 268L650 280Z', { fill: 'url(#h-brass)', stroke: 'none' });
  s += path('M730 220L790 210L805 280L745 292Z', { fill: '#e4ddc8', stroke: C.ink, w: 1 }) + path('M733 236L792 225L805 280L745 292Z', { fill: 'url(#h-brass)', stroke: 'none' }) + path('M728 228L795 200', { stroke: C.brass, w: 0.8, dash: '3 3' });
  s += text(665, 302, '简单咒语', { size: 11, anchor: 'middle' }) + text(768, 312, '复杂咒语', { size: 11, anchor: 'middle' });
  s += text(632, 334, '同样大的石头，简单咒语只占一部分；', { size: 11, fill: C.note }) + text(632, 350, '复杂咒语装不下，就要换更大的石头。', { size: 11, fill: C.note });
  s += note(2, 400, '不同咒语不能混装', '会互相影响、抵消');
  s += rect(640, 440, 70, 56, { stroke: C.ink, w: 1, fill: 'url(#h-brass)' }) + text(675, 512, '同一道', { size: 11, anchor: 'middle' });
  s += rect(740, 440, 70, 56, { stroke: C.ink, w: 1, fill: 'url(#h-brass)' }) + rect(740, 440, 70, 56, { stroke: 'none', fill: 'url(#h-brass2)' }) + rect(740, 440, 70, 56, { stroke: 'none', fill: 'url(#h-teal)' });
  s += line(748, 448, 802, 488, { stroke: '#8a4b3a', w: 1.2 }) + line(802, 448, 748, 488, { stroke: '#8a4b3a', w: 1.2 }) + text(775, 512, '混入', { size: 11, anchor: 'middle' });
  s += text(632, 538, '像在一张纸上反复写字，最后谁也读不出来。', { size: 11, fill: C.note });
  s += note(3, 590, '工坊里的「弹匣」', '预存大量同一咒语，逐次调用');
  s += path('M640 630L760 622L770 700L650 710Z', { fill: '#e4ddc8', stroke: C.ink, w: 1 });
  for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) s += rect(652 + i * 27, 634 + j * 23, 21, 18, { stroke: C.brass, w: 0.6, fill: i === 0 && j === 0 ? 'none' : 'url(#h-brass)' });
  s += arrow(772, 660, 812, 660, { stroke: C.brass, w: 1, head: 5 }) + rect(814, 640, 32, 40, { stroke: C.line, w: 1 }) + text(830, 696, '机器', { size: 10, anchor: 'middle', fill: C.note });
  s += text(632, 730, '大块石材增加的是续航，不是单次威力。', { size: 11, fill: C.note });
  s += note(4, 780, '用过以后', '已用部分不可再填咒');
  s += path('M645 820L700 812L708 868L652 878Z', { fill: '#ddd6c0', stroke: C.faint, w: 1 }) + path('M660 826L676 850L668 872M690 816L684 840', { stroke: C.faint, w: 0.8 });
  s += text(724, 836, '内部结构已因承载魔法', { size: 11, fill: C.note }) + text(724, 852, '而改变，转入二级市场', { size: 11, fill: C.note }) + text(724, 868, '（见「用过的蕴法石」）', { size: 11, fill: C.note });
  return s + '</svg>';
}

// ———————————————————————— 界门 ————————————————————————
function gate() {
  let s = frame({ title: '界门结构样本', number: '06', keywords: 'SANCTIONED ARTEFACT / ARCH / REGISTRY / THRESHOLD' });
  // 主视图：石拱门，门面里是流动的纹理（传送术式所在，只示意）
  const cx = 275, base = 820, pw = 46, inner = 100, spring = 480; // 拱脚高度
  const outerR = inner + pw;
  // 门面纹理
  let field = `<clipPath id="gfield"><path d="M${cx - inner} ${base - 40}L${cx - inner} ${spring}A${inner} ${inner} 0 0 1 ${cx + inner} ${spring}L${cx + inner} ${base - 40}Z"/></clipPath><g clip-path="url(#gfield)"><rect x="${cx - inner}" y="${spring - inner}" width="${inner * 2}" height="${base - spring + inner}" fill="#dde3d8"/>`;
  for (let k = 0; k < 22; k++) {
    const y0 = spring - inner + 10 + k * 17;
    field += path(`M${cx - inner} ${y0}C${cx - 60} ${y0 - 14 + (k % 3) * 6} ${cx + 30} ${y0 + 16 - (k % 4) * 5} ${cx + inner} ${y0 + 2}`, { stroke: C.teal, w: 0.8, op: 0.75 });
  }
  field += '</g>';
  s += field;
  // 拱券：分块石（拱石）
  const nV = 13;
  for (let i = 0; i <= nV; i++) { const a = Math.PI - i * Math.PI / nV; s += line(cx + Math.cos(a) * inner, spring - Math.sin(a) * inner, cx + Math.cos(a) * outerR, spring - Math.sin(a) * outerR, { stroke: C.line, w: 1 }); }
  s += path(`M${cx - inner} ${spring}A${inner} ${inner} 0 0 1 ${cx + inner} ${spring}`, { stroke: C.ink, w: 1.4 }) + path(`M${cx - outerR} ${spring}A${outerR} ${outerR} 0 0 1 ${cx + outerR} ${spring}`, { stroke: C.ink, w: 1.4 });
  // 拱心石
  s += path(`M${cx - 16} ${spring - inner + 2}L${cx - 22} ${spring - outerR - 14}L${cx + 22} ${spring - outerR - 14}L${cx + 16} ${spring - inner + 2}Z`, { fill: '#e2dccb', stroke: C.ink, w: 1.3 });
  // 门柱
  for (const sgn of [-1, 1]) {
    const x1 = cx + sgn * inner, x2 = cx + sgn * outerR, xl = Math.min(x1, x2);
    s += rect(xl, spring, pw, base - 40 - spring, { fill: '#e2dccb', stroke: C.ink, w: 1.3 });
    for (let y = spring + 46; y < base - 50; y += 46) s += line(xl, y, xl + pw, y, { stroke: C.line, w: 0.8 });
    s += rect(xl - 8, spring - 14, pw + 16, 14, { stroke: C.ink, w: 1.2, fill: '#e2dccb' }); // 柱头
    s += rect(xl + 10, spring + 70, pw - 20, 120, { stroke: C.faint, w: 0.8 }); // 柱面浮雕框
  }
  // 登记铭牌（左柱下部，编号处留空）
  s += rect(cx - outerR + 8, base - 120, pw - 16, 46, { stroke: C.brass, w: 1.1, fill: '#e8dfc4' }) + line(cx - outerR + 14, base - 104, cx - inner - 14 + 0, base - 104, { stroke: C.brass, w: 0.7 }) + line(cx - outerR + 14, base - 92, cx - inner - 14, base - 92, { stroke: C.brass, w: 0.7, dash: '2 2' });
  // 台阶与门槛
  s += rect(cx - outerR - 20, base - 40, (outerR + 20) * 2, 14, { stroke: C.ink, w: 1.2, fill: '#e2dccb' });
  s += rect(cx - outerR - 40, base - 26, (outerR + 40) * 2, 13, { stroke: C.line, w: 1.1 }) + rect(cx - outerR - 60, base - 13, (outerR + 60) * 2, 13, { stroke: C.line, w: 1.1 });
  s += callout(cx, spring - outerR - 6, 445, 270, '拱券与拱心石', '分块砌筑的石拱');
  s += callout(cx + 40, 640, 450, 620, '门面', '传送术式所在·示意');
  s += callout(cx + inner + pw / 2, spring + 130, 450, 520, '门柱', '承托拱券');
  s += callout(cx - outerR + pw / 2, base - 98, 112, 700, '登记铭牌', '', 'left') + text(112, 720, '联合部编号', { size: 11, anchor: 'end', fill: C.note }) + text(112, 736, '（留空）', { size: 11, anchor: 'end', fill: C.note });
  s += callout(cx + outerR + 50, base - 8, 450, 735, '台阶与门槛', '旅人由此进出');
  s += text(cx, 875, '正面形制（示意）', { size: 12, anchor: 'middle', fill: C.note });
  s += text(60, 920, '大型圣律造物：由空间魔法体系的巅峰巫师合力建造，', { size: 12, fill: C.note }) + text(60, 940, '建成后由魔法联合部维护与监管。', { size: 12, fill: C.note });

  // 右栏
  s += note(1, 180, '门前的平面', '手续、候行与装卸');
  const px = 640, py = 220;
  s += rect(px, py, 200, 130, { stroke: C.line, w: 1 }) + path(`M${px + 80} ${py}L${px + 80} ${py + 18}M${px + 120} ${py}L${px + 120} ${py + 18}`, { stroke: C.ink, w: 2 }) + path(`M${px + 80} ${py + 6}L${px + 120} ${py + 6}`, { stroke: C.teal, w: 3 });
  s += rect(px + 10, py + 40, 60, 34, { stroke: C.brass, w: 0.9 }) + text(px + 40, py + 62, '手续', { size: 11, anchor: 'middle' });
  s += rect(px + 80, py + 40, 40, 70, { stroke: C.brass, w: 0.9, dash: '3 2' }) + text(px + 100, py + 80, '候行', { size: 11, anchor: 'middle' });
  s += rect(px + 130, py + 40, 60, 34, { stroke: C.brass, w: 0.9 }) + text(px + 160, py + 62, '装卸', { size: 11, anchor: 'middle' });
  s += arrow(px + 100, py + 125, px + 100, py + 24, { stroke: C.brass, w: 0.9, head: 5 });
  s += text(632, 372, '当天办不妥手续，旅人还要在城中住宿；', { size: 11, fill: C.note }) + text(632, 388, '货物到了另一端要重新装卸。', { size: 11, fill: C.note });
  s += note(2, 440, '两端相连', '此端进入，彼端走出');
  const arch = (x, y) => path(`M${x - 16} ${y}L${x - 16} ${y - 22}A16 16 0 0 1 ${x + 16} ${y - 22}L${x + 16} ${y}`, { stroke: C.ink, w: 1.2 }) + line(x - 22, y, x + 22, y, { stroke: C.line, w: 1 });
  s += arch(660, 530) + arch(800, 530) + path('M676 510C710 486 750 486 784 510', { stroke: C.teal, w: 1, dash: '3 3' });
  s += arrow(610, 524, 640, 524, { stroke: C.brass, w: 0.9, head: 4 }) + arrow(820, 524, 852, 524, { stroke: C.brass, w: 0.9, head: 4 });
  s += text(632, 560, '抵达另一端后，前往目的地', { size: 11, fill: C.note }) + text(632, 576, '仍需搭乘其他交通。', { size: 11, fill: C.note });
  s += note(3, 630, '设置在哪里', '只在能长期管理的地点');
  ['首都', '大型城市', '战略要地', '联合部控制区'].forEach((n, i) => { const x = 640 + (i % 2) * 105, y = 670 + Math.floor(i / 2) * 40; s += rect(x, y, 95, 28, { stroke: C.brass, w: 0.9 }) + text(x + 47, y + 19, n, { size: 12, anchor: 'middle' }); });
  s += text(632, 768, '远距离传送所需的术式复杂，', { size: 11, fill: C.note }) + text(632, 784, '无法在村庄临时设立。', { size: 11, fill: C.note });
  s += note(4, 820, '登记与管理', '圣律造物须经联合部登记编号');
  s += rect(640, 856, 200, 70, { stroke: C.brass, w: 1, fill: '#e8dfc4' });
  [['类别', '大型圣律造物'], ['建造', '巅峰巫师合力'], ['维护监管', '魔法联合部']].forEach(([a, b], i) => { s += text(652, 876 + i * 19, a, { size: 11, fill: C.note }) + text(720, 876 + i * 19, b, { size: 11 }); });
  return s + '</svg>';
}

// ———————————————————————— 古式长杖 ————————————————————————
function staff() {
  let s = frame({ title: '古式长杖', number: '02', keywords: 'WOOD / LONG CONDUIT / RESONANCE / OPEN GROUND' });
  // 主视图：一整根带天然弯曲的木杖，杖首一团木瘤；中线沿一条缓慢起伏的曲线
  const top = 175, bot = 940, L = bot - top;
  const cxAt = t => 270 + Math.sin(t * 5.2 + 0.4) * 9 + Math.sin(t * 13 + 1) * 3 - t * 18;
  const half = t => 5.2 + 3.2 * t + (Math.sin(t * 37) * 0.5 + 0.5) * 1.6 * (t > 0.08 ? 1 : 0) + (t < 0.07 ? 6 * Math.sin((t / 0.07) * Math.PI) : 0);
  const N = 180, P = [];
  for (let i = 0; i <= N; i++) { const t = i / N; P.push([t, cxAt(t), top + t * L]); }
  const left = P.map(([t, x, y]) => `${f(x - half(t))} ${f(y)}`), right = P.map(([t, x, y]) => `${f(x + half(t))} ${f(y)}`).reverse();
  s += path(`M${left.join('L')}Q${f(cxAt(1))} ${bot + 12} ${right[0]}L${right.join('L')}Q${f(cxAt(0))} ${top - 14} ${left[0]}Z`, { fill: '#e6dfca', stroke: C.ink, w: 1.4 });
  // 木纹：随枝干扭转的细线
  for (const k of [-0.55, -0.15, 0.3, 0.65]) {
    const d = P.filter((_, i) => i % 3 === 0).map(([t, x, y], i) => `${i ? 'L' : 'M'}${f(x + half(t) * (k + Math.sin(t * 22 + k * 4) * 0.25))} ${f(y)}`).join('');
    s += path(d, { stroke: C.brass, w: 0.7, op: 0.75 });
  }
  // 木瘤与几处节疤
  s += `<ellipse cx="${f(cxAt(0.03) - 1)}" cy="${top + 18}" rx="7" ry="11" fill="none" stroke="${C.brass}" stroke-width=".8"/>`;
  for (const t of [0.31, 0.56, 0.79]) s += `<ellipse cx="${f(cxAt(t) + 2)}" cy="${f(top + t * L)}" rx="3" ry="6" fill="none" stroke="${C.brass}" stroke-width=".8"/>`;
  // 共鸣：沿杖身的几道细弧，表示较长路径上的自然共鸣
  for (let i = 0; i < 6; i++) { const t = 0.12 + i * 0.1, y = top + t * L, x = cxAt(t); s += path(`M${f(x + 18)} ${f(y - 12)}Q${f(x + 30)} ${f(y)} ${f(x + 18)} ${f(y + 12)}`, { stroke: C.brassLight, w: 0.8, op: 0.8 }); }
  // 左侧括注
  for (const [a, b, t1, t2] of [[0, 0.07, '杖首', '力量由此导出'], [0.07, 0.72, '杖身', '较长的导出路径'], [0.74, 1, '握部', '握持的位置']]) {
    const y1 = top + a * L + 3, y2 = top + b * L - 3, xm = 160;
    s += path(`M${xm + 10} ${f(y1)}L${xm} ${f(y1)}L${xm} ${f(y2)}L${xm + 10} ${f(y2)}`, { stroke: C.brass, w: 0.9 });
    s += text(xm - 10, (y1 + y2) / 2 - 2, t1, { size: 15, anchor: 'end' }) + text(xm - 10, (y1 + y2) / 2 + 16, t2, { size: 11, anchor: 'end', fill: C.note });
  }
  s += callout(cxAt(0.42) + 30, top + 0.42 * L, 360, 470, '自然共鸣', '路径越长，共鸣越强');
  s += callout(cxAt(0.56) + 4, top + 0.56 * L, 360, 640, '天然节疤', '一整根木料，不加镶嵌');
  s += text(300, 985, '正面形制（示意）', { size: 12, anchor: 'middle', fill: C.note });

  // 右栏
  s += note(1, 180, '导出路径较长', '与短杖相比，只比相对长短');
  s += line(655, 222, 655, 360, { stroke: C.ink, w: 3.2 }) + line(735, 300, 735, 360, { stroke: C.ink, w: 2.2 });
  for (let i = 0; i < 4; i++) s += path(`M${667} ${236 + i * 30}q10 8 0 16`, { stroke: C.brassLight, w: 0.9 });
  s += path('M747 314q8 7 0 14', { stroke: C.brassLight, w: 0.9 });
  s += text(655, 378, '长杖', { size: 11, anchor: 'middle' }) + text(735, 378, '短杖', { size: 11, anchor: 'middle' });
  s += text(690, 250, '共鸣更强', { size: 11, fill: C.note }) + text(690, 266, '宜远距离引导', { size: 11, fill: C.note });
  s += note(2, 420, '开阔地与狭巷', '需要距离，也需要时间');
  s += line(640, 500, 845, 500, { stroke: C.faint, w: 0.8 }) + circle(650, 490, 4, { fill: C.ink, stroke: C.ink }) + line(650, 494, 650, 470, { stroke: C.ink, w: 1.6 });
  s += path('M660 488C720 440 790 440 836 488', { stroke: C.brass, w: 1, dash: '4 3' }) + circle(838, 492, 4, { stroke: C.ink });
  s += text(838, 512, '远处的目标', { size: 10, anchor: 'end', fill: C.note });
  s += rect(640, 522, 205, 10, { stroke: C.brass, w: 0.8, fill: 'url(#h-brass)' }) + text(632, 545, '吟唱与引导的时间较长', { size: 11, fill: C.note });
  s += line(700, 562, 700, 600, { stroke: C.line, w: 2 }) + line(760, 562, 760, 600, { stroke: C.line, w: 2 }) + line(730, 568, 730, 598, { stroke: C.ink, w: 1.6 }) + path('M714 582L722 576M738 576L746 582', { stroke: '#8a4b3a', w: 1 });
  s += text(780, 586, '狭巷里转身', { size: 11, fill: C.note }) + text(780, 602, '要顾及墙壁', { size: 11, fill: C.note });
  s += note(3, 650, '多人协作', '彼此等待，完成引导');
  for (let i = 0; i < 4; i++) { const x = 650 + i * 26, y = 720 - Math.abs(i - 1.5) * 8; s += circle(x, y - 14, 4, { stroke: C.ink, w: 1 }) + line(x, y - 9, x, y + 8, { stroke: C.ink, w: 1.2 }) + line(x + 5, y + 6, x + 5, y - 22, { stroke: C.ink, w: 1.4 }); s += path(`M${x + 5} ${y - 24}Q${780} ${690} 830 ${700}`, { stroke: C.brassLight, w: 0.7, op: 0.8 }); }
  s += circle(834, 700, 6, { stroke: C.brass, fill: 'url(#h-brass)' });
  s += text(632, 752, '大型法术常由数名巫师合力完成；', { size: 11, fill: C.note }) + text(632, 768, '有人中途失去引导能力，其余人要重新判断。', { size: 11, fill: C.note });
  s += note(4, 820, '回路负担较重', '威力不是免费的');
  s += text(640, 868, '古代魔法', { size: 11 }) + rect(700, 858, 140, 12, { stroke: C.line, w: 0.8 }) + rect(700, 858, 126, 12, { stroke: 'none', fill: 'url(#h-brass)' });
  s += text(640, 892, '现代咒语', { size: 11 }) + rect(700, 882, 140, 12, { stroke: C.line, w: 0.8 }) + rect(700, 882, 46, 12, { stroke: 'none', fill: 'url(#h-brass)' });
  s += text(632, 918, '负荷过大可能损伤回路、使施法能力衰退。', { size: 11, fill: C.note }) + text(632, 934, '（只示意相对轻重）', { size: 11, fill: C.note });
  return s + '</svg>';
}

// ———————————————————————— 用过的蕴法石 ————————————————————————
function spent() {
  const shape = 'M215 300L330 205L420 245L432 470L395 640L250 690L180 600L170 420Z';
  let s = frame({ title: '用过的蕴法石', number: '04', keywords: 'RELEASED / RESIDUAL STRUCTURE / SORTING / SECOND TRADE', defs: `<clipPath id="spentc"><path d="${shape}"/></clipPath>` });
  // 主视图：不规则原石，内部的格已经空了，格壁留下淡淡的残余；表面有裂隙与碎片
  s += path(shape, { fill: '#ddd8c4', stroke: C.ink, w: 1.5 });
  let cells = '';
  for (let gy = 0; gy < 11; gy++) for (let gx = 0; gx < 7; gx++) {
    const x = 165 + gx * 40 + (gy % 2) * 20, y = 200 + gy * 46;
    cells += rect(x, y, 32, 38, { stroke: C.faint, w: 0.6, dash: '2 2', op: 0.8 });
    if ((gx * 7 + gy * 3) % 5 === 0) cells += path(`M${x + 4} ${y + 30}C${x + 12} ${y + 18} ${x + 20} ${y + 26} ${x + 28} ${y + 8}`, { stroke: C.teal, w: 0.7, op: 0.6 });
  }
  s += `<g clip-path="url(#spentc)">${cells}<rect x="160" y="200" width="290" height="500" fill="url(#h-ink)" opacity=".35"/></g>`;
  s += path('M330 205L318 300L250 380L262 470M318 300L400 360L392 470M262 470L320 560L300 650', { stroke: C.line, w: 1, op: 0.7 });
  s += path(shape, { stroke: C.ink, w: 1.5 });
  // 碎片
  s += path('M440 690L462 676L470 698Z', { fill: '#ddd8c4', stroke: C.ink, w: 1 }) + path('M150 700L166 692L170 708L156 710Z', { fill: '#ddd8c4', stroke: C.ink, w: 1 });
  s += line(120, 712, 500, 712, { stroke: C.faint, w: 0.8 });
  s += callout(300, 330, 455, 250, '已释放的格', '空了，不能再填咒');
  s += callout(268, 470, 455, 420, '结构残余', '承载魔法后已改变');
  s += callout(392, 470, 455, 560, '表面裂隙', '');
  s += callout(462, 690, 455, 660, '掉落的碎片', '');
  s += text(300, 760, '正面形制（示意）', { size: 12, anchor: 'middle', fill: C.note });
  // 下方：分拣标签
  s += text(60, 830, '回收时附上的分拣签', { size: 15 });
  s += path('M70 850L300 850L320 875L300 900L70 900Z', { stroke: C.brass, w: 1, fill: '#e8dfc4' }) + circle(296, 875, 4, { stroke: C.brass });
  s += text(82, 870, '曾承载的咒语：', { size: 12, fill: C.note }) + line(170, 872, 280, 872, { stroke: C.brass, w: 0.7, dash: '2 2' });
  s += text(82, 892, '预备送去：', { size: 12, fill: C.note }) + line(146, 894, 280, 894, { stroke: C.brass, w: 0.7, dash: '2 2' });
  s += text(340, 870, '有清楚记录的废石，', { size: 11, fill: C.note }) + text(340, 886, '更容易找到合适的买家。', { size: 11, fill: C.note });

  // 右栏
  s += note(1, 180, '不能再填咒', '一次性，这是它和造物的分别');
  s += path('M650 230L710 222L718 280L656 290Z', { fill: '#ddd8c4', stroke: C.ink, w: 1 }) + arrow(760, 256, 724, 256, { stroke: C.brass, w: 1, head: 5 }) + text(800, 260, '再次填充', { size: 11, anchor: 'middle', fill: C.note });
  s += line(730, 244, 750, 268, { stroke: '#8a4b3a', w: 1.4 }) + line(750, 244, 730, 268, { stroke: '#8a4b3a', w: 1.4 });
  s += text(632, 318, '已经用过的部分不能重新封入咒语。', { size: 11, fill: C.note });
  s += note(2, 370, '三种去向', '按它曾承载的咒语与性质');
  const go = [['建材', '曾承载防御咒语者', '可提供被动防护'], ['研磨料', '加工某些', '铸造魔法所用的工具'], ['炼金原料', '少量交易', '用于特定配方']];
  go.forEach(([a, b, c], i) => { const y = 410 + i * 62; s += rect(640, y, 70, 46, { stroke: C.brass, w: 1 }) + text(675, y + 28, a, { size: 13, anchor: 'middle' }) + text(722, y + 20, b, { size: 11, fill: C.note }) + text(722, y + 36, c, { size: 11, fill: C.note }); });
  s += note(3, 630, '小规模的二级市场', '养活一小批中间商');
  [['工坊', 640], ['收料者', 712], ['用料的人', 790]].forEach(([n, x], i) => { s += rect(x - 4, 670, n.length * 14 + 12, 28, { stroke: C.line, w: 0.9 }) + text(x + 2 + n.length * 7, 689, n, { size: 12, anchor: 'middle' }); if (i < 2) s += arrow(x + n.length * 14 + 10, 684, x + n.length * 14 + 24, 684, { stroke: C.brass, w: 0.9, head: 4 }); });
  s += text(632, 724, '送新石的人来时，也可能带走墙边积攒的旧料。', { size: 11, fill: C.note });
  s += note(4, 780, '问清来历', '收料前的两件事');
  s += text(640, 828, '一  它曾经承载什么咒语', { size: 12 }) + text(640, 852, '二  预备送到哪里去', { size: 12 });
  s += text(632, 884, '建筑者要核对材料是否适合预定部位；', { size: 11, fill: C.note }) + text(632, 900, '说不清来历的废石，只能卖给要求较低的买家。', { size: 11, fill: C.note });
  return s + '</svg>';
}

// ———————————————————————— 日用造物灯 ————————————————————————
function lamp() {
  let s = frame({ title: '一盏日用造物灯', number: '05', keywords: 'ARTEFACT / SHAPED MAGIC / AFFINITY / NATURAL RECOVERY' });
  const cx = 290;
  // 顶饰与灯帽
  s += path(`M${cx} 170C${cx - 9} 182 ${cx - 9} 196 ${cx} 202C${cx + 9} 196 ${cx + 9} 182 ${cx} 170Z`, { fill: '#e2d6b6', stroke: C.ink, w: 1.2 });
  s += path(`M${cx - 14} 214L${cx + 14} 214L${cx + 8} 202L${cx - 8} 202Z`, { fill: '#e2d6b6', stroke: C.ink, w: 1.1 });
  s += path(`M${cx - 88} 262C${cx - 70} 228 ${cx + 70} 228 ${cx + 88} 262Z`, { fill: '#e2d6b6', stroke: C.ink, w: 1.3 }) + rect(cx - 94, 262, 188, 10, { fill: '#e2d6b6', stroke: C.ink, w: 1.1 });
  // 玻璃灯罩与肋框；中间一圈光
  s += `<ellipse cx="${cx}" cy="350" rx="98" ry="80" fill="#efe6c9" stroke="${C.ink}" stroke-width="1.3"/>`;
  s += circle(cx, 352, 26, { stroke: C.brassLight, w: 1, fill: '#f3e3b0' }) + circle(cx, 352, 44, { stroke: C.brassLight, w: 0.6, dash: '2 3' }) + circle(cx, 352, 62, { stroke: C.brassLight, w: 0.5, dash: '1 4' });
  for (const k of [-0.82, -0.45, 0, 0.45, 0.82]) s += path(`M${f(cx + k * 98 * 0.9)} 276Q${f(cx + k * 98 * 1.12)} 350 ${f(cx + k * 98 * 0.9)} 424`, { stroke: C.line, w: 1 });
  s += rect(cx - 82, 424, 164, 10, { fill: '#e2d6b6', stroke: C.ink, w: 1.1 });
  // 莲瓣托
  for (let i = -3; i <= 3; i++) s += path(`M${cx + i * 18 - 10} 452C${cx + i * 18 - 8} 438 ${cx + i * 18 + 8} 438 ${cx + i * 18 + 10} 452Z`, { fill: '#e2d6b6', stroke: C.ink, w: 0.9 });
  s += path(`M${cx - 70} 452L${cx + 70} 452L${cx + 40} 470L${cx - 40} 470Z`, { fill: '#e2d6b6', stroke: C.ink, w: 1.1 });
  // 灯柱与节
  s += rect(cx - 7, 470, 14, 250, { fill: '#e2d6b6', stroke: C.ink, w: 1.1 });
  for (const y of [520, 600, 680]) s += `<ellipse cx="${cx}" cy="${y}" rx="15" ry="9" fill="#e2d6b6" stroke="${C.ink}" stroke-width="1.1"/>`;
  // 底座
  s += path(`M${cx - 20} 720L${cx + 20} 720L${cx + 34} 760L${cx - 34} 760Z`, { fill: '#e2d6b6', stroke: C.ink, w: 1.1 });
  s += path(`M${cx - 34} 760C${cx - 90} 770 ${cx - 120} 790 ${cx - 122} 812L${cx + 122} 812C${cx + 120} 790 ${cx + 90} 770 ${cx + 34} 760Z`, { fill: '#e2d6b6', stroke: C.ink, w: 1.3 });
  s += rect(cx - 130, 812, 260, 16, { fill: '#e2d6b6', stroke: C.ink, w: 1.2 });
  for (let i = 0; i < 9; i++) s += path(`M${cx - 96 + i * 24} 798q6 -8 12 0`, { stroke: C.brass, w: 0.8 });
  s += line(110, 828, 480, 828, { stroke: C.faint, w: 0.8 });
  s += callout(cx + 26, 352, 420, 300, '灯罩', '照明的效果在这里出现');
  s += callout(cx + 12, 600, 420, 560, '器身', '整件器物保存已塑形的');
  s += text(420, 596, '魔力与塑形方式', { size: 11, fill: C.note });
  s += callout(cx - 100, 800, 110, 700, '底座', '', 'left') + text(110, 720, '主人会把它从', { size: 11, anchor: 'end', fill: C.note }) + text(110, 736, '书桌搬到柜台', { size: 11, anchor: 'end', fill: C.note });
  s += text(cx, 870, '正面形制（示意）', { size: 12, anchor: 'middle', fill: C.note });
  s += text(60, 920, '巫师造物：属于安全范畴，可在市场上自由流通。', { size: 12, fill: C.note }) + text(60, 940, '本件是据造物性质拟写的生活样本。', { size: 12, fill: C.note });

  // 右栏
  s += note(1, 180, '造物与蕴法石', '保存的东西不同');
  const rows = [['', '造物', '蕴法石'], ['保存', '已塑形的魔力', '完整的咒语'], ['效果', '可重复使用', '单次释放'], ['用过以后', '慢慢自然恢复', '不能再填']];
  rows.forEach((r, i) => { const y = 222 + i * 26; s += line(632, y + 8, 850, y + 8, { stroke: C.soft, w: 0.8 }); r.forEach((c, j) => { s += text([636, 700, 785][j], y, c, { size: 11, fill: i === 0 || j === 0 ? C.note : C.ink }); }); });
  s += note(2, 360, '契合度', '同一盏灯，在不同人手里');
  [0.95, 0.65, 0.38].forEach((k, i) => { const x = 665 + i * 72; s += circle(x, 420, 10, { stroke: C.brassLight, fill: '#f3e3b0' }) + circle(x, 420, 10 + 22 * k, { stroke: C.brassLight, w: 0.7, dash: '2 3' }) + path(`M${x - 10} 470q10 -12 20 0`, { stroke: C.line, w: 1 }) + line(x, 458, x, 446, { stroke: C.line, w: 1 }); });
  s += text(632, 500, '材料、灌注时的魔力流与使用者的回路特性', { size: 11, fill: C.note }) + text(632, 516, '共同决定能效；没有魔力的人也能使用。', { size: 11, fill: C.note });
  s += note(3, 570, '慢慢恢复', '从自然魔力中缓慢提取');
  s += line(640, 680, 845, 680, { stroke: C.faint, w: 0.8 }) + line(640, 680, 640, 610, { stroke: C.faint, w: 0.8 });
  s += path('M640 615L700 618L716 668L760 650L800 632L845 622', { stroke: C.brass, w: 1.2 });
  s += text(690, 700, '使用', { size: 10, anchor: 'middle', fill: C.note }) + text(790, 700, '等待恢复', { size: 10, anchor: 'middle', fill: C.note }) + text(606, 640, '储备', { size: 10, fill: C.note });
  s += text(632, 724, '只示意趋势，不标时间。', { size: 11, fill: C.note });
  s += note(4, 780, '人为补充的条件', '通常只有原灌注者能做到');
  s += text(640, 828, '一  必须是初步塑形的魔力', { size: 12 }) + text(640, 852, '二  魔力流与造物内部一致', { size: 12 });
  s += text(632, 884, '日用器物的主人多半靠自然恢复，', { size: 11, fill: C.note }) + text(632, 900, '在使用与等待之间安排工作。', { size: 11, fill: C.note });
  return s + '</svg>';
}

const out = process.argv[2] || 'assets-src/plates';
fs.mkdirSync(out, { recursive: true });
const only = process.env.ONLY ? process.env.ONLY.split(',') : null;
for (const [k, fn] of [['wand', wand], ['staff', staff], ['stone', stone], ['spent', spent], ['lamp', lamp], ['gate', gate]].filter(([k]) => !only || only.includes(k))) { fs.writeFileSync(`${out}/${k}.svg`, fn()); console.log(`${out}/${k}.svg`); }
