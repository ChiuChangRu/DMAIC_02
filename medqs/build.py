import re
t = open("template_head.html", encoding="utf8").read() + open("template_body.html", encoding="utf8").read()
stats = open("stats.js", encoding="utf8").read()
val = open("validate/validate_core.js", encoding="utf8").read()
ref = open("validate/ref.json", encoding="utf8").read()
REPORT = "https://claude.ai/code/artifact/9561812d-dd10-4b1d-8513-64ea019e4832"
assert "</script" not in ref and "</script" not in stats and "</script" not in val
out = t.replace("__REF_JSON__", ref).replace("/*__STATS_JS__*/", stats).replace("/*__QUALITY_JS__*/", open("quality.js", encoding="utf8").read()).replace("/*__TAGUCHI_JS__*/", open("taguchi.js", encoding="utf8").read()).replace("/*__SAMPLE_JS__*/", open("sample.js", encoding="utf8").read()).replace("/*__VALIDATE_JS__*/", val).replace("__REPORT_URL__", REPORT).replace("/*__FISHBONE_JS__*/", open("fishbone.js", encoding="utf8").read() + open("aistyle.js", encoding="utf8").read() + open("nyquist.js", encoding="utf8").read() + open("km.js", encoding="utf8").read() + open("byok.js", encoding="utf8").read() + open("tools_ui.js", encoding="utf8").read() + open("taguchi_ui.js", encoding="utf8").read() + open("sample_ui.js", encoding="utf8").read()).replace("__TILES_JSON__", open("tiles/tiles.json").read())
open("hypothesis-test.html", "w", encoding="utf8").write(out)
scripts = re.findall(r"<script>(.*?)</script>", out, re.S)
for i, s in enumerate(scripts):
    open(f"/tmp/claude-0/chk{i}.js", "w", encoding="utf8").write(s)
print(len(out)//1024, "KB,", len(scripts), "scripts")
