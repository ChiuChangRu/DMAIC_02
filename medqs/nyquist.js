  // ---------- 檢索外部案例 (NyquistAI, US FDA public data) ----------
  const NQ_NAME = "NyquistAI MedTech";
  let mcpNs = null, nqServer = NQ_NAME, nqOff = "";
  let homeExt = null;
  (async () => {
    try { mcpNs = window.claude && window.claude.use ? await window.claude.use("mcp") : null; } catch (_) { mcpNs = null; }
    if (!mcpNs) return;
    try {
      const r = await mcpNs.listTools();
      const s = (r.servers || []).find(x => /nyquist/i.test(x.server));
      if (s) { nqServer = s.server; $("extChk").disabled = false; $("extNa").textContent = ""; }
    } catch (_) {}
  })();
  const NQ_ERR = {
    server_not_connected: "你的 claude.ai 尚未連接 NyquistAI（設定 → 連接器）。這次沒有參考外部案例。",
    needs_reauth: "NyquistAI 需要重新連線（claude.ai 設定 → 連接器）。這次沒有參考外部案例。",
    not_in_manifest: "你沒有允許這個頁面使用 NyquistAI。這次沒有參考外部案例。",
    approval_required: "NyquistAI 查詢需要你的同意，這次沒有參考外部案例。",
    blocked_by_policy: "組織政策不允許在這個頁面使用 NyquistAI。",
    selection_required: "你有多個 NyquistAI 連接，請在 claude.ai 的提示中選擇一個後再試。",
    server_unavailable: "NyquistAI 暫時無法連線，請稍後再試。這次沒有參考外部案例。"
  };
  const stripTags = t => String(t || "").replace(/<\?xml[^>]*>/g, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  async function nqCall(tool, request) {
    const res = await mcpNs.callTool(nqServer, tool, { request }, { cache: { staleTime: 300000 } });
    const p = res && res.payload;
    return p && p.data ? p.data : p;
  }
  async function extPlan(question, attText) {
    const plan = await sample.json(
      "請依下列醫療器材問題，產生在美國 FDA 召回與 MAUDE 不良事件資料庫（英文）查詢同類產品案例用的關鍵字。只回 JSON，格式：" +
      '{"queries":["2 到 3 組英文關鍵字，每組 2～4 個字，例如 luer crack"],"product_codes":["確定知道的 3 碼 FDA 產品代碼，不確定就留空陣列"]}' +
      "\n\n問題：" + question + (attText ? "\n\n附件摘錄：" + attText.slice(0, 1500) : ""), { modelTier: "quick" });
    const queries = (Array.isArray(plan && plan.queries) ? plan.queries : []).map(q => String(q).replace(/[^\w\s\-]/g, " ").trim()).filter(Boolean).slice(0, 3);
    const codes = (Array.isArray(plan && plan.product_codes) ? plan.product_codes : []).map(c => String(c).toUpperCase().trim()).filter(c => /^[A-Z]{3}$/.test(c)).slice(0, 2);
    return { queries, codes };
  }
  async function extSearch(question, attText, P) {
    const { queries, codes } = P || await extPlan(question, attText);
    if (!queries.length && !codes.length) return { queries, codes, recalls: [], recallTotal: 0, rootCauses: [], maude: null, empty: true };
    const recalls = new Map(); let recallTotal = 0, rootAgg = new Map(), maude = null;
    const runs = queries.map(q => ({ query: q })).concat(codes.map(c => ({ query: "", product_code: c })));
    for (const r of runs.slice(0, 4)) {
      const d = await nqCall("usfda_recall_search", Object.assign({ size: 12 }, r));
      recallTotal = Math.max(recallTotal, (d && d.total_count) || 0);
      ((d && d.recalls) || []).forEach(x => { if (!recalls.has(x.recall_number)) recalls.set(x.recall_number, x); });
      (((d && d.aggregations) || {}).root_cause_description || []).forEach(a => rootAgg.set(a.value, Math.max(rootAgg.get(a.value) || 0, a.count)));
      if (!maude) {
        const m = await nqCall("usfda_maude_search", Object.assign({ size: 5 }, r));
        if (m && m.total_count) maude = { query: r.query || r.product_code, total: m.total_count, problems: ((m.aggregations || {}).device_problem || []).slice(0, 12), events: ((m.aggregations || {}).event_type || []), samples: (m.maude || []).slice(0, 5).map(x => ({ no: x.report_number, title: x.report_title, date: (x.date_received || "").slice(0, 10), problems: x.device_problem || [], url: x.official_url })) };
      }
    }
    const list = [...recalls.values()].slice(0, 20).map(x => ({ no: x.recall_number, cls: x.recall_class, date: (x.date_initiated || "").slice(0, 10), firm: x.recalling_firm || "", title: x.recall_title || "", reason: stripTags(x.reason_for_recall).slice(0, 260), root: x.root_cause_description || "", codes: (x.product_code || []).join(","), url: x.official_url || "" }));
    return { queries, codes, recalls: list, recallTotal, rootCauses: [...rootAgg.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8), maude, empty: !list.length && !maude, at: new Date().toISOString().slice(0, 10) };
  }
  function extText(ext) {
    if (!ext) return "";
    const more = typeof xsText === "function" ? xsText(ext.more) : "";
    if (ext.nq === false) return more;
    return [extTextNq(ext), more].filter(Boolean).join("\n\n");
  }
  function extTextNq(ext) {
    if (ext.empty) return `【檢索外部案例（NyquistAI，美國 FDA 公開資料）】查詢關鍵字：${ext.queries.join("、") || "（無）"}；查無相關召回或不良事件資料。`;
    const L = [`【檢索外部案例（NyquistAI，美國 FDA 公開資料，查詢日 ${ext.at}）】`, `查詢關鍵字：${ext.queries.join("、")}${ext.codes.length ? "；產品代碼：" + ext.codes.join("、") : ""}`];
    if (ext.recalls.length) {
      L.push(`召回：符合 ${ext.recallTotal} 筆，以下列出 ${ext.recalls.length} 筆`);
      if (ext.rootCauses.length) L.push("FDA 根本原因分類統計：" + ext.rootCauses.map(([k, n]) => `${k} ${n}`).join("；"));
      ext.recalls.forEach(r => L.push(`- ${r.no}（第 ${r.cls} 級，${r.date}，${r.firm}）根本原因分類：${r.root}；召回原因：${r.reason}`));
    } else L.push("召回：查無相關資料");
    if (ext.maude) {
      L.push(`MAUDE 不良事件（關鍵字 ${ext.maude.query}）：符合 ${ext.maude.total} 筆；事件類型：${ext.maude.events.map(e => `${e.value} ${e.count}`).join("；")}`);
      L.push("常見器材問題：" + ext.maude.problems.map(p => `${p.value} ${p.count}`).join("；"));
    } else L.push("MAUDE：查無相關資料");
    return L.join("\n");
  }
  function extTableHtml(ext) {
    if (!ext) return "";
    const more = typeof xsHtml === "function" ? xsHtml(ext.more) : "";
    if (ext.nq === false) return more;
    return extTableNq(ext) + (more ? `<h3 style="margin-top:14px">其他外部資料庫</h3>` + more : "");
  }
  function extTableNq(ext) {
    if (ext.empty) return `<p class="hint">查詢關鍵字：${esc(ext.queries.join("、") || "（無）")}。NyquistAI 查無相關的召回或不良事件資料。</p>`;
    let h = `<p class="hint">資料來源：NyquistAI（美國 FDA 召回與 MAUDE 公開資料），查詢日 ${esc(ext.at)}。查詢關鍵字：${esc(ext.queries.join("、"))}${ext.codes.length ? "；產品代碼：" + esc(ext.codes.join("、")) : ""}。只代表在美國有通報或召回的案例，不能用來推估不良率。</p>`;
    if (ext.recalls.length) {
      h += `<h4>召回（符合 ${ext.recallTotal} 筆，列出 ${ext.recalls.length} 筆）</h4>`;
      if (ext.rootCauses.length) h += `<p class="hint">FDA 根本原因分類：${ext.rootCauses.map(([k, n]) => `${esc(k)} ${n}`).join("、")}</p>`;
      h += `<div class="scroll-x"><table class="ext-table"><thead><tr><th>召回編號</th><th>日期</th><th>廠商</th><th>召回原因</th><th>根本原因分類</th></tr></thead><tbody>${ext.recalls.map(r => `<tr><td>${r.url ? `<a class="link" href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.no)}</a>` : esc(r.no)}<br><span class="hint">第 ${esc(r.cls)} 級</span></td><td>${esc(r.date)}</td><td>${esc(r.firm)}</td><td>${esc(r.reason)}</td><td>${esc(r.root)}</td></tr>`).join("")}</tbody></table></div>`;
    } else h += `<p class="hint">召回：查無相關資料。</p>`;
    if (ext.maude) {
      h += `<h4>MAUDE 不良事件（關鍵字「${esc(ext.maude.query)}」，符合 ${ext.maude.total} 筆）</h4><p class="hint">常見器材問題：${ext.maude.problems.map(p => `${esc(p.value)} ${p.count}`).join("、")}</p>`;
      h += `<ul class="reasons">${ext.maude.samples.map(s => `<li>${s.url ? `<a class="link" href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.no)}</a>` : esc(s.no)}（${esc(s.date)}）${esc(s.title)}${s.problems.length ? "：" + esc(s.problems.join("、")) : ""}</li>`).join("")}</ul>`;
    } else h += `<p class="hint">MAUDE：查無相關資料。</p>`;
    return h;
  }
  function extSumText(e, lab) {
    const parts = [];
    if (e.nq !== false) parts.push(e.empty ? "NyquistAI 查無" : `NyquistAI 召回 ${e.recalls.length} 筆${e.maude ? `、不良事件 ${e.maude.total} 筆` : ""}`);
    (e.more || []).forEach(m => parts.push(m.ok ? `${m.name} ${m.items.length} 筆` : `${m.name} 未取得`));
    return `${lab}（${parts.join("；")}）`;
  }
  function renderExtBoxes() {
    $("extOut").hidden = !homeExt; $("extOutBody").innerHTML = extTableHtml(homeExt);
    $("extOutSum").textContent = homeExt ? extSumText(homeExt, "檢索外部案例") : "";
    const fe = fb.ext;
    $("fbExtBox").hidden = !fe; $("fbExtBody").innerHTML = extTableHtml(fe);
    $("fbExtSum").textContent = fe ? extSumText(fe, "其他廠參考案例") : "";
  }
  const EXT_RULE = "【檢索外部案例的回答方式】在建議工具之外，增加一段「其他廠經驗」：只根據上方 NyquistAI 資料整理同類產品常見的召回原因、根本原因分類與器材問題，每項附召回編號或件數；資料很少、不相關或查無資料時，直接寫「查無相關的外部案例」，不要推測或編造。適合當作魚骨圖候選原因的，放進 fishbone 區塊，該項加上 \"src\":\"ext\" 與 \"ref\":\"召回編號或 MAUDE\"。";
