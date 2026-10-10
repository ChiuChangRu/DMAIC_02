  // =====================================================================
  // 案件存取：把目前整個網站的內容（定義問題、魚骨圖、各工具的資料與設定、規劃表單）存成一個「案件」
  // A. 匯出成 .json 檔、再匯入；B. 存在這個瀏覽器的案件清單（可切換、刪除）
  // 分析結果不存：載入後由程式重新計算。附件不存。AI 對話紀錄預設不存（勾選才存）。
  // 載入、開新案件時重新整理頁面，從乾淨的狀態還原，避免上一個案件的結果殘留。
  // =====================================================================
  const CASE_LIST = "mdqs.cases.v1", CASE_PENDING = "mdqs.case.pending", CASE_CUR = "mdqs.case.current", CASE_FMT = "mdqs-case", CASE_VER = 1;
  const CASE_VIEWS = ["viewHome", "viewAnalyze", "viewSample", "viewSPC", "viewMSA", "viewDOE", "viewTaguchi"];
  const caseSkip = el => !el.id || /^km/.test(el.id) || el.type === "file" || el.type === "button" || el.type === "password" || el.closest("#aiPanel") || (el.closest(".mp-card") && !/Desc$/.test(el.id));
  const caseLoadList = () => { try { const a = JSON.parse(localStorage.getItem(CASE_LIST) || "[]"); return Array.isArray(a) ? a : []; } catch (_) { return []; } };
  const caseSaveList = a => { localStorage.setItem(CASE_LIST, JSON.stringify(a)); };
  const caseNow = () => new Date().toLocaleString("zh-TW", { hour12: false });
  const caseId = () => "c" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  let caseCur = null; try { caseCur = JSON.parse(sessionStorage.getItem(CASE_CUR) || "null"); } catch (_) { caseCur = null; }
  function caseNote(m, bad) { $("caseHint").innerHTML = m ? (bad ? `<span class="status ng">${esc(m)}</span>` : esc(m)) : ""; }
  function caseDefaultName() {
    const t = (fb && fb.problem || "").trim() || ($("homeQ").value || "").trim() || CASE_VIEWS.map(v => { const b = document.querySelector(`#${v} textarea[id$="Problem"]`); return b ? b.value.trim() : ""; }).find(Boolean) || "";
    return (t ? t.replace(/\s+/g, " ").slice(0, 24) : "未命名案件") + "（" + new Date().toISOString().slice(0, 10) + "）";
  }

  // ---- 擷取目前內容 ----
  function caseCapture(withChat) {
    const fields = {}, chips = {}, subs = {};
    CASE_VIEWS.forEach(vid => {
      const v = $(vid); if (!v) return;
      v.querySelectorAll("input, select, textarea").forEach(el => { if (caseSkip(el)) return; fields[el.id] = el.type === "checkbox" ? !!el.checked : el.value; });
      v.querySelectorAll(".chips[id]").forEach(g => { if (g.closest(".mp-card") || g.closest("#aiPanel")) return; const b = g.querySelector('[aria-pressed="true"]'); if (!b) return; const a = ["v", "mode", "alt"].find(x => b.dataset[x] != null); if (a) chips[g.id] = [a, b.dataset[a]]; });
      v.querySelectorAll(".subtabs").forEach((s, i) => { const b = s.querySelector('[aria-selected="true"]'); if (!b) return; const key = s.id || vid + ":" + i; subs[key] = b.dataset.tsub || b.dataset.sub || ""; });
    });
    const ran = { hyp: !!state.result, spc: !!TQ.spc, grr: !!TQ.grr, bias: !!TQ.bias, lin: !!TQ.lin, stab: !!TQ.stab, attr: !!TQ.attr, doe: !!TQ.doe, tg: !!TQ.tg, pw: !!pw.result, at: !!at.result, prop: !!TQ.prop, tolp: !!TQ.tolp, doer: !!TQ.doer };
    const data = {
      fields, chips, subs, ran, sampleSub,
      fb: JSON.parse(JSON.stringify(fb)),
      toolProblems: JSON.parse(JSON.stringify(toolProblems)),
      doeF: JSON.parse(JSON.stringify(doeF)), doeY: doe ? JSON.parse(JSON.stringify(doe.y)) : null,
      tgF: JSON.parse(JSON.stringify(tgF)), tgNoise: tgNoise.slice(), tgY: tg ? JSON.parse(JSON.stringify(tg.y)) : null,
      msa: { type: MP.type, p: JSON.parse(JSON.stringify(MP.p)), m: Object.assign({}, MP.m), sheet: MP.sheet ? JSON.parse(JSON.stringify(MP.sheet)) : null, desc: $("mpDesc").value },
      spc: { m: Object.assign({}, SP.m), sheet: SP.sheet ? JSON.parse(JSON.stringify(SP.sheet)) : null, desc: $("spDesc").value },
      plans: Object.fromEntries(Object.entries(PLANS).map(([k, p]) => [k, p.state()]))
    };
    if (withChat) {
      const all = Object.assign({}, chats); all[chatKey] = { turns, log: chatLog };
      data.chats = Object.fromEntries(Object.entries(all).filter(([, c]) => c && Array.isArray(c.log) && c.log.length).map(([k, c]) => [k, { turns: c.turns || [], log: c.log }]));
    }
    return data;
  }
  function caseWrap(name, data) { return { format: CASE_FMT, version: CASE_VER, name, savedAt: new Date().toISOString(), data }; }

  // ---- 還原（在剛載入的乾淨頁面上執行） ----
  function caseRestore(c) {
    const d = c.data || {}, step = (lab, f) => { try { f(); } catch (e) { console.warn("case restore", lab, e); } };
    step("objects", () => {
      if (Array.isArray(d.doeF)) d.doeF.forEach((f, i) => { if (doeF[i] && f) doeF[i] = { name: String(f.name || ""), lo: String(f.lo ?? ""), hi: String(f.hi ?? "") }; });
      if (Array.isArray(d.tgF)) d.tgF.forEach((f, i) => { if (tgF[i] && f) tgF[i] = { name: String(f.name || ""), L: f.L === 3 ? 3 : 2, lab: Array.isArray(f.lab) ? f.lab.map(String).slice(0, 3) : tgF[i].lab }; });
      if (Array.isArray(d.tgNoise)) d.tgNoise.forEach((x, i) => { if (i < tgNoise.length) tgNoise[i] = String(x); });
    });
    step("subtabs", () => Object.entries(d.subs || {}).forEach(([key, val]) => {
      const box = key.includes(":") ? $(key.split(":")[0]).querySelectorAll(".subtabs")[+key.split(":")[1]] : $(key);
      const b = box && box.querySelector(`[data-tsub="${val}"], [data-sub="${val}"]`); if (b) b.click();
    }));
    step("chips", () => Object.entries(d.chips || {}).forEach(([id, [a, v]]) => { const g = $(id); const b = g && g.querySelector(`[data-${a}="${v}"]`); if (b && b.getAttribute("aria-pressed") !== "true") b.click(); }));
    step("fields", () => {
      const F = d.fields || {}, ids = Object.keys(F).filter(id => $(id));
      const order = id => $(id).tagName === "SELECT" ? 0 : $(id).tagName === "INPUT" ? 1 : 2;
      ids.sort((a, b) => order(a) - order(b)).forEach(id => {
        const el = $(id), v = F[id];
        if (el.type === "checkbox") { if (el.checked !== !!v) { el.checked = !!v; el.dispatchEvent(new Event("change", { bubbles: true })); } return; }
        if (el.value === String(v)) return;
        el.value = String(v); if (id !== "pasteBox" && id !== "tlBox") el.dispatchEvent(new Event(el.tagName === "SELECT" ? "change" : "input", { bubbles: true }));
      });
    });
    step("fishbone", () => { if (d.fb && fbValid(d.fb)) { fb = fbRepair(JSON.parse(JSON.stringify(d.fb))); popClose(); fbRenderEditor(); fbSaveNow(); } });
    step("problems", () => Object.entries(d.toolProblems || {}).forEach(([k, v]) => { toolProblems[k] = v; }));
    step("msa", () => { const s = d.msa; if (!s) return; Object.keys(MP.p).forEach(t => { if (s.p && s.p[t]) MP.p[t] = Object.assign({}, MP.p[t], s.p[t]); }); MP.m = Object.assign({}, MP.m, s.m || {}); $("mpDesc").value = s.desc || ""; setMpType(MP_NAME[s.type] ? s.type : "grr", true); if (s.sheet && s.sheet.t === MP.type) { MP.sheet = s.sheet; mpSheetHtml(); } });
    step("spc", () => { const s = d.spc; if (!s) return; SP.m = Object.assign({}, SP.m, s.m || {}); $("spDesc").value = s.desc || ""; spRenderForm(); if (s.sheet) { SP.sheet = s.sheet; spSheetHtml(); } });
    step("plans", () => Object.entries(d.plans || {}).forEach(([k, m]) => { if (PLANS[k]) PLANS[k].restore(m); }));
    const R = d.ran || {};
    step("doe", () => { if (d.doeY) { doeFactorsUI(); doeGenerate(d.doeY); if (R.doe) doeRun(); } });
    step("tg", () => { tgFactorsUI(); tgNoiseUI(); if (d.tgY) { if (tgGenerate(d.tgY) !== false && R.tg) $("tgRun").click(); } });
    step("hyp", () => { if (($("pasteBox").value || "").trim()) { pkHypTouched = true; reparse(false); if (R.hyp) run(); } });
    step("spcRun", () => { if (R.spc && $("spcData").value.trim()) spcRun(); });
    step("msaRun", () => { [["grr", grrRun], ["bias", biasRun], ["lin", linRun], ["stab", stabRun], ["attr", attrRun]].forEach(([k, f]) => { if (R[k]) f(); }); });
    step("sample", () => { if (R.pw) $("pwRun").click(); if (R.at) $("atRun").click(); if (R.prop) $("prRun").click(); if (R.tolp) $("tpRun").click(); if (R.doer) $("drRun").click(); if (d.sampleSub) { const b = $("ssTabs").querySelector(`[data-tsub="${d.sampleSub}"]`); if (b) b.click(); } });
    step("chats", () => {
      if (!d.chats) return;
      Object.entries(d.chats).forEach(([k, ch]) => {
        if (!ch || !Array.isArray(ch.log)) return;
        if (k === "fishbone") { fbLoadChat({ turns: ch.turns || [], log: ch.log }); return; }
        const c = { turns: Array.isArray(ch.turns) ? ch.turns : [], log: ch.log, lastCtx: "", prefix: "", html: logHtml(ch.log, k) };
        if (k === chatKey) { chatGen++; turns = c.turns; chatLog = c.log; chatLastCtx = ""; chatPrefix = ""; $("msgs").innerHTML = c.html; } else chats[k] = c;
      });
      updateChatControls();
    });
    route("home");
  }

  // ---- 載入／開新：重新整理頁面後再還原 ----
  function caseOpen(entry) {
    try { sessionStorage.setItem(CASE_PENDING, JSON.stringify(entry ? (entry.demo ? { demo: entry.id } : { id: entry.id }) : { blank: true })); } catch (_) {}
    let reloaded = false; window.addEventListener("pagehide", () => { reloaded = true; }, { once: true });
    try { location.reload(); } catch (_) {}
    // 若這個檢視不允許重新整理，改成直接在頁面上還原（上一案件的部分結果畫面可能殘留，重新分析即更新）
    setTimeout(() => { if (reloaded) return; try { sessionStorage.removeItem(CASE_PENDING); } catch (_) {} caseApplyHere(entry); }, 1800);
  }
  function caseApplyHere(entry) {
    newProblemReset(false);
    if (entry) { caseRestore(entry.c); caseSetCur(entry.demo ? null : entry); caseNote(`已載入「${entry.name}」。（這個檢視無法重新整理頁面，若看到上一個案件的結果，請重新分析一次）`); }
    else { caseSetCur(null); caseNote("已開新案件。各工具的數據請用各頁的「清除」或直接覆蓋。"); }
    caseRender();
  }
  function caseSetCur(entry) { caseCur = entry ? { id: entry.id, name: entry.name } : null; try { if (caseCur) sessionStorage.setItem(CASE_CUR, JSON.stringify(caseCur)); else sessionStorage.removeItem(CASE_CUR); } catch (_) {} caseBadge(); }
  function caseBadge() { const b = $("caseBadge"); if (b) { b.hidden = !caseCur; b.textContent = caseCur ? "案件：" + caseCur.name : ""; } }

  // ---- 儲存到瀏覽器清單 ----
  function caseStore(asNew) {
    const name = ($("caseName").value || "").trim() || caseDefaultName(), withChat = $("caseChat").checked;
    const c = caseWrap(name, caseCapture(withChat)), list = caseLoadList();
    let entry;
    if (!asNew && caseCur && list.some(x => x.id === caseCur.id)) { entry = list.find(x => x.id === caseCur.id); entry.name = name; entry.c = c; entry.savedAt = c.savedAt; }
    else { entry = { id: caseId(), name, savedAt: c.savedAt, c }; list.unshift(entry); }
    try { caseSaveList(list); } catch (e) { caseNote("瀏覽器空間不足，無法存入清單。請先「匯出」成檔案保存，或刪除舊案件。", true); return false; }
    caseSetCur(entry); caseRender(); caseNote(`已儲存「${name}」${withChat ? "（含 AI 對話）" : "（不含 AI 對話）"}。這份只存在這個瀏覽器，建議另外「匯出」備份。`);
    return true;
  }
  function caseExport(c) {
    const data = JSON.stringify(c, null, 1), fn = `案件_${String(c.name).replace(/[\\/:*?"<>|\s]+/g, "_").slice(0, 40)}.json`;
    if (!downloads) { caseNote("這個檢視無法下載檔案。", true); return; }
    Promise.resolve().then(() => downloads.save({ filename: fn, data })).then(() => caseNote("已匯出。檔案在你的電腦，請依公司規定保管。")).catch(e => { if (!(e && e.code === "declined")) caseNote("無法下載檔案。", true); });
  }
  function caseValid(o) { return o && o.format === CASE_FMT && typeof o.version === "number" && o.data && typeof o.data === "object"; }
  async function caseImport(file) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { caseNote("檔案太大（超過 5 MB），不像是案件檔。", true); return; }
    let o; try { o = JSON.parse(await file.text()); } catch (_) { caseNote("讀不到這個檔案：不是有效的案件檔（.json）。", true); return; }
    if (!caseValid(o)) { caseNote("這不是本網站匯出的案件檔。", true); return; }
    if (o.version > CASE_VER) { caseNote("這個案件檔來自較新版本的網站，請先更新網頁。", true); return; }
    const entry = { id: caseId(), name: String(o.name || "匯入的案件").slice(0, 60), savedAt: o.savedAt || new Date().toISOString(), c: o }, list = caseLoadList();
    list.unshift(entry);
    try { caseSaveList(list); } catch (_) { caseNote("瀏覽器空間不足，無法加入清單；請刪除舊案件後再匯入。", true); return; }
    caseRender(); caseNote(`已匯入「${entry.name}」到清單。按「載入」即可使用。`);
  }
  function caseRender() {
    const list = caseLoadList();
    $("caseCurLine").innerHTML = caseCur ? `目前案件：<b>${esc(caseCur.name)}</b>` : "";
    $("caseSaveOver").hidden = !(caseCur && list.some(x => x.id === caseCur.id));
    if (!$("caseName").value && caseCur) $("caseName").value = caseCur.name;
    const size = s => { const n = JSON.stringify(s).length; return n > 1e6 ? (n / 1e6).toFixed(1) + " MB" : Math.max(1, Math.round(n / 1e3)) + " KB"; };
    $("caseList").innerHTML = list.length ? `<table class="mini"><thead><tr><th>案件</th><th>儲存時間</th><th>大小</th><th></th></tr></thead><tbody>${list.map(x => `<tr${caseCur && caseCur.id === x.id ? ' class="case-cur"' : ""}><td>${esc(x.name)}${x.c && x.c.data && x.c.data.chats ? '<span class="hint">（含 AI 對話）</span>' : ""}</td><td>${esc(new Date(x.savedAt).toLocaleString("zh-TW", { hour12: false }))}</td><td>${size(x.c)}</td><td class="case-btns"><button type="button" class="btn small" data-case="load" data-id="${x.id}">載入</button><button type="button" class="btn small" data-case="export" data-id="${x.id}">匯出</button><button type="button" class="btn small ghost" data-case="del" data-id="${x.id}">刪除</button></td></tr>`).join("")}</tbody></table>` : `<p class="hint">清單是空的。</p>`;
  }
  $("caseList").addEventListener("click", e => {
    const b = e.target.closest("[data-case]"); if (!b) return;
    const list = caseLoadList(), x = list.find(y => y.id === b.dataset.id); if (!x) { caseRender(); return; }
    if (b.dataset.case === "export") caseExport(x.c);
    else if (b.dataset.case === "load") {
      if (!b.dataset.ok) { b.dataset.ok = "1"; b.textContent = "確定載入？"; caseNote(`載入「${x.name}」會取代目前網頁上所有內容（尚未儲存的會遺失）。再按一次「確定載入？」。`); setTimeout(() => { if (b.isConnected) { delete b.dataset.ok; b.textContent = "載入"; } }, 5000); return; }
      caseNote("載入中…"); caseOpen(x);
    } else if (b.dataset.case === "del") {
      if (!b.dataset.ok) { b.dataset.ok = "1"; b.textContent = "確定刪除？"; caseNote(`刪除「${x.name}」只會刪掉這個瀏覽器裡的這一筆，已匯出的檔案不受影響。再按一次「確定刪除？」。`); setTimeout(() => { if (b.isConnected) { delete b.dataset.ok; b.textContent = "刪除"; } }, 5000); return; }
      try { caseSaveList(list.filter(y => y.id !== x.id)); } catch (_) {}
      if (caseCur && caseCur.id === x.id) caseSetCur(null);
      caseRender(); caseNote(`已刪除「${x.name}」。`);
    }
  });
  $("caseSaveNew").addEventListener("click", () => caseStore(true));
  $("caseSaveOver").addEventListener("click", () => caseStore(false));
  $("caseExportNow").addEventListener("click", () => caseExport(caseWrap(($("caseName").value || "").trim() || caseDefaultName(), caseCapture($("caseChat").checked))));
  $("caseImportBtn").addEventListener("click", () => $("caseFile").click());
  $("caseFile").addEventListener("change", e => { caseImport(e.target.files && e.target.files[0]); e.target.value = ""; });
  $("caseNew").addEventListener("click", () => {
    const b = $("caseNew"); if (!b.dataset.ok) { b.dataset.ok = "1"; b.textContent = "確定清空？"; caseNote("開新案件會清空網頁上所有內容（定義問題、魚骨圖、各工具的資料、AI 對話）；尚未儲存的會遺失。再按一次「確定清空？」。"); setTimeout(() => { delete b.dataset.ok; b.textContent = "開新案件（清空全部）"; }, 5000); return; }
    caseOpen(null);
  });

  // ---- 內建範例：下拉選單選取 → 先警告存檔 → 載入 ----
  const demoBy = id => CASE_DEMOS.find(x => x.id === id);
  $("demoSel").innerHTML = `<option value="">— 選擇範例 —</option>` + CASE_DEMOS.map(x => `<option value="${x.id}">${esc(x.name)}</option>`).join("");
  function demoAskHide() { $("demoAsk").hidden = true; $("demoAsk").innerHTML = ""; }
  $("demoSel").addEventListener("change", () => {
    const x = demoBy($("demoSel").value);
    $("demoDesc").textContent = x ? x.desc : "";
    if (!x) { demoAskHide(); return; }
    $("demoAsk").innerHTML = `<p>⚠ 載入範例會取代目前網頁上所有內容（定義問題、魚骨圖、各工具的資料、AI 對話）。目前的內容如果還沒存檔，會遺失。</p>
      <div class="run-row" style="margin:0"><button class="btn primary small" type="button" data-demo="save">先存成案件，再載入範例</button><button class="btn small" type="button" data-demo="go">不存檔，直接載入</button><button class="btn small ghost" type="button" data-demo="cancel">取消</button></div>`;
    $("demoAsk").hidden = false;
  });
  $("demoAsk").addEventListener("click", e => {
    const b = e.target.closest("[data-demo]"); if (!b) return;
    const x = demoBy($("demoSel").value);
    if (b.dataset.demo === "cancel" || !x) { demoAskHide(); $("demoSel").value = ""; $("demoDesc").textContent = ""; return; }
    if (b.dataset.demo === "save" && !caseStore(true)) return;
    demoAskHide(); caseNote("載入範例中…"); caseOpen({ demo: true, id: x.id, name: x.name, c: x.c });
  });

  // ---- 開啟頁面時：處理待還原的案件 ----
  (function caseBoot() {
    let p = null; try { p = JSON.parse(sessionStorage.getItem(CASE_PENDING) || "null"); sessionStorage.removeItem(CASE_PENDING); } catch (_) { p = null; }
    if (p && p.blank) { caseSetCur(null); setTimeout(() => { try { newProblemReset(false); } catch (_) {} caseNote("已開新案件。"); }, 0); }
    else if (p && p.demo) {
      const x = demoBy(p.demo);
      if (x) setTimeout(() => { caseRestore(x.c); caseSetCur(null); caseRender(); caseNote(`已載入範例「${x.name}」。數據全部為模擬；要保留你的修改，請按「另存新案件」。`); }, 0);
    }
    else if (p && p.id) {
      const x = caseLoadList().find(y => y.id === p.id);
      if (x) setTimeout(() => { caseRestore(x.c); caseSetCur(x); caseRender(); caseNote(`已載入「${x.name}」（${caseNow()}）。分析結果已由程式重新計算。`); }, 0);
    }
    caseRender(); caseBadge();
  })();
