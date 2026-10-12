  // =====================================================================
  // 從魚骨圖「勾選」原因帶入 DOE、田口方法（因子）與 MSA（要評估的量測問題）
  // 只帶入名稱與角色；水準數值由使用者填寫，AI 與程式都不代填。
  // =====================================================================
  const FBP_NOISE = /環境|使用|Environment|Mother|User/i, FBP_MEAS = /量測|測量|量具|檢測|檢驗|Measure/i;
  const FBP = {
    doe: { anchor: "pkdAi", title: "從魚骨圖選擇因子", help: "勾選要放進實驗的原因（實驗因子要是能設定高、低水準的條件）。帶入後請在確認區填水準數值。", multi: true },
    taguchi: { anchor: "pktAi", title: "從魚骨圖選擇因子", help: "勾選要放進實驗的原因，並決定是控制因子（可設定水準）還是雜音因子（難以控制，用雜音條件模擬）。「環境」「使用」分類預設為雜音因子*，可以改。", multi: true, role: true },
    msa: { anchor: "mpAi", title: "從魚骨圖選擇量測問題", help: "選一個「量測」相關的原因，帶入上方的問題描述，AI 規劃 MSA 時會參考。MSA 的實驗結構（零件、操作員、重複）是固定的，不需要把原因當因子。", multi: false }
  };
  function fbpItems(tool) {
    let L = fb.factors.filter(f => f.st !== "excl");
    if (tool === "msa") { const m = L.filter(f => FBP_MEAS.test(fbCatName(f))); if (m.length) L = m; }
    return L;
  }
  function fbpBox(tool) {
    let box = $("fbp_" + tool);
    if (!box) {
      const row = $(FBP[tool].anchor).closest(".run-row");
      row.insertAdjacentHTML("afterend", `<div class="run-row fbp-open"><button type="button" class="btn" data-fbpopen="${tool}">${FBP[tool].title}</button><span class="hint">魚骨圖上標「◇ 待驗證」「★ 重要」的會預先勾選</span></div><div class="fbp" id="fbp_${tool}" hidden></div>`);
      box = $("fbp_" + tool);
      box.addEventListener("change", () => fbpCount(tool));
      box.addEventListener("click", e => {
        if (e.target.closest("[data-fbpgo]")) { route("fishbone"); return; }
        if (e.target.closest("[data-fbpall]")) { const cbs = [...box.querySelectorAll("input[data-fi]")]; const on = cbs.some(c => !c.checked); cbs.forEach(c => { c.checked = on; }); fbpCount(tool); return; }
        if (e.target.closest("[data-fbpclose]")) { box.hidden = true; return; }
        if (e.target.closest("[data-fbpapply]")) fbpApply(tool);
      });
    }
    return box;
  }
  function fbpOpen(tool) {
    const box = fbpBox(tool), items = fbpItems(tool), F = FBP[tool];
    if (!items.length) {
      box.innerHTML = `<p class="hint">魚骨圖還沒有可以帶入的原因（已排除的不會列出）。</p><div class="run-row"><button type="button" class="btn small" data-fbpgo="1">到魚骨圖整理原因</button><button type="button" class="btn small ghost" data-fbpclose="1">關閉</button></div>`;
      box.hidden = false; return;
    }
    const groups = [];
    items.forEach(f => { const c = fbCatName(f) || "未分類"; let g = groups.find(x => x[0] === c); if (!g) groups.push(g = [c, []]); g[1].push(f); });
    const pre = f => !!(f.verify || f.key);
    const anyPre = items.some(pre);
    const row = (f, i) => {
      const tags = [f.verify ? "◇ 待驗證" : "", f.key ? "★ 重要" : "", f.st === "cand" ? "候選" : ""].filter(Boolean).join("、");
      const on = F.multi ? (anyPre ? pre(f) : false) : false;
      const input = F.multi ? `<input type="checkbox" data-fi="${i}"${on ? " checked" : ""}>` : `<input type="radio" name="fbp_${tool}_r" data-fi="${i}">`;
      const role = F.role ? `<select data-fr="${i}" aria-label="角色"><option value="control"${FBP_NOISE.test(fbCatName(f)) ? "" : " selected"}>控制因子</option><option value="noise"${FBP_NOISE.test(fbCatName(f)) ? " selected" : ""}>雜音因子</option></select>` : "";
      return `<label class="fbp-item">${input}<span class="fbp-text">${esc(f.text)}${tags ? `<small>${esc(tags)}</small>` : ""}</span>${role}</label>`;
    };
    let idx = 0;
    const body = groups.map(([c, fs]) => `<div class="fbp-grp"><div class="fbp-cat">${esc(c)}</div>${fs.map(f => row(f, idx++)).join("")}</div>`).join("");
    box._items = groups.flatMap(g => g[1]);
    box.innerHTML = `<p class="help"><b>${esc(F.title)}</b>：${esc(F.help)}${tool === "msa" && !items.some(f => FBP_MEAS.test(fbCatName(f))) ? "（魚骨圖沒有「量測」分類的原因，下面列出全部原因）" : ""}</p>
      <p class="hint">魚骨圖問題點：${esc(fb.problem.trim() || "（未填）")}</p>
      <div class="fbp-list">${body}</div>
      <p class="hint fbp-count"></p>
      <div class="run-row"><button type="button" class="btn primary small" data-fbpapply="1">${tool === "msa" ? "帶入問題描述" : "勾選的帶入確認區"}</button>${F.multi ? `<button type="button" class="linkbtn" data-fbpall="1">全選／全不選</button>` : ""}<button type="button" class="btn small ghost" data-fbpclose="1">關閉</button></div>`;
    box.hidden = false; fbpCount(tool);
    box.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
  function fbpPicked(tool) {
    const box = $("fbp_" + tool);
    return [...box.querySelectorAll("input[data-fi]")].filter(c => c.checked).map(c => { const i = +c.dataset.fi, s = box.querySelector(`select[data-fr="${i}"]`); return { f: box._items[i], role: s ? s.value : "control" }; });
  }
  function fbpCount(tool) {
    const box = $("fbp_" + tool), el = box && box.querySelector(".fbp-count"); if (!el) return;
    const P = fbpPicked(tool), k = P.length;
    if (tool === "doe") el.textContent = `已勾 ${k} 個。${k < 2 ? "至少要 2 個因子。" : k <= 5 ? "建議全因子 2^" + k + "（" + 2 ** k + " 組）。" : k <= 7 ? "建議部分因子（4～7 個因子）。" : k <= 11 ? "建議 Plackett-Burman 篩選（5～11 個因子，12 次）。" : "超過 11 個：DOE 工具最多 11 個因子，請先篩選。"}`;
    else if (tool === "taguchi") { const c = P.filter(x => x.role !== "noise").length; el.textContent = `已勾 ${k} 個：控制因子 ${c} 個、雜音因子 ${k - c} 個。${c < 2 ? "控制因子至少 2 個。" : c > 15 ? "控制因子最多 15 個。" : ""}`; }
    else el.textContent = k ? "" : "請選一個原因。";
  }
  function fbpApply(tool) {
    const P = fbpPicked(tool), box = $("fbp_" + tool), k = P.length;
    if (tool === "doe") {
      if (k < 2 || k > 11) { fbpCount(tool); return; }
      PLANS.doe.apply({ mode: k <= 5 ? "full" : k <= 7 ? "frac" : "pb", factors: P.map(x => ({ name: x.f.text, low: "", high: "", unit: "" })) }, "fb");
    } else if (tool === "taguchi") {
      const c = P.filter(x => x.role !== "noise").length; if (c < 2 || c > 15) { fbpCount(tool); return; }
      PLANS.taguchi.apply({ factors: P.map(x => ({ name: x.f.text, role: x.role, levels: [] })) }, "fb");
    } else {
      if (!k) { fbpCount(tool); return; }
      const f = P[0].f, tb = $("msaProblem"), add = `要評估的量測問題（來自魚骨圖）：${f.text}${fb.problem.trim() ? `；問題點：${fb.problem.trim()}` : ""}`;
      tb.value = tb.value.trim() ? tb.value.trim() + "\n" + add : add; tb.dispatchEvent(new Event("input", { bubbles: true }));
      $("mpHint").textContent = "已帶入上方的問題描述，可以按「請 AI 建議實驗設計」。";
      tb.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    box.hidden = true;
  }
  document.addEventListener("click", e => { const b = e.target.closest("[data-fbpopen]"); if (b) fbpOpen(b.dataset.fbpopen); });
  ["doe", "taguchi", "msa"].forEach(t => { try { fbpBox(t); } catch (_) {} });
  // 魚骨圖頁的「→ DOE」「→ 田口方法」改成到工具頁勾選
  function fbpFromFishbone(tool) { route(tool); if (tool === "doe" || tool === "taguchi") { const c = $(tool === "doe" ? "pkdPlan" : "pktPlan"); if (c) c.open = true; } fbpOpen(tool); }
  // 田口頁原本的「從魚骨圖帶入」：改成開啟勾選清單
  (function () { const b = $("tgFromFb"); if (b) b.hidden = true; })();
