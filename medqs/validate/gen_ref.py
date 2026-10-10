"""Generate reference results with SciPy and parse NIST StRD ANOVA certified values."""
import json, os, glob, re, math
import numpy as np
from scipy import stats

rng = np.random.default_rng(20261008)
cases = []

def r6(a):
    return [float(v) for v in a]

def gen(kind, n, dec=None):
    if kind == "normal":
        x = rng.normal(10, 2, n)
    elif kind == "uniform":
        x = rng.uniform(0, 1, n)
    elif kind == "expo":
        x = rng.exponential(1.5, n)
    elif kind == "lognorm":
        x = rng.lognormal(0, 0.8, n)
    elif kind == "int":
        x = rng.integers(1, 6, n).astype(float)
    if dec is not None:
        x = np.round(x, dec)
    return x

# ---- special functions ----
sf = {"t_sf": [], "f_sf": [], "norm_ppf": [], "t_ppf": []}
for t, df in [(0.5, 3), (2.1, 7.5), (-1.3, 12), (4.2, 30), (8.0, 5), (1.96, 1000), (12, 40), (0.01, 2)]:
    sf["t_sf"].append([t, df, float(stats.t.sf(t, df))])
for f, d1, d2 in [(1.2, 1, 10), (4.5, 1, 46), (15.9467335677930, 1, 46), (3.0, 8, 171), (0.4, 2, 5), (50, 1, 3), (1e-3, 4, 9)]:
    sf["f_sf"].append([f, d1, d2, float(stats.f.sf(f, d1, d2))])
for p in [1e-10, 0.001, 0.025, 0.2, 0.5, 0.8, 0.975, 0.999999]:
    sf["norm_ppf"].append([p, float(stats.norm.ppf(p))])
for p, df in [(0.975, 5), (0.975, 23.4), (0.95, 2), (0.995, 100), (0.9, 1)]:
    sf["t_ppf"].append([p, df, float(stats.t.ppf(p, df))])

# ---- Shapiro-Wilk ----
sw = []
for n in [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 15, 20, 30, 50, 100, 500, 2000]:
    for kind in ["normal", "expo", "uniform"]:
        x = gen(kind, n, 3)
        if np.ptp(x) == 0:
            continue
        r = stats.shapiro(x)
        sw.append({"x": r6(x), "W": float(r.statistic), "p": float(r.pvalue)})

# ---- independent two-sample tests ----
ind = []
def ind_case(x, y, alt, delta0, label):
    x = np.asarray(x, float); y = np.asarray(y, float)
    xs = x - delta0
    tp = stats.ttest_ind(xs, y, equal_var=True, alternative=alt)
    tw = stats.ttest_ind(xs, y, equal_var=False, alternative=alt)
    cp = tp.confidence_interval(0.95); cw = tw.confidence_interval(0.95)
    mw = stats.mannwhitneyu(xs, y, alternative=alt)
    lev = stats.levene(x, y, center="median")
    an = stats.f_oneway(x, y)
    ind.append({"label": label, "x": r6(x), "y": r6(y), "alt": alt, "delta0": delta0,
                "pooled": {"t": float(tp.statistic), "df": float(tp.df), "p": float(tp.pvalue),
                           "ci": [float(cp.low) + delta0, float(cp.high) + delta0]},
                "welch": {"t": float(tw.statistic), "df": float(tw.df), "p": float(tw.pvalue),
                          "ci": [float(cw.low) + delta0, float(cw.high) + delta0]},
                "mwu": {"U": float(mw.statistic), "p": float(mw.pvalue)},
                "levene": {"W": float(lev.statistic), "p": float(lev.pvalue)},
                "anova": {"F": float(an.statistic), "p": float(an.pvalue)}})

for alt in ["two-sided", "greater", "less"]:
    ind_case(gen("normal", 12, 3), gen("normal", 15, 3) + 1.0, alt, 0, f"normal 12 vs 15 {alt}")
    ind_case(gen("normal", 6, 3), gen("normal", 5, 3), alt, 0, f"small exact MWU 6 vs 5 {alt}")
    ind_case(gen("int", 20), gen("int", 18), alt, 0, f"tied integers 20 vs 18 {alt}")
    ind_case(gen("expo", 40, 4), gen("lognorm", 35, 4), alt, 0, f"skewed 40 vs 35 {alt}")
    ind_case(gen("normal", 8, 3), gen("normal", 30, 3) * 3, alt, 0, f"unequal var exact MWU 8 vs 30 {alt}")
ind_case(gen("normal", 25, 3), gen("normal", 25, 3), "two-sided", 0.5, "delta0 = 0.5")
ind_case(gen("normal", 25, 3), gen("normal", 25, 3), "greater", -0.3, "delta0 = -0.3 greater")
ind_case(gen("int", 5), gen("int", 4), "two-sided", 0, "small with ties 5 vs 4")
ind_case(gen("normal", 200, 2), gen("normal", 180, 2) + 0.2, "two-sided", 0, "large 200 vs 180")

# ---- paired tests ----
par = []
def par_case(x, y, alt, delta0, label):
    x = np.asarray(x, float); y = np.asarray(y, float)
    tr = stats.ttest_rel(x - delta0, y, alternative=alt)
    ci = tr.confidence_interval(0.95)
    w = stats.wilcoxon(x - delta0, y, alternative=alt)
    d = x - y
    swd = stats.shapiro(d) if np.ptp(d) > 0 else None
    # randomized block ANOVA by hand
    n = len(x); M = np.vstack([x, y]).T
    gm = M.mean(); bm = M.mean(axis=1); tm = M.mean(axis=0)
    sst = ((M - gm) ** 2).sum(); ssb = 2 * ((bm - gm) ** 2).sum(); sstr = n * ((tm - gm) ** 2).sum()
    sse = sst - ssb - sstr
    Ft = (sstr / 1) / (sse / (n - 1))
    par.append({"label": label, "x": r6(x), "y": r6(y), "alt": alt, "delta0": delta0,
                "paired": {"t": float(tr.statistic), "df": float(tr.df), "p": float(tr.pvalue),
                           "ci": [float(ci.low) + delta0, float(ci.high) + delta0]},
                "wsr": {"W": float(w.statistic), "p": float(w.pvalue)},
                "sw_diff": None if swd is None else {"W": float(swd.statistic), "p": float(swd.pvalue)},
                "block": {"F": float(Ft), "p": float(stats.f.sf(Ft, 1, n - 1)), "ss_treat": float(sstr),
                          "ss_block": float(ssb), "ss_err": float(sse),
                          "t2_check": float(stats.ttest_rel(x, y).statistic ** 2)}})

for alt in ["two-sided", "greater", "less"]:
    base = gen("normal", 15, 3)
    par_case(base, base - rng.normal(0.4, 0.5, 15).round(3), alt, 0, f"exact WSR n=15 {alt}")
    base = gen("int", 12)
    par_case(base, base + rng.integers(-2, 3, 12), alt, 0, f"ties/zeros n=12 permutation {alt}")
    base = gen("int", 30)
    par_case(base, base + rng.integers(-3, 3, 30), alt, 0, f"ties n=30 asymptotic {alt}")
    base = gen("normal", 60, 3)
    par_case(base, base + rng.normal(0.1, 1, 60).round(3), alt, 0, f"n=60 asymptotic {alt}")
par_case(gen("normal", 20, 3), gen("normal", 20, 3), "two-sided", 0.25, "paired delta0 = 0.25")

# ---- quantiles / descriptives ----
q = []
for n in [3, 4, 7, 10, 25, 101]:
    x = gen("normal", n, 3)
    m = float(np.mean(x)); s = float(np.std(x, ddof=1))
    ci = stats.t.interval(0.95, n - 1, loc=m, scale=s / np.sqrt(n))
    q.append({"x": r6(x), "q1": float(np.percentile(x, 25)), "med": float(np.percentile(x, 50)),
              "q3": float(np.percentile(x, 75)), "mean": m, "sd": s, "ci": [float(ci[0]), float(ci[1])]})

# ---- NIST StRD ANOVA ----
nist = []
d = os.path.join(os.path.dirname(stats.__file__), "tests", "data", "nist_anova")
for path in sorted(glob.glob(os.path.join(d, "*.dat"))):
    lines = open(path).read().splitlines()
    name = os.path.basename(path)[:-4]
    cert = {}
    for ln in lines:
        m = re.match(r"\s*Between\s+\S+\s+(\d+)\s+(\S+)\s+(\S+)\s+(\S+)", ln)
        if m:
            cert.update(dfb=int(m.group(1)), ssb=float(m.group(2)), msb=float(m.group(3)), F=float(m.group(4)))
        m = re.match(r"\s*Within\s+\S+\s+(\d+)\s+(\S+)\s+(\S+)", ln)
        if m:
            cert.update(dfw=int(m.group(1)), ssw=float(m.group(2)), msw=float(m.group(3)))
        m = re.search(r"Certified R-Squared\s+(\S+)", ln)
        if m:
            cert["r2"] = float(m.group(1))
        m = re.search(r"Standard Deviation\s+(\S+)", ln)
        if m:
            cert["resid_sd"] = float(m.group(1))
    start = next(i for i, ln in enumerate(lines) if ln.strip().startswith("Data:") and "Data   " not in ln and len(ln.split()) >= 2 and not ln.strip().startswith("Data:          ") )
    # data block: header line "Data:  <factor> <response>" followed by pairs
    hdr = max(i for i, ln in enumerate(lines) if ln.strip().startswith("Data:"))
    groups = {}
    for ln in lines[hdr + 1:]:
        parts = ln.split()
        if len(parts) != 2:
            continue
        groups.setdefault(parts[0], []).append(parts[1])
    nist.append({"name": name, "groups": [groups[k] for k in sorted(groups, key=lambda s: float(s))], "cert": cert})

json.dump({"special": sf, "shapiro": sw, "independent": ind, "paired": par, "quantiles": q, "nist": nist},
          open(os.path.join(os.path.dirname(__file__), "ref.json"), "w"))
print("cases:", len(sw), len(ind), len(par), len(q), len(nist))
print("scipy", __import__("scipy").__version__, "numpy", np.__version__)

# ---- best achievable with double-precision inputs (exact rational arithmetic after float conversion) ----
from fractions import Fraction as Fr
ref = json.load(open(os.path.join(os.path.dirname(__file__), "ref.json")))
for n in ref["nist"]:
    G = [[Fr(float(v)) for v in grp] for grp in n["groups"]]
    N = sum(len(x) for x in G); k = len(G)
    gm = sum(sum(x) for x in G) / N
    means = [sum(x) / len(x) for x in G]
    ssb = sum(len(x) * (m - gm) ** 2 for x, m in zip(G, means))
    ssw = sum(sum((v - m) ** 2 for v in x) for x, m in zip(G, means))
    msb = ssb / (k - 1); msw = ssw / (N - k)
    n["exact_double"] = {"ssb": float(ssb), "ssw": float(ssw), "msb": float(msb), "msw": float(msw),
                         "F": float(msb / msw), "r2": float(ssb / (ssb + ssw)), "resid_sd": math.sqrt(float(msw))}
json.dump(ref, open(os.path.join(os.path.dirname(__file__), "ref.json"), "w"))
print("exact-double limits added")
