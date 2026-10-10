"""References for binomial CDF, beta quantiles, confidence/reliability sample sizes and plan points (SciPy)."""
import json, os
from scipy import stats
here = os.path.dirname(__file__)
ref = json.load(open(os.path.join(here, "ref.json")))
bc = [{"k":k,"n":n,"p":p,"cdf":float(stats.binom.cdf(k,n,p))} for k,n,p in [(0,29,0.1),(1,46,0.1),(2,13,0.05),(5,80,0.025),(0,299,0.01),(10,200,0.08),(3,32,0.15),(0,8,0.0065)]]
bp = [{"q":q,"a":a,"b":b,"ppf":float(stats.beta.ppf(q,a,b))} for q,a,b in [(0.95,1,59),(0.9,2,45),(0.05,1,8),(0.5,3,30),(0.99,1,299),(0.95,4,120)]]
def ss(C,R,c):
    n=c+1
    while stats.binom.cdf(c,n,1-R) > 1-C: n+=1
    return n
cr = [{"C":C,"R":R,"c":c,"n":ss(C,R,c)} for C in [0.90,0.95,0.99] for R in [0.90,0.95,0.99] for c in [0,1,2]]
dr = [{"n":n,"x":x,"C":C,"rel":float(1-stats.beta.ppf(C,x+1,n-x))} for n,x,C in [(59,0,0.95),(30,0,0.95),(30,1,0.95),(100,2,0.90),(13,0,0.99),(50,3,0.95)]]
pl = []
for n,ac in [(8,0),(13,0),(20,1),(32,1),(50,2),(80,3),(125,5)]:
    pl.append({"n":n,"ac":ac,"p95":float(stats.beta.ppf(0.05,ac+1,n-ac)),"p50":float(stats.beta.ppf(0.5,ac+1,n-ac)),"p10":float(stats.beta.ppf(0.9,ac+1,n-ac)),
               "pa_at":[[p,float(stats.binom.cdf(ac,n,p))] for p in (0.01,0.015,0.04,0.1)]})
ref.update({"binom":bc,"betappf":bp,"cr":cr,"demorel":dr,"plans":pl})
json.dump(ref, open(os.path.join(here,"ref.json"),"w"))
print(len(bc),len(bp),len(cr),len(dr),len(pl))
