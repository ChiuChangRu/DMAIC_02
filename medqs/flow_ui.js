  // =====================================================================
  // 解決問題流程列：工具分頁不變（每個工具都能直接用）；流程列只依資料判斷進度、提供跳轉與「暫存進度」。
  // 暫存＝按了才存（存成案件，存在這個瀏覽器）；不自動存。
  // =====================================================================
  const FLOW_STEPS = [
    { k: "def", lab: "定義問題", go: ["home"] },
    { k: "fb", lab: "魚骨圖", go: ["fishbone", "fbTop"] },
    { k: "vp", lab: "驗證項目", go: ["fishbone", "fbVerify"] },
    { k: "ss", lab: "樣本數", go: ["sample"] },
    { k: "an", lab: "檢定分析", go: ["hypothesis"] },
    { k: "rp", lab: "PDCA 報告", go: ["pdca"] }
  ];
  const FLOW_VIEWS = ["home", "fishbone", "sample", "hypothesis", "pdca"];
  const flowTry = f => { try { return !!f(); } catch (_) { return false; } };
  function flowDone() {
    const any = o => o && Object.values(o).some(Boolean);
    return {
      def: flowTry(() => ($("homeQ").value || "").trim() || (chats.home && chats.home.log && chats.home.log.length) || (chatKey === "home" && chatLog.length)),
      fb: flowTry(() => fb.factors.some(f => f.st === "use")),
      vp: flowTry(() => (fb.vplan || []).some(x => x.on) || fb.factors.some(f => f.verify && f.st !== "excl")),
      ss: flowTry(() => { const v = (fb.vplan || []).filter(x => x.on); if (v.length) return v.every(svOk); return pw.result || at.result || TQ.prop || TQ.tolp || TQ.doer || TQ.tost || TQ.ni || TQ.aql; }),
      an: flowTry(() => (state.result && !Object.values(EXAMPLES).some(e => e && e.text === $("pasteBox").value)) || tl.result || CT.result || TQ.spc || TQ.grr || TQ.bias || TQ.lin || TQ.stab || TQ.attr || TQ.doe || TQ.tg || REG.res),
      rp: flowTry(() => fb.pdca && (fb.pdca.out || any(fb.pdca.t) || any(fb.pdca.c)))
    };
  }
  // ---- 多輪實驗：每一輪完整封存（除非使用者刪除），目前畫面資料不清空；退回步驟之後的步驟要「資料有變動」才重新打勾 ----
  let RD = { n: 1, from: -1, base: {}, list: [] };
  const RD_RES = { ng: "未達目標", part: "部分改善", ok: "達到目標" };
  const rdHash = str => { let h = 5381; for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0; return String(h >>> 0); };
  const rdView = ids => ids.map(id => { const v = $(id); if (!v) return ""; return [...v.querySelectorAll("input, textarea, select")].filter(el => el.type !== "file" && el.type !== "button").map(el => el.type === "checkbox" ? (el.checked ? 1 : 0) : el.value).join("\u0001"); }).join("\u0002");
  function rdSigs() {
    const J = o => { try { return JSON.stringify(o); } catch (_) { return ""; } };
    return {
      def: rdHash(($("homeQ") || {}).value || ""),
      fb: rdHash(J(fb.factors.map(f => [f.text, f.st, f.cat, f.subs.map(x => [x.text, x.st])]))),
      vp: rdHash(J([fb.vplan, fb.factors.map(f => f.verify)])),
      ss: rdHash(rdView(["viewSample"])),
      an: rdHash(rdView(["viewAnalyze", "viewSPC", "viewMSA", "viewDOE", "viewTaguchi", "viewReg"])),
      rp: rdHash(J(fb.pdca || {}))
    };
  }
  function rdRedo() {   // 回傳哪些步驟「本輪還沒重做」
    const r = {}; if (RD.from < 0) return r; const now = rdSigs();
    FLOW_STEPS.forEach((st, i) => { if (i >= RD.from && RD.base[st.k] != null && RD.base[st.k] === now[st.k]) r[st.k] = true; });
    return r;
  }
  let flowMin = false; try { flowMin = localStorage.getItem("mdqs.flow.min") === "1"; } catch (_) {}
  let flowSig = "", flowNoResume = false, flowHistOpen = false;
  function flowCase() { try { if (!caseCur) return null; const e = caseLoadList().find(x => x.id === caseCur.id); return e ? { name: e.name, at: e.savedAt } : null; } catch (_) { return null; } }
  const flowHM = iso => { const d = new Date(iso); return isNaN(d) ? "" : `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; };
  function flowResume() {   // 開啟網頁時：還沒有內容、也沒有目前案件 → 提示最近一次暫存的案件
    try { if (flowNoResume || caseCur) return null; const d = flowDone(); if (Object.values(d).some(Boolean)) return null; const L = caseLoadList(); return L.length ? L[0] : null; } catch (_) { return null; }
  }
  function flowRender(force) {
    const box = $("flowBar"); if (!box) return;
    const d0 = flowDone(), redo = rdRedo(), d = {}; FLOW_STEPS.forEach(st => { d[st.k] = d0[st.k] && !redo[st.k]; });
    const nowI = FLOW_STEPS.findIndex(s => !d[s.k]), nDone = FLOW_STEPS.filter(s => d[s.k]).length;
    const inFlow = FLOW_VIEWS.includes(currentView), mini = flowMin || !inFlow, cs = flowCase(), rs = flowResume();
    const sig = JSON.stringify([d, redo, mini, cs, rs && rs.id, currentView, RD.n, RD.list.length, flowHistOpen]);
    if (!force && sig === flowSig) return; flowSig = sig;
    const save = `<button type="button" class="fl-save" data-fl="save" title="存成案件（存在這個瀏覽器；換電腦請到「AI 設定與案件存取」匯出）">💾 ${mini ? "暫存" : "暫存進度"}</button>`;
    const caseTxt = cs ? `案件：${esc(cs.name)}　上次暫存 ${flowHM(cs.at)}` : "尚未暫存";
    const resume = rs ? `<div class="fl-resume">繼續上次的案件：<b>${esc(rs.name)}</b>（${flowHM(rs.savedAt)} 暫存）<button type="button" class="fl-mini-btn" data-fl="resume" data-id="${rs.id}">載入</button><button type="button" class="fl-x" data-fl="noresume">不用</button></div>` : "";
    if (mini) {
      box.className = "flow-wrap mini";
      box.innerHTML = `${resume}<div class="fl-minirow"><button type="button" class="fl-open" data-fl="open">📋 解決問題流程${RD.n > 1 ? `（第 ${RD.n} 輪）` : ""}　<b>已完成 ${nDone}／${FLOW_STEPS.length}</b>${nowI >= 0 ? `　下一步：${FLOW_STEPS[nowI].lab}` : "　全部完成"}　展開 ▾</button>${save}</div>`;
      return;
    }
    box.className = "flow-wrap";
    const st = (s, i) => { const done = d[s.k], now = i === nowI, rd = redo[s.k];
      const sub = done ? "已完成" : now ? (rd ? `第 ${RD.n} 輪：修改中` : "目前在這一步") : rd ? `第 ${RD.n} 輪待重做` : "未開始";
      return `<li class="${done ? "done" : now ? "now" : rd ? "redo" : ""}"><button type="button" class="st" data-fl="go" data-i="${i}" aria-label="${s.lab}：${sub}"><span class="dot">${done ? "✓" : i + 1}</span><span class="lab">${s.lab}</span><span class="sub">${sub}</span></button></li>`; };
    const hist = RD.list.length ? `<details class="rd-hist"${flowHistOpen ? " open" : ""}><summary data-fl="hist">各輪紀錄（${RD.list.length + 1}）</summary><div class="scroll-x"><table class="rd-tbl"><thead><tr><th>輪次</th><th>日期</th><th>從哪一步開始</th><th>結果</th><th>說明</th><th></th></tr></thead><tbody>${RD.list.map((r, i) => `<tr><td>第 ${r.n} 輪</td><td>${flowHM(r.date)}</td><td>${r.from >= 0 ? FLOW_STEPS[r.from].lab : "—"}</td><td class="${r.result === "ok" ? "rd-ok" : r.result === "part" ? "rd-part" : "rd-ng"}">${RD_RES[r.result] || ""}</td><td>${esc(r.note || "")}</td><td class="rd-btns"><button type="button" class="rd-a" data-fl="view" data-i="${i}">查看</button><button type="button" class="rd-a" data-fl="exp" data-i="${i}">匯出</button><button type="button" class="rd-a rd-del" data-fl="del" data-i="${i}">刪除</button></td></tr>`).join("")}<tr><td>第 ${RD.n} 輪</td><td>—</td><td>${RD.from >= 0 ? FLOW_STEPS[RD.from].lab : "—"}</td><td class="rd-now">進行中</td><td></td><td></td></tr></tbody></table></div><p class="hint">每一輪按「開始下一輪」時完整封存（問題、原因、驗證項目、各工具資料與結果、報告）；除非按「刪除」，不會消失。</p></details>` : "";
    box.innerHTML = `${resume}<div class="flowbar"><div class="fl-top"><span class="fl-t">解決問題流程${RD.n > 1 ? `<span class="rd-badge">第 ${RD.n} 輪</span>` : ""}<small>不一定要照順序，每個工具都能直接用</small></span><span class="fl-act"><button type="button" class="rd-next" data-fl="next" title="這一輪的結果不理想、要回到某一步再試一次時使用">🔁 開始下一輪</button><span class="fl-save-t">${caseTxt}</span>${save}<button type="button" class="fl-x" data-fl="min">收起 ▴</button></span></div><ol>${FLOW_STEPS.map(st).join("")}</ol>${hist}</div>`;
  }
  function rdDialog() {
    let dlg = $("rdDlg"); if (dlg) dlg.remove();
    const chips = (name, opts, def) => `<div class="chips" role="group" data-rdg="${name}">${opts.map(([v, t]) => `<button type="button" class="chip" data-v="${v}" aria-pressed="${v === def}">${t}</button>`).join("")}</div>`;
    document.body.insertAdjacentHTML("beforeend", `<div id="rdDlg" class="rd-wrap"><div class="rd-dlg" role="dialog" aria-modal="true" aria-labelledby="rdT"><h3 id="rdT">🔁 開始第 ${RD.n + 1} 輪</h3>
      <p class="help" style="margin:0">先把第 ${RD.n} 輪完整封存，再從你選的步驟接著改。目前畫面上的資料不會清空；封存時會一併暫存案件。</p>
      <div class="group-label" style="margin-top:10px">第 ${RD.n} 輪的結果</div>${chips("res", [["ng", "未達目標"], ["part", "部分改善"], ["ok", "達到目標"]], "ng")}
      <div class="group-label">要回到哪一步</div>${chips("from", [["1", "② 魚骨圖（重新找原因）"], ["2", "③ 驗證項目（換驗證方式）"], ["3", "④ 樣本數（加量重測）"], ["4", "⑤ 檢定分析（重新分析）"]], "2")}
      <div class="group-label">一句話說明（會寫進紀錄與 PDCA 報告）</div><textarea id="rdNote" rows="3" placeholder="例如：延長熱封時間後強度仍未達規格；下一輪改驗證膜材批次"></textarea>
      <div class="rd-row"><button type="button" class="btn small" data-rd="cancel">取消</button><button type="button" class="btn primary small" data-rd="ok">封存第 ${RD.n} 輪，開始第 ${RD.n + 1} 輪</button></div></div></div>`);
    dlg = $("rdDlg");
    dlg.addEventListener("click", e => {
      const c = e.target.closest("[data-rdg] [data-v]"); if (c) { c.parentElement.querySelectorAll("[data-v]").forEach(x => x.setAttribute("aria-pressed", String(x === c))); return; }
      const b = e.target.closest("[data-rd]"); if (!b && e.target !== dlg) return;
      if (!b || b.dataset.rd === "cancel") { dlg.remove(); return; }
      const pick = g => (dlg.querySelector(`[data-rdg="${g}"] [aria-pressed="true"]`) || {}).dataset;
      const res = (pick("res") || {}).v || "ng", from = +((pick("from") || {}).v || 2), note = ($("rdNote").value || "").trim().slice(0, 300);
      let snap; try { snap = JSON.parse(JSON.stringify(caseCapture(false))); delete snap.rounds; } catch (_) { snap = null; }
      RD.list.push({ n: RD.n, date: new Date().toISOString(), from: RD.from, result: res, note, snap });
      RD.n++; RD.from = from; const sg = rdSigs(); RD.base = {}; FLOW_STEPS.forEach((st, i) => { if (i >= from) RD.base[st.k] = sg[st.k]; });
      dlg.remove(); flowHistOpen = true;
      const ok = caseStore(!flowCase());
      try { fbNote(ok ? `已封存第 ${RD.n - 1} 輪並暫存案件，現在是第 ${RD.n} 輪。` : "已封存，但瀏覽器空間不足、案件沒有存成功，請到「AI 設定與案件存取」匯出。"); } catch (_) {}
      flowRender(true); try { pdcaRender(); } catch (_) {}
      flowGo(from);
    });
    document.addEventListener("keydown", function esc(e) { if (e.key === "Escape" && $("rdDlg")) { $("rdDlg").remove(); document.removeEventListener("keydown", esc); } });
  }
  function rdShow(i) {   // 唯讀檢視：只顯示封存內容的重點；完整內容可「匯出」成案件檔
    const r = RD.list[i]; if (!r) return; const s = r.snap || {}, F = s.fields || {}, f = s.fb || {}, R = s.ran || {};
    const cats = {}; ((f.cats && f.cats[f.set]) || []).forEach(c => { cats[c.id] = c.name; });
    const use = (f.factors || []).filter(x => x.st === "use"), excl = (f.factors || []).filter(x => x.st === "excl"), vp = (f.vplan || []).filter(x => x.on);
    const TN = { hyp: "假設檢定", spc: "SPC", grr: "MSA Gage R&R", bias: "MSA 偏差", lin: "MSA 線性", stab: "MSA 穩定性", attr: "MSA 屬性一致性", doe: "DOE", tg: "田口方法", pw: "樣本數（t 檢定）", at: "樣本數（通過／不通過）", prop: "樣本數（比例）", tolp: "樣本數（允差區間）", doer: "DOE 重複次數", tost: "樣本數（TOST）", ni: "樣本數（不劣性）", reg: "相關與回歸", ct: "次數資料" };
    const ran = Object.keys(R).filter(k => R[k]).map(k => TN[k] || k);
    const li = a => a.length ? `<ul>${a.map(x => `<li>${x}</li>`).join("")}</ul>` : `<p class="hint">（無）</p>`;
    const box = document.createElement("div"); box.id = "rdDlg"; box.className = "rd-wrap";
    box.innerHTML = `<div class="rd-dlg rd-view" role="dialog" aria-modal="true"><h3>第 ${r.n} 輪（唯讀）<span class="hint" style="font-weight:400;font-size:13px">　封存於 ${flowHM(r.date)}　結果：${RD_RES[r.result] || ""}</span></h3>
      ${r.note ? `<p><b>說明：</b>${esc(r.note)}</p>` : ""}
      <h4>問題點</h4><p>${esc(f.problem || F.homeQ || "（無）")}</p>
      <h4>採用的原因（${use.length}）</h4>${li(use.map(x => `${esc(cats[x.cat && x.cat[f.set]] || "")}：${esc(x.text)}${x.verify ? " ◇" : ""}${x.key ? " ★" : ""}`))}
      <h4>排除的原因（${excl.length}）</h4>${li(excl.map(x => `${esc(x.text)}${x.reason ? `（理由：${esc(x.reason)}）` : ""}`))}
      <h4>勾選的驗證項目（${vp.length}）</h4>${li(vp.map(x => `${esc(x.cause)}${x.method ? " — " + esc(x.method) : ""}${x.tool ? `（${esc(x.tool)}）` : ""}`))}
      <h4>當時有結果的工具</h4><p>${ran.length ? esc(ran.join("、")) : "（無）"}</p>
      <p class="hint">這裡只列重點。要看當時每個工具的完整數據與結果，按「匯出」存成案件檔，再到「AI 設定與案件存取」匯入（建議另開一個分頁，避免覆蓋目前這一輪）。</p>
      <div class="rd-row"><button type="button" class="btn small" data-fl-x="exp">匯出這一輪</button><button type="button" class="btn primary small" data-fl-x="close">關閉</button></div></div>`;
    document.body.appendChild(box);
    box.addEventListener("click", e => { const b = e.target.closest("[data-fl-x]"); if (e.target === box || (b && b.dataset.flX === "close")) box.remove(); else if (b) rdExport(i); });
  }
  function rdExport(i) {
    const r = RD.list[i]; if (!r || !r.snap) return;
    try { const cs = flowCase(); caseExport(caseWrap(`${cs ? cs.name : "案件"}（第 ${r.n} 輪，${RD_RES[r.result] || ""}）`, r.snap)); } catch (_) {}
  }
  function flowGo(i) {
    const s = FLOW_STEPS[i]; if (!s) return;
    const b = document.querySelector(`.toolnav [data-route="${s.go[0]}"]`); if (b) b.click(); else route(s.go[0]);
    if (s.go[1]) setTimeout(() => { const el = s.go[1] === "fbTop" ? document.querySelector('[data-view="fishbone"]') : $(s.go[1]); if (el) el.scrollIntoView({ behavior: "smooth", block: "start" }); }, 60);
  }
  setTimeout(function flowInit() {   // 延後到整段程式載入完成（currentView 等變數在後面才宣告）
    const box = $("flowBar"); if (!box) return;
    box.addEventListener("click", e => {
      const b = e.target.closest("[data-fl]"); if (!b) return; const a = b.dataset.fl;
      if (a === "go") flowGo(+b.dataset.i);
      else if (a === "min" || a === "open") { flowMin = a === "min"; try { localStorage.setItem("mdqs.flow.min", flowMin ? "1" : "0"); } catch (_) {} if (a === "open" && !FLOW_VIEWS.includes(currentView)) flowGo(Math.max(0, FLOW_STEPS.findIndex(s => !flowDone()[s.k]))); flowRender(true); }
      else if (a === "save") { const ok = caseStore(!flowCase()); if (ok) { b.textContent = "✓ 已暫存"; b.classList.add("ok"); setTimeout(() => flowRender(true), 1400); } else document.querySelector('.toolnav [data-route="aisettings"]').click(); }
      else if (a === "resume") { const x = caseLoadList().find(y => y.id === b.dataset.id); if (x) caseOpen(x); }
      else if (a === "noresume") { flowNoResume = true; flowRender(true); }
      else if (a === "next") rdDialog();
      else if (a === "hist") { setTimeout(() => { const d = box.querySelector(".rd-hist"); flowHistOpen = !!(d && d.open); }, 0); }
      else if (a === "view") rdShow(+b.dataset.i);
      else if (a === "exp") rdExport(+b.dataset.i);
      else if (a === "del") { if (!b.dataset.armed) { b.dataset.armed = "1"; b.textContent = "確定刪除？"; setTimeout(() => { if (b.isConnected) { delete b.dataset.armed; b.textContent = "刪除"; } }, 4000); return; }
        RD.list.splice(+b.dataset.i, 1); if (flowCase()) caseStore(false); flowRender(true); try { pdcaRender(); } catch (_) {} }
    });
    document.querySelector(".toolnav").addEventListener("click", () => setTimeout(() => flowRender(), 0));
    setInterval(() => { try { flowRender(); } catch (_) {} }, 1500);
    try { flowRender(true); } catch (_) {}
  }, 0);
  function rdState() { return RD; }
  function rdRestore(o) { RD = o && typeof o === "object" && Array.isArray(o.list) ? { n: o.n || o.list.length + 1, from: typeof o.from === "number" ? o.from : -1, base: o.base || {}, list: o.list } : { n: 1, from: -1, base: {}, list: [] }; try { flowRender(true); } catch (_) {} }
