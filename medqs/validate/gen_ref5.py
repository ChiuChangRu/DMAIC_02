"""References for the quality tools (SPC, MSA, DOE, mixture) — independent implementations
with SciPy / statsmodels / scikit-learn. Writes ref["q"] into ref.json."""
import json, os, itertools
import numpy as np
from scipy import stats, integrate, special
import pandas as pd
import statsmodels.formula.api as smf
import statsmodels.api as sm
from statsmodels.stats.anova import anova_lm
from statsmodels.stats.inter_rater import fleiss_kappa, aggregate_raters
from sklearn.metrics import cohen_kappa_score

here = os.path.dirname(__file__)
ref = json.load(open(os.path.join(here, "ref.json")))
rng = np.random.default_rng(20261009)
q = {}

# ---------- SPC constants (numerical integration with SciPy quad / dblquad) ----------
def d2(n):
    f = lambda x: 1 - stats.norm.cdf(x) ** n - stats.norm.sf(x) ** n
    return integrate.quad(f, -np.inf, np.inf, epsabs=1e-13, epsrel=1e-13, limit=200)[0]
def d3(n):
    F = stats.norm.cdf
    g = lambda x, y: 1 - F(y) ** n - (1 - F(x)) ** n + (F(y) - F(x)) ** n   # inner x from -8..y
    er2 = 2 * integrate.dblquad(lambda x, y: g(x, y), -8, 8, lambda y: -8, lambda y: y, epsabs=1e-11, epsrel=1e-11)[0]
    return float(np.sqrt(er2 - d2(n) ** 2))
def c4(n): return float(np.sqrt(2 / (n - 1)) * special.gamma(n / 2) / special.gamma((n - 1) / 2))
consts = []
for n in [2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25]:
    consts.append({"n": n, "d2": d2(n), "d3": d3(n), "c4": c4(n)})
q["consts"] = consts
KC = {c["n"]: c for c in consts}

def lim_xbarr(groups):
    n = len(groups[0]); xb = groups.mean(axis=1); R = groups.max(axis=1) - groups.min(axis=1)
    X, Rb = xb.mean(), R.mean(); dd2, dd3 = KC[n]["d2"], KC[n]["d3"]
    A2 = 3 / (dd2 * np.sqrt(n)); D3 = max(0, 1 - 3 * dd3 / dd2); D4 = 1 + 3 * dd3 / dd2
    return {"x_cl": X, "x_ucl": X + A2 * Rb, "x_lcl": X - A2 * Rb, "r_cl": Rb, "r_ucl": D4 * Rb, "r_lcl": D3 * Rb, "sigma": Rb / dd2}
def lim_xbars(groups):
    n = len(groups[0]); xb = groups.mean(axis=1); S = groups.std(axis=1, ddof=1)
    X, Sb = xb.mean(), S.mean(); cc = KC[n]["c4"]; A3 = 3 / (cc * np.sqrt(n)); w = 3 * np.sqrt(1 - cc * cc) / cc
    return {"x_cl": X, "x_ucl": X + A3 * Sb, "x_lcl": X - A3 * Sb, "r_cl": Sb, "r_ucl": (1 + w) * Sb, "r_lcl": max(0, 1 - w) * Sb, "sigma": Sb / cc}
def lim_imr(x):
    MR = np.abs(np.diff(x)); s = MR.mean() / KC[2]["d2"]; D4 = 1 + 3 * KC[2]["d3"] / KC[2]["d2"]
    return {"x_cl": x.mean(), "x_ucl": x.mean() + 3 * s, "x_lcl": x.mean() - 3 * s, "r_cl": MR.mean(), "r_ucl": D4 * MR.mean(), "r_lcl": 0.0, "sigma": s}
spc = []
g5 = np.round(rng.normal(25, 0.2, (25, 5)), 3); spc.append({"type": "xbarr", "rows": g5.tolist(), **lim_xbarr(g5)})
g3 = np.round(rng.normal(10, 0.05, (20, 3)), 3); spc.append({"type": "xbarr", "rows": g3.tolist(), **lim_xbarr(g3)})
g12 = np.round(rng.normal(50, 1.5, (20, 12)), 2); spc.append({"type": "xbars", "rows": g12.tolist(), **lim_xbars(g12)})
x1 = np.round(rng.normal(3.2, 0.1, 30), 3); spc.append({"type": "imr", "rows": [[v] for v in x1.tolist()], **lim_imr(x1)})
# attribute charts
nn = rng.integers(80, 160, 20); dd = rng.binomial(nn, 0.05)
pb = dd.sum() / nn.sum()
spc.append({"type": "p", "rows": [[int(a), int(b)] for a, b in zip(dd, nn)], "x_cl": pb, "ucl_list": (pb + 3 * np.sqrt(pb * (1 - pb) / nn)).tolist(), "lcl_list": np.maximum(0, pb - 3 * np.sqrt(pb * (1 - pb) / nn)).tolist()})
d2_ = rng.binomial(100, 0.04, 25); pb2 = d2_.mean() / 100; c_ = 100 * pb2
spc.append({"type": "np", "rows": [[int(a), 100] for a in d2_], "x_cl": c_, "x_ucl": c_ + 3 * np.sqrt(c_ * (1 - pb2)), "x_lcl": max(0, c_ - 3 * np.sqrt(c_ * (1 - pb2)))})
cc_ = rng.poisson(6, 25); cb = cc_.mean()
spc.append({"type": "c", "rows": [[int(a)] for a in cc_], "x_cl": cb, "x_ucl": cb + 3 * np.sqrt(cb), "x_lcl": max(0, cb - 3 * np.sqrt(cb))})
un = rng.integers(2, 6, 20); uc = rng.poisson(3 * un); ub = uc.sum() / un.sum()
spc.append({"type": "u", "rows": [[int(a), int(b)] for a, b in zip(uc, un)], "x_cl": ub, "ucl_list": (ub + 3 * np.sqrt(ub / un)).tolist(), "lcl_list": np.maximum(0, ub - 3 * np.sqrt(ub / un)).tolist()})
q["spc"] = spc

# capability (independent formulas)
cap = []
for vals, sw, lsl, usl, tgt in [(g5.flatten(), spc[0]["sigma"], 24.4, 25.6, 25.0), (x1, spc[3]["sigma"], None, 3.5, None), (g12.flatten(), spc[2]["sigma"], 45.0, None, None), (g5.flatten(), spc[0]["sigma"], 24.4, 25.6, 25.2)]:
    m = vals.mean(); so = vals.std(ddof=1); o = {"values": vals.tolist(), "sw": sw, "lsl": lsl, "usl": usl, "target": tgt, "mean": m, "sdOverall": so}
    def cc(s):
        r = {}
        if usl is not None: r["u"] = (usl - m) / (3 * s)
        if lsl is not None: r["l"] = (m - lsl) / (3 * s)
        if usl is not None and lsl is not None: r["p"] = (usl - lsl) / (6 * s)
        r["k"] = min(r.get("u", np.inf), r.get("l", np.inf))
        r["ppm"] = 1e6 * ((stats.norm.sf((usl - m) / s) if usl is not None else 0) + (stats.norm.cdf((lsl - m) / s) if lsl is not None else 0))
        return r
    w, ov = cc(sw), cc(so)
    o.update({"Cpk": w["k"], "Ppk": ov["k"], "ppmWithin": w["ppm"], "ppmOverall": ov["ppm"]})
    if "p" in w: o.update({"Cp": w["p"], "Pp": ov["p"]})
    if tgt is not None:
        tau = np.sqrt(np.sum((vals - tgt) ** 2) / (len(vals) - 1))   # Minitab convention
        o["Cpm"] = (usl - lsl) / (6 * tau) if abs(tgt - (usl + lsl) / 2) < 1e-12 else min(tgt - lsl, usl - tgt) / (3 * tau)
    cap.append(o)
q["cap"] = cap

# ---------- MSA: Gage R&R (statsmodels two-way ANOVA with interaction) ----------
def grr_ref(arr, alpha=0.05, ksv=6, tol=None):
    k, n, r = arr.shape
    rows = [{"o": i, "p": j, "y": arr[i, j, t]} for i in range(k) for j in range(n) for t in range(r)]
    df = pd.DataFrame(rows)
    fit = smf.ols("y ~ C(o) * C(p)", data=df).fit()
    a = anova_lm(fit, typ=2)
    SSo, SSp, SSi, SSe = a.loc["C(o)", "sum_sq"], a.loc["C(p)", "sum_sq"], a.loc["C(o):C(p)", "sum_sq"], a.loc["Residual", "sum_sq"]
    dfo, dfp, dfi, dfe = k - 1, n - 1, (k - 1) * (n - 1), k * n * (r - 1)
    MSo, MSp, MSi, MSe = SSo / dfo, SSp / dfp, SSi / dfi, SSe / dfe
    Pi = stats.f.sf(MSi / MSe, dfi, dfe)
    out = {"data": arr.tolist(), "SSo": SSo, "SSp": SSp, "SSi": SSi, "SSe": SSe, "Pi": Pi, "Fi": MSi / MSe}
    if Pi <= alpha:
        rep, op, opp, part = MSe, max(0, (MSo - MSi) / (n * r)), max(0, (MSi - MSe) / r), max(0, (MSp - MSi) / (k * r))
        out.update({"Fo": MSo / MSi, "Po": stats.f.sf(MSo / MSi, dfo, dfi), "Fp": MSp / MSi, "Pp": stats.f.sf(MSp / MSi, dfp, dfi), "removed": False})
    else:
        MSpool = (SSi + SSe) / (dfi + dfe)
        rep, op, opp, part = MSpool, max(0, (MSo - MSpool) / (n * r)), 0.0, max(0, (MSp - MSpool) / (k * r))
        out.update({"Fo": MSo / MSpool, "Po": stats.f.sf(MSo / MSpool, dfo, dfi + dfe), "Fp": MSp / MSpool, "Pp": stats.f.sf(MSp / MSpool, dfp, dfi + dfe), "removed": True})
    grr = rep + op + opp; tot = grr + part
    out.update({"var_grr": grr, "var_part": part, "var_rep": rep, "pctContribGRR": 100 * grr / tot, "pctSVGRR": 100 * np.sqrt(grr / tot),
                "ndc": int(np.floor(np.sqrt(2) * np.sqrt(part) / np.sqrt(grr))), "tol": tol, "pctTolGRR": (100 * ksv * np.sqrt(grr) / tol) if tol else None})
    return out
ex = np.array([[2.7,2.5],[5.1,4.8],[5.8,5.7],[4.0,4.2],[3.8,3.1],[2.6,2.4],[2.6,2.7],[7.6,7.8],[4.6,4.7],[3.4,3.2],
               [2.8,3.1],[5.3,5.0],[5.5,5.7],[4.1,3.8],[3.6,3.4],[2.5,2.4],[2.9,2.4],[7.4,7.9],[4.7,4.8],[3.1,3.4],
               [2.8,2.4],[5.0,4.9],[5.8,5.5],[3.8,4.0],[3.6,3.3],[2.4,2.1],[2.7,2.5],[7.5,7.7],[4.6,4.5],[3.3,3.2]]).reshape(3, 10, 2)
part_true = rng.normal(10, 0.8, 10); op_bias = np.array([0, 0.15, -0.1]); inter = rng.normal(0, 0.12, (3, 10))
sim = np.round(part_true[None, :, None] + op_bias[:, None, None] + inter[:, :, None] + rng.normal(0, 0.08, (3, 10, 3)), 3)
sim2 = np.round(part_true[None, :8, None] + rng.normal(0, 0.1, (2, 8, 3)), 3)
q["grr"] = [grr_ref(ex, tol=8.0), grr_ref(sim, tol=5.0), grr_ref(sim2)]

# bias (scipy) and linearity (statsmodels OLS)
bv = np.round(rng.normal(10.05, 0.12, 15), 3)
tt = stats.ttest_1samp(bv, 10.0)
q["bias"] = [{"x": bv.tolist(), "ref": 10.0, "bias": bv.mean() - 10.0, "t": tt.statistic, "p": tt.pvalue}]
lin_rows = []
for refv in [2, 4, 6, 8, 10]:
    lin_rows.append({"ref": refv, "values": np.round(refv + 0.02 * refv - 0.05 + rng.normal(0, 0.05, 6), 3).tolist()})
X, Y = [], []
for rr in lin_rows:
    for v in rr["values"]: X.append(rr["ref"]); Y.append(v - rr["ref"])
ols = sm.OLS(np.array(Y), sm.add_constant(np.array(X, float))).fit()
q["lin"] = [{"rows": lin_rows, "intercept": ols.params[0], "slope": ols.params[1], "pIntercept": ols.pvalues[0], "pSlope": ols.pvalues[1], "r2": ols.rsquared, "s": float(np.sqrt(ols.mse_resid))}]

# attribute agreement: Cohen (sklearn) and Fleiss (statsmodels)
S, A, T = 30, 3, 2
std = rng.choice(["G", "NG"], S, p=[0.6, 0.4])
rat = []
for s in range(S):
    row = []
    for a in range(A):
        row.append([std[s] if rng.random() > 0.12 + 0.05 * a else ("NG" if std[s] == "G" else "G") for _ in range(T)])
    rat.append(row)
ag = {"ratings": rat, "standard": std.tolist(), "vsStd": [], "within": []}
for a in range(A):
    xa = [v for s in range(S) for v in rat[s][a]]; xs = [std[s] for s in range(S) for _ in range(T)]
    ag["vsStd"].append(cohen_kappa_score(xa, xs))
    tab, _ = aggregate_raters(np.array([[1 if v == "G" else 0 for v in rat[s][a]] for s in range(S)]))
    ag["within"].append(fleiss_kappa(tab, method="fleiss"))
allr = np.array([[1 if v == "G" else 0 for a in range(A) for v in rat[s][a]] for s in range(S)])
tab, _ = aggregate_raters(allr); ag["between"] = fleiss_kappa(tab, method="fleiss")
xa = [v for s in range(S) for a in range(A) for v in rat[s][a]]; xs = [std[s] for s in range(S) for _ in range(A * T)]
ag["allStd"] = cohen_kappa_score(xa, xs)
q["attr"] = ag

# ---------- DOE (statsmodels OLS on coded columns) ----------
L = "ABCDEFGHJ"
def full(k): return np.array([[1 if (i >> j) & 1 else -1 for j in range(k)] for i in range(2 ** k)])
def frac(k, p, gens):
    base = full(k - p); cols = [base[:, j] for j in range(k - p)]
    for g in gens: cols.append(np.prod([base[:, L.index(c)] for c in g], axis=0))
    return np.column_stack(cols)
def pb12(k):
    g = np.array([1, 1, -1, 1, 1, 1, -1, -1, -1, 1, -1]); M = [np.roll(g, i) for i in range(11)] + [-np.ones(11, int)]
    return np.array(M)[:, :k]
def terms(k, maxo):
    out = []
    for o in range(1, maxo + 1): out += list(itertools.combinations(range(k), o))
    return out
def doe_ref(M, y, maxo):
    runs, k = M.shape; r = y.shape[1]
    groups = []
    for t in terms(k, maxo):
        col = np.prod(M[:, list(t)], axis=1)
        if any((np.array_equal(col, g[1]) or np.array_equal(col, -g[1])) for g in groups): continue
        if np.all(col == col[0]): continue
        groups.append(("".join(L[j] for j in t), col))
    groups = groups[: runs - 1]
    Xc = np.repeat(np.column_stack([g[1] for g in groups]), r, axis=0).astype(float)
    yy = y.reshape(-1)
    out = {"matrix": M.tolist(), "y": y.tolist(), "names": [g[0] for g in groups]}
    if r > 1:
        fit = sm.OLS(yy, sm.add_constant(Xc)).fit()
        N = len(yy); coefs = fit.params[1:]
        out["coef"] = coefs.tolist(); out["effect"] = (2 * coefs).tolist()
        out["p"] = fit.pvalues[1:].tolist(); out["ss"] = (N * coefs ** 2).tolist()
        out["mse"] = fit.mse_resid; out["df"] = int(fit.df_resid)
    else:
        coefs = np.linalg.lstsq(sm.add_constant(Xc), yy, rcond=None)[0][1:]
        eff = 2 * coefs; c = np.abs(eff); s0 = 1.5 * np.median(c); trimmed = c[c < 2.5 * s0]
        pse = 1.5 * np.median(trimmed if len(trimmed) else c); dfl = len(eff) / 3
        out.update({"effect": eff.tolist(), "pse": pse, "p": (2 * stats.t.sf(np.abs(eff / pse), dfl)).tolist()})
    return out
doe = []
M3 = full(3); y3 = np.round(60 + (M3 @ np.array([3.0, 2.0, 5.0]) - 4 * M3[:, 0] * M3[:, 2])[:, None] + rng.normal(0, 1.2, (8, 2)), 2)
doe.append({"kind": "full", "k": 3, **doe_ref(M3, y3, 3)})
M4 = full(4); y4 = np.round(40 + (M4 @ np.array([4.0, 0.5, 3.0, 0.2]) + 2.5 * M4[:, 0] * M4[:, 2])[:, None] + rng.normal(0, 0.8, (16, 1)), 2)
doe.append({"kind": "full", "k": 4, **doe_ref(M4, y4, 4)})
M52 = frac(5, 2, ["AB", "AC"]); y52 = np.round(20 + (M52 @ np.array([2.0, -1.5, 0.3, 1.0, 0.0]))[:, None] + rng.normal(0, 0.5, (8, 2)), 2)
doe.append({"kind": "frac", "key": "5-2", **doe_ref(M52, y52, 2)})
M63 = frac(6, 2, ["ABC", "BCD"]); y63 = np.round(5 + (M63 @ np.array([1.0, 0.2, -0.8, 0.0, 0.5, 0.1]))[:, None] + rng.normal(0, 0.3, (16, 2)), 2)
doe.append({"kind": "frac", "key": "6-2", **doe_ref(M63, y63, 2)})
Mpb = pb12(7); ypb = np.round(100 + (Mpb @ np.array([5.0, 0.0, -3.0, 0.5, 0.0, 2.0, 0.0]))[:, None] + rng.normal(0, 1.0, (12, 2)), 2)
doe.append({"kind": "pb", "k": 7, **doe_ref(Mpb, ypb, 1)})
q["doe"] = doe

# ---------- mixture (statsmodels OLS without constant) ----------
def lattice(qn, m):
    pts = [p for p in itertools.product(range(m + 1), repeat=qn) if sum(p) == m]
    return [list(np.array(p) / m) for p in pts]
mix = []
for qn, design, model in [(3, "lattice2+centroid", "quadratic"), (3, "lattice3", "cubic"), (4, "lattice2", "quadratic")]:
    pts = lattice(qn, 3 if design == "lattice3" else 2)
    if design == "lattice2+centroid": pts = pts + [[1 / 3] * 3, [2 / 3, 1 / 6, 1 / 6], [1 / 6, 2 / 3, 1 / 6], [1 / 6, 1 / 6, 2 / 3]]
    if qn == 4: pts = pts + [[0.25] * 4, [0.625, 0.125, 0.125, 0.125], [0.125, 0.625, 0.125, 0.125], [0.125, 0.125, 0.625, 0.125], [0.125, 0.125, 0.125, 0.625]]
    P = np.array(pts)
    tm = [(i,) for i in range(qn)] + [c for c in itertools.combinations(range(qn), 2)]
    if model == "cubic": tm += list(itertools.combinations(range(qn), 3))
    X = np.column_stack([np.prod(P[:, list(t)], axis=1) for t in tm])
    beta = rng.normal(10, 3, len(tm)); y = np.round(X @ beta + rng.normal(0, 0.4, len(P)), 3)
    fit = sm.OLS(y, X).fit(); sst = ((y - y.mean()) ** 2).sum()
    mix.append({"points": P.tolist(), "y": y.tolist(), "model": model, "coef": fit.params.tolist(), "se": fit.bse.tolist(), "p": fit.pvalues.tolist(),
                "sse": fit.ssr, "R2": 1 - fit.ssr / sst, "R2adj": 1 - (fit.ssr / fit.df_resid) / (sst / (len(y) - 1)),
                "F": ((sst - fit.ssr) / (len(tm) - 1)) / (fit.ssr / fit.df_resid), "Fp": stats.f.sf(((sst - fit.ssr) / (len(tm) - 1)) / (fit.ssr / fit.df_resid), len(tm) - 1, fit.df_resid)})
q["mix"] = mix

ref["q"] = q
json.dump(ref, open(os.path.join(here, "ref.json"), "w"), default=float)
print("consts", len(consts), "spc", len(spc), "cap", len(cap), "grr", len(q["grr"]), "doe", len(doe), "mix", len(mix))
for c in consts[:3]: print(c)
print("grr ex", q["grr"][0]["Pi"], q["grr"][0]["removed"], q["grr"][0]["pctSVGRR"], q["grr"][0]["ndc"])
