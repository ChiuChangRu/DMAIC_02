  // =====================================================================
  // 通用 AI 規劃卡：樣本數規劃、假設檢定、DOE、田口方法
  // 流程：AI 建議設計參數（不產生量測數值）→ 程式限制範圍並檢查 → 人員修改 → 帶入下方工具（統計由 JS 計算）
  // 聊天視窗回答若附上對應的規劃區塊，回答下方會出現「帶入」按鈕。
  // =====================================================================
  var PLANS = {};
  const pkNum = v => { const s = String(v == null ? "" : v).trim(); if (s === "") return null; const x = Number(s); return isFinite(x) ? x : NaN; };
  const pkInt = (v, lo, hi, d) => { const x = Math.round(Number(v)); return isFinite(x) ? Math.min(hi, Math.max(lo, x)) : d; };
  const pkClick = (sel) => { const b = document.querySelector(sel); if (b) b.click(); return !!b; };
  const pkSet = (id, v, ev) => { const el = $(id); if (!el) return; el.value = v == null ? "" : String(v); el.dispatchEvent(new Event(ev || "input", { bubbles: true })); };
  const PK_SRC = { ai: "AI 建議", fb: "魚骨圖", user: "手動", reg: "相關與回歸", ss: "樣本數規劃" };
  const pkCheckHtml = ck => ck.map(x => `<li class="mp-${x.lv}"><b>${x.lv === "bad" ? "✗ 不可行" : x.lv === "warn" ? "⚠ 提醒" : "✓"}</b> ${esc(x.m)}${x.go ? ` <button type="button" class="linkbtn" data-go="${x.go[0]}"${x.go[1] ? ` data-sub="${x.go[1]}"` : ""}>${esc(x.go[2])}</button>` : ""}</li>`).join("") + `<li class="hint">標 * 的是一般慣例或推論，不是法規硬性規定；以公司程序為準。</li>`;
  const PK_COMMON = "規則：1. 全程使用繁體中文。2. 不要產生、猜測或舉例任何量測數值或實驗結果；只給設計參數。3. 標準差 σ、預期平均、不良率、因子水準等「需要使用者決定或歷史資料」的數字，只在使用者有提供時才填，否則留空（\"\" 或 null），並在文字中說明要去哪裡找或怎麼決定。4. 規格、目標值只在使用者提供時填。5. 不確定的地方標 * 並說明要使用者確認什麼。6. 不要要求或重複客戶、病患、批號等可識別資訊。";
  const PK_FORMAT = "回答格式：先用最多 6 點說明為什麼這樣設計（每點一行，以「- 」開頭），口語、短句，具體到可以照做；常見做法的數量標 *。最後附一個規劃區塊（JSON），格式如下：";

  // 樣本數規劃：AI 建議直接填進工具時，在工具的「計算」按鈕上方顯示來源與程式檢查；按「計算」後收起
  const PK_RUNS = { power: "pwRun", attr: "atRun", prop: "prRun", tolp: "tpRun", tost: "eqRun", ni: "niRun" };
  function pkInline(calc, html) {
    Object.keys(PK_RUNS).forEach(k => { const b = document.querySelector(`[data-pkin="${k}"]`); if (b) b.hidden = true; });
    if (!html) return;
    const run = $(PK_RUNS[calc]); if (!run) return;
    let box = document.querySelector(`[data-pkin="${calc}"]`);
    if (!box) { box = document.createElement("div"); box.className = "pk-inline"; box.dataset.pkin = calc; run.closest(".run-row").before(box); run.addEventListener("click", () => { box.hidden = true; }); }
    box.innerHTML = html; box.hidden = false;
  }
  function makePlanner(c) {
    const P = { m: JSON.parse(JSON.stringify(c.def)), busy: false, src: "" };
    const id = s => c.id + s, blocks = c.blocks || [c.block];
    const card = document.createElement("details");
    card.className = "card mp-card"; card.id = id("Plan"); card.open = true;
    card.innerHTML = `<summary><span class="qref copper">規劃</span> <b>${esc(c.title)}</b> <span class="pk-src" id="${id("Src")}" hidden></span><span class="hint"> ${esc(c.sub)}</span></summary>
      <div class="mp-body">
        ${(h => c.helpFold ? `<details class="pk-flow"><summary>規劃流程與注意事項</summary>${h}</details>` : h)(`<p class="help">${c.help.replace(/^流程：① [^，]*，/, "流程：① 在上方「描述情境或問題」寫一句話，")} 請不要輸入客戶、病患、批號等可識別資訊。</p>`)}
        <div class="field"><label for="${id("Desc")}">情境（選填給 AI 看）</label><textarea id="${id("Desc")}" rows="2" placeholder="${esc(c.descPh)}" spellcheck="false"></textarea></div>
        <div class="run-row"><button class="btn" type="button" id="${id("Ai")}">請 AI 建議設計</button><span class="hint" id="${id("Hint")}"></span></div>
        <div class="pk-ask" id="${id("Ask")}" hidden></div>
        <div class="mp-why" id="${id("Why")}" hidden></div>
        <div id="${id("Form")}" class="mp-meta"></div>
        <ul class="mp-check" id="${id("Check")}"></ul>
        <div class="run-row"><button class="btn primary" type="button" id="${id("Go")}">${esc(c.goLabel)}</button>${c.applyLabel ? `<button class="btn" type="button" id="${id("Apply")}">${esc(c.applyLabel)}</button>` : ""}<button class="btn ghost" type="button" id="${id("Reset")}">恢復預設值</button><span class="hint" id="${id("ApplyHint")}"></span></div>
        <div id="${id("Sheet")}" hidden></div>
      </div>`;
    if (c.direct) { [id("Form"), id("Check")].forEach(k => { card.querySelector("#" + k).hidden = true; }); card.querySelector("#" + id("Go")).closest(".run-row").hidden = true; }
    card.querySelector("#" + id("Desc")).closest(".field").hidden = true;   // 只留頁面上方一個描述框
    const view = $(c.view), anchor = view.querySelector(c.before);
    anchor.parentNode.insertBefore(card, anchor);
    if (c.aiTop) {   // 「請 AI 建議設計」放在描述框正下方：寫完就按
      const tp = $(c.problemId) && $(c.problemId).closest(".tool-problem");
      if (tp) { const row = card.querySelector("#" + id("Ai")).closest(".run-row"); row.classList.add("pk-airow"); tp.appendChild(row); }
    }
    const note = (m, bad) => { $(id("Hint")).innerHTML = m ? (bad ? `<span class="status ng">${esc(m)}</span>` : esc(m)) : ""; };
    const setSrc = s => { P.src = s || ""; const el = $(id("Src")); el.hidden = !s; el.textContent = s ? `來源：${PK_SRC[s] || s}・待確認` : ""; };
    // 確認列：取代／加入／取消
    function ask(msg, opts) {
      const box = $(id("Ask"));
      box.innerHTML = `<p>${esc(msg)}</p><div class="run-row">${opts.map((o, i) => `<button type="button" class="btn small${i ? "" : " primary"}" data-ask="${i}">${esc(o.label)}</button>`).join("")}</div>`;
      box.hidden = false; box.scrollIntoView({ behavior: "smooth", block: "center" });
      box.onclick = e => { const b = e.target.closest("[data-ask]"); if (!b) return; box.hidden = true; box.onclick = null; const o = opts[+b.dataset.ask]; if (o.fn) o.fn(); };
    }
    function tableHtml(f) {
      const rows = P.m[f.k] || [], lab = typeof f.lab === "function" ? f.lab(P.m) : f.lab;
      const cell = (r, i, col) => {
        const v = r[col.k] == null ? "" : r[col.k], miss = col.req && (!col.reqIf || col.reqIf(r)) && String(v).trim() === "" ? " pk-miss" : "";
        if (col.k === "src") return `<td class="pk-srccell">${esc(PK_SRC[v] || "手動")}</td>`;
        if (col.type === "select") return `<td><select class="mp-in${miss}" data-tk="${f.k}" data-ti="${i}" data-tc="${col.k}">${col.opts.map(o => `<option value="${o[0]}"${String(v) === o[0] ? " selected" : ""}>${esc(o[1])}</option>`).join("")}</select></td>`;
        return `<td><input class="mp-in${miss}" data-tk="${f.k}" data-ti="${i}" data-tc="${col.k}" value="${esc(v)}" type="text" autocomplete="off" placeholder="${esc(col.ph || "")}"></td>`;
      };
      return `<div class="field pk-wide"><label>${lab}</label><div class="scroll-x"><table class="mp-tbl pk-tbl"><thead><tr>${f.cols.map(col => `<th>${esc(col.lab)}</th>`).join("")}<th></th></tr></thead><tbody>${rows.map((r, i) => `<tr>${f.cols.map(col => cell(r, i, col)).join("")}<td><button type="button" class="btn small ghost" data-tdel="${f.k}" data-ti="${i}" aria-label="刪除這一列">刪除</button></td></tr>`).join("")}</tbody></table></div><div class="run-row"><button type="button" class="btn small" data-tadd="${f.k}">＋ 新增一列</button>${f.hint ? `<span class="hint">${esc(f.hint)}</span>` : ""}</div></div>`;
    }
    function fieldHtml(f) {
      const M = P.m, v = M[f.k], fid = id("_" + f.k), lab = typeof f.lab === "function" ? f.lab(M) : f.lab;
      if (f.type === "table") return tableHtml(f);
      if (f.type === "select") { const opts = typeof f.opts === "function" ? f.opts(M) : f.opts; return `<div class="field"><label for="${fid}">${lab}</label><select id="${fid}" data-pk="${f.k}"${f.req && String(v) === "" ? ' class="pk-miss"' : ""}>${opts.map(o => `<option value="${o[0]}"${String(v) === String(o[0]) ? " selected" : ""}>${esc(o[1])}</option>`).join("")}</select></div>`; }
      if (f.type === "bool") return `<div class="mp-opts"><label><input type="checkbox" data-pk="${f.k}"${v ? " checked" : ""}> ${lab}</label></div>`;
      if (f.type === "area") return `<div class="field pk-wide"><label for="${fid}">${lab}</label><textarea id="${fid}" data-pk="${f.k}" rows="${f.rows || 4}" spellcheck="false" placeholder="${esc(f.ph || "")}">${esc(v || "")}</textarea></div>`;
      if (f.type === "int") return `<div class="field"><label for="${fid}">${lab}</label><input id="${fid}" data-pk="${f.k}" data-int="${f.lo},${f.hi}" type="number" min="${f.lo}" max="${f.hi}" step="1" inputmode="numeric" value="${esc(v)}"></div>`;
      return `<div class="field"><label for="${fid}">${lab}</label><input id="${fid}" data-pk="${f.k}" type="${f.type === "num" ? "number" : "text"}" ${f.type === "num" ? 'step="any" inputmode="decimal"' : 'autocomplete="off"'} value="${esc(v == null ? "" : v)}" placeholder="${esc(f.ph || "")}"></div>`;
    }
    function render() {
      const vis = c.fields.filter(f => !f.show || f.show(P.m));
      const plain = vis.filter(f => !["bool", "area", "table"].includes(f.type)), wide = vis.filter(f => f.type === "area" || f.type === "table"), bools = vis.filter(f => f.type === "bool");
      $(id("Form")).innerHTML = `<div class="fields">${plain.map(fieldHtml).join("")}</div>${wide.map(fieldHtml).join("")}${bools.map(fieldHtml).join("")}`;
      check();
    }
    function read() {
      $(id("Form")).querySelectorAll("[data-pk]").forEach(el => {
        const k = el.dataset.pk;
        if (el.type === "checkbox") P.m[k] = el.checked;
        else if (el.dataset.int) { const [lo, hi] = el.dataset.int.split(",").map(Number); P.m[k] = pkInt(el.value, lo, hi, c.def[k]); }
        else P.m[k] = el.value.trim();
      });
      $(id("Form")).querySelectorAll("[data-tk]").forEach(el => { const r = (P.m[el.dataset.tk] || [])[+el.dataset.ti]; if (!r) return; const v = el.value.trim(); if (r[el.dataset.tc] !== v && /^(low|high|lv\d)$/.test(el.dataset.tc)) delete r.aiLv; r[el.dataset.tc] = v; });
    }
    function check() {
      const ck = c.check(P.m), hasBad = ck.some(x => x.lv === "bad"); $(id("Check")).innerHTML = pkCheckHtml(ck); $(id("Go")).disabled = hasBad;
      const h = $(id("Hint")); if (!hasBad && /還有缺少或不可行/.test(h.textContent)) note("設定已齊全，確認後按「" + c.goLabel + "」。");
      $(id("Form")).querySelectorAll("[data-tk]").forEach(el => { const f = c.fields.find(x => x.k === el.dataset.tk), col = f && f.cols.find(x => x.k === el.dataset.tc), row = (P.m[el.dataset.tk] || [])[+el.dataset.ti]; el.classList.toggle("pk-miss", !!(col && col.req && (!col.reqIf || (row && col.reqIf(row))) && !el.value.trim())); });
      return ck;
    }
    const dirty = () => { read(); return JSON.stringify(P.m) !== JSON.stringify(c.def); };
    // 草稿進來（AI 或魚骨圖）：確認區已有內容時先詢問
    function load(j, src) {
      const base = JSON.parse(JSON.stringify(c.def)), r = c.fromJson(j, base, src) || {};
      if (r.error) { note(r.error, true); return false; }
      const fresh = r.m || base;
      if (c.direct) {   // 直接填進下方工具（不經過確認區表單），由人確認後按工具的「計算」
        const fillIt = () => { P.m = fresh; render(); const f = c.fill(P.m, { src }); note((r.notes || []).concat([f.bad ? "已填入下方工具，但還有缺少或不可行的設定（✗），請補上後再按「計算」。" : "已填入下方工具，請確認數值後按「計算」。"]).join(" "), f.bad); };
        if (c.toolHas && c.toolHas(fresh)) ask("下方工具已經有計算結果。要用 AI 的建議取代目前的設定嗎？", [{ label: "取代", fn: fillIt }, { label: "取消" }]); else fillIt();
        return true;
      }
      const doIt = mode => {
        if (mode === "add" && c.merge) c.merge(P.m, fresh); else P.m = fresh;
        $(id("Sheet")).hidden = true; setSrc(src); render();
        const bad = c.check(P.m).some(x => x.lv === "bad");
        note((r.notes || []).concat([bad ? "已放進確認區，但還有缺少或不可行的設定（紅色或 ✗），請補上。" : "已放進下方確認區，請確認或修改後按「" + c.goLabel + "」" + (c.applyLabel ? "；同意的話也可以按「" + c.applyLabel + "」。" : "。")]).join(" "), bad);
        if (c.aiTop) card.scrollIntoView({ behavior: "smooth", block: "start" });
      };
      if (dirty()) ask("確認區已經有內容。要怎麼處理新的建議？", [{ label: "取代", fn: () => doIt("replace") }].concat(c.merge ? [{ label: "加入（把新的因子加在後面）", fn: () => doIt("add") }] : []).concat([{ label: "取消" }]));
      else doIt("replace");
      return true;
    }
    const blockRe = new RegExp("```(?:" + blocks.join("|") + ")[ \\t]*\\n([\\s\\S]*?)```"), stripRe = new RegExp("```(?:" + blocks.join("|") + ")[ \\t]*\\n[\\s\\S]*?(```|$)", "g");
    function parse(text) { const m = String(text).match(blockRe); if (!m) return null; try { const j = JSON.parse(m[1]); return j && typeof j === "object" ? j : null; } catch (_) { return null; } }
    const schema = "```" + blocks[0] + "\n" + c.example + "\n```\n" + c.schemaNote;
    async function askAI() {
      const q = (($(c.problemId).value || "").trim() || $(id("Desc")).value.trim()); if (!q && !(c.ctxExtra && c.ctxExtra(P.m))) { note("請先在頁面上方的「描述情境或問題」寫一句話。", true); return; }
      if (!sample) { note("目前無法使用 AI，請在「AI 設定與案件存取」確認；也可以直接在下方自己選擇與調整。", true); return; }
      if (P.busy) return; P.busy = true; $(id("Ai")).disabled = true; note("AI 規劃中…");
      read();
      const ctx = ($(c.problemId).value || "").trim(), newbie = styleFor(c.chatKey).persp === "teach";
      const msg = [c.role, PK_COMMON, PK_FORMAT, schema].join("\n") + (newbie ? "\n讀者是新人：每個名詞第一次出現就用括號白話解釋。" : "") + (ctx && ctx !== q ? "\n\n【問題描述】" + ctx : "") + "\n【目前確認區的內容】" + JSON.stringify(c.toJson ? c.toJson(P.m) : P.m) + (c.ctxExtra ? c.ctxExtra(P.m) : "") + "\n【情境】" + (q || "請依目前確認區的內容補上設計建議。");
      try {
        const res = await sample([{ role: "user", content: msg }], { cache: false, modelTier: "default" });
        const j = parse(res.text), why = res.text.replace(stripRe, "").trim();
        $(id("Why")).innerHTML = j ? `<b>AI 的設計理由（推論，請自行判斷是否適用）</b>${mdLite(why)}` : mdLite(why || res.text); $(id("Why")).hidden = false;
        if (!j) { note("AI 的回答沒有附上可用的設計參數，請參考說明自己填寫。", true); return; }
        load(j, "ai");
      } catch (e) { note((ERR[e && e.code] || ERR.upstream_error) + (e && e.message ? "（" + e.message + "）" : ""), true); }
      finally { P.busy = false; $(id("Ai")).disabled = false; }
    }
    $(id("Form")).addEventListener("change", e => { read(); if (e.target.tagName === "SELECT" && !e.target.dataset.tk || e.target.type === "checkbox") render(); else check(); });
    $(id("Form")).addEventListener("input", e => { if (e.target.type !== "checkbox" && e.target.tagName !== "SELECT") { read(); check(); } });
    $(id("Form")).addEventListener("click", e => {
      const add = e.target.closest("[data-tadd]"), del = e.target.closest("[data-tdel]"); if (!add && !del) return;
      read();
      if (add) { const f = c.fields.find(x => x.k === add.dataset.tadd); (P.m[f.k] = P.m[f.k] || []).push(Object.assign({}, f.blank, { src: "user" })); }
      else P.m[del.dataset.tdel].splice(+del.dataset.ti, 1);
      render();
    });
    card.addEventListener("click", e => { const g = e.target.closest(".mp-check [data-go]"); if (g) gotoTool(g.dataset.go, g.dataset.sub); });
    $(id("Ai")).addEventListener("click", askAI);
    if (c.applyLabel) $(id("Apply")).addEventListener("click", () => {
      read(); const h = $(id("ApplyHint"));
      if (check().some(x => x.lv === "bad")) { h.innerHTML = `<span class="status ng">還有 ✗ 的設定，請先修正。</span>`; return; }
      h.textContent = c.applySettings(P.m) || "";
    });
    $(id("Reset")).addEventListener("click", () => { P.m = JSON.parse(JSON.stringify(c.def)); $(id("Why")).hidden = true; $(id("Sheet")).hidden = true; $(id("Ask")).hidden = true; setSrc(""); note(""); render(); });
    $(id("Go")).addEventListener("click", () => {
      read(); if (check().some(x => x.lv === "bad")) return;
      const run = mode => { const r = c.go(P.m, { sheet: $(id("Sheet")), note, ask, mode, src: P.src }); if (r) { note(r.msg || "", r.bad); if (!r.bad) setSrc(""); } };
      if (c.toolHas && c.toolHas(P.m)) ask("下方工具已經有內容。要怎麼處理？", [{ label: "取代", fn: () => run("replace") }].concat(c.toolMerge && c.toolMerge(P.m) ? [{ label: "加入（把這些因子加在工具原有的因子後面）", fn: () => run("add") }] : []).concat([{ label: "取消" }]));
      else run("replace");
    });
    PLANS[c.chatKey] = {
      parse, block: blocks[0], stripRe,
      _check: c.check,
      _fromJson: j => { const base = JSON.parse(JSON.stringify(c.def)), r = c.fromJson(j, base, "ai") || {}; return r.error ? r : { m: r.m || base }; },
      chatRule: `【${c.title}】${c.chatWhen || "回答中如果有建議具體的設計參數"}，最後附一個 \`\`\`${blocks[0]} 區塊，讓使用者按按鈕帶入網頁的確認區。區塊內只放設計參數，不放任何量測數值或結果。${PK_COMMON}\n格式：\n${schema}`,
      html: j => { const pv = c.preview ? c.preview(j) : { html: "", ok: true }; return `<div class="pk-preview">${pv.html}${pv.ok ? `<div class="fb-sug"><button type="button" class="btn small primary" data-pkplan="${c.chatKey}" data-pkjson="${esc(JSON.stringify(j))}">${esc(c.chatBtn || "帶入「" + c.title + "」確認區")}</button></div>` : ""}</div>`; },
      apply: (j, src) => { closePanel(); route(c.route); card.open = true; if (load(j, src || "ai") && !c.direct) card.scrollIntoView({ behavior: "smooth", block: "start" }); },
      state: () => { read(); return JSON.parse(JSON.stringify(P.m)); },
      restore: m => { P.m = Object.assign(JSON.parse(JSON.stringify(c.def)), m || {}); $(id("Why")).hidden = true; $(id("Sheet")).hidden = true; setSrc(""); note(""); render(); }
    };
    render();
    return P;
  }
  $("msgs").addEventListener("click", e => {
    const b = e.target.closest("[data-pkplan]"); if (!b) return;
    const pl = PLANS[b.dataset.pkplan]; let j; try { j = JSON.parse(b.dataset.pkjson); } catch (_) { return; }
    if (pl && j) { pl.apply(j, "ai"); b.textContent = "已帶入確認區"; }
  });

  // ---------------- 樣本數規劃 ----------------
  const SS_CALC = [["tost", "變更後一樣嗎（同等性 TOST）"], ["ni", "換了不會變差（不劣性）"], ["power", "有沒有差（t 檢定：平均值）"], ["attr", "通過／不通過（信心度／可靠度）"], ["prop", "不良率比較"], ["tolp", "允差區間（涵蓋比例）"]];
  makePlanner({
    id: "pks", view: "viewSample", before: "#ssQ", route: "sample", chatKey: "sample", problemId: "sampleProblem", block: "sampleplan",
    title: "樣本數規劃", sub: "用一句話描述情境，AI 建議要回答哪一題與條件；計算由程式執行",
    help: "流程：① 用一句話描述情境，請 AI 建議要選下方哪一題、條件是什麼（AI 不提供標準差、δ 等數值）→ ② 建議直接選好題目並填進下方表單，標示「AI 建議・待確認」，程式同時檢查 → ③ 你補上或修改後按「計算」。也可以不用 AI，直接在下方選題。",
    direct: true,
    toolHas: m => { const r = { power: pw.result, attr: at.result, prop: TQ.prop, tolp: TQ.tolp, tost: TQ.tost, ni: TQ.ni }[m.calc]; return !!r; },
    fill: m => {
      ssPick({ power: m.design === "one" ? "q4" : "q1", attr: "q5", prop: "q7", tolp: "q8", tost: "q2", ni: "q3" }[m.calc], { noScroll: true });
      if (m.calc === "tost" || m.calc === "ni") {
        const p = m.calc === "tost" ? "eq" : "ni";
        pkSet(p + "D", m.design, "change"); if (m.calc === "ni") pkSet("niDir", m.dir, "change");
        pkSet(p + "Sd", m.sd); pkSet(p + "Delta", m.delta === "" ? "" : Math.abs(+m.delta)); pkSet(p + "True", m.trueDiff === "" ? "0" : m.trueDiff);
        pkSet(p + "Alpha", m.alpha === "0.01" ? "0.025" : m.alpha, "change"); pkSet(p + "Power", m.power, "change");
      } else if (m.calc === "power") {
        pkClick(`#pwDesign [data-v="${m.design}"]`); pkClick('#pwSolve [data-v="n"]'); pkClick(`#pwAlt [data-v="${m.alt}"]`);
        pkSet("pwSd", m.sd); pkSet("pwDelta", m.delta === "" ? "" : Math.abs(+m.delta)); pkSet("pwTarget", m.power, "change"); pkSet("pwAlpha", m.alpha, "change");
      } else if (m.calc === "attr") {
        pkClick('#atMode [data-v="plan"]'); pkSet("atC", m.conf, "change"); pkSet("atR", m.rel, "change"); pkSet("atCc", m.fails, "change");
      } else if (m.calc === "prop") {
        pkClick(`#prDesign [data-v="${m.design}"]`); pkClick('#prSolve [data-v="n"]'); pkSet("prP0", m.p0); pkSet("prP1", m.p1); pkSet("prTarget", m.power, "change"); pkSet("prAlpha", m.alpha, "change");
      } else {
        pkClick(`#tpMethod [data-v="${m.method}"]`); pkClick(`#tpSide [data-v="${m.side}"]`); pkSet("tpP", m.cover, "change"); pkSet("tpG", m.tconf, "change");
      }
      const ck = PLANS.sample._check(m), bad = ck.some(x => x.lv === "bad");
      pkInline(m.calc, `<span class="pk-src">來源：AI 建議・待確認</span><ul class="mp-check">${pkCheckHtml(ck)}</ul><p class="hint">確認或修改上面的數值後，按「計算」。</p>`);
      const run = $(PK_RUNS[m.calc]);
      run.closest(".card").scrollIntoView({ behavior: "smooth", block: "start" });
      return { bad };
    },
    descPh: "例如：轉廠後要證明封口拉力平均沒有下降超過 2 N，歷史標準差約 1.5 N",
    goLabel: "帶入並計算",
    role: "你是樣本數規劃的助手。先判斷使用者要回答哪一類問題：要證明「變更後（轉廠、換料、換設備、換方法）一樣」用 tost（同等性 TOST，不能用 p > 0.05 證明一樣）；只在意「換了之後不會變差」用 ni（不劣性，dir＝higher 越大越好或 lower 越小越好）；要證明「有差、改善有效」用 power。其他算法：power（計量型 t 檢定）、attr（通過／不通過：信心度與可靠度，例如 95/95）、prop（不良率比較）、tolp（統計允差區間）。",
    example: '{"calc":"tost","design":"two","alt":"two-sided","dir":"higher","alpha":0.05,"power":0.9,"sd":null,"delta":null,"trueDiff":0,"conf":0.95,"rel":0.95,"fails":0,"p0":null,"p1":null,"cover":0.99,"tconf":0.95,"side":"lower","method":"norm"}',
    schemaNote: "calc＝tost、ni、power、attr、prop、tolp。tost 與 ni 用 design（two＝兩組獨立，one＝成對）、delta（δ：可接受的差異，是工程判斷，使用者沒提供就 null，不要自己訂）、sd、trueDiff（預期真實差異，不知道用 0）、alpha（0.05 或 0.025）、power；ni 另用 dir（higher 或 lower）。power 用 design（one＝單組或成對，two＝兩組獨立）、alt（two-sided 或 greater）、alpha、power、sd（標準差，使用者沒提供就 null）、delta（要偵測的最小差異，使用者沒提供就 null）；attr 用 conf（0.9／0.95／0.99）、rel（0.9／0.95／0.99／0.999）、fails（允許失效數 0／1／2／3／5）；prop 用 design、p0、p1（百分比數字，例如 1 代表 1%）、alpha、power；tolp 用 cover（涵蓋比例 0.9／0.95／0.99／0.999）、tconf（0.9／0.95／0.99）、side（lower／upper／two）、method（norm 常態或 np 無母數）。",
    def: { calc: "power", dir: "higher", trueDiff: "0", design: "two", alt: "two-sided", alpha: "0.05", power: "0.9", sd: "", delta: "", conf: "0.95", rel: "0.95", fails: "0", p0: "", p1: "", cover: "0.99", tconf: "0.95", side: "lower", method: "norm" },
    fields: [
      { k: "calc", lab: "算法", type: "select", opts: SS_CALC },
      { k: "design", lab: "試驗設計", type: "select", opts: [["one", "單組或成對"], ["two", "兩組獨立"]], show: m => ["power", "prop", "tost", "ni"].includes(m.calc) },
      { k: "dir", lab: "特性方向", type: "select", opts: [["higher", "越大越好"], ["lower", "越小越好"]], show: m => m.calc === "ni" },
      { k: "trueDiff", lab: "預期真實差異", type: "num", show: m => m.calc === "tost" || m.calc === "ni" },
      { k: "alt", lab: "對立假設", type: "select", opts: [["two-sided", "雙尾（不同）"], ["greater", "單尾（只關心一個方向）"]], show: m => m.calc === "power" },
      { k: "sd", lab: "標準差 σ（來自歷史資料或預試驗）", type: "num", ph: "必填", show: m => ["power", "tost", "ni"].includes(m.calc) },
      { k: "delta", lab: m => m.calc === "power" ? "要偵測的最小差異 Δ" : "可接受的差異 δ", type: "num", ph: "必填", show: m => ["power", "tost", "ni"].includes(m.calc) },
      { k: "p0", lab: m => m.design === "one" ? "目標不良率 p₀（%）" : "第 1 組不良率（%）", type: "num", ph: "必填", show: m => m.calc === "prop" },
      { k: "p1", lab: m => m.design === "one" ? "預期實際不良率 p₁（%）" : "第 2 組不良率（%）", type: "num", ph: "必填", show: m => m.calc === "prop" },
      { k: "alpha", lab: "顯著水準 α", type: "select", opts: m => m.calc === "tost" || m.calc === "ni" ? [["0.025", "0.025"], ["0.05", "0.05"], ["0.10", "0.10"]] : [["0.01", "0.01"], ["0.05", "0.05"], ["0.10", "0.10"]], show: m => ["power", "prop", "tost", "ni"].includes(m.calc) },
      { k: "power", lab: "目標檢定力", type: "select", opts: [["0.8", "0.80"], ["0.9", "0.90"], ["0.95", "0.95"]], show: m => ["power", "prop", "tost", "ni"].includes(m.calc) },
      { k: "conf", lab: "信心水準", type: "select", opts: [["0.9", "90%"], ["0.95", "95%"], ["0.99", "99%"]], show: m => m.calc === "attr" },
      { k: "rel", lab: "要宣稱的可靠度", type: "select", opts: [["0.9", "90%"], ["0.95", "95%"], ["0.99", "99%"], ["0.999", "99.9%"]], show: m => m.calc === "attr" },
      { k: "fails", lab: "允許失效數", type: "select", opts: [["0", "0"], ["1", "1"], ["2", "2"], ["3", "3"], ["5", "5"]], show: m => m.calc === "attr" },
      { k: "cover", lab: "涵蓋比例", type: "select", opts: [["0.9", "90%"], ["0.95", "95%"], ["0.99", "99%"], ["0.999", "99.9%"]], show: m => m.calc === "tolp" },
      { k: "tconf", lab: "信心水準", type: "select", opts: [["0.9", "90%"], ["0.95", "95%"], ["0.99", "99%"]], show: m => m.calc === "tolp" },
      { k: "side", lab: "單邊或雙邊", type: "select", opts: [["lower", "只有下限"], ["upper", "只有上限"], ["two", "雙邊"]], show: m => m.calc === "tolp" },
      { k: "method", lab: "方法", type: "select", opts: [["norm", "常態（資料近似常態）"], ["np", "無母數（不假設分布，樣本數較多）"]], show: m => m.calc === "tolp" }
    ],
    check: m => {
      const o = [], bad = x => o.push({ lv: "bad", m: x }), warn = x => o.push({ lv: "warn", m: x }), ok = x => o.push({ lv: "ok", m: x });
      if (m.calc === "tost" || m.calc === "ni") {
        const s = pkNum(m.sd), d = pkNum(m.delta);
        if (d == null) bad("請填 δ（差多少以內可以接受）：這是工程判斷，要由你們決定並寫下依據；AI 不提供。"); else if (Number.isNaN(d) || d <= 0) bad("δ 要是大於 0 的數字。");
        if (s == null) bad("請填標準差 σ：要來自歷史數據、SPC、MSA 或預試驗。AI 不會、也不應該替你猜這個數字。"); else if (Number.isNaN(s) || s <= 0) bad("標準差要是大於 0 的數字。");
        warn(m.calc === "tost" ? "同等性：量完後要看平均差的 90% 信賴區間是否整條落在 ±δ 內，不能用 p > 0.05 判定一樣。" : "不劣性：方向（越大越好／越小越好）要在試驗前決定。");
      } else if (m.calc === "power") {
        const s = pkNum(m.sd), d = pkNum(m.delta);
        if (s == null) bad("請填標準差 σ：要來自歷史資料、SPC 紀錄或預試驗。AI 不會、也不應該替你猜這個數字。"); else if (Number.isNaN(s) || s <= 0) bad("標準差要是大於 0 的數字。");
        if (d == null) bad("請填要偵測的最小差異 Δ：這是工程或品質上「差多少才有意義」的判斷，要由你們決定。"); else if (Number.isNaN(d) || d === 0) bad("Δ 要是不等於 0 的數字。");
        if (s > 0 && d) { const e = Math.abs(d) / s; if (e < 0.25) warn(`Δ／σ ＝ ${e.toFixed(2)}，差異比雜訊小很多，需要的樣本數會非常大*。`); else if (e > 3) warn(`Δ／σ ＝ ${e.toFixed(2)}，差異很大，算出的樣本數可能很少；仍建議每組至少 5～10 個*。`); else ok(`Δ／σ ＝ ${e.toFixed(2)}。`); }
        if (m.alt === "greater") warn("單尾檢定只在「事先」確定只關心一個方向時才用，不能看完資料再決定*。");
        warn("t 檢定假設資料近似常態；拉力、強度等偏態資料要先確認分布*。");
      } else if (m.calc === "attr") {
        ok(`${Math.round(m.conf * 100)}% 信心、${(m.rel * 100).toFixed(m.rel === "0.999" ? 1 : 0)}% 可靠度、允許 ${m.fails} 個失效。`);
        if (+m.fails > 0) warn("允許失效數越多，需要的樣本數越多；試驗時出現的失效數超過設定就不能宣稱達標。");
        warn("信心度／可靠度的組合（例如 95/95）應依風險等級（ISO 14971）與公司程序決定*。");
      } else if (m.calc === "prop") {
        const a = pkNum(m.p0), b = pkNum(m.p1);
        if (a == null || b == null) bad("請填兩個不良率（%）：p₀ 是目標或第 1 組，p₁ 是預期或第 2 組；要來自歷史資料或規格。");
        else if ([a, b].some(x => Number.isNaN(x) || x <= 0 || x >= 100)) bad("不良率要介於 0 和 100（%）之間。");
        else if (a === b) bad("兩個不良率相同，沒有差異可以偵測。");
        else if (Math.min(a, b) < 1) warn("不良率低於 1% 時，需要的樣本數通常很大（數百到數千件）*。");
      } else if (m.calc === "tolp") {
        if (m.method === "np") warn("無母數方法不假設分布，但樣本數通常比常態方法多很多*。");
        else warn("常態方法要先確認資料近似常態；偏態資料改用無母數方法或先轉換*。");
      }
      return o;
    },
    fromJson: (j, m) => {
      const pick = (k, list) => { if (j[k] != null && list.includes(String(j[k]))) m[k] = String(j[k]); };
      pick("calc", ["power", "attr", "prop", "tolp", "tost", "ni"]); pick("dir", ["higher", "lower"]); if (j.trueDiff != null && isFinite(+j.trueDiff)) m.trueDiff = String(+j.trueDiff); pick("design", ["one", "two"]); pick("alt", ["two-sided", "greater"]);
      if (j.alpha != null) m.alpha = String(+j.alpha === 0.1 ? "0.10" : +j.alpha); pick("power", ["0.8", "0.9", "0.95"]);
      ["sd", "delta", "p0", "p1"].forEach(k => { if (j[k] !== undefined) { const x = Number(j[k]); m[k] = j[k] == null || !isFinite(x) ? "" : String(x); } });
      pick("conf", ["0.9", "0.95", "0.99"]); pick("rel", ["0.9", "0.95", "0.99", "0.999"]); pick("fails", ["0", "1", "2", "3", "5"]);
      pick("cover", ["0.9", "0.95", "0.99", "0.999"]); pick("tconf", ["0.9", "0.95", "0.99"]); pick("side", ["lower", "upper", "two"]); pick("method", ["norm", "np"]);
      if (!["0.01", "0.025", "0.05", "0.10"].includes(m.alpha)) m.alpha = "0.05";
    },
    go: m => {
      pkClick(`#ssTabs [data-tsub="${m.calc}"]`);
      if (m.calc === "power") {
        pkClick(`#pwDesign [data-v="${m.design}"]`); pkClick('#pwSolve [data-v="n"]'); pkClick(`#pwAlt [data-v="${m.alt}"]`);
        pkSet("pwSd", m.sd); pkSet("pwDelta", Math.abs(+m.delta)); pkSet("pwTarget", m.power, "change"); pkSet("pwAlpha", m.alpha, "change"); $("pwRun").click();
      } else if (m.calc === "attr") {
        pkClick('#atMode [data-v="plan"]'); pkSet("atC", m.conf, "change"); pkSet("atR", m.rel, "change"); pkSet("atCc", m.fails, "change"); $("atRun").click();
      } else if (m.calc === "prop") {
        pkClick(`#prDesign [data-v="${m.design}"]`); pkClick('#prSolve [data-v="n"]'); pkSet("prP0", m.p0); pkSet("prP1", m.p1); pkSet("prTarget", m.power, "change"); pkSet("prAlpha", m.alpha, "change"); $("prRun").click();
      } else {
        pkClick(`#tpMethod [data-v="${m.method}"]`); pkClick(`#tpSide [data-v="${m.side}"]`); pkSet("tpP", m.cover, "change"); pkSet("tpG", m.tconf, "change"); $("tpRun").click();
      }
      $("ssTilesCard").scrollIntoView({ behavior: "smooth", block: "start" });
      return { msg: "已帶入下方工具並計算。" };
    }
  });

  // ---------------- 假設檢定 ----------------
  let pkHypTouched = false; $("pasteBox").addEventListener("input", () => { pkHypTouched = true; });
  document.querySelectorAll("[data-example]").forEach(b => b.addEventListener("click", () => { pkHypTouched = false; }));
  function pkHypSettings(m) {
    setSub("compare");
    if (m.purpose === "two") pkClick(`#modeChips [data-mode="${m.relation}"]`);
    if (m.purpose !== "multi") { pkClick(`#goalChips [data-goal="${m.goal || "diff"}"]`); if (m.goal !== "equiv") pkClick(`#altChips [data-alt="${m.alt}"]`); pkSet("hypEqDelta", m.goal === "equiv" ? m.eqd : $("hypEqDelta").value); }
    pkSet("alphaSel", m.alpha, "change"); pkSet("target", m.purpose === "one" ? m.target : ""); pkSet("lsl", m.lsl); pkSet("usl", m.usl);
  }
  makePlanner({
    id: "pkh", view: "viewAnalyze", before: ".subtabs", route: "hypothesis", chatKey: "hyp", problemId: "hypProblem", block: "hypplan",
    title: "比較試驗規劃", sub: "先決定比什麼、分幾組、每組幾個；產生記錄表，填完再分析",
    aiTop: true, helpFold: true, applyLabel: "同意，套用到下方檢定設定",
    applySettings: m => {
      pkHypSettings(m);
      const eqv = m.goal === "equiv" && m.purpose !== "multi";
      const L = [m.purpose === "two" ? (m.relation === "paired" ? "成對樣本" : "獨立樣本") : "", eqv ? "同等性 TOST ±" + m.eqd : m.purpose !== "multi" ? { "two-sided": "雙尾", greater: "單尾 A>B", less: "單尾 A<B" }[m.alt] : "", "α=" + m.alpha, m.purpose === "one" && m.target !== "" ? "目標值 " + m.target : "", m.lsl !== "" ? "LSL " + m.lsl : "", m.usl !== "" ? "USL " + m.usl : ""].filter(Boolean);
      return "已套用到下方 STEP 2（" + L.join("、") + "）。組數與樣本數依貼上的數據判定。";
    },
    help: "流程：① 描述要比較什麼，請 AI 建議試驗設計（AI 不產生數值）→ ② 程式檢查，你修改 → ③ 產生記錄表 → ④ 填入量測值 → ⑤ 帶入下方分析（統計全部由程式計算）。",
    descPh: "例如：A 線、B 線各抽一批導管，比較拉伸強度是否有差異；規格下限 15 N",
    goLabel: "產生記錄表",
    role: "你是比較試驗（假設檢定）的設計助手。依使用者描述，建議試驗設計：one（單組對目標值）、two（兩組比較）、multi（3 組以上）；兩組時判斷獨立（ind）還是成對（paired：同一個樣品量兩次、或同一批樣品分兩種方法量）。再判斷檢定目的 goal：要證明「有差／改善了」用 diff；要證明「一樣／同等／沒有改變」（例如和 510(k) 比對品比較、轉廠、變更前後、換料、換供應商）用 equiv（同等性 TOST），並在理由中說明「沒有顯著差異不等於相同」。同等界限 eqd（Δ）只有使用者提供才填，否則填 null，並說明 Δ 要在看數據前依臨床或功能需求、比對品規格決定。",
    example: '{"purpose":"two","relation":"ind","groups":["轉廠前","轉廠後"],"n":15,"alt":"two-sided","alpha":0.05,"goal":"diff","eqd":null,"target":null,"lsl":null,"usl":null}',
    schemaNote: "purpose＝one、two、multi；relation＝ind 或 paired（只有 two 用）；groups＝組別名稱（one 為 1 個、two 為 2 個、multi 為 3～8 個）；n＝每組樣本數（建議值，常見做法標 *）；alt＝two-sided、greater（第 1 組較大或大於目標）、less（goal 為 equiv 時固定 two-sided）；alpha；goal＝diff 或 equiv（multi 只能 diff）；eqd＝同等界限 Δ（正數，使用者提供才填）；target＝單組要比較的目標值；lsl／usl＝規格（使用者提供才填）。",
    def: { purpose: "two", relation: "ind", groups: "A, B", n: 10, goal: "diff", eqd: "", alt: "two-sided", alpha: "0.05", target: "", lsl: "", usl: "" },
    toJson: m => Object.assign({}, m, { groups: String(m.groups).split(/[,，、]+/).map(s => s.trim()).filter(Boolean) }),
    fields: [
      { k: "purpose", lab: "要比較什麼", type: "select", opts: [["one", "單組對目標值"], ["two", "兩組比較"], ["multi", "3 組以上"]] },
      { k: "relation", lab: "樣本關係", type: "select", opts: [["ind", "獨立（兩組是不同的樣品）"], ["paired", "成對（同一個樣品量兩次）"]], show: m => m.purpose === "two" },
      { k: "groups", lab: "組別名稱（逗號分隔）", type: "text", ph: "例如 A 線, B 線" },
      { k: "n", lab: "每組樣本數", type: "int", lo: 2, hi: 500 },
      { k: "goal", lab: "檢定目的", type: "select", opts: [["diff", "差異：有沒有差"], ["equiv", "同等性（TOST）：差在 ±Δ 內"]], show: m => m.purpose !== "multi" },
      { k: "eqd", lab: "同等界限 Δ（±）", type: "num", ph: "必填，看數據前決定", show: m => m.purpose !== "multi" && m.goal === "equiv" },
      { k: "alt", lab: "對立假設", type: "select", opts: [["two-sided", "雙尾（不同）"], ["greater", "單尾：第 1 組較大／大於目標"], ["less", "單尾：第 1 組較小／小於目標"]], show: m => m.purpose !== "multi" && m.goal !== "equiv" },
      { k: "alpha", lab: "顯著水準 α", type: "select", opts: [["0.01", "0.01"], ["0.025", "0.025"], ["0.05", "0.05"], ["0.10", "0.10"]] },
      { k: "target", lab: "目標值", type: "num", ph: "單組必填", show: m => m.purpose === "one" },
      { k: "lsl", lab: "規格下限 LSL（選填）", type: "num" },
      { k: "usl", lab: "規格上限 USL（選填）", type: "num" }
    ],
    check: m => {
      const o = [], bad = x => o.push({ lv: "bad", m: x }), warn = x => o.push({ lv: "warn", m: x }), ok = x => o.push({ lv: "ok", m: x });
      const g = String(m.groups).split(/[,，、]+/).map(s => s.trim()).filter(Boolean), need = m.purpose === "one" ? 1 : m.purpose === "two" ? 2 : 3;
      if (m.purpose === "multi" ? g.length < 3 || g.length > 8 : g.length !== need) bad(m.purpose === "multi" ? "3 組以上要填 3～8 個組別名稱。" : `要填 ${need} 個組別名稱。`);
      if (new Set(g).size !== g.length) bad("組別名稱不能重複。");
      if (m.purpose === "one") { const t = pkNum(m.target); if (t == null || Number.isNaN(t)) bad("單組對目標值要填目標值。"); }
      const L = pkNum(m.lsl), U = pkNum(m.usl); if (Number.isNaN(L) || Number.isNaN(U)) bad("規格要是數字。"); else if (L != null && U != null && L >= U) bad("規格下限必須小於上限。");
      const eqv = m.goal === "equiv" && m.purpose !== "multi";
      if (eqv) { const e = pkNum(m.eqd); if (e == null || Number.isNaN(e) || !(e > 0)) bad("同等性要填同等界限 Δ（大於 0）：差多少以內算一樣，依臨床／功能需求或比對品規格，在看數據前決定。"); else ok(`同等性判定：${Math.round((1 - 2 * Number(m.alpha)) * 100)}% 信賴區間完全落在 ±${m.eqd} 內才判定同等。`); }
      if (eqv) warn("同等性的樣本數要用「樣本數規劃 ② 變更後一樣嗎」計算；樣本太少時信賴區間太寬，即使真的一樣也判定不出來*。");
      if (m.n < 3) bad("每組至少 3 個。"); else if (eqv) ok(`共 ${m.n * Math.max(need, g.length)} 個量測值。`); else if (m.n < 10) warn("每組少於 10 個：檢定力低，「沒有顯著差異」不代表「相同」*。要證明相同，請用樣本數規劃或等效性檢定的思路決定 n。"); else ok(`共 ${m.n * Math.max(need, g.length)} 個量測值。`);
      if (m.relation === "paired" && m.purpose === "two") warn("成對：記錄表的同一列必須是同一個樣品（或同一對），順序不能錯。");
      if (m.alt !== "two-sided" && m.purpose !== "multi" && !eqv) warn("單尾檢定只在事先確定只關心一個方向時才用*。");
      warn("每組的樣品要隨機抽取，量測順序最好交錯（不要先量完 A 再量 B），避免時間或量具漂移混進組別差異*。");
      warn("樣本數的依據建議先用「樣本數規劃」計算，並把計算條件寫進試驗計畫書。");
      return o;
    },
    fromJson: (j, m) => {
      if (["one", "two", "multi"].includes(j.purpose)) m.purpose = j.purpose;
      if (["ind", "paired"].includes(j.relation)) m.relation = j.relation;
      if (Array.isArray(j.groups) && j.groups.length) m.groups = j.groups.map(s => String(s).slice(0, 16)).slice(0, 8).join(", ");
      if (j.n != null) m.n = pkInt(j.n, 2, 500, 10);
      if (["two-sided", "greater", "less"].includes(j.alt)) m.alt = j.alt;
      if (["diff", "equiv"].includes(j.goal)) m.goal = j.goal;
      if (j.eqd !== undefined) { const x = Number(j.eqd); m.eqd = j.eqd == null || !isFinite(x) || x <= 0 ? "" : String(x); }
      if (m.goal === "equiv") m.alt = "two-sided";
      if (j.alpha != null) { const a = +j.alpha; m.alpha = a === 0.01 ? "0.01" : a === 0.025 ? "0.025" : a === 0.1 ? "0.10" : "0.05"; }
      ["target", "lsl", "usl"].forEach(k => { if (j[k] !== undefined) { const x = Number(j[k]); m[k] = j[k] == null || !isFinite(x) ? "" : String(x); } });
    },
    go: (m, ui) => {
      const g = String(m.groups).split(/[,，、]+/).map(s => s.trim()).filter(Boolean), n = m.n;
      const S = { m: Object.assign({}, m), g, v: Array.from({ length: n }, () => g.map(() => "")) };
      const draw = () => {
        ui.sheet.innerHTML = `<h3>記錄表（${g.length} 組 × ${n} 個）</h3><p class="help">${m.relation === "paired" && m.purpose === "two" ? "同一列是同一個樣品的兩次量測。" : "每一欄是一組，由上往下填。"}填好後按「帶入下方分析」。統計全部由程式計算，AI 不參與。</p>
          <div class="scroll-x mp-tblwrap"><table class="mp-tbl"><thead><tr><th>#</th>${g.map(x => `<th>${esc(x)}</th>`).join("")}</tr></thead><tbody>${S.v.map((r, i) => `<tr><td>${i + 1}</td>${r.map((v, j) => `<td><input class="mp-in" data-r="${i}" data-c="${j}" value="${esc(v)}" type="text" inputmode="decimal" autocomplete="off"></td>`).join("")}</tr>`).join("")}</tbody></table></div>
          <details class="mp-paste"><summary>從 Excel 一次貼上數值</summary><p class="hint">貼上 ${g.length} 欄 × ${n} 列的數值（不含標題）。</p><textarea class="pk-bulk" rows="3" spellcheck="false"></textarea><div class="run-row"><button class="btn small" type="button" data-act="bulk">填入表格</button></div></details>
          <div class="run-row"><button class="btn primary" type="button" data-act="apply">帶入下方分析</button><button class="btn" type="button" data-act="csv">下載空白記錄表（CSV）</button><span class="hint pk-prog"></span></div>`;
        ui.sheet.hidden = false; prog();
      };
      const prog = () => { const f = [].concat(...S.v).filter(v => String(v).trim() !== "").length; const el = ui.sheet.querySelector(".pk-prog"); if (el) el.textContent = `已填 ${f} / ${n * g.length}`; };
      ui.sheet.oninput = e => { const t = e.target; if (t.dataset.r != null) { S.v[+t.dataset.r][+t.dataset.c] = t.value; prog(); } };
      ui.sheet.onclick = e => {
        const a = e.target.dataset.act; if (!a) return;
        if (a === "bulk") { const lines = ui.sheet.querySelector(".pk-bulk").value.split(/\r?\n/).map(l => l.trim()).filter(Boolean); lines.slice(0, n).forEach((l, i) => l.split(/[\s,，;\t]+/).filter(Boolean).slice(0, g.length).forEach((v, j) => { S.v[i][j] = v; })); draw(); ui.note("已填入表格，請檢查。"); }
        else if (a === "csv") {
          if (!downloads) { ui.note("這個檢視無法下載檔案。", true); return; }
          const L = [["#"].concat(g).map(x => `"${String(x).replace(/"/g, '""')}"`).join(",")].concat(S.v.map((r, i) => [i + 1].concat(r.map(() => "")).join(",")));
          Promise.resolve().then(() => downloads.save({ filename: `比較試驗_記錄表_${new Date().toISOString().slice(0, 10)}.csv`, data: "﻿" + L.join("\r\n") })).catch(er => { if (!(er && er.code === "declined")) ui.note("無法下載檔案。", true); });
        } else if (a === "apply") {
          const cells = [].concat(...S.v).map(v => String(v).trim()), miss = cells.filter(v => v === "").length;
          if (miss) { ui.note(`還有 ${miss} 格沒填。`, true); return; }
          const bad = cells.find(v => !isFinite(Number(v))); if (bad != null) { ui.note(`「${bad}」不是數字。`, true); return; }
          const doApply = () => {
          setSub("compare");
          pkSet("pasteBox", [g.join("\t")].concat(S.v.map(r => r.map(v => String(v).trim()).join("\t"))).join("\n"));
          reparse(false);
          pkHypSettings(m);
          $("runBtn").click(); $("pasteBox").scrollIntoView({ behavior: "smooth", block: "center" });
          ui.note("已帶入並分析，結果在下方。");
          };
          if (pkHypTouched && ($("pasteBox").value || "").trim()) ui.ask("下方假設檢定已經有資料，帶入會取代原本的資料。要取代嗎？", [{ label: "取代", fn: doApply }, { label: "取消" }]); else doApply();
        }
      };
      draw();
      return { msg: "記錄表已產生，在下方。" };
    }
  });


  // ---------------- DOE（因子設計／混合設計） ----------------
  const DOE_MODE = { full: "全因子 2^k（2～5 因子）", frac: "部分因子 2^(k−p)（4～7 因子）", pb: "Plackett-Burman 篩選（5～11 因子，12 次）", mix: "混合設計（配方比例，3～4 成分）" };
  const DOE_RANGE = { full: [2, 5], frac: [4, 7], pb: [5, 11], mix: [3, 4] };
  const MIX_DESIGN = [["lat2c", "{q,2} 單形格子＋中心點"], ["lat2", "{q,2} 單形格子"], ["lat3", "{q,3} 單形格子"], ["cen", "單形重心設計"]];
  function pkFracKey(k) { const c = Object.entries(QQ.FRACTIONS).filter(([, f]) => f.k === k).sort((a, b) => a[1].p - b[1].p)[0]; return c ? Object.assign({ key: c[0] }, c[1]) : { key: "", p: 0, res: "", gens: [] }; }
  const pkGenStr = k => { const f = pkFracKey(k), base = f.k - f.p; return (f.gens || []).map((g, i) => QQ.LETTERS[base + i] + "=" + g).join(", "); };
  const pkGenNorm = s => String(s || "").toUpperCase().replace(/\s+/g, "").replace(/[；;、，]/g, ",").split(",").filter(Boolean).sort().join(",");
  const pkModeOf = j => { const v = String(j.mode || j.kind || "").trim(); if (DOE_MODE[v]) return v; if (/混合|mix/i.test(v)) return "mix"; if (/plackett|pb/i.test(v)) return "pb"; if (/部分|frac|k\s*[−-]\s*p/i.test(v)) return "frac"; if (/全因子|full|2\^k/i.test(v)) return "full"; return ""; };
  const pkRuns = m => { const k = (m.mode === "mix" ? m.comps : m.factors).length; if (m.mode === "full") return 1 << k; if (m.mode === "frac") return 1 << (k - pkFracKey(k).p); if (m.mode === "pb") return 12; try { return mixPoints(k, m.mixdesign).length; } catch (_) { return null; } };
  const pkDoeName = r => { const n = String(r.name || "").trim(), u = String(r.unit || "").trim(); return u && !n.includes(u) ? `${n} (${u})` : n; };
  const pkDoeDefault = i => doeF[i] && doeF[i].name === "因子 " + QQ.LETTERS[i] && doeF[i].lo === "-1" && doeF[i].hi === "+1";
  function pkBadge(elId, anchorId, text) {
    let b = $(elId); if (!b) { const a = $(anchorId); if (!a) return; b = document.createElement("p"); b.id = elId; b.className = "pk-badge"; a.parentNode.insertBefore(b, a.nextSibling); }
    b.hidden = !text; b.textContent = text || "";
  }
  makePlanner({
    id: "pkd", view: "viewDOE", before: ".subtabs", route: "doe", chatKey: "doe", problemId: "doeProblem", blocks: ["doeplan", "doe"],
    title: "DOE 規劃", sub: "決定模式、因子與水準；確認後填入下方 DOE 工具",
    help: "這裡是確認區：魚骨圖的待驗證原因、AI 的建議都先放在這裡，由程式檢查；你確認或修改後按「填入 DOE 工具」，再到工具按「產生實驗矩陣」。實驗矩陣與別名一律由工具計算，不用 AI 給的表格。",
    descPh: "例如：無菌包裝封口拉力偏低，想調封口溫度、壓力、時間；目前設定 150°C、0.3 MPa、1.5 秒",
    goLabel: "填入 DOE 工具", chatBtn: "帶入 DOE（先放進確認區）",
    chatWhen: "只有在使用者明確要求規劃或舉例 DOE（實驗設計）時才附區塊；回答中如果有建議具體的 DOE 設計",
    role: "你是 DOE（實驗設計）的設計助手。依使用者描述，建議模式（mode：full 全因子 2～5 因子、frac 部分因子 4～7 因子、pb Plackett-Burman 5～11 因子、mix 混合設計 3～4 成分）、因子名稱與單位、回應名稱。水準的數值只有使用者提供時才填，否則留空，並在文字說明怎麼決定範圍（例如現行值上下多少、安全或可操作的製程視窗）。重複次數留 null，並提醒用網站的「樣本數規劃 → DOE 重複次數」估算。文字中說明別名（混淆）與注意事項。",
    example: '{"mode":"frac","k":4,"p":1,"generator":"D=ABC","factors":[{"name":"熱定型溫度","low":"","high":"","unit":"°C"},{"name":"熱定型時間","low":"","high":"","unit":"s"},{"name":"拉伸速度","low":"","high":"","unit":"mm/min"},{"name":"冷卻方式","low":"","high":"","unit":""}],"responses":["抽芯力峰值 (N)"],"goal":"max","replicates":null,"randomize":true}',
    schemaNote: "mode 只能是 full、frac、pb、mix。factors 的 low／high 使用者沒提供就留空字串，不准自己編數字。mix 時改用 components（成分名稱陣列）與 mixDesign（lat2c、lat2、lat3、cen）。responses 是回應名稱陣列（工具一次分析一個，放第一個）。goal＝max、min、target（target 需 target 值）。replicates 留 null。randomize 固定 true。矩陣、別名由網站工具計算，不要放進區塊。",
    def: { mode: "full", factors: [], comps: [], reps: "", response: "", goal: "max", target: "", generator: "", mixdesign: "lat2c", mixmodel: "auto", extraResp: "", norandom: false },
    toJson: m => Object.assign({}, m),
    fields: [
      { k: "mode", lab: "模式", type: "select", opts: Object.entries(DOE_MODE) },
      { k: "factors", lab: "因子與水準（水準請填實際範圍；紅色是還沒填的）", type: "table", show: m => m.mode !== "mix", blank: { name: "", low: "", high: "", unit: "" },
        cols: [{ k: "name", lab: "因子名稱", req: true }, { k: "low", lab: "低水準（−）", req: true, ph: "實際數值" }, { k: "high", lab: "高水準（+）", req: true, ph: "實際數值" }, { k: "unit", lab: "單位" }, { k: "src", lab: "來源" }] },
      { k: "comps", lab: "成分（比例加總 100%）", type: "table", show: m => m.mode === "mix", blank: { name: "" }, cols: [{ k: "name", lab: "成分名稱", req: true }, { k: "src", lab: "來源" }] },
      { k: "mixdesign", lab: "混合設計", type: "select", opts: MIX_DESIGN, show: m => m.mode === "mix" },
      { k: "mixmodel", lab: "模型", type: "select", opts: [["auto", "自動"], ["linear", "線性"], ["quadratic", "二次"], ["cubic", "特殊三次"]], show: m => m.mode === "mix" },
      { k: "reps", lab: "每組重複次數", type: "select", req: true, opts: m => [["", "請選擇"], ["1", "1（不重複）"], ["2", "2"]].concat(m.mode === "mix" ? [] : [["3", "3"]]) },
      { k: "response", lab: "回應（含單位）", type: "text", ph: "例如 抽芯力峰值 (N)" },
      { k: "goal", lab: "目標", type: "select", opts: [["max", "越大越好"], ["min", "越小越好"], ["target", "越接近目標值越好"]] },
      { k: "target", lab: "目標值", type: "num", show: m => m.goal === "target" }
    ],
    check: m => {
      const o = [], bad = (x, go) => o.push({ lv: "bad", m: x, go }), warn = (x, go) => o.push({ lv: "warn", m: x, go }), ok = x => o.push({ lv: "ok", m: x });
      const mix = m.mode === "mix", rows = mix ? m.comps : m.factors, k = rows.length, [lo, hi] = DOE_RANGE[m.mode];
      if (k < lo || k > hi) bad(`${DOE_MODE[m.mode]}：目前 ${k} 個${mix ? "成分" : "因子"}，要 ${lo}～${hi} 個。${!mix && k > 5 && m.mode === "full" ? "因子多時改用部分因子或 Plackett-Burman 先篩選。" : ""}`);
      const names = rows.map(r => String(r.name || "").trim());
      if (names.some(n => !n)) bad("有空白的名稱。");
      if (new Set(names.filter(Boolean)).size !== names.filter(Boolean).length) bad("名稱有重複。");
      if (!mix) {
        const miss = m.factors.filter(r => !String(r.low).trim() || !String(r.high).trim()).map(r => r.name || "（未命名）");
        if (miss.length) bad(`請填實際範圍：${miss.join("、")} 的低／高水準還沒填（紅色格子）。`);
        m.factors.forEach(r => { if (String(r.low).trim() && String(r.low).trim() === String(r.high).trim()) bad(`「${r.name}」的低水準和高水準相同。`); });
        if (m.factors.some(r => r.aiLv)) warn("AI 帶入了水準數值：請確認這是你們提供或決定的範圍，不是 AI 猜的*。");
        if (m.mode === "frac" && k >= 4 && k <= 7) { const g = pkGenStr(k), f = pkFracKey(k); warn(`部分因子 2^(${f.key})，產生器 ${g}，解析度 ${f.res}：${f.res === "III" ? "主效應會和二因子交互作用混淆，只適合篩選" : f.res === "IV" ? "主效應不會和二因子交互作用混淆，但二因子交互作用之間會混淆" : "主效應與二因子交互作用都不會互相混淆"}。`); if (m.generator && pkGenNorm(m.generator) !== pkGenNorm(g)) warn(`建議寫的產生器「${m.generator}」和工具使用的「${g}」不同，以工具為準（工具目前不支援自訂產生器）。`); }
        if (m.mode === "pb") warn("Plackett-Burman 只能看主效應，交互作用會混在主效應裡；用來從很多因子中挑出重要的幾個*。");
        warn("目前不支援中心點；若懷疑有曲率（最佳點在中間），分析後再做追加實驗*。");
      } else {
        warn("混合設計的每個成分範圍是 0～100%（全單形）；若某成分有上下限，目前工具不支援，請先確認*。");
        if (m.reps === "3") bad("混合設計的重複次數只能 1 或 2。");
      }
      if (m.reps === "") bad("請選擇重複次數。不確定時，可用「樣本數規劃 → DOE 重複次數」估算。", ["sample", "doer", "到樣本數規劃估算"]);
      else if (m.reps === "1" && !mix) warn("不重複時無法直接估計實驗誤差，程式會用 Lenth 法判斷顯著性；結果較不穩*。");
      if (!o.some(x => x.lv === "bad")) { const R = pkRuns(m); if (R) ok(`${R} 組 × ${m.reps} 次 ＝ ${R * m.reps} 次實驗。`); }
      if (!String(m.response).trim()) warn("建議填回應名稱（含單位）。");
      if (m.extraResp) warn(`其他回應（${m.extraResp}）：工具一次只分析一個回應，可另存案件分次分析。`);
      if (m.norandom) warn("建議寫了不隨機化：工具一律隨機排序執行順序，以避免時間漂移混進因子效應。");
      if (m.goal === "target") { const t = pkNum(m.target); if (t == null || Number.isNaN(t)) bad("「越接近目標值越好」要填目標值。"); }
      return o;
    },
    fromJson: (j, m, src) => {
      const mode = pkModeOf(j); if (!mode) return { error: "建議的模式不是 DOE 工具現有的模式（全因子、部分因子、Plackett-Burman、混合設計），沒有帶入。" };
      m.mode = mode; src = src || "ai";
      const str = v => String(v == null ? "" : v).replace(/[\n]/g, " ").trim().slice(0, 40);
      if (mode === "mix") {
        const comps = Array.isArray(j.components) ? j.components : Array.isArray(j.factors) ? j.factors.map(f => f && (f.name || f)) : [];
        m.comps = comps.slice(0, 8).map(n => ({ name: str(typeof n === "object" ? n.name : n), src }));
        if (MIX_DESIGN.some(x => x[0] === j.mixDesign)) m.mixdesign = j.mixDesign;
      } else {
        let fs = Array.isArray(j.factors) ? j.factors : [];
        if (!fs.length && +j.k > 0) fs = Array.from({ length: +j.k }, (_, i) => ({ name: "因子 " + QQ.LETTERS[i] }));
        m.factors = fs.slice(0, 15).map(f => { const r = { name: str(f.name), low: str(f.low ?? f.lo), high: str(f.high ?? f.hi), unit: str(f.unit), src }; if (src === "ai" && (r.low || r.high)) r.aiLv = true; return r; });
        if (j.generator) m.generator = Array.isArray(j.generator) ? j.generator.join(", ") : str(j.generator);
      }
      const k = (mode === "mix" ? m.comps : m.factors).length, [lo, hi] = DOE_RANGE[mode];
      if (k < lo || k > hi) return { error: `${DOE_MODE[mode]}要 ${lo}～${hi} 個${mode === "mix" ? "成分" : "因子"}，建議中有 ${k} 個，沒有帶入。請在對話中請 AI 改用其他模式，或自己在確認區調整。` };
      const resp = Array.isArray(j.responses) ? j.responses.map(str).filter(Boolean) : j.response ? [str(j.response)] : [];
      m.response = resp[0] || ""; m.extraResp = resp.slice(1).join("、");
      const rp = j.replicates ?? j.reps; m.reps = rp != null && [1, 2, 3].includes(+rp) && !(mode === "mix" && +rp === 3) ? String(+rp) : "";
      if (["max", "min", "target"].includes(j.goal)) m.goal = j.goal;
      if (j.target != null && isFinite(Number(j.target))) m.target = String(Number(j.target));
      m.norandom = j.randomize === false;
      return { m };
    },
    merge: (cur, fresh) => { const key = fresh.mode === "mix" ? "comps" : "factors"; if (cur.mode !== fresh.mode) { cur.mode = fresh.mode; } const have = new Set((cur[key] || []).map(r => r.name)); cur[key] = (cur[key] || []).concat(fresh[key].filter(r => !have.has(r.name))); ["response", "reps", "generator"].forEach(x => { if (!cur[x] && fresh[x]) cur[x] = fresh[x]; }); },
    preview: j => {
      const r = PLANS.doe && PLANS.doe._fromJson ? PLANS.doe._fromJson(j) : null;
      if (!r || r.error) return { ok: false, html: `<p class="hint"><span class="status ng">${esc((r && r.error) || "無法讀取這個 DOE 建議。")}</span></p>` };
      const m = r.m, mix = m.mode === "mix", R = pkRuns(m);
      const rows = mix ? m.comps.map(x => `<tr><td>${esc(x.name)}</td></tr>`).join("") : m.factors.map(x => `<tr><td>${esc(pkDoeName(x))}</td><td>${x.low ? esc(x.low) : '<span class="status ng">待填</span>'}</td><td>${x.high ? esc(x.high) : '<span class="status ng">待填</span>'}</td></tr>`).join("");
      const gen = m.mode === "frac" ? `<br>產生器（工具）：${esc(pkGenStr(m.factors.length))}${m.generator && pkGenNorm(m.generator) !== pkGenNorm(pkGenStr(m.factors.length)) ? `<span class="hint">（建議寫的 ${esc(m.generator)} 不同，以工具為準）</span>` : ""}` : "";
      return { ok: true, html: `<div class="pk-pv"><b>DOE 建議預覽</b>（AI 建議，待確認）<br>模式：${esc(DOE_MODE[m.mode])}；${mix ? "成分" : "因子"} ${(mix ? m.comps : m.factors).length} 個；${R ? R + " 組" : ""}；重複次數：${m.reps || "待定（建議用樣本數規劃估算）"}；回應：${esc(m.response || "未填")}${gen}
        <div class="scroll-x"><table class="mini"><thead><tr><th>${mix ? "成分" : "因子"}</th>${mix ? "" : "<th>低水準</th><th>高水準</th>"}</tr></thead><tbody>${rows}</tbody></table></div></div>` };
    },
    toolHas: m => m.mode === "mix" ? !!mix || mixNamesArr.slice(0, +$("mixQ").value).some((n, i) => n !== ["樹脂", "溶劑", "添加劑", "成分 D"][i]) : !!doe || doeF.slice(0, doeKNow()).some((f, i) => !pkDoeDefault(i)),
    toolMerge: m => m.mode !== "mix" && !!doeF.slice(0, doeKNow()).some((f, i) => !pkDoeDefault(i)),
    go: (m, ui) => {
      const srcTxt = { ai: "AI 建議", fb: "魚骨圖" }[ui.src] || "確認區";
      if (m.mode === "mix") {
        pkClick('#doeTabs [data-tsub="mix"]');
        $("mixQ").value = String(m.comps.length); mixNamesArr.splice(0, m.comps.length, ...m.comps.map(r => r.name)); mixNamesUI();
        $("mixDesign").value = m.mixdesign; $("mixRep").value = m.reps; pkSet("mixY", m.response); $("mixModel").value = m.mixmodel;
        $("mixGoal").value = m.goal; $("mixTgtF").hidden = m.goal !== "target"; pkSet("mixTgt", m.target);
        mix = null; $("mixMatrix").innerHTML = ""; TQ.mix = null;
        pkBadge("mixSrcBadge", "mixGenHint", `來源：${srcTxt}（已填入，尚未產生實驗點）。請確認後按「產生實驗點」。`);
        $("mixQ").scrollIntoView({ behavior: "smooth", block: "center" });
        return { msg: "已填入下方混合設計工具（尚未產生實驗點）。" };
      }
      let rows = m.factors.map(r => ({ name: pkDoeName(r), lo: String(r.low).trim(), hi: String(r.high).trim() }));
      if (ui.mode === "add") { const cur = doeF.slice(0, doeKNow()).filter((f, i) => !pkDoeDefault(i)).map(f => Object.assign({}, f)); const have = new Set(cur.map(f => f.name)); rows = cur.concat(rows.filter(r => !have.has(r.name))); }
      const k = rows.length, [lo, hi] = DOE_RANGE[m.mode];
      if (k < lo || k > hi) return { msg: `加入後共 ${k} 個因子，超出${DOE_MODE[m.mode]}的範圍（${lo}～${hi}），沒有填入。`, bad: true };
      pkClick('#doeTabs [data-tsub="fact"]'); pkClick(`#doeKind [data-v="${m.mode}"]`);
      $("doeK").value = m.mode === "frac" ? pkFracKey(k).key : String(k);
      rows.forEach((r, i) => { doeF[i] = r; }); doeFactorsUI();
      $("doeRep").value = m.reps; pkSet("doeY", m.response);
      $("doeGoal").value = m.goal; $("doeTgtF").hidden = m.goal !== "target"; pkSet("doeTgt", m.target);
      doe = null; TQ.doe = null; $("doeMatrix").innerHTML = ""; $("doeSheets").hidden = true; $("doeTitle").textContent = "尚未分析"; $("doeGenHint").textContent = "";
      pkBadge("doeSrcBadge", "doeGenHint", `來源：${srcTxt}（已填入，尚未產生實驗矩陣）。請確認因子與水準後按「產生實驗矩陣」。`);
      $("doeFactors").scrollIntoView({ behavior: "smooth", block: "center" });
      return { msg: "已填入下方 DOE 工具（尚未產生實驗矩陣）。請確認後按「產生實驗矩陣」。" };
    }
  });

  // ---------------- 田口方法 ----------------
  const pkTgDefault = i => tgF[i] && tgF[i].name === "因子 " + TGE.LETTERS[i];
  makePlanner({
    id: "pkt", view: "viewTaguchi", before: ".grid", route: "taguchi", chatKey: "taguchi", problemId: "taguchiProblem", blocks: ["tgplan"],
    title: "穩健設計規劃", sub: "決定控制因子、雜音因子與品質特性；確認後填入下方田口工具",
    help: "這裡是確認區：魚骨圖的原因、AI 的建議都先放在這裡，由程式檢查；你決定每個因子是「控制因子」（可以設定水準）還是「雜音因子」（難以控制，用雜音條件模擬），確認後按「填入田口工具」，再到工具按「產生直交表」。",
    descPh: "例如：封口拉力在不同膜材批號與室溫下變化很大，想找出對這些變化不敏感的封口溫度、壓力、時間設定",
    goLabel: "填入田口工具", chatBtn: "帶入田口（先放進確認區）",
    role: "你是田口方法（穩健設計）的設計助手。依使用者描述，建議：品質特性類型（larger 望大、smaller 望小、nominal 望目）、控制因子（2～15 個，每個 2 或 3 水準）、雜音因子與雜音條件數（通常 2 個：N1 不利組合、N2 有利組合）。水準數值只有使用者提供時才填，否則留空，並說明怎麼決定。",
    example: '{"type":"larger","response":"封口拉力 (N/15mm)","target":null,"factors":[{"name":"封口溫度 (°C)","levels":["","",""]},{"name":"壓力 (MPa)","levels":["","",""]}],"noiseFactors":["膜材批號","環境溫度"],"noiseN":2,"noise":"N1＝不利組合；N2＝有利組合"}',
    schemaNote: "type＝larger、smaller、nominal（望目需 target）；factors＝控制因子陣列（name 含單位、levels 為 2 或 3 個水準，數值使用者沒提供就留空字串）；noiseFactors＝雜音因子名稱陣列；noiseN＝雜音條件數 1～4；noise＝雜音組合方式的說明。動態特性請在文字說明，不放進區塊。",
    def: { type: "larger", response: "", target: "", factors: [], noiseN: 2, noise: "" },
    fields: [
      { k: "type", lab: "品質特性", type: "select", opts: [["larger", "望大（越大越好）"], ["smaller", "望小（越小越好）"], ["nominal", "望目（越接近目標越好）"]] },
      { k: "response", lab: "品質特性名稱（含單位）", type: "text", ph: "例如 封口拉力 (N/15mm)" },
      { k: "target", lab: "目標值", type: "num", show: m => m.type === "nominal" },
      { k: "noiseN", lab: "雜音條件數", type: "int", lo: 1, hi: 4 },
      { k: "factors", lab: "因子（控制因子要填 2 或 3 個水準；紅色是還沒填的）", type: "table", blank: { name: "", role: "control", lv1: "", lv2: "", lv3: "" },
        cols: [{ k: "name", lab: "名稱（含單位）", req: true }, { k: "role", lab: "角色", type: "select", opts: [["control", "控制因子"], ["noise", "雜音因子"]] }, { k: "lv1", lab: "水準 1", req: true, reqIf: r => r.role !== "noise" }, { k: "lv2", lab: "水準 2", req: true, reqIf: r => r.role !== "noise" }, { k: "lv3", lab: "水準 3（選填）" }, { k: "src", lab: "來源" }] },
      { k: "noise", lab: "雜音組合方式（記錄用）", type: "area", rows: 2, ph: "例如 N1＝舊批膜材＋15°C；N2＝新批膜材＋30°C" }
    ],
    check: m => {
      const o = [], bad = x => o.push({ lv: "bad", m: x }), warn = x => o.push({ lv: "warn", m: x }), ok = x => o.push({ lv: "ok", m: x });
      const C = m.factors.filter(r => r.role !== "noise"), N = m.factors.filter(r => r.role === "noise"), k = C.length;
      if (m.factors.some(r => !String(r.name).trim())) bad("有空白的名稱。");
      if (k < 2 || k > 15) bad(`控制因子要 2～15 個，目前 ${k} 個。`);
      const lv = C.map(r => [r.lv1, r.lv2, r.lv3].map(x => String(x || "").trim()).filter(Boolean));
      C.forEach((r, i) => { if (!String(r.lv1).trim() || !String(r.lv2).trim()) bad(`請填實際水準：「${r.name || "（未命名）"}」至少要填水準 1、2（紅色格子）。`); else if (new Set(lv[i]).size !== lv[i].length) bad(`「${r.name}」的水準有重複。`); });
      if (!o.some(x => x.lv === "bad") && k) { const s = TGE.suggest(lv.map(x => x.length)); if (!s) bad("找不到適合的直交表：請減少因子或調整水準數（2 水準與 3 水準混合時，L18 最多 1 個 2 水準＋7 個 3 水準）。"); else ok(`會自動選用 ${s}：${TGE.ARR[s].runs} 組 × ${m.noiseN} 個雜音條件 ＝ ${TGE.ARR[s].runs * m.noiseN} 次實驗。`); }
      if (N.length) warn(`雜音因子（${N.map(r => r.name).join("、")}）不放進直交表，會寫進雜音說明；請把它們組合成 N1（不利）、N2（有利）等雜音條件。`);
      if (m.noiseN < 2) warn("只有 1 個雜音條件：S/N 比主要反映重複誤差，看不出對雜音的穩健性*。常見做法是 2 個（不利、有利的組合）*。");
      if (m.factors.some(r => r.aiLv)) warn("AI 帶入了水準數值：請確認這是你們提供或決定的，不是 AI 猜的*。");
      if (m.type === "nominal") { const t = pkNum(m.target); if (t == null || Number.isNaN(t)) warn("望目建議填目標值，分析時才能把平均調回目標。"); }
      warn("直交表通常不估計交互作用；若懷疑有強交互作用，確認實驗要做，或改用 DOE 全因子*。");
      return o;
    },
    fromJson: (j, m, src) => {
      src = src || "ai"; const str = v => String(v == null ? "" : v).replace(/[\n]/g, " ").trim().slice(0, 30);
      if (["larger", "smaller", "nominal"].includes(j.type)) m.type = j.type;
      if (j.response != null) m.response = str(j.response);
      if (j.target != null && isFinite(Number(j.target))) m.target = String(Number(j.target));
      const C = (Array.isArray(j.factors) ? j.factors : []).slice(0, 15).map(f => { const L = Array.isArray(f.levels) ? f.levels.slice(0, 3).map(str) : []; const r = { name: str(f.name), role: f.role === "noise" ? "noise" : "control", lv1: L[0] || "", lv2: L[1] || "", lv3: L[2] || "", src }; if (src === "ai" && L.some(Boolean)) r.aiLv = true; return r; });
      const N = (Array.isArray(j.noiseFactors) ? j.noiseFactors : []).slice(0, 8).map(n => ({ name: str(typeof n === "object" ? n.name : n), role: "noise", lv1: "", lv2: "", lv3: "", src }));
      m.factors = C.concat(N);
      if (j.noiseN != null) m.noiseN = pkInt(j.noiseN, 1, 4, 2);
      if (j.noise != null) m.noise = String(j.noise).slice(0, 200);
      if (m.factors.filter(r => r.role !== "noise").length > 15) return { error: "控制因子超過 15 個，沒有帶入。" };
      return { m };
    },
    merge: (cur, fresh) => { const have = new Set(cur.factors.map(r => r.name)); cur.factors = cur.factors.concat(fresh.factors.filter(r => !have.has(r.name))); ["response", "noise"].forEach(x => { if (!cur[x] && fresh[x]) cur[x] = fresh[x]; }); },
    toolHas: () => !!tg || tgF.slice(0, +$("tgK").value).some((f, i) => !pkTgDefault(i)),
    toolMerge: () => tgF.slice(0, +$("tgK").value).some((f, i) => !pkTgDefault(i)),
    go: (m, ui) => {
      const srcTxt = { ai: "AI 建議", fb: "魚骨圖" }[ui.src] || "確認區";
      let C = m.factors.filter(r => r.role !== "noise").map(r => { const L = [r.lv1, r.lv2, r.lv3].map(x => String(x || "").trim()).filter(Boolean); return { name: r.name, L: L.length, lab: L.concat(["水準 3"]).slice(0, 3) }; });
      if (ui.mode === "add") { const cur = tgF.slice(0, +$("tgK").value).filter((f, i) => !pkTgDefault(i)).map(f => JSON.parse(JSON.stringify(f))); const have = new Set(cur.map(f => f.name)); C = cur.concat(C.filter(f => !have.has(f.name))); }
      if (C.length > 15) return { msg: `加入後共 ${C.length} 個控制因子，超過 15 個，沒有填入。`, bad: true };
      if (!TGE.suggest(C.map(f => f.L))) return { msg: "加入後找不到適合的直交表，沒有填入。", bad: true };
      const N = m.factors.filter(r => r.role === "noise").map(r => r.name);
      pkClick(`#tgType [data-v="${m.type}"]`);
      C.forEach((f, i) => { tgF[i] = f; }); $("tgK").value = String(C.length); tgFactorsUI(); $("tgArr").value = "auto";
      $("tgNoiseN").value = String(m.noiseN); tgNoiseUI();
      pkSet("tgY", m.response); pkSet("tgNoiseDesc", [N.length ? "雜音因子：" + N.join("、") + "。" : "", m.noise].filter(Boolean).join(" ")); if (m.type === "nominal") pkSet("tgTarget", m.target);
      tg = null; $("tgMatrix").innerHTML = ""; tgGenHint();
      pkBadge("tgSrcBadge", "tgGenHint", `來源：${srcTxt}（已填入，尚未產生直交表）。請確認後按「產生直交表」。`);
      $("tgFactors").scrollIntoView({ behavior: "smooth", block: "center" });
      return { msg: "已填入下方田口工具（尚未產生直交表）。請確認後按「產生直交表」。" };
    }
  });

  // ---------------- 魚骨圖 → 確認區 ----------------
  function pkFbList() {
    const v = fb.factors.filter(f => f.verify && f.st !== "excl");
    return v.length ? v : fb.factors.filter(f => f.key && f.st === "use");
  }
  function pkFromFb(tool, fid) {
    if (tool === "doe" || tool === "taguchi") { fbpFromFishbone(tool); return; }   // 到工具頁勾選要帶入的原因
    const list = pkFbList();
    if (!list.length && tool !== "hyp") { fbNote("還沒有標記「◇ 待驗證」（或「★ 重要」）的原因。先在 STEP 2 標記，再帶入。"); return; }
    if (tool === "doe") PLANS.doe.apply({ mode: list.length > 5 ? (list.length > 7 ? "pb" : "frac") : "full", factors: list.map(f => ({ name: f.text, low: "", high: "", unit: "" })) }, "fb");
    else if (tool === "taguchi") PLANS.taguchi.apply({ factors: list.map(f => ({ name: f.text, levels: [] })) }, "fb");
    else if (tool === "hyp") { const f = fb.factors.find(x => x.id === fid); if (!f) return; PLANS.hyp.apply({ purpose: "two", relation: "ind", groups: [f.text.slice(0, 12) + "：條件 A", f.text.slice(0, 12) + "：條件 B"] }, "fb"); }
    else if (tool === "spc") {
      const cats = [...new Set(list.map(f => fbCatName(f)).filter(Boolean))].slice(0, 4);
      const cur = String(SP.m.strata || "").split(/[,，、]+/).map(s => s.trim()).filter(Boolean);
      SP.m.strata = [...new Set(cur.concat(cats))].slice(0, 4).join(", ");
      route("spc"); spRenderForm(); $("spcPlan").open = true; spNote(`已從魚骨圖帶入分層欄位：${cats.join("、")}。${SP.m.dataType ? "" : "請先選「資料型態」，分層欄位就會顯示。"}`);
      $("spcPlan").scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }
  $("fbVerify").addEventListener("click", e => { const b = e.target.closest("[data-pkfb]"); if (b) pkFromFb(b.dataset.pkfb, b.dataset.fid); });
  // 田口頁原本的「從魚骨圖帶入」改成先放進確認區
  (function () { const b = $("tgFromFb"); if (!b) return; const nb = b.cloneNode(true); b.replaceWith(nb); nb.textContent = "從魚骨圖帶入（先放進確認區）"; nb.addEventListener("click", () => { const box = $("tgFbPick"); if (box) box.hidden = true; pkFromFb("taguchi"); }); })();
  // DOE 工具：產生矩陣前檢查水準是否空白（手動流程預設 −1／+1，不受影響）
  $("doeFactors").addEventListener("input", e => { const t = e.target.closest('[data-fk="lo"], [data-fk="hi"]'); if (t) t.classList.toggle("pk-miss", !t.value.trim()); });
