  // =====================================================================
  // 樣本數規劃：方法圖卡（取代原本的分頁按鈕）＋計數型 AQL（ISO 2859-1:2026）
  // 查表與轉換規則在 sample.js（SS.aqlCode / aqlPlan / aqlScheme），OC 用 HT.binomCdf；這裡只處理介面。
  // =====================================================================
  const SS_TILES = [
    ["power", "power", "計量型 t 檢定"], ["tost", "tost", "同等性 TOST"], ["ni", "ni", "不劣性"],
    ["attr", "attr", "通過／不通過"], ["prop", "prop", "不良率比較"], ["tolp", "tolp", "允差區間"],
    ["aql", "aql", "計數型 AQL"], ["aqlv", "aqlv", "計量型 AQL"], ["doer", "doer", "DOE 重複次數"], ["guide", "guide", "其他工具建議數量"]
  ];
  const SS_TILE_STD = { attr: "ISO 13485 §7.3", tolp: "ISO 16269-6", aql: "ISO 2859-1:2026", aqlv: "ISO 3951-1", guide: "AIAG" };
  function ssTilesRender() {
    $("ssTiles").innerHTML = SS_TILES.map(([k, sub, name]) => `<button type="button" class="tool-card tile ss-tile" role="tab" data-ssub="${sub}" aria-label="${esc(name)}" aria-selected="false"><span class="tile-img"><img src="${TILE_IMG["ss_" + k]}" alt="" decoding="async"></span><span class="ss-std">${SS_TILE_STD[sub] ? esc(SS_TILE_STD[sub]) : "&nbsp;"}</span>${sub === "aql" || sub === "aqlv" ? `<span class="ss-new">新增</span>` : ""}</button>`).join("");
    ssTileMark();
  }
  function ssTileMark() {
    const box = $("ssTiles"); if (!box) return;
    const q = SSQ[ssCurQ], rec = q ? q.sub : "";
    box.querySelectorAll("[data-ssub]").forEach(t => {
      const s = t.dataset.ssub;
      t.classList.toggle("rec", s === rec); t.classList.toggle("dim", !!rec && s !== rec);
      t.setAttribute("aria-selected", String(s === sampleSub));
      let o = t.querySelector(".tile-order");
      if (s === rec) { if (!o) { o = document.createElement("span"); o.className = "tile-order"; t.appendChild(o); } o.textContent = "1"; } else if (o) o.remove();
    });
    const nm = (SS_TILES.find(x => x[1] === rec) || [])[2];
    $("ssRecLine").innerHTML = rec ? `依「${esc(q.title)}」建議：<b>${esc(nm || rec)}</b>　也可以直接點其他圖卡。` : "選了上面的問題，建議的方法會加框標示；也可以直接點任何一張圖卡。";
  }
  $("ssTiles").addEventListener("click", e => {
    const b = e.target.closest("[data-ssub]"); if (!b) return;
    const s = b.dataset.ssub;
    setSampleSub(s); ssSyncFromSub(s); ssTileMark();
    const v = $("viewSample").querySelector(`[data-tview="${s}"]`); if (v) v.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  setTimeout(ssTilesRender, 0);   // TILE_IMG 在主程式後段才定義

  // ---------------- 計數型 AQL ----------------
  const aqFmtAql = a => (a < 1 ? String(a).replace(/^0(?=\.)/, "0") : String(a));
  $("aqAql").innerHTML = `<optgroup label="不良品百分比（%）">${SS.AQL_LIST.filter(a => a <= 10).map(a => `<option value="${a}"${a === 1 ? " selected" : ""}>${aqFmtAql(a)} %</option>`).join("")}</optgroup>` +
    `<optgroup label="每百件缺點數（只用於數缺點）">${SS.AQL_LIST.filter(a => a > 10).map(a => `<option value="${a}">${a}／百件</option>`).join("")}</optgroup>`;
  const aqSevName = { normal: "正常", tightened: "加嚴", reduced: "減量" };
  function aqUI() { const r = $("aqSev").value === "reduced"; $("aqRedF").hidden = !r; $("aqRedNote").hidden = !r; }
  $("aqSev").addEventListener("change", aqUI); aqUI();
  function aqReduced() {
    const n = Math.round(Number($("aqRn").value)), ac = Math.round(Number($("aqRac").value));
    return n >= 1 && ac >= 0 && ac < n && $("aqRn").value !== "" && $("aqRac").value !== "" ? { n, ac } : null;
  }
  function aqRun() {
    const hint = $("aqHint"); hint.textContent = "";
    const N = Math.round(Number($("aqN").value)), lv = $("aqLv").value, aql = Number($("aqAql").value), sev = $("aqSev").value;
    if (!(N >= 2)) { hint.textContent = "請填批量 N（2 以上）。"; return; }
    const code = SS.aqlCode(N, lv);
    let plan;
    if (sev === "reduced") { const r = aqReduced(); if (!r) { hint.textContent = "減量檢驗請填入從表 4 查出的 n 與 Ac。"; return; } plan = { letter: "—", n: r.n, ac: r.ac, re: r.ac + 1, moved: false, sev }; }
    else plan = SS.aqlPlan(code, aql, sev);
    if (!plan) { hint.textContent = "查不到方案。"; return; }
    const dRaw = $("aqD").value.trim(), d = dRaw === "" ? null : Math.round(Number(dRaw));
    if (d !== null && !(d >= 0)) { hint.textContent = "不良數要是 0 以上的整數。"; return; }
    const full = plan.n >= N, pctMode = aql <= 10, p = aql / 100;
    const acc = d === null ? null : d <= plan.ac;
    const rel = HT.demoReliability(plan.n, plan.ac, 0.95), pts = HT.planPoints(plan.n, plan.ac);
    const nShow = full ? N : plan.n;
    $("aqTitle").textContent = `批量 ${N} · 水準 ${lv} · AQL ${pctMode ? aqFmtAql(aql) + "%" : aql + "／百件"} · ${aqSevName[sev]}`;
    const moved = plan.moved ? `<p class="help">代字 ${code} 在 AQL ${aqFmtAql(aql)} 沒有適用的方案，依表改用代字 <b>${plan.letter}</b> 的方案（樣本數跟著改變，§10.3）。</p>` : "";
    const verdict = d === null ? "" : `<span class="pill ${acc ? "eqok" : "ns"}" style="margin-top:6px">${acc ? "允收" : "不允收（拒收）"}</span><p class="help">抽到 ${d} 個不良，${acc ? `≤ Ac ${plan.ac}` : `≥ Re ${plan.re}`}。${acc ? "" : "依 §7.2 由權責單位決定處置（報廢、篩選、重工等），並記入轉換規則。"}</p>`;
    $("aqOut").innerHTML = `<div class="verdict"><div class="bignum">${nShow}<small>${full ? "個（全數檢驗）" : "個樣本"}</small></div>
      <p class="big">${full ? `樣本數 ${plan.n} 已達批量，整批 ${N} 個全數檢驗。` : `從這批隨機抽 ${plan.n} 個：不良 ≤ ${plan.ac} 個允收，≥ ${plan.re} 個不允收。`}</p>${verdict}</div>${moved}
      <div class="kv"><div><span>樣本代字</span><b>${sev === "reduced" ? "（自填）" : code + (plan.moved ? " → " + plan.letter : "")}</b></div><div><span>Ac／Re</span><b>${plan.ac}／${plan.re}</b></div>${pctMode ? `<div><span>不良率 = AQL 時允收機率</span><b>${pct(HT.binomCdf(plan.ac, plan.n, p), 1)}</b></div>` : ""}<div><span>LTPD（允收 10%）</span><b>${pct(pts.p10, 2)}</b></div></div>
      ${pctMode ? `<div class="chart-wrap" id="aqChart"></div>` : `<p class="help">每百件缺點數的方案，OC 曲線要用卜瓦松分布（附錄 E.4），本頁暫不繪製。</p>`}
      <p class="help">只抽這一次、不搭配轉換規則時：用 95% 信心可宣稱的可靠度約 <b>${pct(rel, 2)}</b>（不良率上界 ${pct(1 - rel, 2)}）。這種用法依 §12.6.1 不算「依 ISO 2859-1 檢驗」。</p>
      <p class="hint">計算方法：樣本代字與方案依 ISO 2859-1:2026 表 1～表 3（與 MIL-STD-105E 相同）；OC 與可靠度用二項分布，與 SciPy 比對確效。</p>`;
    if (pctMode) drawOC($("aqChart"), plan.n, plan.ac, p, 0.95);
    const ps = [0.001, 0.0025, 0.005, 0.01, 0.015, 0.025, 0.04, 0.065, 0.1, 0.15, 0.25];
    if (pctMode && !ps.some(x => Math.abs(x - p) < 1e-12)) ps.push(p);
    ps.sort((a, b) => a - b);
    $("aqTable").innerHTML = `<thead><tr><th class="num">製程不良率</th><th class="num">允收機率</th><th class="num">不允收機率</th></tr></thead><tbody>` +
      ps.map(x => { const pa = HT.binomCdf(plan.ac, plan.n, x); return `<tr class="${pctMode && Math.abs(x - p) < 1e-12 ? "hl" : ""}"><td class="num">${pct(x, x < 0.01 ? 2 : 1)}${pctMode && Math.abs(x - p) < 1e-12 ? "（AQL）" : ""}</td><td class="num">${pct(pa, 1)}</td><td class="num">${pct(1 - pa, 1)}</td></tr>`; }).join("") + "</tbody>";
    $("aqSheets").hidden = false;
    TQ.aql = { ctx: ["【計數型 AQL 抽樣（ISO 2859-1:2026，單次抽樣）】",
      `批量 N=${N}；檢驗水準 ${lv}；AQL=${pctMode ? aql + "%" : aql + " 缺點／百件"}；嚴格度：${aqSevName[sev]}`,
      `樣本代字 ${code}${plan.moved ? `（表中無方案，改用代字 ${plan.letter}）` : ""}；n=${plan.n}；Ac=${plan.ac}；Re=${plan.re}${full ? "；樣本數 ≥ 批量 → 全數檢驗" : ""}`,
      pctMode ? `不良率 = AQL 時允收機率=${pct(HT.binomCdf(plan.ac, plan.n, p), 2)}；LTPD（允收 10%）=${pct(pts.p10, 3)}；95% 允收的不良率=${pct(pts.p95, 3)}` : "缺點數方案，未計算 OC",
      d === null ? "未填抽到的不良數" : `這批抽到不良 ${d} 個 → ${acc ? "允收" : "不允收"}`,
      `只抽一次、不搭配轉換規則時，95% 信心可宣稱可靠度=${pct(rel, 3)}；依 §12.6.1 這種用法不算依 ISO 2859-1 檢驗`,
      "方案來源：ISO 2859-1:2026 表 1～表 3（與 MIL-STD-105E 相同）；減量方案由使用者自行填入。"].join("\n") };
    toolChanged("sample");
  }
  $("aqRun").addEventListener("click", aqRun);
  function aqSchRun() {
    const hint = $("aqSchHint"); hint.textContent = "";
    const lv = $("aqLv").value, aql = Number($("aqAql").value);
    const lots = [], bad = [];
    $("aqLots").value.split(/\r?\n/).map(l => l.trim()).filter(Boolean).forEach((l, i) => {
      const m = l.split(/[\s,，\t]+/).map(Number);
      if (m.length >= 2 && m[0] >= 2 && m[1] >= 0 && Number.isInteger(m[0]) && Number.isInteger(m[1])) lots.push({ N: m[0], d: m[1] }); else bad.push(i + 1);
    });
    if (bad.length) { hint.textContent = `第 ${bad.slice(0, 5).join("、")} 列格式不對，請填「批量 不良數」。`; return; }
    if (!lots.length) { hint.textContent = "請先填入每批的批量與不良數。"; return; }
    const red = aqReduced(), r = SS.aqlScheme(lots, { level: lv, aql, reduced: red, steady: $("aqSteady").checked });
    const stName = { normal: "正常", tightened: "加嚴", reduced: "減量", stop: "停止" };
    const rows = r.rows.map(x => x.plan ? `<tr class="${x.acc ? "" : "aq-rej"}"><td class="num">${x.k + 1}</td><td>${stName[x.st]}</td><td>${x.plan.letter}</td><td class="num">${x.plan.n}</td><td class="num">${x.plan.ac}／${x.plan.re}</td><td class="num">${x.d}</td><td>${x.acc ? "允收" : "不允收"}</td><td class="num">${x.st === "normal" ? x.score : "—"}</td><td>${esc(x.note || "")}${x.skipOk ? (x.note ? "；" : "") + "已連續 10 批零不良，可評估跳批（§9.5，另須廠商與產品資格）" : ""}</td></tr>` : `<tr><td class="num">${x.k + 1}</td><td>${stName[x.st] || x.st}</td><td colspan="7">${esc(x.note || "")}</td></tr>`).join("");
    $("aqSchOut").innerHTML = `<p class="big" style="margin:10px 0 6px">下一批應使用：<b>${stName[r.state]}</b>${r.state === "normal" ? `（目前轉換分數 ${r.score}）` : ""}</p>
      <div class="scroll-x"><table class="mini"><thead><tr><th class="num">批</th><th>嚴格度</th><th>代字</th><th class="num">n</th><th class="num">Ac／Re</th><th class="num">不良數</th><th>結果</th><th class="num">轉換分數</th><th>說明</th></tr></thead><tbody>${rows}</tbody></table></div>
      <p class="hint">依 §9.3、§9.4 判定；只看「原始檢驗」結果，重新提交的批不列入。轉減量另須權責單位同意（§9.3.3 c）。${red ? "" : "未填減量方案，達到條件時只會提示、不會切換。"}</p>`;
    TQ.aql = TQ.aql || { ctx: "" };
    TQ.aql.ctx = (TQ.aql.ctx ? TQ.aql.ctx + "\n" : "") + `【逐批轉換規則】共 ${lots.length} 批；下一批應使用：${stName[r.state]}；` + r.rows.filter(x => x.note).map(x => `第 ${x.k + 1} 批：${x.note}`).join("；");
    toolChanged("sample");
  }
  $("aqSchRun").addEventListener("click", aqSchRun);
