# 樣本數規劃方法圖卡（便利貼風格，與定義問題頁圖卡一致）
import math, json, base64, io, os
from PIL import Image, ImageDraw, ImageFont
W, H = 424, 414
INK = (40, 40, 40, 255)
FB = "/usr/share/fonts/opentype/noto/NotoSansCJK-Black.ttc"
if not os.path.exists(FB): FB = "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc"
FR = "/usr/share/fonts/opentype/noto/NotoSansCJK-Medium.ttc"
if not os.path.exists(FR): FR = "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc"
COL = {"cmp": ((250, 226, 206), (246, 210, 184)), "pass": ((220, 238, 224), (200, 226, 208)), "spec": ((226, 228, 246), (208, 211, 238)),
       "lot": ((248, 236, 196), (240, 222, 168)), "exp": ((236, 231, 222), (222, 214, 200))}
def base(g):
    c1, c2 = COL[g]
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    for y in range(12, H - 12):
        t = (y - 12) / (H - 24); c = tuple(int(c1[k] + (c2[k] - c1[k]) * t) for k in range(3))
        d.line([(12, y), (W - 12, y)], fill=c + (255,))
    fold = 48
    d.polygon([(W - 12 - fold, H - 12), (W - 12, H - 12 - fold), (W - 12, H - 12)], fill=(0, 0, 0, 0))
    d.polygon([(W - 12 - fold, H - 12), (W - 12, H - 12 - fold), (W - 12 - fold, H - 12 - fold)], fill=tuple(max(0, v - 28) for v in c2) + (255,))
    im = rounded(im)
    global SH; SH = tuple(max(0, v - 46) for v in c2) + (255,)
    return im, ImageDraw.Draw(im)
def rounded(im):
    m = Image.new("L", im.size, 0); ImageDraw.Draw(m).rounded_rectangle([12, 12, W - 12, H - 12], 10, fill=255)
    a = im.split()[3]; from PIL import ImageChops; im.putalpha(ImageChops.multiply(a, m)); return im
def text(d, title, sub):
    f = ImageFont.truetype(FB, 46 if len(title) <= 5 else 40 if len(title) <= 7 else 34)
    w = d.textlength(title, font=f); d.text(((W - w) / 2, 236), title, font=f, fill=INK)
    fs = ImageFont.truetype(FR, 23); w = d.textlength(sub, font=fs); d.text(((W - w) / 2, 304), sub, font=fs, fill=INK)
def bell(d, cx, sd, x0, x1, y0, h, width=6, fill=None):
    pts = [(x, y0 - h * math.exp(-0.5 * ((x - cx) / sd) ** 2)) for x in range(int(x0), int(x1) + 1, 2)]
    if fill: d.polygon(pts + [(x1, y0), (x0, y0)], fill=fill)
    d.line(pts, fill=INK, width=width, joint="curve")
def axis(d, x0=96, x1=340, y0=196, top=40):
    d.line([(x0, y0), (x1, y0)], fill=INK, width=5); d.polygon([(x1 + 12, y0), (x1, y0 - 7), (x1, y0 + 7)], fill=INK)
SH = (0, 0, 0, 255)
def t_power():
    im, d = base("cmp"); axis(d); bell(d, 175, 26, 92, 300, 194, 120); bell(d, 250, 26, 160, 345, 194, 120)
    d.line([(175, 60), (250, 60)], fill=INK, width=4); [d.polygon(p, fill=INK) for p in ([(165, 60), (177, 53), (177, 67)], [(260, 60), (248, 53), (248, 67)])]
    text(d, "計量型 t 檢定", "有沒有差，要測幾個"); return im
def t_tost():
    im, d = base("cmp"); axis(d)
    d.rectangle([150, 50, 286, 194], fill=SH)
    for x in (150, 286):
        for y in range(50, 194, 14): d.line([(x, y), (x, y + 8)], fill=INK, width=4)
    bell(d, 210, 24, 110, 310, 194, 118); bell(d, 226, 24, 126, 326, 194, 118)
    f = ImageFont.truetype(FB, 24); d.text((126, 18), "−δ", font=f, fill=INK); d.text((270, 18), "+δ", font=f, fill=INK)
    text(d, "同等性 TOST", "證明一樣，要測幾個"); return im
def t_ni():
    im, d = base("cmp"); axis(d)
    d.rectangle([160, 50, 340, 194], fill=SH)
    for y in range(50, 194, 14): d.line([(160, y), (160, y + 8)], fill=INK, width=4)
    bell(d, 236, 26, 130, 340, 194, 118)
    f = ImageFont.truetype(FB, 24); d.text((128, 18), "−δ", font=f, fill=INK)
    d.line([(250, 34), (330, 34)], fill=INK, width=5); d.polygon([(342, 34), (328, 26), (328, 42)], fill=INK)
    text(d, "不劣性", "證明沒變差，要測幾個"); return im
def check(d, x, y, s=1.0):
    d.line([(x - 18 * s, y), (x - 5 * s, y + 14 * s), (x + 20 * s, y - 16 * s)], fill=INK, width=int(7 * s), joint="curve")
def t_attr():
    im, d = base("pass")
    for r in range(3):
        for c in range(4):
            x, y = 120 + c * 62, 58 + r * 54; d.rounded_rectangle([x - 24, y - 22, x + 24, y + 22], 6, outline=INK, width=4); check(d, x, y, 0.75)
    text(d, "通過／不通過", "全過才能宣稱可靠度"); return im
def t_prop():
    im, d = base("pass"); axis(d)
    for x, h in ((140, 120), (240, 62)):
        d.rectangle([x - 30, 194 - h, x + 30, 194], outline=INK, width=5); d.rectangle([x - 30, 194 - h, x + 30, 194], fill=SH)
    f = ImageFont.truetype(FB, 30); d.text((124, 30), "%", font=f, fill=INK); d.text((224, 92), "%", font=f, fill=INK)
    d.line([(190, 70), (210, 100)], fill=INK, width=5); d.polygon([(214, 108), (196, 100), (212, 90)], fill=INK)
    text(d, "不良率比較", "不良率有沒有變"); return im
def t_tolp():
    im, d = base("spec"); axis(d)
    bell(d, 218, 30, 130, 306, 194, 124, fill=SH)
    for x in (104, 332):
        for y in range(40, 194, 14): d.line([(x, y), (x, y + 8)], fill=INK, width=4)
    f = ImageFont.truetype(FB, 22); d.text((84, 14), "LSL", font=f, fill=INK); d.text((310, 14), "USL", font=f, fill=INK)
    d.text((184, 110), "99%", font=ImageFont.truetype(FB, 28), fill=INK)
    text(d, "允差區間", "宣稱 99% 落在規格內"); return im
def t_aql():
    im, d = base("lot")
    for r in range(4):
        for c in range(6):
            x, y = 98 + c * 46, 40 + r * 42
            d.rectangle([x - 16, y - 16, x + 16, y + 16], outline=INK, width=3)
            if (r, c) in ((1, 3), (3, 1)): d.line([(x - 10, y - 10), (x + 10, y + 10)], fill=INK, width=5); d.line([(x - 10, y + 10), (x + 10, y - 10)], fill=INK, width=5)
            elif (r + c) % 3 == 0: d.rectangle([x - 16, y - 16, x + 16, y + 16], fill=SH)
    d.ellipse([268, 120, 336, 188], outline=INK, width=7); d.line([(326, 178), (356, 210)], fill=INK, width=10)
    text(d, "計數型 AQL", "批次抽檢，數不良品"); return im
def t_aqlv():
    im, d = base("lot"); axis(d)
    hs = [18, 40, 74, 104, 112, 92, 60, 30, 12]
    for k, h in enumerate(hs):
        x = 112 + k * 24; d.rectangle([x, 194 - h, x + 22, 194], outline=INK, width=3, fill=SH)
    for y in range(36, 194, 14): d.line([(330, y), (330, y + 8)], fill=INK, width=4)
    d.text((312, 10), "USL", font=ImageFont.truetype(FB, 22), fill=INK)
    d.line([(222, 52), (322, 52)], fill=INK, width=4); d.polygon([(330, 52), (318, 45), (318, 59)], fill=INK)
    d.text((252, 18), "k·s", font=ImageFont.truetype(FB, 24), fill=INK)
    text(d, "計量型 AQL", "批次抽檢，看量測數值"); return im
def t_doer():
    im, d = base("exp")
    A, B, C, D = (120, 90), (250, 90), (250, 190), (120, 190); o = (50, -40)
    sh = lambda p: (p[0] + o[0], p[1] + o[1])
    for p, q in ((A, B), (B, C), (C, D), (D, A), (sh(A), sh(B)), (sh(B), sh(C)), (sh(A), A), (sh(B), B), (sh(C), C)): d.line([p, q], fill=INK, width=5)
    for p in (A, B, C, D, sh(A), sh(B), sh(C)): d.ellipse([p[0] - 11, p[1] - 11, p[0] + 11, p[1] + 11], fill=INK)
    d.text((300, 160), "×n", font=ImageFont.truetype(FB, 34), fill=INK)
    text(d, "DOE 重複次數", "實驗要重複幾次"); return im
def t_guide():
    im, d = base("exp")
    d.rounded_rectangle([96, 36, 330, 200], 10, outline=INK, width=5); d.line([(96, 76), (330, 76)], fill=INK, width=5); d.line([(176, 36), (176, 200)], fill=INK, width=4)
    for k in range(3):
        y = 104 + k * 36; d.line([(116, y), (156, y)], fill=INK, width=5); d.line([(196, y), (306 - k * 30, y)], fill=INK, width=5)
    text(d, "其他工具建議數量", "MSA、SPC 要收多少"); return im
TILES = {"ss_power": t_power, "ss_tost": t_tost, "ss_ni": t_ni, "ss_attr": t_attr, "ss_prop": t_prop, "ss_tolp": t_tolp, "ss_aql": t_aql, "ss_aqlv": t_aqlv, "ss_doer": t_doer, "ss_guide": t_guide}
here = os.path.dirname(os.path.abspath(__file__)); J = json.load(open(os.path.join(here, "tiles.json")))
for k, fn in TILES.items():
    im = fn(); im.save(os.path.join(here, "ss", k + ".png"))
    b = io.BytesIO(); im.resize((212, 207), Image.LANCZOS).save(b, "WEBP", quality=82, method=6)
    J[k] = "data:image/webp;base64," + base64.b64encode(b.getvalue()).decode()
json.dump(J, open(os.path.join(here, "tiles.json"), "w"))
print({k: len(v) for k, v in J.items() if k.startswith("ss_")})
