"""Reference values for the Taguchi engine (taguchi.js), computed independently with NumPy / SciPy.
Writes ref["tg"] into ref.json."""
import json, os, itertools
import numpy as np
from scipy import stats

here = os.path.dirname(os.path.abspath(__file__))
ref = json.load(open(os.path.join(here, "ref.json")))
rng = np.random.default_rng(20261009)

# ---- arrays (independent construction) ----
def two_level(n):
    # columns in Taguchi order: A, B, AB, C, AC, BC, ABC ...
    basics = [1 << (n - 1 - e) for e in range(n)]
    masks = []
    for b in basics:
        prev = list(masks); masks.append(b); masks += [m ^ b for m in prev]
    runs = 2 ** n
    return np.array([[1 + (bin(i & m).count("1") % 2) for m in masks] for i in range(runs)])
L9 = np.array([[a + 1, b + 1, (a + b) % 3 + 1, (2 * a + b) % 3 + 1] for a in range(3) for b in range(3)])
L18 = np.array([[int(c) for c in r] for r in ["11111111", "11222222", "11333333", "12112233", "12223311", "12331122", "13121323", "13232131", "13313212",
    "21133221", "21211332", "21322113", "22123132", "22231213", "22312321", "23132312", "23213123", "23321231"]])
g = [1, 1, -1, 1, 1, 1, -1, -1, -1, 1, -1]
PB = np.array([[g[(j - i) % 11] for j in range(11)] for i in range(11)] + [[-1] * 11]); L12 = np.where(PB > 0, 2, 1)
ARR = {"L4": two_level(2), "L8": two_level(3), "L9": L9, "L12": L12, "L16": two_level(4), "L18": L18}

def sn_static(y, t):
    y = np.asarray(y, float)
    if t == "smaller": return -10 * np.log10(np.mean(y ** 2))
    if t == "larger": return -10 * np.log10(np.mean(1 / y ** 2))
    s2 = np.var(y, ddof=1)
    if t == "nominal": return 10 * np.log10(np.mean(y) ** 2 / s2)
    return -10 * np.log10(s2)

def sn_dyn(M, Y, formula):
    x = np.repeat(np.asarray(M, float), [len(r) for r in Y]); y = np.concatenate([np.asarray(r, float) for r in Y])
    beta = np.linalg.lstsq(x[:, None], y, rcond=None)[0][0]
    r = np.sum(x * x); Sb = (np.sum(x * y)) ** 2 / r; Ve = np.sum((y - beta * x) ** 2) / (len(y) - 1)
    sn = 10 * np.log10(beta ** 2 / Ve) if formula == "simple" else 10 * np.log10(((Sb - Ve) / r) / Ve)
    return dict(beta=beta, Ve=Ve, sn=sn, r=r)

def anova(arr, cols, levels, inter, resp, pool):
    M = ARR[arr]; N = len(resp); resp = np.asarray(resp, float); T = resp.mean(); SST = np.sum((resp - T) ** 2)
    terms = []
    for f, (c, L) in enumerate(zip(cols, levels)):
        means = [resp[M[:, c] == l].mean() for l in range(1, L + 1)]
        terms.append(dict(df=L - 1, ss=sum(N / L * (m - T) ** 2 for m in means), means=means))
    for (a, b, c) in inter:
        means = [resp[M[:, c] == l].mean() for l in (1, 2)]
        cell = [[resp[(M[:, cols[a]] == la) & (M[:, cols[b]] == lb)].mean() for lb in (1, 2)] for la in (1, 2)]
        terms.append(dict(df=1, ss=sum(N / 2 * (m - T) ** 2 for m in means), cell=cell, a=a, b=b))
    dfT = N - 1; dfterms = sum(t["df"] for t in terms)
    rdf = dfT - dfterms; rss = max(0.0, SST - sum(t["ss"] for t in terms))
    if pool == "auto":
        pool = []
        if rdf < 1:
            d = 0
            for i in sorted(range(len(terms)), key=lambda i: terms[i]["ss"] / terms[i]["df"]):
                if d >= dfterms / 2: break
                pool.append(i); d += terms[i]["df"]
    eSS = rss + sum(terms[i]["ss"] for i in pool); eDf = rdf + sum(terms[i]["df"] for i in pool); Ve = eSS / eDf
    out = []
    for i, t in enumerate(terms):
        o = dict(ss=t["ss"], df=t["df"], means=t.get("means"))
        if i not in pool:
            F = (t["ss"] / t["df"]) / Ve
            o.update(F=F, p=stats.f.sf(F, t["df"], eDf), rho=100 * (t["ss"] - t["df"] * Ve) / SST)
        out.append(o)
    # prediction at best S/N combination for factors (exhaustive), with interactions
    def pred(lv):
        p = T; dfu = 0
        for i, t in enumerate(terms):
            if i in pool: continue
            dfu += t["df"]
            if "means" in t: p += t["means"][lv[i] - 1] - T
            else:
                a, b = t["a"], t["b"]
                p += t["cell"][lv[a] - 1][lv[b] - 1] - terms[a]["means"][lv[a] - 1] - terms[b]["means"][lv[b] - 1] + T
        return p, dfu
    best = max(itertools.product(*[range(1, L + 1) for L in levels]), key=lambda lv: (round(pred(lv)[0], 9), [-x for x in lv]))
    pv, dfu = pred(best); neff = N / (1 + dfu); Fc = stats.f.isf(0.05, 1, eDf)
    return dict(T=T, SST=SST, Ve=Ve, eDf=eDf, eSS=eSS, pool=sorted(pool), terms=out, bestPred=pv, neff=neff, Fcrit=Fc,
                ci1=np.sqrt(Fc * Ve / neff), ci2=np.sqrt(Fc * Ve * (1 / neff + 1 / 1)))

tg = {"static": [], "dynamic": [], "anova": []}
for t in ["smaller", "larger", "nominal", "nominalVar"]:
    for n in (2, 3, 5):
        y = (rng.normal(20, 3, n)).round(3).tolist()
        tg["static"].append(dict(type=t, y=y, sn=sn_static(y, t)))
for formula in ("std", "simple"):
    for k in (2, 3, 4):
        M = sorted(rng.uniform(1, 10, k).round(2).tolist())
        Y = [[m * 2.3 + rng.normal(0, 0.4) for _ in range(2)] for m in M]
        tg["dynamic"].append(dict(M=M, Y=Y, formula=formula, **sn_dyn(M, Y, formula)))
cases = [
    ("L8", [0, 1, 3, 5], [2, 2, 2, 2], [(0, 1, 2), (0, 2, 4)], "auto"),
    ("L8", [0, 1, 3], [2, 2, 2], [], [2]),
    ("L9", [0, 1, 2, 3], [3, 3, 3, 3], [], "auto"),
    ("L12", list(range(7)), [2] * 7, [], "auto"),
    ("L16", [0, 1, 3, 7, 14], [2] * 5, [(0, 1, 2), (1, 2, 5)], "auto"),
    ("L18", [0, 1, 2, 3, 4, 5], [2, 3, 3, 3, 3, 3], [], "auto"),
    ("L18", list(range(8)), [2] + [3] * 7, [], [1, 4, 6, 7]),
]
for arr, cols, levels, inter, pool in cases:
    N = len(ARR[arr]); resp = (rng.normal(30, 4, N) + 3 * (ARR[arr][:, cols[0]] - 1.5)).round(4).tolist()
    r = anova(arr, cols, levels, inter, resp, pool)
    tg["anova"].append(dict(array=arr, cols=cols, levels=levels, inter=[dict(a=a, b=b, col=c) for a, b, c in inter], resp=resp, poolIn=pool, **r))
ref["tg"] = tg
json.dump(ref, open(os.path.join(here, "ref.json"), "w"), default=float)
print("tg cases", {k: len(v) for k, v in tg.items()}, tg["anova"][0]["pool"], tg["anova"][2]["pool"])
