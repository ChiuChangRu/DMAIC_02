import re
t = open("template_head.html", encoding="utf8").read() + open("template_body.html", encoding="utf8").read()
stats = open("stats.js", encoding="utf8").read()
val = open("validate/validate_core.js", encoding="utf8").read()
ref = open("validate/ref.json", encoding="utf8").read()
REPORT = "https://claude.ai/code/artifact/9561812d-dd10-4b1d-8513-64ea019e4832"
assert "</script" not in ref and "</script" not in stats and "</script" not in val
out = t.replace("__REF_JSON__", ref).replace("/*__STATS_JS__*/", stats).replace("/*__QUALITY_JS__*/", open("quality.js", encoding="utf8").read()).replace("/*__TAGUCHI_JS__*/", open("taguchi.js", encoding="utf8").read()).replace("/*__SAMPLE_JS__*/", open("sample.js", encoding="utf8").read() + "\n" + open("regress.js", encoding="utf8").read()).replace("/*__VALIDATE_JS__*/", val).replace("__REPORT_URL__", REPORT).replace("/*__FISHBONE_JS__*/", open("fishbone.js", encoding="utf8").read() + open("aistyle.js", encoding="utf8").read() + open("nyquist.js", encoding="utf8").read() + open("ext_sources.js", encoding="utf8").read() + open("km.js", encoding="utf8").read() + open("byok.js", encoding="utf8").read() + open("tools_ui.js", encoding="utf8").read() + open("msa_plan.js", encoding="utf8").read() + open("spc_plan.js", encoding="utf8").read() + open("taguchi_ui.js", encoding="utf8").read() + open("sample_ui.js", encoding="utf8").read() + open("eq_ui.js", encoding="utf8").read() + open("aql_ui.js", encoding="utf8").read() + open("formula_ui.js", encoding="utf8").read() + open("plan_kit.js", encoding="utf8").read() + open("fb_pick.js", encoding="utf8").read() + open("help_ui.js", encoding="utf8").read() + open("tost_intro.js", encoding="utf8").read() + open("ss2hyp.js", encoding="utf8").read() + open("regress_ui.js", encoding="utf8").read() + open("demo_cases.js", encoding="utf8").read() + open("case.js", encoding="utf8").read() + open("pub_examples.js", encoding="utf8").read() + open("ai_status.js", encoding="utf8").read() + open("count_ui.js", encoding="utf8").read() + open("pdca_report.js", encoding="utf8").read()).replace("__TILES_JSON__", open("tiles/tiles.json").read())
# 獨立網站版：加上完整的 HTML 外框（claude.ai 發布時會自動加上，GitHub Pages 需要自己有）
scripts = re.findall(r"<script>(.*?)</script>", out, re.S)
page = '<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>醫材品質統計輔助工具</title></head><body>' + out + '</body></html>'
open("index.html", "w", encoding="utf8").write(page)
print(len(out)//1024, "KB,", len(scripts), "scripts")
