"""Reference values for 次數資料：單比例（精確二項）、Clopper-Pearson、列聯表卡方、Fisher 2×2、
Wilson／Newcombe 兩比例差。SciPy: binomtest、chi2_contingency(correction=False)、fisher_exact、
contingency.association(cramer)；statsmodels: proportion_confint(wilson)、confint_proportions_2indep(newcomb)。
Writes ref["counts"] into ref.json."""
import json, os
import numpy as np
from scipy import stats
from scipy.stats import contingency
from statsmodels.stats.proportion import proportion_confint, confint_proportions_2indep

here = os.path.dirname(os.path.abspath(__file__))
ref = json.load(open(os.path.join(here, "ref.json")))
one = []
for n, x, p0 in [(300, 0, 0.01), (300, 1, 0.01), (59, 0, 0.05), (59, 1, 0.05), (20, 3, 0.2), (1000, 4, 0.01), (1000, 12, 0.01), (50, 50, 0.9), (10, 0, 0.5), (150, 2, 0.05), (5, 1, 0.3), (2000, 25, 0.02)]:
    for conf in (0.95, 0.90, 0.99):
        r = stats.binomtest(x, n, p0, alternative="less")
        ci2 = stats.binomtest(x, n).proportion_ci(confidence_level=conf, method="exact")
        up1 = stats.binomtest(x, n).proportion_ci(confidence_level=2 * conf - 1, method="exact").high
        one.append(dict(n=n, x=x, p0=p0, conf=conf, p=float(r.pvalue), lo=float(ci2.low), hi=float(ci2.high), upper=float(up1)))
tabs = [[[12, 188], [3, 197]], [[1, 9], [11, 3]], [[0, 20], [5, 15]], [[30, 70], [45, 55]], [[2, 48], [1, 49]],
        [[10, 5, 3], [8, 12, 6], [4, 7, 15]], [[20, 30], [25, 25], [40, 10]], [[5, 7, 9, 11], [9, 8, 7, 6]],
        [[100, 900], [130, 870], [90, 910]], [[3, 1], [1, 3]], [[50, 0], [45, 5]], [[7, 3, 0], [2, 8, 4]]]
chi = []
for T in tabs:
    a = np.array(T)
    c2, p, df, E = stats.chi2_contingency(a, correction=False)
    N = a.sum(); rs = a.sum(1, keepdims=True); cs = a.sum(0, keepdims=True)
    adj = (a - E) / np.sqrt(E * (1 - rs / N) * (1 - cs / N))
    d = dict(t=T, chi2=float(c2), p=float(p), df=int(df), E=E.tolist(), adj=adj.tolist(), V=float(contingency.association(a, method="cramer")))
    if a.shape == (2, 2):
        o, fp = stats.fisher_exact(a); d["fisher"] = float(fp); d["or"] = float(o) if np.isfinite(o) else str(o)
        lo, hi = confint_proportions_2indep(int(a[0, 0]), int(a[0].sum()), int(a[1, 0]), int(a[1].sum()), method="newcomb", compare="diff", alpha=0.05)
        d["diffCI"] = [float(lo), float(hi)]
    chi.append(d)
wil = []
for x, n in [(0, 10), (1, 10), (5, 10), (12, 200), (3, 50), (99, 100)]:
    lo, hi = proportion_confint(x, n, alpha=0.05, method="wilson"); wil.append(dict(x=x, n=n, lo=float(lo), hi=float(hi)))
ref["counts"] = dict(one=one, chi=chi, wilson=wil)
json.dump(ref, open(os.path.join(here, "ref.json"), "w"))
print(len(one), len(chi), len(wil))
