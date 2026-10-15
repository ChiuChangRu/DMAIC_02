  // =====================================================================
  // 其他外部資料庫：openFDA（召回＋MAUDE）、PubMed、PatentsView、Health Canada
  // 檢索到的紀錄一律附編號與連結；AI 依紀錄提出的原因必須引用編號（ref），
  // 沒有紀錄依據的原因視為 AI 推論，文字結尾加 *（程式會再檢查一次）。
  // 只送英文關鍵字與產品代碼到外部網站，不送客戶、批號、病患等資料。
  // =====================================================================
  const XS = [
    { id: "openfda", name: "openFDA（美國 FDA 召回＋MAUDE 不良事件）", short: "openFDA" },
    { id: "pubmed", name: "PubMed（醫學、材料文獻）", short: "PubMed" },
    { id: "patents", name: "PatentsView（美國專利，需免費金鑰）", short: "PatentsView" },
    { id: "hc", name: "Health Canada（加拿大回收與安全警訊）", short: "Health Canada" }
  ];
  const XS_KEY = "mdqs.xs.v1", PV_KEY = "mdqs.pv.key";
  let pubmedServer = null;
  (async () => {
    // 在 claude.ai 開啟時，PubMed 走連接器（平台不允許網頁直接連外部網站時仍可用）
    try { const ns = window.claude && window.claude.use ? await window.claude.use("mcp") : null; if (!ns) return; const r = await ns.listTools(); const s = (r.servers || []).find(x => /pubmed/i.test(x.server)); if (s) pubmedServer = s.server; } catch (_) {}
  })();
  function xsUI() {
    const wrap = $("extWrap"); if (!wrap || $("xsBox")) return;
    let saved = {}; try { saved = JSON.parse(localStorage.getItem(XS_KEY) || "{}"); } catch (_) {}
    let pv = ""; try { pv = localStorage.getItem(PV_KEY) || ""; } catch (_) {}
    wrap.insertAdjacentHTML("afterend", `<div class="xs-box" id="xsBox">
      <div class="xs-head"><b>檢索外部資料庫</b></div>
      <div class="xs-list" id="xsList">${XS.map(s => `<label class="fb-chk"><input type="checkbox" data-xs="${s.id}"${saved[s.id] ? " checked" : ""}> ${esc(s.name)}</label>`).join("")}</div>
      <div class="xs-pv" id="xsPv"${saved.patents ? "" : " hidden"}><label for="xsPvKey" class="hint">PatentsView API 金鑰（到 USPTO 開發者網站免費申請；只存在這個瀏覽器）</label><input type="password" id="xsPvKey" autocomplete="off" value="${esc(pv)}" placeholder="貼上金鑰"></div>
      <p class="hint xs-note">這些網站是否允許網頁直接查詢，依開啟方式而定；連不上時會說明原因，並附上可自行查詢的網址。</p>
    </div>`);
    // NyquistAI 併入同一個清單（第一項）；不在 claude.ai 或沒連接時停用並說明
    $("xsList").prepend(wrap); wrap.classList.remove("ext-chk");
    if (!(window.claude && window.claude.use)) { $("extChk").disabled = true; $("extChk").checked = false; $("extNa").textContent = "（目前開啟方式無法使用）"; }
    else { $("extChk").disabled = true; $("extNa").textContent = "（尚未偵測到 NyquistAI 連接器）"; }
    $("xsBox").addEventListener("change", e => {
      const c = e.target.closest("[data-xs]");
      if (c) { const o = {}; $("xsBox").querySelectorAll("[data-xs]").forEach(x => { o[x.dataset.xs] = x.checked; }); try { localStorage.setItem(XS_KEY, JSON.stringify(o)); } catch (_) {} $("xsPv").hidden = !o.patents; }
      if (e.target.id === "xsPvKey") { try { const v = e.target.value.trim(); v ? localStorage.setItem(PV_KEY, v) : localStorage.removeItem(PV_KEY); } catch (_) {} }
    });
  }
  xsUI();
  const xsSelected = () => $("xsBox") ? [...$("xsBox").querySelectorAll("[data-xs]:checked")].map(x => x.dataset.xs) : [];
  const xsTerms = q => String(q || "").toLowerCase().replace(/[^a-z0-9\s\-]/g, " ").split(/\s+/).filter(w => w.length > 1).slice(0, 4);
  const clip = (t, n) => { t = String(t || "").replace(/\s+/g, " ").trim(); return t.length > n ? t.slice(0, n) + "…" : t; };
  async function getJSON(url, init) {
    let r; try { r = await fetch(url, init); } catch (e) { const er = new Error("無法連線（可能是這個開啟方式不允許網頁直接連到此網站，或網路阻擋）"); er.code = "network"; throw er; }
    if (r.status === 404) return null;
    if (r.status === 401 || r.status === 403) { const er = new Error("金鑰無效或沒有權限（HTTP " + r.status + "）"); er.code = "auth"; throw er; }
    if (r.status === 429) { const er = new Error("查詢太頻繁，請稍後再試（HTTP 429）"); er.code = "rate"; throw er; }
    if (!r.ok) { const er = new Error("網站回應錯誤（HTTP " + r.status + "）"); er.code = "http"; throw er; }
    return r.json();
  }
  // ---- openFDA ----
  async function xsOpenFDA(plan) {
    const runs = plan.codes.map(c => ({ rec: `product_code:${c}`, ev: `device.device_report_product_code:${c}`, label: "產品代碼 " + c }))
      .concat(plan.queries.map(q => { const t = xsTerms(q); return t.length ? { rec: t.map(w => `reason_for_recall:${w}`).join(" AND "), ev: t.map(w => `mdr_text.text:${w}`).join(" AND "), label: q } : null; }).filter(Boolean)).slice(0, 2);
    const items = [], seen = new Set(), probs = new Map(); let total = { rec: 0, ev: 0 };
    for (const r of runs) {
      const base = "https://api.fda.gov/device/";
      const rec = await getJSON(base + "recall.json?search=" + encodeURIComponent(r.rec) + "&limit=8");
      total.rec += (rec && rec.meta && rec.meta.results && rec.meta.results.total) || 0;
      ((rec && rec.results) || []).forEach(x => { const id = x.product_res_number || x.res_event_number; if (!id || seen.has(id)) return; seen.add(id);
        items.push({ ref: "FDA召回 " + id, kind: "召回", date: (x.event_date_initiated || "").slice(0, 10), title: clip(x.product_description, 120), text: `原因：${clip(x.reason_for_recall, 260)}；FDA 根本原因分類：${x.root_cause_description || "—"}；廠商：${x.recalling_firm || "—"}`, url: base + "recall.json?search=" + encodeURIComponent(`product_res_number:"${x.product_res_number || id}"`) }); });
      const ev = await getJSON(base + "event.json?search=" + encodeURIComponent(r.ev) + "&limit=5");
      total.ev += (ev && ev.meta && ev.meta.results && ev.meta.results.total) || 0;
      ((ev && ev.results) || []).forEach(x => { const id = x.report_number || x.mdr_report_key; if (!id || seen.has(id)) return; seen.add(id);
        const dv = (x.device || [])[0] || {}, txt = ((x.mdr_text || []).find(m => m.text) || {}).text || "";
        items.push({ ref: "MAUDE " + id, kind: "不良事件", date: String(x.date_received || "").replace(/^(\d{4})(\d{2})(\d{2})$/, "$1-$2-$3"), title: clip([dv.generic_name, dv.brand_name].filter(Boolean).join(" / "), 120), text: `器材問題：${(x.product_problems || []).join("、") || "—"}；描述：${clip(txt, 260)}`, url: base + "event.json?search=" + encodeURIComponent(`mdr_report_key:"${x.mdr_report_key || id}"`) }); });
      const cnt = await getJSON(base + "event.json?search=" + encodeURIComponent(r.ev) + "&count=product_problems.exact").catch(() => null);
      ((cnt && cnt.results) || []).slice(0, 8).forEach(c => probs.set(c.term, Math.max(probs.get(c.term) || 0, c.count)));
    }
    const sum = `查詢 ${runs.map(r => r.label).join("、")}：召回符合 ${total.rec} 筆、MAUDE 符合 ${total.ev} 筆（各組查詢合計，可能重複；列出前幾筆）` + (probs.size ? `；MAUDE 常見器材問題：${[...probs.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, n]) => `${k} ${n}`).join("、")}` : "");
    return { items, sum, manual: [["FDA 召回資料庫", "https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfRES/res.cfm"], ["MAUDE 查詢", "https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfmaude/search.cfm"]] };
  }
  // ---- PubMed ----
  async function xsPubMed(plan) {
    const q = plan.queries.slice(0, 2).map(x => "(" + xsTerms(x).join(" AND ") + ")").filter(x => x !== "()").join(" OR ");
    const manual = [["PubMed 查詢", "https://pubmed.ncbi.nlm.nih.gov/?term=" + encodeURIComponent(q)]];
    if (!q) return { items: [], sum: "沒有可用的關鍵字", manual };
    let arts = [];
    if (pubmedServer && mcpNs) {
      const s = await mcpNs.callTool(pubmedServer, "search_articles", { query: q, max_results: 6 }); const sp = s && s.payload;
      const ids = (sp && sp.pmids) || [];
      if (ids.length) { const m = await mcpNs.callTool(pubmedServer, "get_article_metadata", { pmids: ids.slice(0, 6) }); const mp = m && m.payload;
        arts = ((mp && mp.articles) || []).map(a => ({ pmid: (a.identifiers || {}).pmid, doi: (a.identifiers || {}).doi || a.doi, title: a.title, abs: a.abstract, year: (a.publication_date || {}).year, journal: (a.journal || {}).iso_abbreviation || (a.journal || {}).title })); }
    } else {
      const E = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/";
      const s = await getJSON(E + "esearch.fcgi?db=pubmed&retmode=json&retmax=6&term=" + encodeURIComponent(q));
      const ids = (s && s.esearchresult && s.esearchresult.idlist) || [];
      if (ids.length) {
        let r; try { r = await fetch(E + "efetch.fcgi?db=pubmed&retmode=xml&id=" + ids.join(",")); } catch (_) { const er = new Error("無法連線（可能是這個開啟方式不允許網頁直接連到此網站）"); er.code = "network"; throw er; }
        const doc = new DOMParser().parseFromString(await r.text(), "text/xml");
        arts = [...doc.querySelectorAll("PubmedArticle")].map(a => ({ pmid: (a.querySelector("PMID") || {}).textContent, doi: ([...a.querySelectorAll('ArticleId[IdType="doi"]')][0] || {}).textContent, title: (a.querySelector("ArticleTitle") || {}).textContent, abs: [...a.querySelectorAll("AbstractText")].map(x => x.textContent).join(" "), year: (a.querySelector("PubDate Year") || {}).textContent, journal: (a.querySelector("ISOAbbreviation") || {}).textContent }));
      }
    }
    const items = arts.filter(a => a.pmid).map(a => ({ ref: "PMID " + a.pmid, kind: "文獻", date: a.year || "", title: clip(a.title, 160), text: `${a.journal || ""}；摘要：${clip(a.abs, 400) || "（無摘要）"}`, url: "https://pubmed.ncbi.nlm.nih.gov/" + a.pmid + "/", doi: a.doi ? "https://doi.org/" + a.doi : "" }));
    return { items, sum: `依 PubMed 檢索，查詢式：${q}`, manual };
  }
  // ---- PatentsView ----
  async function xsPatents(plan) {
    const terms = xsTerms(plan.queries[0] || ""), manual = [["Google Patents 查詢", "https://patents.google.com/?q=" + encodeURIComponent(terms.join(" "))]];
    const key = ($("xsPvKey") && $("xsPvKey").value.trim()) || "";
    if (!key) { const er = new Error("沒有填 PatentsView 金鑰，略過"); er.code = "nokey"; er.manual = manual; throw er; }
    if (!terms.length) return { items: [], sum: "沒有可用的關鍵字", manual };
    const body = { q: { _or: [{ patent_abstract: { _text_all: terms.join(" ") } }, { patent_title: { _text_all: terms.join(" ") } }] }, f: ["patent_id", "patent_title", "patent_date", "patent_abstract"], s: [{ patent_date: "desc" }], o: { size: 6 } };
    const j = await getJSON("https://search.patentsview.org/api/v1/patent/", { method: "POST", headers: { "Content-Type": "application/json", "X-Api-Key": key }, body: JSON.stringify(body) });
    const items = ((j && j.patents) || []).map(p => ({ ref: "US " + p.patent_id, kind: "專利", date: p.patent_date || "", title: clip(p.patent_title, 160), text: "摘要：" + clip(p.patent_abstract, 380), url: "https://patents.google.com/patent/US" + p.patent_id }));
    return { items, sum: `PatentsView 符合 ${(j && j.total_hits) || items.length} 筆（列出最新幾筆）`, manual };
  }
  // ---- Health Canada（整份公開資料檔，在瀏覽器內篩選）----
  let hcCache = null;
  async function xsHC(plan) {
    const manual = [["Health Canada 回收與安全警訊", "https://recalls-rappels.canada.ca/en"]];
    if (!hcCache) {
      const j = await getJSON("https://recalls-rappels.canada.ca/sites/default/files/opendata-donneesouvertes/HCRSAMOpenData.json");
      hcCache = Array.isArray(j) ? j : (j && (Object.values(j).find(Array.isArray))) || [];
    }
    const pick = (o, re) => { const k = Object.keys(o).find(k => re.test(k)); return k ? String(o[k] || "") : ""; };
    const qs = plan.queries.map(xsTerms).filter(t => t.length);
    const hits = hcCache.filter(o => { if (!o || typeof o !== "object") return false; const all = Object.values(o).join(" ").toLowerCase(); if (!/medical device|health product/.test(all)) return false; return qs.some(t => t.every(w => all.includes(w))); });
    hits.sort((a, b) => pick(b, /date|updated/i).localeCompare(pick(a, /date|updated/i)));
    const items = hits.slice(0, 6).map(o => { const id = pick(o, /^nid$|recall.?id|^id$/i) || pick(o, /nid/i); const t = pick(o, /title/i); return { ref: "HC " + (id || clip(t, 30)), kind: "回收／警訊", date: pick(o, /date|updated/i).slice(0, 10), title: clip(t, 160), text: clip(Object.entries(o).filter(([k]) => /issue|reason|problem|summary|description/i.test(k)).map(([, v]) => v).join("；"), 300), url: pick(o, /url|link/i) }; });
    return { items, sum: `Health Canada 公開資料共 ${hcCache.length} 筆，符合醫材／健康產品與關鍵字的有 ${hits.length} 筆（列出最新幾筆）`, manual };
  }
  const XS_MANUAL = {
    openfda: () => [["FDA 召回資料庫", "https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfRES/res.cfm"], ["MAUDE 查詢", "https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfmaude/search.cfm"]],
    pubmed: plan => [["PubMed 查詢", "https://pubmed.ncbi.nlm.nih.gov/?term=" + encodeURIComponent(xsTerms(plan.queries[0] || "").join(" "))]],
    patents: plan => [["Google Patents 查詢", "https://patents.google.com/?q=" + encodeURIComponent(xsTerms(plan.queries[0] || "").join(" "))]],
    hc: () => [["Health Canada 回收與安全警訊", "https://recalls-rappels.canada.ca/en"]]
  };
  const XS_RUN = { openfda: xsOpenFDA, pubmed: xsPubMed, patents: xsPatents, hc: xsHC };
  async function xsSearch(plan, ids) {
    return Promise.all(ids.map(async id => {
      const S = XS.find(s => s.id === id);
      try { const r = await XS_RUN[id](plan); return Object.assign({ id, name: S.short, ok: true }, r); }
      catch (e) { return { id, name: S.short, ok: false, err: (e && e.message) || "查詢失敗", items: [], manual: (e && e.manual) || XS_MANUAL[id](plan) }; }
    }));
  }
  function xsText(more) {
    if (!more || !more.length) return "";
    const L = ["【其他外部資料庫檢索結果】（每筆方括號內為編號，引用時原樣複製）"];
    more.forEach(m => {
      if (!m.ok) { L.push(`${m.name}：未取得資料（${m.err}）`); return; }
      L.push(`${m.name}：${m.sum}`);
      if (!m.items.length) L.push("- 查無相關紀錄");
      m.items.forEach(it => L.push(`- [${it.ref}]（${it.kind}${it.date ? "，" + it.date : ""}）${it.title}；${it.text}`));
    });
    return L.join("\n");
  }
  const XS_RULE = "【外部紀錄的引用規則】fishbone 區塊中，依據上列外部紀錄提出的原因，加上 \"src\":\"ext\" 與 \"ref\":\"方括號內的編號（原樣複製，例如 FDA召回 Z-1234-2020、MAUDE 1234567、PMID 12345678、US 1234567、HC 12345）\"；沒有紀錄依據、由你推論的原因不要加 ref，文字結尾加 *。不可編造編號；外部紀錄是同類產品的經驗，不代表本案原因，回答時要說明。";
  function xsHtml(more) {
    if (!more || !more.length) return "";
    return more.map(m => `<h4>${esc(m.name)}</h4>` + (m.ok ? `<p class="hint">${esc(m.sum)}</p>` + (m.items.length ? `<ul class="reasons">${m.items.map(it => `<li><a class="link" href="${esc(it.url || "#")}" target="_blank" rel="noopener">${esc(it.ref)}</a>（${esc(it.kind)}${it.date ? "，" + esc(it.date) : ""}）${esc(it.title)}<br><span class="hint">${esc(it.text)}</span>${it.doi ? ` <a class="link" href="${esc(it.doi)}" target="_blank" rel="noopener">DOI</a>` : ""}</li>`).join("")}</ul>` : `<p class="hint">查無相關紀錄。</p>`)
      : `<p class="hint" style="color:var(--bad)">未取得資料：${esc(m.err)}</p>`) + (m.manual && m.manual.length ? `<p class="hint">自行查詢：${m.manual.map(([t, u]) => `<a class="link" href="${esc(u)}" target="_blank" rel="noopener">${esc(t)}</a>`).join("、")}</p>` : "") + (m.id === "pubmed" && m.ok && m.items.length ? `<p class="hint">文獻資料來自 PubMed（美國國家醫學圖書館）。</p>` : "")).join("");
  }
  // ---- 出處檢查：AI 給的 ref 必須是這次（或魚骨圖保存的）檢索結果中的編號 ----
  function extKnownRefs() {
    const S = new Set();
    [homeExt, typeof fb !== "undefined" && fb ? fb.ext : null].forEach(e => {
      if (!e) return;
      (e.recalls || []).forEach(r => r.no && S.add(String(r.no)));
      if (e.maude) { S.add("MAUDE"); (e.maude.samples || []).forEach(s => s.no && S.add(String(s.no))); }
      (e.more || []).forEach(m => (m.items || []).forEach(it => { S.add(it.ref); S.add(it.ref.replace(/^\S+\s+/, "")); }));
    });
    return S;
  }
  function extRefOK(ref) {
    ref = String(ref || "").trim(); if (!ref) return false;
    const S = extKnownRefs(); if (!S.size) return false;
    if (S.has(ref)) return true;
    for (const k of S) if (k.length >= 4 && ref.includes(k)) return true;
    return false;
  }
