"""Reference values for sample-size planning (sample.js), computed with SciPy / statsmodels.
Writes ref["ss"] into ref.json."""
import json, os
import numpy as np
from scipy import stats
from statsmodels.stats.proportion import power_proportions_2indep

here = os.path.dirname(os.path.abspath(__file__))
ref = json.load(open(os.path.join(here, "ref.json")))
B = stats.binom

def crit(n, p0, a, alt):
    lo, hi = -1, n + 1
    if alt in ("less", "two-sided"):
        aa = a if alt == "less" else a / 2
        for c in range(-1, n + 1):
            if c >= 0 and B.cdf(c, n, p0) > aa: break
            lo = c
    if alt in ("greater", "two-sided"):
        aa = a if alt == "greater" else a / 2
        for c in range(n + 1, -1, -1):
            if c <= n and B.sf(c - 1, n, p0) > aa: break
            hi = c
    return lo, hi

def p1power(p0, p1, n, a, alt):
    lo, hi = crit(n, p0, a, alt)
    rej = lambda p: (B.cdf(lo, n, p) if lo >= 0 else 0) + (B.sf(hi - 1, n, p) if hi <= n else 0)
    return rej(p1), rej(p0), lo, hi

ss = {"p1": [], "p1n": [], "p2": [], "p2n": [], "doe": [], "tol1": [], "np": []}
for (p0, p1, n, alt) in [(0.1, 0.02, 100, "less"), (0.05, 0.15, 60, "greater"), (0.5, 0.7, 50, "two-sided"), (0.01, 0.003, 900, "less"), (0.2, 0.1, 37, "two-sided"), (0.02, 0.06, 250, "greater")]:
    pw, size, lo, hi = p1power(p0, p1, n, 0.05, alt)
    ss["p1"].append(dict(p0=p0, p1=p1, n=n, alt=alt, power=pw, size=size, lo=lo, hi=hi))
for (p0, p1, alt, tgt) in [(0.1, 0.02, "less", 0.8), (0.05, 0.15, "greater", 0.9), (0.5, 0.7, "two-sided", 0.8), (0.2, 0.1, "two-sided", 0.9)]:
    n = 1
    while p1power(p0, p1, n, 0.05, alt)[0] < tgt: n += 1
    ss["p1n"].append(dict(p0=p0, p1=p1, alt=alt, target=tgt, n=n))
for (p1, p2, n, alt, ratio) in [(0.05, 0.02, 300, "two-sided", 1), (0.10, 0.20, 120, "smaller", 1), (0.30, 0.20, 200, "larger", 2), (0.08, 0.03, 500, "two-sided", 0.5)]:
    ss["p2"].append(dict(p1=p1, p2=p2, n=n, alt=alt, ratio=ratio, power=float(power_proportions_2indep(p1 - p2, p2, n, ratio=ratio, alpha=0.05, alternative=alt, return_results=False))))
for (p1, p2, alt, tgt) in [(0.05, 0.02, "two-sided", 0.8), (0.10, 0.20, "smaller", 0.9), (0.30, 0.20, "two-sided", 0.8)]:
    n = 2
    while power_proportions_2indep(p1 - p2, p2, n, alpha=0.05, alternative=alt, return_results=False) < tgt: n += 1
    ss["p2n"].append(dict(p1=p1, p2=p2, alt=alt, target=tgt, n=n))
for (runs, r, terms, d, s, cp) in [(8, 2, 7, 2.0, 1.5, 0), (16, 1, 10, 3.0, 2.0, 0), (4, 3, 3, 1.0, 0.5, 0), (8, 1, 3, 2.5, 1.0, 4), (12, 2, 7, 1.5, 1.0, 0), (32, 1, 15, 1.0, 1.0, 0)]:
    Nf = runs * r; N = Nf + cp; df = N - 1 - terms; ncp = d * np.sqrt(Nf) / (2 * s); c = stats.t.ppf(0.975, df)
    ss["doe"].append(dict(runs=runs, r=r, terms=terms, delta=d, sigma=s, cp=cp, df=df, power=stats.nct.sf(c, df, ncp) + stats.nct.cdf(-c, df, ncp)))
for (p, g, kmax) in [(0.99, 0.95, 4.0), (0.95, 0.95, 2.5), (0.999, 0.95, 4.0), (0.90, 0.90, 1.6), (0.99, 0.95, 2.5), (0.99, 0.95, 2.426)]:
    k1 = lambda n: stats.nct.ppf(g, n - 1, stats.norm.ppf(p) * np.sqrt(n)) / np.sqrt(n)
    lo, hi = 2, 2
    while k1(hi) > kmax: lo, hi = hi, hi * 2
    while hi - lo > 1:
        m = (lo + hi) // 2
        if k1(m) > kmax: lo = m
        else: hi = m
    n = lo if k1(lo) <= kmax else hi
    ss["tol1"].append(dict(p=p, g=g, kmax=kmax, n=n, k=k1(n)))
for (p, g, side) in [(0.99, 0.95, "lower"), (0.95, 0.95, "two"), (0.90, 0.90, "two"), (0.999, 0.90, "upper")]:
    f = (lambda n: 1 - n * p ** (n - 1) + (n - 1) * p ** n) if side == "two" else (lambda n: 1 - p ** n)
    n = 2 if side == "two" else 1
    while f(n) < g: n += 1
    ss["np"].append(dict(p=p, g=g, side=side, n=n, conf=f(n)))
ss["nct"] = [dict(t=t, df=df, d=d, cdf=stats.nct.cdf(t, df, d)) for (t, df, d) in [(40, 300, 39), (60, 500, 58), (45, 1000, 47), (-50, 200, -49), (80, 2000, 82), (2, 10, 1), (-1, 8, 0.5)]]
ref["ss"] = ss
json.dump(ref, open(os.path.join(here, "ref.json"), "w"), default=float)
print({k: len(v) for k, v in ss.items()}, ss["p1n"], ss["p2n"], ss["tol1"], ss["np"])
