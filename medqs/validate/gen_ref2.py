"""Reference values for one-sample, k-group and repeated-measures tests (SciPy + pingouin)."""
import json, os, warnings
import numpy as np, pandas as pd
from scipy import stats
import pingouin as pg
warnings.filterwarnings("ignore")
here = os.path.dirname(__file__)
ref = json.load(open(os.path.join(here, "ref.json")))
rng = np.random.default_rng(20261009)
f = lambda a: [float(v) for v in a]

# one-sample
one = []
def one_case(x, mu, alt, label):
    x = np.asarray(x, float)
    t = stats.ttest_1samp(x, mu, alternative=alt); ci = t.confidence_interval(0.95)
    w = stats.wilcoxon(x - mu, alternative=alt)
    one.append({"label": label, "x": f(x), "mu": mu, "alt": alt,
                "t": {"t": float(t.statistic), "df": float(t.df), "p": float(t.pvalue), "ci": [float(ci.low) - mu, float(ci.high) - mu]},
                "w": {"W": float(w.statistic), "p": float(w.pvalue)}})
for alt in ["two-sided", "greater", "less"]:
    one_case(rng.normal(50.4, 1.2, 15).round(2), 50, alt, f"normal n=15 {alt}")
    one_case(rng.integers(45, 56, 20).astype(float), 50, alt, f"integers with ties/zeros n=20 {alt}")
    one_case(rng.exponential(2, 60).round(3), 1.5, alt, f"skewed n=60 {alt}")
one_case(rng.normal(10, 1, 9).round(3), 9.5, "two-sided", "small n=9 exact")

# k-group independent
multi = []
def multi_case(groups, label):
    g = [np.asarray(x, float) for x in groups]
    an = stats.f_oneway(*g); wa = stats.f_oneway(*g, equal_var=False); kw = stats.kruskal(*g); lv = stats.levene(*g, center="median")
    multi.append({"label": label, "groups": [f(x) for x in g],
                  "anova": {"F": float(an.statistic), "p": float(an.pvalue)},
                  "welch": {"F": float(wa.statistic), "p": float(wa.pvalue)},
                  "kw": {"H": float(kw.statistic), "p": float(kw.pvalue)},
                  "levene": {"W": float(lv.statistic), "p": float(lv.pvalue)}})
multi_case([rng.normal(10, 1, 12).round(3), rng.normal(10.5, 1, 15).round(3), rng.normal(11, 1, 10).round(3)], "3 groups normal")
multi_case([rng.normal(10, 0.5, 20).round(3), rng.normal(10.2, 2, 18).round(3), rng.normal(10.8, 4, 25).round(3), rng.normal(9.9, 1, 8).round(3)], "4 groups unequal variance")
multi_case([rng.integers(1, 6, 14).astype(float), rng.integers(2, 7, 16).astype(float), rng.integers(1, 5, 12).astype(float)], "3 groups tied integers")
multi_case([rng.exponential(1, 30).round(3), rng.exponential(1.5, 30).round(3), rng.lognormal(0, 1, 30).round(3), rng.exponential(1, 25).round(3), rng.exponential(2, 22).round(3)], "5 groups skewed")
multi_case([rng.normal(100, 5, 5).round(1), rng.normal(103, 5, 5).round(1), rng.normal(98, 5, 5).round(1)], "3 groups n=5")

# repeated measures
rm = []
def rm_case(M, label):
    M = np.asarray(M, float); n, k = M.shape
    df = pd.DataFrame([{"s": i, "c": j, "y": M[i, j]} for i in range(n) for j in range(k)])
    a = pg.rm_anova(data=df, dv="y", within="c", subject="s", correction=True, detailed=True)
    sp = pg.sphericity(df, dv="y", within="c", subject="s")
    eps = pg.epsilon(df, dv="y", within="c", subject="s", correction="gg")
    fr = stats.friedmanchisquare(*[M[:, j] for j in range(k)])
    row = a.iloc[0]
    rm.append({"label": label, "M": [f(r) for r in M],
               "F": float(row["F"]), "p": float(row["p_unc"] if "p_unc" in row else row["p-unc"]),
               "ss_cond": float(row["SS"]), "ss_err": float(a.iloc[1]["SS"]),
               "epsGG": float(eps), "mauchlyW": float(sp.W), "mauchlyP": float(sp.pval),
               "friedman": {"chi2": float(fr.statistic), "p": float(fr.pvalue)}})
    pggcol = [c for c in a.columns if "GG" in c and "corr" in c]
    rm[-1]["pGG"] = float(row[pggcol[0]]) if pggcol else None
base = rng.normal(50, 3, 12)
rm_case(np.column_stack([base + rng.normal(0, 1, 12), base + 0.8 + rng.normal(0, 1, 12), base + 1.5 + rng.normal(0, 1, 12)]).round(2), "3 conditions n=12")
base = rng.normal(20, 4, 15)
rm_case(np.column_stack([base, base + rng.normal(0.5, 0.3, 15), base + rng.normal(1, 2, 15), base + rng.normal(0.2, 4, 15)]).round(2), "4 conditions unequal spread n=15")
base = rng.integers(3, 8, 10)
rm_case(np.column_stack([base, base + rng.integers(0, 3, 10), base + rng.integers(-1, 4, 10)]).astype(float), "3 conditions tied integers n=10")
base = rng.normal(5, 1, 25)
rm_case(np.column_stack([base + rng.normal(0, .5, 25) for _ in range(5)]).round(3), "5 conditions n=25")
ref.update({"one": one, "multi": multi, "rm": rm})
json.dump(ref, open(os.path.join(here, "ref.json"), "w"))
print(len(one), len(multi), len(rm), "pingouin", pg.__version__)
print(rm[0])
