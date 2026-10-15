  // =====================================================================
  // 驗證結果 ↔ 驗證項目：分析工具的結果「驗證結束，並儲存到報告」→ PDCA 報告第 5 段各項結論＋附錄（統計驗證報告）
  // 統計類項目在分析工具存入（保留每一次存入，除非使用者刪除）；不用統計的項目在 PDCA 報告直接選結論、寫依據。
  // 資料：fb.vplan[i].apx = [{ id, at, tool, st, note, html }]、fb.vplan[i].vr = { st, note }（不用統計的項目）
  // =====================================================================
  const VR_ST = { ok: "原因成立", ng: "原因不成立", tbd: "待定" };
  const VR_OUTS = { previewBody: "假設檢定", ctOut: "假設檢定－次數資料", tlOut: "假設檢定－統計允差區間", regOut: "相關與回歸", spcOut: "SPC 管制圖", grrOut: "MSA－Gage R&R", biasOut: "MSA－偏差", linOut: "MSA－線性", stabOut: "MSA－穩定性", attrOut: "MSA－屬性一致性", doeOut: "DOE", mixOut: "DOE－混料設計", tgOut: "田口方法" };
  const vrNonStat = x => /不用統計|不需統計/.test(x.tool || "") || !!(x.ss && x.ss.q === "none");
  const vrItems = () => (fb.vplan || []).filter(x => x.on);
  const vrStatItems = () => vrItems().filter(x => !vrNonStat(x));
  // 目前的結論：統計類取最後一次存入；不用統計的取報告上填的
  function vrNow(x) {
    if (vrNonStat(x)) { const v = x.vr || {}; return { st: v.st || "", note: v.note || "", n: 0 }; }
    const L = x.apx || []; const a = L[L.length - 1]; return a ? { st: a.st, note: a.note, n: L.length } : { st: "", note: "", n: 0 };
  }
  // ---------------- 分析工具結果下方：存成驗證結果 ----------------
  const vrHas = body => !!body.querySelector(".verdict, svg, .kv, .bignum, table");
  function vrAuto(body) {
    const v0 = body.querySelector(".verdict") || body, v = v0.cloneNode(true); v.querySelectorAll(".pill, button").forEach(e => e.remove());
    const t = (v.textContent || "").split(/\n+/).map(s => s.replace(/\s+/g, " ").trim()).filter(Boolean).slice(0, 2).join("；").replace(/。；/g, "；");
    return t.slice(0, 220);
  }
  function vrSlotHtml(id, open) {
    const L = vrStatItems();
    if (!open) { const d = L.filter(x => (x.apx || []).length).length; return `<button type="button" class="vr-open" data-vropen="${id}">✓ 驗證結束，並儲存到報告${L.length ? `　<span class="vr-prog">統計驗證已完成 ${d}／${L.length}</span>` : ""}</button>`; }
    if (!L.length) return `<div class="vr-pick"><b>✓ 驗證結束，並儲存到報告</b><p class="hint" style="margin:4px 0 0">還沒有需要統計的驗證項目。請先在魚骨圖 STEP 3 勾選驗證項目（驗證策略不是「不用統計」的）。</p><div class="vr-row vr-end"><button type="button" class="sv-btn" data-vrclose="${id}">關閉</button></div></div>`;
    const body = $(id), auto = body ? vrAuto(body) : "", tool = VR_OUTS[id] || "";
    const guess = L.find(x => tool && (x.tool || "").includes(tool.split("－")[0])) || L.find(x => !(x.apx || []).length) || L[0];
    return `<div class="vr-pick" data-vrbox="${id}"><b>✓ 驗證結束，並儲存到報告</b><span class="hint">　這份結果畫面會附在 PDCA 報告後面（附錄）</span>
      <div class="vr-row"><label>驗證項目</label><select data-vrit="1">${L.map(x => `<option value="${x.id}"${x === guess ? " selected" : ""}>${esc(x.cause || "（未命名）")}${x.tool ? "（" + esc(x.tool) + "）" : ""}${(x.apx || []).length ? `　已存 ${(x.apx || []).length} 份` : ""}</option>`).join("")}</select></div>
      <div class="vr-row"><label>結論 <span class="vr-req">必選</span></label>${Object.entries(VR_ST).map(([k, t]) => `<button type="button" class="vr-chip" data-vrst="${k}" aria-pressed="false">${t}</button>`).join("")}</div>
      <div class="vr-row vr-col"><label>依據（系統依結果產生，可修改）</label><input type="text" data-vrnote="1" value="${esc(auto)}"></div>
      <div class="vr-row vr-end"><span class="hint" data-vrhint="1"></span><button type="button" class="sv-btn" data-vrclose="${id}">取消</button><button type="button" class="sv-btn vr-save" data-vrsave="${id}">✓ 驗證結束，儲存到報告</button></div></div>`;
  }
  function vrSlot(id, open) {
    const body = $(id); if (!body) return;
    let s = body.nextElementSibling; if (!s || !s.classList.contains("vr-slot")) { s = document.createElement("div"); s.className = "vr-slot"; body.after(s); }
    if (!vrHas(body)) { s.hidden = true; s.innerHTML = ""; return; }
    if (s.dataset.open === "1" && !open && s.innerHTML) return;   // 正在填寫，不重畫
    s.hidden = false; s.dataset.open = open ? "1" : ""; s.innerHTML = vrSlotHtml(id, open);
  }
  function vrSnap(body) {   // 只存結果卡：去掉按鈕、輸入框與互動元件
    const c = body.cloneNode(true);
    c.querySelectorAll("button, input, select, textarea, script, .ss2hyp, .ask-slot, .vr-slot, details > summary ~ .run-row").forEach(e => e.remove());
    c.querySelectorAll("[id]").forEach(e => e.removeAttribute("id"));
    c.querySelectorAll("*").forEach(e => { [...e.attributes].forEach(a => { if (/^on/i.test(a.name)) e.removeAttribute(a.name); }); });
    let h = c.innerHTML.replace(/\s{2,}/g, " ");
    if (h.length > 400000) h = h.replace(/<svg[\s\S]*?<\/svg>/g, "<p>（圖表過大未存入）</p>");
    return h.slice(0, 400000);
  }
  // 驗證策略 → 對應的分析頁
  function vrRoute(tool) {
    const t = String(tool || "");
    if (/次數|不良率|卡方/.test(t)) return ["hypothesis", "count"]; if (/允差/.test(t)) return ["hypothesis", "tol"]; if (/假設檢定/.test(t)) return ["hypothesis", "compare"];
    if (/回歸|相關/.test(t)) return ["regression"]; if (/SPC|管制/.test(t)) return ["spc"];
    if (/MSA/.test(t)) return ["msa", /偏差/.test(t) ? "bias" : /線性/.test(t) ? "lin" : /穩定/.test(t) ? "stab" : /屬性/.test(t) ? "attr" : "grr"];
    if (/混料/.test(t)) return ["doe", "mix"]; if (/DOE|實驗設計/.test(t)) return ["doe", "fact"]; if (/田口/.test(t)) return ["taguchi"];
    return ["hypothesis", "compare"];
  }
  function vrNextHtml() {
    const left = vrStatItems().filter(y => !(y.apx || []).length);
    if (!left.length) return `<div class="vr-next-box"><b>統計驗證都完成了。</b>不用統計的項目請到 PDCA 報告第 5 段選結論、寫依據。　<button type="button" class="sv-btn vr-save" data-route-go="pdca">前往 PDCA 報告 →</button></div>`;
    return `<div class="vr-next-box"><b>還沒驗證的（${left.length} 項）：</b>按「驗證這一項 →」會到對應的分析頁，貼上這一項的數據再分析。<ul>${left.map(x => `<li><span>${esc(x.cause)}<small>${esc(x.tool || "")}</small></span><button type="button" class="sv-btn p" data-vrnext="${x.id}">驗證這一項 →</button></li>`).join("")}</ul></div>`;
  }
  function vrSave(id) {
    const box = document.querySelector(`[data-vrbox="${id}"]`), body = $(id); if (!box || !body) return;
    const hint = box.querySelector("[data-vrhint]"), it = box.querySelector("[data-vrit]").value, st = (box.querySelector("[data-vrst][aria-pressed='true']") || {}).dataset;
    const note = box.querySelector("[data-vrnote]").value.trim();
    if (!st) { hint.textContent = "⚠ 還沒存：請先選結論（原因成立／不成立／待定）"; const r = box.querySelector("[data-vrst]").parentElement; r.classList.add("vr-need"); r.scrollIntoView({ behavior: "smooth", block: "center" }); return; }
    if (!note) { hint.textContent = "請寫依據。"; return; }
    const x = vrItems().find(y => y.id === it); if (!x) return;
    const title = (body.closest(".preview") && body.closest(".preview").querySelector(".preview-head b")) ? body.closest(".preview").querySelector(".preview-head b").textContent.trim() : "";
    (x.apx || (x.apx = [])).push({ id: fid(), at: Date.now(), tool: (VR_OUTS[id] || "") + (title && title !== "尚未分析" ? "：" + title : ""), st: st.vrst, note, html: vrSnap(body) });
    fbSave(); try { pdcaRender(); } catch (_) {} try { flowRender(); } catch (_) {}
    const s = body.nextElementSibling; if (s) { s.dataset.open = ""; s.innerHTML = `<div class="vr-done">✓ 已存入「${esc(x.cause)}」的驗證結果（${VR_ST[st.vrst]}），會附在 PDCA 報告附錄。　<button type="button" class="linkbtn" data-route-go="pdca">看 PDCA 報告</button>　<button type="button" class="linkbtn" data-vropen="${id}">再存一份</button></div>${vrNextHtml()}`; }
    const left = vrStatItems().filter(y => !(y.apx || []).length).length;
    try { fbNote(left ? `已存入。還有 ${left} 個統計驗證項目沒有結果。` : "所有統計驗證項目都有結果了。不用統計的項目請到 PDCA 報告第 5 段填寫。"); } catch (_) {}
  }
  (function vrInit() {
    Object.keys(VR_OUTS).forEach(id => { const b = $(id); if (!b) return; new MutationObserver(() => vrSlot(id)).observe(b, { childList: true, subtree: false }); vrSlot(id); });
    document.addEventListener("click", e => {
      const o = e.target.closest("[data-vropen]"); if (o) { vrSlot(o.dataset.vropen, true); return; }
      const c = e.target.closest("[data-vrclose]"); if (c) { const s = $(c.dataset.vrclose).nextElementSibling; if (s) s.dataset.open = ""; vrSlot(c.dataset.vrclose); return; }
      const st = e.target.closest(".vr-pick [data-vrst]"); if (st) { st.parentElement.classList.remove("vr-need"); st.parentElement.querySelectorAll("[data-vrst]").forEach(b => b.setAttribute("aria-pressed", String(b === st))); const h = st.closest(".vr-pick").querySelector("[data-vrhint]"); if (h) h.textContent = ""; return; }
      const sv = e.target.closest("[data-vrsave]"); if (sv) { vrSave(sv.dataset.vrsave); return; }
      const nx = e.target.closest("[data-vrnext]"); if (nx) { const x = vrItems().find(y => y.id === nx.dataset.vrnext); if (!x) return; const [r, sub] = vrRoute(x.tool);
        if (r === "hypothesis" && sub === "compare" && currentView === "hypothesis") { try { $("clearBtn").click(); } catch (_) {} }   // 同一頁換下一項：清掉上一項的數據（已存在附錄）
        try { gotoTool(r, sub); } catch (_) { const b = document.querySelector(`.toolnav [data-route="${r}"]`); if (b) b.click(); }
        const pb = $({ hypothesis: "hypProblem", regression: "regressionProblem", spc: "spcProblem", msa: "msaProblem", doe: "doeProblem", taguchi: "taguchiProblem" }[r]);
        if (pb) { pb.value = `驗證項目：${x.cause}${x.method ? "。驗證方式：" + x.method : ""}`; pb.dataset.auto = pb.value; }
        try { fbNote(`現在驗證「${x.cause}」：貼上這一項的數據後分析，再按結果下方的「驗證結束，並儲存到報告」。`); } catch (_) {}
        window.scrollTo({ top: 0, behavior: "smooth" }); }
    });
  })();
  // ---------------- PDCA 報告：第 5 段各項結論、附錄 ----------------
  function vrTableHtml(mode) {
    const L = vrItems(); if (!L.length) return "";
    const keep = mode === "screen", edit = mode !== "print"; let k = 0;
    const apxNo = {}; L.forEach(x => { if (!vrNonStat(x) && (x.apx || []).length) apxNo[x.id] = (x.apx || []).map(() => ++k); });
    const stCell = (x, v) => {
      if (!vrNonStat(x)) return v.st ? `<span class="pd-vr-${v.st}">${VR_ST[v.st]}</span>` : `<span class="pd-vr-none">尚未驗證</span>`;
      if (!edit) return v.st ? `<span class="pd-vr-${v.st}">${VR_ST[v.st]}</span>` : `<span class="pd-line"></span>`;
      return `<select class="pd-vrsel"${keep ? ` data-vrx="${x.id}"` : ""}><option value="">請選擇</option>${Object.entries(VR_ST).map(([s, t]) => `<option value="${s}"${v.st === s ? " selected" : ""}>${t}</option>`).join("")}</select>`;
    };
    const noteCell = (x, v) => {
      if (!vrNonStat(x) || !edit) return v.note ? esc(v.note) : vrNonStat(x) ? `<span class="pd-line"></span>` : "";
      return `<div class="pd-ed"${keep ? ` data-vrn="${x.id}"` : ""} contenteditable="plaintext-only" spellcheck="false" title="點一下可以修改">${esc(v.note)}</div>`;
    };
    return `<div class="pd-cap">各驗證項目的結論</div><table class="pd-tbl pd-vr"><thead><tr><th>驗證項目</th><th class="pd-tool">驗證策略</th><th style="width:100px">結論</th><th>依據</th><th style="width:58px">附錄</th></tr></thead><tbody>${L.map(x => { const v = vrNow(x); return `<tr><td>${esc(x.cause)}</td><td>${esc(x.tool || "")}</td><td>${stCell(x, v)}</td><td>${noteCell(x, v)}</td><td>${apxNo[x.id] ? apxNo[x.id].map(n => "附錄 " + n).join("<br>") : "—"}</td></tr>`; }).join("")}</tbody></table>
      <p class="pd-note">統計類項目的結論來自 ⑤ 檢定分析「驗證結束，並儲存到報告」（多份時以最後一份為準）；不用統計的項目在這裡選結論、寫依據。</p>`;
  }
  function vrApxHtml(mode) {
    const keep = mode === "screen"; let k = 0, out = "";
    vrItems().forEach(x => { if (vrNonStat(x)) return; (x.apx || []).forEach(a => { k++;
      out += `<section class="pd-apx1"><h4>附錄 ${k}　${esc(x.cause)}</h4><div class="pd-note">${esc(a.tool || "")}｜存入 ${new Date(a.at).toISOString().slice(0, 10)}｜結論：<b class="pd-vr-${a.st}">${VR_ST[a.st] || ""}</b>｜依據：${esc(a.note || "")}${keep ? `　<button type="button" class="pd-mini pd-noprint" data-vrdel="${x.id}|${a.id}">刪除這份</button>` : ""}</div><div class="pd-apxb">${a.html}</div></section>`; }); });
    return out ? `<div class="pd-apx"><h3 class="pd-apxh">附錄　統計驗證報告</h3>${out}</div>` : "";
  }
  (function vrPdInit() {
    const w = $("pdcaWrap"); if (!w) return;
    w.addEventListener("change", e => { const s = e.target.closest("[data-vrx]"); if (!s) return; const x = vrItems().find(y => y.id === s.dataset.vrx); if (!x) return; x.vr = Object.assign({}, x.vr, { st: s.value }); fbSave(); try { pdcaStatus(); flowRender(); } catch (_) {} });
    w.addEventListener("input", e => { const d = e.target.closest("[data-vrn]"); if (!d) return; const x = vrItems().find(y => y.id === d.dataset.vrn); if (!x) return; x.vr = Object.assign({}, x.vr, { note: d.innerText.replace(/\n+$/, "") }); fbSave(); });
    w.addEventListener("click", e => { const d = e.target.closest("[data-vrdel]"); if (!d) return;
      if (!d.dataset.armed) { d.dataset.armed = "1"; d.textContent = "確定刪除？再按一次"; setTimeout(() => { if (d.isConnected) { delete d.dataset.armed; d.textContent = "刪除這份"; } }, 5000); return; }
      const [xi, ai] = d.dataset.vrdel.split("|"), x = (fb.vplan || []).find(y => y.id === xi); if (!x) return; x.apx = (x.apx || []).filter(a => a.id !== ai); fbSave(); pdcaRender(); try { flowRender(); } catch (_) {} });
  })();
