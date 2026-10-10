"""References for noncentral t, t-test power / sample size, and normal tolerance factors."""
import json, os, math, warnings
import numpy as np
from scipy import stats, integrate, optimize
from statsmodels.stats.power import TTestPower, TTestIndPower
warnings.filterwarnings("ignore")
here = os.path.dirname(__file__)
ref = json.load(open(os.path.join(here, "ref.json")))

nct = []
for t, df, d in [(2.5,10,1.5),(-1,5,0.8),(3,30,4),(0.2,3,-1.2),(5,8,6),(-2,50,-3),(1.0,200,1.0),(10,12,8),(0.0,7,2.5),(4.1,19,2.0),(-0.5,2,0.3),(6,60,5.5)]:
    nct.append({"t":t,"df":df,"d":d,"cdf":float(stats.nct.cdf(t,df,d))})
nctp = []
for q, df, d in [(0.95,9,2.0),(0.99,19,3.3),(0.9,4,1.0),(0.05,15,-1.5),(0.5,30,0.7),(0.975,99,5.0)]:
    nctp.append({"q":q,"df":df,"d":d,"ppf":float(stats.nct.ppf(q,df,d))})

pw = []
alts = {"two-sided":"two-sided","greater":"larger","less":"smaller"}
for design in ["one","two"]:
    P = TTestPower() if design=="one" else TTestIndPower()
    for n, es, a, alt in [(10,0.8,0.05,"two-sided"),(20,0.5,0.05,"two-sided"),(15,0.6,0.01,"greater"),(30,-0.4,0.05,"less"),(8,1.2,0.10,"two-sided"),(50,0.3,0.05,"greater"),(5,2.0,0.05,"two-sided")]:
        powv = P.power(es, n, a, alternative=alts[alt])
        pw.append({"design":design,"n":n,"es":es,"alpha":a,"alt":alt,"power":float(powv)})
ss = []
for design in ["one","two"]:
    P = TTestPower() if design=="one" else TTestIndPower()
    for es, a, alt, target in [(0.5,0.05,"two-sided",0.8),(0.5,0.05,"two-sided",0.9),(1.0,0.05,"greater",0.8),(0.3,0.01,"two-sided",0.9),(0.8,0.05,"two-sided",0.95),(1.5,0.10,"greater",0.8)]:
        nreal = P.solve_power(es, None, a, target, alternative=alts[alt])
        n = int(math.ceil(nreal - 1e-9))
        # statsmodels n may fall below 2; floor at 2
        n = max(n, 2)
        def spow(e):
            df = n - 1 if design == "one" else 2 * n - 2
            nc = e * math.sqrt(n) if design == "one" else e * math.sqrt(n / 2)
            if alt == "two-sided":
                c = stats.t.ppf(1 - a / 2, df); lo = stats.nct.cdf(-c, df, nc); return stats.nct.sf(c, df, nc) + (0.0 if lo != lo else lo)
            c = stats.t.ppf(1 - a, df); return stats.nct.sf(c, df, nc)
        det = optimize.brentq(lambda e: spow(e) - target, 1e-6, 3 * abs(es) + 2, xtol=1e-15, rtol=1e-15)
        ss.append({"design":design,"es":es,"alpha":a,"alt":alt,"target":target,"n":n,"nreal":float(nreal),"detect_at_n":float(abs(det))})

def k1(n,p,g): return stats.nct.ppf(g, n-1, stats.norm.ppf(p)*math.sqrt(n))/math.sqrt(n)
def k2(n,p,g):
    nu=n-1
    def conf(k):
        f=lambda x: stats.chi2.sf(nu*stats.ncx2.ppf(p,1,x*x)/(k*k), nu)*math.exp(-n*x*x/2)
        v,_=integrate.quad(f,0,np.inf,limit=200,epsabs=1e-13,epsrel=1e-12)
        return math.sqrt(2*n/math.pi)*v
    return optimize.brentq(lambda k: conf(k)-g, 0.5, 50, xtol=1e-12)
tol = []
for n in [3,5,10,20,30,59,100]:
    for p, g in [(0.90,0.95),(0.95,0.95),(0.99,0.95),(0.99,0.99)]:
        tol.append({"n":n,"p":p,"g":g,"k1":float(k1(n,p,g)),"k2":float(k2(n,p,g))})
ref.update({"nct":nct,"nctppf":nctp,"power":pw,"ssize":ss,"tol":tol})
json.dump(ref, open(os.path.join(here,"ref.json"),"w"))
print(len(nct),len(nctp),len(pw),len(ss),len(tol))
print([ (t["n"],t["p"],t["g"],round(t["k1"],4),round(t["k2"],4)) for t in tol if t["n"]==10])
