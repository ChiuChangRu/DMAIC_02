"""Reference values for 同等性（TOST）與不劣性 樣本數規劃 (sample.js tostPower / niPower / tostN / niN).
TOST: independent implementation with scipy.integrate.quad over the chi-square distribution of the
pooled variance (different variable and quadrature from the JS Gauss–Legendre over chi), plus Monte
Carlo simulation of the actual TOST decision for spot checks. Non-inferiority: scipy.stats.nct.
Writes ref["eq"] into ref.json."""
import json, os
import numpy as np
from scipy import stats, integrate

here = os.path.dirname(os.path.abspath(__file__))
ref = json.load(open(os.path.join(here, "ref.json")))

def kdf(design, n): return (2 / n, 2 * n - 2) if design == "two" else (1 / n, n - 1)
def tost(design, n, d, sd, a, D):
    k, df = kdf(design, n); c = sd * np.sqrt(k); t = stats.t.ppf(1 - a, df)
    qmax = df * (d / (t * c)) ** 2
    def f(q):
        lim = d - t * c * np.sqrt(q / df)
        return 0.0 if lim <= 0 else (stats.norm.cdf((lim - D) / c) - stats.norm.cdf((-lim - D) / c)) * stats.chi2.pdf(q, df)
    pts = [p for p in (df, df - 4 * np.sqrt(2 * df), df + 4 * np.sqrt(2 * df)) if 0 < p < qmax]
    return integrate.quad(f, 0, qmax, limit=500, epsabs=1e-13, epsrel=1e-11, points=pts or None)[0]
def ni(design, n, d, sd, a, D, dr):
    k, df = kdf(design, n); c = sd * np.sqrt(k); t = stats.t.ppf(1 - a, df)
    return float(stats.nct.cdf(-t, df, (D - d) / c)) if dr == "lower" else float(stats.nct.sf(t, df, (D + d) / c))
def minN(fn, target):
    n = 2
    while fn(n) < target: n += 1
    return n

tp = []
for design in ("two", "one"):
    for n in (2, 3, 5, 10, 30, 100):
        for ratio in (0.5, 1.0, 2.0):              # δ/σ
            for frac in (0.0, 0.3, -0.5):          # 真實差異 / δ
                for a in (0.05, 0.025):
                    tp.append(dict(design=design, n=n, delta=ratio, sd=1.0, alpha=a, D=frac * ratio, power=tost(design, n, ratio, 1.0, a, frac * ratio)))
# 實際單位的例子（教材：δ = 0.02 mm、σ = 0.012 mm）
for n in (5, 6, 9, 10): tp.append(dict(design="two", n=n, delta=0.02, sd=0.012, alpha=0.05, D=0.0, power=tost("two", n, 0.02, 0.012, 0.05, 0.0)))
tn = []
for design, d, sd, a, tg, D in [("two", 0.02, 0.012, 0.05, 0.9, 0), ("two", 1, 1, 0.05, 0.8, 0), ("two", 1, 1, 0.05, 0.9, 0.2), ("one", 1, 1, 0.05, 0.9, 0), ("one", 0.5, 1, 0.025, 0.8, -0.1), ("two", 0.3, 1, 0.05, 0.9, 0)]:
    n = minN(lambda m: tost(design, m, d, sd, a, D), tg); tn.append(dict(design=design, delta=d, sd=sd, alpha=a, target=tg, D=D, n=n))
nip = []
for design in ("two", "one"):
    for n in (2, 3, 5, 10, 30, 100):
        for ratio in (0.5, 1.0):
            for D in (0.0, 0.2):
                for dr in ("higher", "lower"):
                    nip.append(dict(design=design, n=n, delta=ratio, sd=1.0, alpha=0.05, D=D if dr == "higher" else -D, dir=dr, power=ni(design, n, ratio, 1.0, 0.05, D if dr == "higher" else -D, dr)))
nin = []
for design, d, sd, a, tg, D, dr in [("two", 0.02, 0.012, 0.05, 0.9, 0, "higher"), ("two", 1, 1, 0.025, 0.9, 0, "higher"), ("one", 0.5, 1, 0.05, 0.8, 0.1, "higher"), ("two", 0.5, 1, 0.05, 0.9, 0, "lower")]:
    n = minN(lambda m: ni(design, m, d, sd, a, D, dr), tg); nin.append(dict(design=design, delta=d, sd=sd, alpha=a, target=tg, D=D, dir=dr, n=n))
# 模擬：直接做 TOST 判定（不經過任何公式），用來確認公式的定義正確
rng = np.random.default_rng(20261011); sim = []
for design, n, d, sd, D in [("two", 9, 0.02, 0.012, 0.0), ("two", 6, 0.02, 0.012, 0.004), ("one", 8, 1.0, 1.0, 0.3)]:
    N = 400000; k, df = kdf(design, n); t = stats.t.ppf(0.95, df)
    if design == "two":
        x = rng.normal(0, sd, (N, n)); y = rng.normal(D, sd, (N, n)); dd = y.mean(1) - x.mean(1); se = np.sqrt((x.var(1, ddof=1) + y.var(1, ddof=1)) / 2) * np.sqrt(2 / n)
    else:
        z = rng.normal(D, sd, (N, n)); dd = z.mean(1); se = z.std(1, ddof=1) / np.sqrt(n)
    p = float(np.mean((dd - t * se > -d) & (dd + t * se < d))); sim.append(dict(design=design, n=n, delta=d, sd=sd, D=D, power=p, se=float(np.sqrt(p * (1 - p) / N))))
    print("sim", design, n, p, "formula", tost(design, n, d, sd, 0.05, D))
ref["eq"] = dict(tp=tp, tn=tn, nip=nip, nin=nin, sim=sim)
json.dump(ref, open(os.path.join(here, "ref.json"), "w"), ensure_ascii=False)
print(len(tp), len(tn), len(nip), len(nin), [c["n"] for c in tn], [c["n"] for c in nin])

# ---- 判定：statsmodels ttost_ind／ttost_paired 與單邊 t 檢定 ----
from statsmodels.stats.weightstats import ttost_ind, ttost_paired, ttest_ind
rng2 = np.random.default_rng(20261012); tt = []
for k, (n1, n2, mu, sd, d, a, paired) in enumerate([(30, 30, 0.007, 0.012, 0.02, 0.05, False), (5, 5, 0.007, 0.012, 0.02, 0.05, False), (12, 15, -0.3, 1.0, 1.0, 0.05, False), (10, 10, 0.2, 0.5, 0.5, 0.025, True), (25, 25, 1.2, 1.0, 1.0, 0.05, True), (8, 11, 0.0, 2.0, 1.5, 0.05, False)]):
    x = np.round(rng2.normal(5.0, sd, n1), 4); y = np.round(rng2.normal(5.0 + mu, sd, n2 if not paired else n1), 4)
    if paired:
        p, r1, r2 = ttost_paired(y, x, -d, d)
        dd = y - x; se = dd.std(ddof=1) / np.sqrt(len(dd)); dfv = len(dd) - 1; dm = dd.mean()
    else:
        p, r1, r2 = ttost_ind(y, x, -d, d, usevar="pooled")
        dfv = n1 + n2 - 2; sp = np.sqrt(((n1 - 1) * x.var(ddof=1) + (n2 - 1) * y.var(ddof=1)) / dfv); se = sp * np.sqrt(1 / n1 + 1 / n2); dm = y.mean() - x.mean()
    tc = stats.t.ppf(1 - a, dfv)
    ni_hi = float(stats.t.sf((dm + d) / se, dfv)); ni_lo = float(stats.t.cdf((dm - d) / se, dfv))
    tt.append(dict(x=x.tolist(), y=y.tolist(), paired=paired, delta=d, alpha=a, pLow=float(r1[1]), pUp=float(r2[1]), p=float(p), d=float(dm), se=float(se), df=int(dfv), lo=float(dm - tc * se), hi=float(dm + tc * se), niHigher=ni_hi, niLower=ni_lo))
ref["eq"]["tests"] = tt
json.dump(ref, open(os.path.join(here, "ref.json"), "w"), ensure_ascii=False)
print("tests", [(round(c["p"], 4), c["lo"] > -c["delta"] and c["hi"] < c["delta"]) for c in tt])

# ---- 不良率判定：scipy binomtest、statsmodels proportions_ztest、scipy fisher_exact、Wald 信賴區間 ----
from statsmodels.stats.proportion import proportions_ztest, confint_proportions_2indep
p1t = []
for x, n, p0 in [(0, 59, 0.05), (2, 153, 0.05), (4, 153, 0.05), (7, 40, 0.1), (12, 100, 0.08), (1, 20, 0.2), (30, 60, 0.5)]:
    for alt in ("less", "greater", "two-sided"):
        r = stats.binomtest(x, n, p0, alternative=alt); ci = r.proportion_ci(confidence_level=0.95 if alt == "two-sided" else 0.95, method="exact") if alt == "two-sided" else stats.binomtest(x, n, p0, alternative=alt).proportion_ci(confidence_level=0.95, method="exact")
        p1t.append(dict(x=x, n=n, p0=p0, alt=alt, p=float(r.pvalue), lo=float(ci.low), hi=float(ci.high)))
p2t = []
for x1, n1, x2, n2 in [(5, 100, 15, 100), (2, 50, 9, 60), (0, 30, 6, 30), (40, 200, 30, 220), (3, 12, 8, 14)]:
    for alt, sm, fa in (("two-sided", "two-sided", "two-sided"), ("larger", "larger", "greater"), ("smaller", "smaller", "less")):
        z, pz = proportions_ztest([x1, x2], [n1, n2], alternative=sm)
        pf = stats.fisher_exact([[x1, n1 - x1], [x2, n2 - x2]], alternative=fa).pvalue
        lo, hi = confint_proportions_2indep(x1, n1, x2, n2, method="wald", compare="diff", alpha=0.05)
        p2t.append(dict(x1=x1, n1=n1, x2=x2, n2=n2, alt=alt, z=float(z), pz=float(pz), pf=float(pf), lo=float(lo), hi=float(hi)))
ref["eq"]["p1t"] = p1t; ref["eq"]["p2t"] = p2t
json.dump(ref, open(os.path.join(here, "ref.json"), "w"), ensure_ascii=False)
print("prop tests", len(p1t), len(p2t))
