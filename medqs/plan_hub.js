  // =====================================================================
  // 新架構：③ 驗證計畫（以驗證項目為中心）＋ 🧰 工具箱（全部方法攤開）＋ 工具頁麵包屑
  // 每個勾選的驗證項目一列：① 驗證策略 → ② 樣本數 → ③ 數據與分析 → ④ 結論
  // 資料沿用 fb.vplan（ss＝樣本數、apx＝存入的分析結果、vr＝不用統計的結論），不另外存
  // =====================================================================
  function planNote(msg) { const e = $("planMsg"); if (!e) return; e.textContent = msg; clearTimeout(planNote.t); planNote.t = setTimeout(() => { e.textContent = ""; }, 6000); }
  function hubRender() {
    const box = $("planHub"), sum = $("planSum"); if (!box) return;
    if (box.contains(document.activeElement) && /^(INPUT|SELECT|TEXTAREA)$/.test(document.activeElement.tagName)) return;
    const L = vrItems(), all = fb.vplan || [];
    const st = L.filter(x => !vrNonStat(x)), ns = L.filter(vrNonStat);
    const done = x => vrNonStat(x) ? !!(x.vr && x.vr.st) : !!(x.apx || []).length;
    const nDone = L.filter(done).length, nDev = st.filter(x => { const A = x.apx || []; return A.length && A[A.length - 1].dev; }).length;
    sum.innerHTML = `<div class="card plan-sum"><div class="ps-row"><span><b>${L.length}</b>個項目</span><span><b>${st.length}</b>統計</span><span><b>${ns.length}</b>不用統計</span><span class="ok"><b>${nDone}</b>已完成</span>${nDev ? `<span class="warn"><b>${nDev}</b>少於規劃</span>` : ""}
      <span class="ps-act"><button type="button" class="btn small" data-hub="new">＋ 新增項目</button><button type="button" class="btn small copper" data-hub="ai">請 AI 建議驗證策略</button>${nDone && nDone === L.length ? `<button type="button" class="btn small primary" data-route-go="pdca">全部完成 → ④ PDCA 報告</button>` : ""}</span></div>
      ${!L.length ? `<p class="hint" style="margin:8px 0 0">${all.length ? `清單有 ${all.length} 個項目，但還沒有勾選要驗證的。請在下方「編輯驗證項目」勾選。` : "還沒有驗證項目。按「請 AI 建議驗證策略」，或「＋ 新增項目」自己寫。原因請先在 ② 魚骨圖 整理好。"}</p>` : ""}</div>`;
    const ed = $("planEdit"); if (ed && !L.length) ed.open = true;
    box.innerHTML = L.map((x, i) => {
      const nsx = vrNonStat(x), s = x.ss || {}, A = x.apx || [], a = A[A.length - 1], pl = vrPlanOf(x);
      const cell = (lab, ok, now, body, cls) => `<div class="hc${ok ? " done" : ""}${now ? " now" : ""}${cls ? " " + cls : ""}"><div class="hc-lab">${lab}</div>${body}</div>`;
      const c1 = cell("① 驗證策略", !!x.tool, !x.tool, `<div class="hc-v">${esc(x.tool || "未選")}</div><div class="hc-d">${esc(x.method || "")}</div>`);
      let c2 = "", c3 = "", c4 = "";
      if (nsx) {
        const v = x.vr || {};
        c4 = cell("④ 結論（直接填）", !!v.st, !v.st, `<div class="hc-v hc-ns"><select data-hubvr="${x.id}" aria-label="結論"><option value="">請選擇</option>${Object.entries(VR_ST).map(([k, t]) => `<option value="${k}"${v.st === k ? " selected" : ""}>${t}</option>`).join("")}</select><input type="text" data-hubvn="${x.id}" value="${esc(v.note || "")}" placeholder="依據，例如：審查變更紀錄，保壓時間未經確效"></div>`, "wide");
      } else {
        const ssOk = (() => { try { return svOk(x); } catch (_) { return false; } })();
        c2 = cell("② 樣本數", ssOk, !ssOk && !!x.tool, ssOk ? `<div class="hc-v">${esc(s.n || "")}</div><div class="hc-d">${esc(pl ? (pl.sum || pl.meth).slice(0, 60) : "")}</div><div class="hc-b">${s.inp ? `<button type="button" class="linkbtn" data-hub="calc" data-id="${x.id}">🔍 查看計算</button>` : ""}<button type="button" class="linkbtn" data-hub="plan" data-id="${x.id}">修改</button></div>` : `<div class="hc-v hc-todo">尚未規劃</div><div class="hc-b"><button type="button" class="btn small primary" data-hub="plan" data-id="${x.id}">規劃 →</button></div>`);
        c3 = cell("③ 數據與分析", !!a, ssOk && !a, a ? `<div class="hc-v">${esc(a.key || a.meth || "已存")}</div><div class="hc-d">${esc(a.meth || "")}${a.act ? `｜實際 ${esc(a.act)}` : ""}</div>${a.dev ? `<div class="hc-d hc-dev">⚠ 少於規劃${a.devWhy ? "：" + esc(a.devWhy.slice(0, 40)) : ""}</div>` : ""}<div class="hc-b"><button type="button" class="linkbtn" data-vrres="${x.id}">📊 結果（附錄 ${vrApxNos(x).join("、")}）</button><button type="button" class="linkbtn" data-hub="go" data-id="${x.id}">再分析</button></div>` : `<div class="hc-v hc-todo">尚未分析</div><div class="hc-b"><button type="button" class="btn small primary" data-hub="go" data-id="${x.id}">開始分析 →</button></div>`, a && a.dev ? "dev" : "");
        c4 = cell("④ 結論", !!a, false, a ? `<div class="hc-v"><span class="pd-vr-${a.st}">${VR_ST[a.st] || ""}</span></div><div class="hc-d">${esc((a.note || "").slice(0, 60))}</div>` : `<div class="hc-v hc-todo">—</div><div class="hc-d">分析後在結果下方按「驗證結束，並儲存到報告」</div>`);
      }
      const fbTag = (() => { const f = fb.factors.find(f => f.text && x.cause && (x.cause.includes(f.text.slice(0, 6)) || f.text.includes(x.cause.slice(0, 6)))); return f ? `魚骨圖：${esc(fbCatName(f))}${f.key ? " ★" : ""}${f.verify ? " ◇" : ""}` : ""; })();
      return `<div class="hub-item${done(x) ? " hub-done" : ""}"><div class="hub-h"><span class="hub-no">${i + 1}</span><span class="hub-t">${esc(x.cause || "（未命名）")}</span><span class="hint">${fbTag}</span><button type="button" class="linkbtn" data-hub="edit" data-id="${x.id}">修改項目</button></div>
        <div class="hub-pipe${nsx ? " ns" : ""}">${c1}${c2}${c3}${c4}</div></div>`;
    }).join("");
  }
  // 到樣本數頁，替這一項開始規劃（沿用樣本數清單的「規劃 →」）
  function hubPlan(x) {
    navCtx = "plan"; const b = document.querySelector('.toolnav [data-route="sample"]'); if (b) b.click();
    setTimeout(() => { const g = document.querySelector(`#svList [data-svgo="${x.id}"]`); if (g && !g.disabled) g.click(); else { const r = g && g.closest("tr"); if (r) r.scrollIntoView({ behavior: "smooth", block: "center" }); planNote("請先在這一列選「要證明什麼」，再按「規劃 →」。"); } }, 150);
  }
  (function hubInit() {
    const v = $("viewPlan"); if (!v) return;
    v.addEventListener("click", e => {
      const b = e.target.closest("[data-hub]"); if (!b) return; const x = (fb.vplan || []).find(y => y.id === b.dataset.id), k = b.dataset.hub;
      if (k === "new") { $("planEdit").open = true; const n = $("fbVplan").querySelector("[data-vpnew]"); if (n) n.click(); $("planEdit").scrollIntoView({ behavior: "smooth", block: "start" }); return; }
      if (k === "ai") { $("planEdit").open = true; $("fbPlanAI").click(); return; }
      if (!x) return;
      if (k === "edit") { $("planEdit").open = true; const r = [...$("fbVplan").querySelectorAll("tbody tr")].find(tr => tr.querySelector(`[data-vpon="${x.id}"]`)); if (r) { r.scrollIntoView({ behavior: "smooth", block: "center" }); r.classList.add("vp-flash"); setTimeout(() => r.classList.remove("vp-flash"), 1600); } return; }
      if (k === "plan") { hubPlan(x); return; }
      if (k === "calc") { navCtx = "plan"; const s = document.querySelector('.toolnav [data-route="sample"]'); if (s) s.click(); setTimeout(() => { try { svView(x); } catch (_) {} }, 150); return; }
      if (k === "go") { navCtx = "plan"; vrGo(x); return; }
    });
    v.addEventListener("change", e => { const s = e.target.closest("[data-hubvr]"); if (!s) return; const x = (fb.vplan || []).find(y => y.id === s.dataset.hubvr); if (!x) return; x.vr = Object.assign({}, x.vr, { st: s.value }); fbSave(); try { pdcaRender(); flowRender(); } catch (_) {} });
    v.addEventListener("input", e => { const s = e.target.closest("[data-hubvn]"); if (!s) return; const x = (fb.vplan || []).find(y => y.id === s.dataset.hubvn); if (!x) return; x.vr = Object.assign({}, x.vr, { note: s.value }); fbSave(); });
    v.addEventListener("focusout", e => { if (e.target.closest("[data-hubvn]")) setTimeout(() => { try { pdcaRender(); } catch (_) {} }, 0); });
    new MutationObserver(() => { if (!v.hidden) hubRender(); }).observe(v, { attributes: true, attributeFilter: ["hidden"] });
    setTimeout(hubRender, 0);
  })();

  // ---------------- 🧰 工具箱 ----------------
  const TB = [
    ["📏 比較數值", "兩組、多組、對目標值有沒有差，或是否一樣", [
      ["單組對目標值", "平均有沒有達到規格或目標值；成對前後差也在這裡", "hypothesis", "compare", "目標 規格 平均 單組 成對"],
      ["兩組比較", "t 檢定或無母數自動選；獨立或成對", "hypothesis", "compare", "兩組 兩條線 前後 A B 供應商 t檢定 差異 有沒有差"],
      ["三組以上", "ANOVA／Kruskal-Wallis，含重複量測", "hypothesis", "compare", "多組 三組 ANOVA 模穴 批次"],
      ["同等性（TOST）", "轉廠、換料、換設備後，證明一樣", "hypothesis", "compare:equiv", "同等 一樣 轉廠 換料 變更"]]],
    ["🔢 比例與次數", "不良率、過／不過、類別資料", [
      ["單一比例", "不良率有沒有低於目標", "hypothesis", "count", "不良率 比例 目標 過不過"],
      ["多組比例（卡方／Fisher）", "線別、模穴、供應商的不良率有沒有不同", "hypothesis", "count", "卡方 Fisher 不良率 比較 類別 漏液"]]],
    ["🎯 宣稱規格符合", "至少多少比例落在規格內", [
      ["統計允差區間", "例如有 95% 信心，99% 產品落在規格內", "hypothesis", "tol", "允差 規格 99% 95% 宣稱 確效"],
      ["可靠度（全部通過才算）", "測幾個 0 失效，可宣稱 95/95", "sample", "q5", "可靠度 95/95 全過 0 失效 成功試驗"]]],
    ["📈 關係", "一個變數和另一個有沒有關係", [
      ["相關與回歸", "溫度 vs 強度、使用時數 vs 照度", "regression", "", "相關 回歸 關係 趨勢 散佈圖"]]],
    ["📐 量測系統（MSA）", "量具、檢驗員可不可信", [
      ["Gage R&R", "計量：重複性、再現性、ndc", "msa", "grr", "GRR 量具 重複性 再現性 量測系統"],
      ["偏差／線性／穩定性", "量具準不準、整個範圍準不準、穩不穩", "msa", "bias", "偏差 線性 穩定性 校正"],
      ["屬性一致性", "目檢 OK／NG 判定一致嗎（Kappa）", "msa", "attr", "屬性 目檢 判定 Kappa 一致性"]]],
    ["🏭 製程穩定與能力（SPC）", "製程有沒有失控、能力夠不夠", [
      ["管制圖", "自動選 I-MR、X̄-R、p、c 等，判異規則", "spc", "", "管制圖 SPC 失控 穩定 趨勢"],
      ["製程能力 Cpk", "和規格比，能力夠不夠", "spc", "", "Cpk Ppk 製程能力 規格"]]],
    ["🧪 找最佳參數", "哪些參數有影響、怎麼設定", [
      ["DOE 全因子／部分因子", "2 水準實驗設計與分析", "doe", "fact", "DOE 實驗設計 參數 因子 最佳化"],
      ["混料設計", "配方比例的最佳化", "doe", "mix", "混料 配方 比例"],
      ["田口方法", "讓產品對雜音不敏感的設定（S/N 比）", "taguchi", "", "田口 穩健 雜音 S/N"]]],
    ["🧮 要測幾個（樣本數）", "試驗前規劃數量與理由", [
      ["依「要證明什麼」選題", "① ～ ⑫ 題目卡，含 ★ 新產品開發導引", "sample", "", "樣本數 要測幾個 規劃 檢定力"],
      ["AQL 抽樣（ISO 2859-1）", "進料、出貨批次檢驗：抽多少、幾個不良算不合格", "sample", "q11", "AQL 抽樣 進料 出貨 批次 2859"]]],
    ["📚 其他", "學習與計算驗證", [
      ["統計觀念圖解", "非統計背景的說明與互動圖", "learn", "", "學習 觀念 圖解 教學"],
      ["計算驗證（確效）", "本工具的計算和 SciPy、NIST 比對的結果", "validation", "", "確效 驗證 SciPy NIST 正確性"]]]
  ];
  function tbRender() {
    const g = $("tbGrid"); if (!g) return;
    g.innerHTML = TB.map(([t, q, ms]) => `<section class="tb-g"><h3>${t}</h3><div class="hint">${q}</div>${ms.map(m => `<div class="tb-m" data-kw="${esc((m[0] + " " + m[1] + " " + m[4]).toLowerCase())}"><span><b>${esc(m[0])}</b><small>${esc(m[1])}</small></span><button type="button" class="btn small" data-tb="${m[2]}|${m[3]}">開啟</button></div>`).join("")}</section>`).join("");
  }
  function tbOpen(r, sub) {
    navCtx = "toolbox";
    if (r === "learn") { const a = $("learnLink"); if (a) window.open(a.href, "_blank", "noopener"); return; }
    if (r === "sample" && /^q\d+$/.test(sub)) { const b = document.querySelector('.toolnav [data-route="sample"]'); if (b) b.click(); try { ssPick(sub); } catch (_) {} return; }
    const [s, extra] = String(sub || "").split(":");
    try { gotoTool(r, s || undefined); } catch (_) { const b = document.querySelector(`.toolnav [data-route="${r}"]`); if (b) b.click(); }
    if (extra === "equiv") { const c = document.querySelector('#goalChips [data-goal="equiv"]'); if (c) c.click(); }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  (function tbInit() {
    if (!$("tbGrid")) return; tbRender();
    $("tbGrid").addEventListener("click", e => { const b = e.target.closest("[data-tb]"); if (!b) return; const [r, s] = b.dataset.tb.split("|"); tbOpen(r, s); });
    $("tbSearch").addEventListener("input", () => {
      const q = $("tbSearch").value.trim().toLowerCase(), ws = q.split(/\s+/).filter(Boolean); let n = 0;
      document.querySelectorAll("#tbGrid .tb-m").forEach(m => { const ok = !q || ws.some(w => m.dataset.kw.includes(w)) || m.dataset.kw.split(/\s+/).some(k => k.length >= 2 && q.includes(k)); m.hidden = !ok; if (ok) n++; });
      document.querySelectorAll("#tbGrid .tb-g").forEach(g => { g.hidden = ![...g.querySelectorAll(".tb-m")].some(m => !m.hidden); });
      $("tbNone").hidden = n > 0;
    });
  })();

  // ---------------- 工具頁上方的麵包屑：從哪裡來、怎麼回去 ----------------
  const CRUMB_NAME = { sample: "樣本數規劃", hypothesis: "假設檢定", regression: "相關與回歸", msa: "MSA 量測系統分析", spc: "SPC 管制圖", doe: "DOE 實驗設計", taguchi: "田口方法", validation: "計算驗證" };
  function crumbRender() {
    Object.keys(CRUMB_NAME).forEach(r => {
      const v = document.querySelector(`[data-view="${r}"]`); if (!v || v.hidden) return;
      let c = v.querySelector(":scope > .crumb"); if (!c) { c = document.createElement("div"); c.className = "crumb"; v.prepend(c); }
      c.innerHTML = navCtx === "plan" ? `<button type="button" class="linkbtn" data-route-go="plan">← 回到 ③ 驗證計畫</button><span class="hint">　正在用「${CRUMB_NAME[r]}」驗證項目；做完按結果下方的「驗證結束，並儲存到報告」</span>` : `<button type="button" class="linkbtn" data-route-go="toolbox">🧰 工具箱</button><span class="hint"> › ${CRUMB_NAME[r]}</span>`;
    });
  }
  setTimeout(() => { Object.keys(CRUMB_NAME).forEach(r => { const v = document.querySelector(`[data-view="${r}"]`); if (v) new MutationObserver(() => { if (!v.hidden) crumbRender(); }).observe(v, { attributes: true, attributeFilter: ["hidden"] }); }); crumbRender(); }, 0);
  // 回到驗證計畫或工具箱時，重設來源
  document.addEventListener("click", e => { const g = e.target.closest('[data-route-go="plan"], .toolnav [data-route="plan"]'); if (g) navCtx = "plan"; const t = e.target.closest('[data-route-go="toolbox"], .toolnav [data-route="toolbox"]'); if (t) navCtx = "toolbox"; }, true);
