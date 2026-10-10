"""Reference values for 相關與迴歸 (regress.js): SciPy pearsonr / spearmanr / linregress, statsmodels OLS
(prediction intervals, influence, Durbin-Watson, quadratic term), and NIST StRD Norris (certified values +
best value attainable from double-precision inputs, computed with exact rational arithmetic).
Writes ref["reg"] into ref.json."""
import json, os, re
from fractions import Fraction as Fr
from decimal import Decimal, getcontext
import numpy as np
from scipy import stats
import statsmodels.api as sm
from statsmodels.stats.stattools import durbin_watson

here = os.path.dirname(os.path.abspath(__file__))
ref = json.load(open(os.path.join(here, "ref.json")))
rng = np.random.default_rng(20261010)
r6 = lambda a: [float(round(v, 6)) for v in a]

cases = []
getcontext().prec = 50
def exact_lin(x, y, x0s):
    """有理數精確計算（只在 statsmodels 因病態矩陣失準時使用）；p 值與分位數仍用 SciPy 分布函數"""
    X = [Fr(float(v)) for v in x]; Y = [Fr(float(v)) for v in y]; n = len(X); df = n - 2
    D = lambda f: Decimal(f.numerator) / Decimal(f.denominator)
    xb, yb = sum(X) / n, sum(Y) / n; sxx = sum((v - xb) ** 2 for v in X); sxy = sum((X[i] - xb) * (Y[i] - yb) for i in range(n)); syy = sum((v - yb) ** 2 for v in Y)
    b1 = sxy / sxx; b0 = yb - b1 * xb; res = [Y[i] - b0 - b1 * X[i] for i in range(n)]; sse = sum(e * e for e in res); mse = sse / df
    s = D(mse).sqrt(); lev = [Fr(1, n) + (v - xb) ** 2 / sxx for v in X]
    sres = [D(res[i]) / (s * D(1 - lev[i]).sqrt()) for i in range(n)]
    tres = [r * (Decimal(df - 1) / (Decimal(df) - r * r)).sqrt() for r in sres]
    tc = Decimal(repr(float(stats.t.ppf(0.975, df))))
    pred = []
    for x0 in x0s:
        x0 = Fr(float(x0)); f = yb + b1 * (x0 - xb); k = Fr(1, n) + (x0 - xb) ** 2 / sxx
        cm = tc * s * D(k).sqrt(); pm = tc * s * D(1 + k).sqrt(); F = D(f)
        pred.append(dict(x=float(x0), fit=float(F), ci=[float(F - cm), float(F + cm)], pi=[float(F - pm), float(F + pm)]))
    dw = sum((res[i] - res[i - 1]) ** 2 for i in range(1, n)) / sse
    return dict(s=float(s), lev=[float(v) for v in lev], sres=[float(v) for v in sres], tres=[float(v) for v in tres], dw=float(dw)), pred
def add(label, x, y, x0s, exact=False):
    x, y = np.array(x, float), np.array(y, float)
    pr = stats.pearsonr(x, y); ci = pr.confidence_interval(0.95)
    sp = stats.spearmanr(x, y)
    lr = stats.linregress(x, y)
    X = sm.add_constant(x); m = sm.OLS(y, X).fit()
    infl = m.get_influence()
    pred = m.get_prediction(sm.add_constant(np.array(x0s, float), has_constant="add")).summary_frame(alpha=0.05)
    xc = x - x.mean()  # 中心化：最高次項的 t 值不受平移影響，且避免大數值的病態矩陣
    q = sm.OLS(y, np.column_stack([np.ones_like(x), xc, xc * xc])).fit() if len(set(x)) >= 3 and len(x) >= 5 else None
    cases.append(dict(label=label, x=x.tolist(), y=y.tolist(),
        pearson=dict(r=float(pr.statistic), p=float(pr.pvalue), ci=[float(ci.low), float(ci.high)]),
        spearman=dict(rho=float(sp.statistic), p=float(sp.pvalue)),
        lin=dict(b0=float(lr.intercept), b1=float(lr.slope), seB0=float(lr.intercept_stderr), seB1=float(lr.stderr), p=float(lr.pvalue),
                 ciB0=m.conf_int(0.05)[0].tolist(), ciB1=m.conf_int(0.05)[1].tolist(), r2=float(m.rsquared), r2adj=float(m.rsquared_adj),
                 F=float(m.fvalue), pF=float(m.f_pvalue), s=float(np.sqrt(m.mse_resid)), pB0=float(m.pvalues[0]),
                 lev=infl.hat_matrix_diag.tolist(), sres=infl.resid_studentized_internal.tolist(), tres=infl.resid_studentized_external.tolist(),
                 dw=float(durbin_watson(m.resid))),
        pred=[dict(x=float(x0), fit=float(r["mean"]), ci=[float(r["mean_ci_lower"]), float(r["mean_ci_upper"])], pi=[float(r["obs_ci_lower"]), float(r["obs_ci_upper"])]) for x0, (_, r) in zip(x0s, pred.iterrows())],
        quad=(dict(p=float(q.pvalues[2]), t=float(q.tvalues[2])) if q is not None else None)))
    if exact:
        ex, pr2 = exact_lin(x, y, x0s); cases[-1]["lin"].update(ex); cases[-1]["pred"] = pr2; cases[-1]["label"] += "（殘差、槓桿、區間以有理數精確計算）"

# 1) 熱封溫度 vs 強度：正相關、n=30
x = rng.uniform(170, 190, 30).round(1); add("正相關 n=30", x, (0.32 * x - 40 + rng.normal(0, 1.1, 30)).round(2), [170, 180, 195])
# 2) 負相關、n=12
x = rng.uniform(0, 10, 12).round(2); add("負相關 n=12", x, (50 - 2.1 * x + rng.normal(0, 3, 12)).round(2), [0, 5, 12])
# 3) 幾乎無相關、n=40
x = rng.normal(5, 1, 40).round(3); add("無相關 n=40", x, rng.normal(10, 2, 40).round(3), [3, 5, 7])
# 4) 有重複值（Spearman 同分）、n=20
x = rng.integers(1, 6, 20).astype(float); add("同分 n=20", x, (x * 1.5 + rng.integers(0, 4, 20)).astype(float), [1, 3, 5])
# 5) 小樣本 n=5
add("小樣本 n=5", [1, 2, 3, 4, 5], [2.1, 3.9, 6.2, 7.8, 10.1], [0, 3, 6])
# 6) 曲線關係（二次項應顯著）
x = np.linspace(0, 10, 25); add("曲線 n=25", x, (2 + 0.5 * x - 0.2 * x * x + rng.normal(0, 0.3, 25)).round(3), [0, 5, 10])
# 7) 大數值、小變異（數值穩定度）
x = 1e6 + rng.normal(0, 1, 30).round(4); add("大數值 n=30", x, (3 * (x - 1e6) + 1e4 + rng.normal(0, 0.5, 30)).round(4), [1e6 - 1, 1e6, 1e6 + 1], exact=True)
# 8) 含離群值、n=15
x = rng.uniform(0, 20, 15).round(2); y = 5 + 0.8 * x + rng.normal(0, 1, 15); y[7] += 9; add("含離群值 n=15", x, y.round(3), [0, 10, 20])

# ---- NIST StRD Norris ----
path = os.path.join(os.path.dirname(stats.__file__), "tests", "data", "nist_linregress", "Norris.dat")
L = open(path).read().splitlines()
num = lambda s: float(s.replace("E", "e"))
cert = {}
for ln in L:
    m = re.match(r"\s*B0\s+(\S+)\s+(\S+)", ln)
    if m: cert["b0"], cert["seB0"] = num(m.group(1)), num(m.group(2))
    m = re.match(r"\s*B1\s+(\S+)\s+(\S+)", ln)
    if m: cert["b1"], cert["seB1"] = num(m.group(1)), num(m.group(2))
    m = re.search(r"Standard Deviation\s+(\S+)$", ln.strip())
    if m and "Residual" not in ln: cert["s"] = num(m.group(1))
    m = re.search(r"R-Squared\s+(\S+)", ln)
    if m: cert["r2"] = num(m.group(1))
    m = re.match(r"\s*Regression\s+1\s+(\S+)\s+(\S+)\s+(\S+)", ln)
    if m: cert["ssr"], cert["F"] = num(m.group(1)), num(m.group(3))
    m = re.match(r"\s*Residual\s+\d+\s+(\S+)\s+(\S+)", ln)
    if m: cert["sse"], cert["mse"] = num(m.group(1)), num(m.group(2))
hdr = max(i for i, ln in enumerate(L) if ln.strip().startswith("Data:"))
ys, xs = [], []
for ln in L[hdr + 1:]:
    p = ln.split()
    if len(p) == 2: ys.append(p[0]); xs.append(p[1])
# best attainable from double inputs: exact rational arithmetic on the float-converted data
getcontext().prec = 50
X = [Fr(float(v)) for v in xs]; Y = [Fr(float(v)) for v in ys]; n = len(X)
xb, yb = sum(X) / n, sum(Y) / n
sxx = sum((v - xb) ** 2 for v in X); sxy = sum((X[i] - xb) * (Y[i] - yb) for i in range(n)); syy = sum((v - yb) ** 2 for v in Y)
b1 = sxy / sxx; b0 = yb - b1 * xb
sse = sum((Y[i] - b0 - b1 * X[i]) ** 2 for i in range(n)); ssr = syy - sse; mse = sse / (n - 2)
D = lambda f: Decimal(f.numerator) / Decimal(f.denominator)
s = D(mse).sqrt()
best = dict(b0=float(b0), b1=float(b1), sse=float(sse), ssr=float(ssr), mse=float(mse), F=float(ssr / mse), r2=float(1 - sse / syy),
            s=float(s), seB1=float(s / D(sxx).sqrt()), seB0=float(s * (D(Fr(1, n) + xb * xb / sxx)).sqrt()))
nist = dict(name="Norris", x=xs, y=ys, cert=cert, best=best)

ref["reg"] = dict(cases=cases, nist=[nist])
json.dump(ref, open(os.path.join(here, "ref.json"), "w"))
print("reg cases:", len(cases), "nist cert keys:", sorted(cert))
