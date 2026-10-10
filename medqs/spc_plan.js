  // =====================================================================
  // SPC 資料規劃：AI 建議資料結構（管制圖、子組大小、組數、抽樣頻率、規格、分層欄位）→ 程式檢查 → 人員修改
  // → 產生依時間順序的記錄表 → 人員填數值 → 帶入下方 SPC 分析（統計仍由 JS 計算；AI 不產生任何量測數值）
  // =====================================================================
  const SP_DT = {
    continuous: { name: "連續型（計量）", eg: "例如拉力、外徑、重量", kind: "var" },
    defective: { name: "不良品（每件判通過／不通過）", eg: "每批抽幾件、幾件不良", kind: "defective" },
    defect: { name: "缺點數（一件可有多個缺點）", eg: "例如每片的異物數、每批的外觀缺點數", kind: "defect" }
  };
  const SP_GOAL = { stable: "只看製程是否穩定", cap: "穩定後再算製程能力（Cpk）" };
  const SP_DEF = { dataType: "", goal: "cap", cpkTarget: "1.33", unit: "", resolution: "", lsl: "", target: "", usl: "", subgroupSize: 5, subgroups: 25, frequency: "", sampleSize: 200, sizeVaries: false, units: 1, unitsVary: false, strata: "", skewed: false };
  const SP = { m: Object.assign({}, SP_DEF), sheet: null, busy: false };
  const spNum = v => { const s = String(v == null ? "" : v).trim(); if (s === "") return null; const x = Number(s); return isFinite(x) ? x : NaN; };
  const spInt = (v, lo, hi, d) => { const x = Math.round(Number(v)); return isFinite(x) ? Math.min(hi, Math.max(lo, x)) : d; };
  const spStrata = () => String(SP.m.strata || "").split(/[,，、]+/).map(s => s.trim()).filter(Boolean).slice(0, 4);
  function spChart(M) {
    if (M.dataType === "continuous") return M.subgroupSize === 1 ? "imr" : M.subgroupSize <= 10 ? "xbarr" : "xbars";
    if (M.dataType === "defective") return M.sizeVaries ? "p" : "np";
    if (M.dataType === "defect") return M.unitsVary ? "u" : "c";
    return "";
  }

  // ---- 程式檢查（數量門檻依一般慣例*；不是法規硬性規定） ----
  function spCheck(M) {
    const o = [], bad = m => o.push({ lv: "bad", m }), warn = m => o.push({ lv: "warn", m }), ok = m => o.push({ lv: "ok", m });
    if (!SP_DT[M.dataType]) { bad("請先選擇「資料型態」（必填）。"); return o; }
    const k = M.subgroups;
    if (M.dataType === "continuous") {
      const n = M.subgroupSize, L = spNum(M.lsl), U = spNum(M.usl), T = spNum(M.target), R = spNum(M.resolution);
      if ([L, U, T, R].some(Number.isNaN)) bad("規格、目標值、解析度要填數字（不需要就留空）。");
      if (n > 25) bad("子組大小超過 25，請重新分組。");
      if (n === 1) { if (k < 20) bad("個別值少於 20 點：管制界限估不準。"); else if (k < 25) warn("個別值少於 25 點（常見做法是 25～30 點以上*）。"); }
      else if (k < 15) bad("子組少於 15 組：管制界限估不準。"); else if (k < 20) warn("子組少於 20 組（常見做法是 20～25 組*）。");
      if (n > 1 && n <= 10) ok(`子組大小 ${n}：使用 X̄-R 管制圖。`); else if (n > 10 && n <= 25) ok(`子組大小 ${n}：使用 X̄-S 管制圖。`); else if (n === 1) ok("每次只量 1 個：使用 I-MR（個別值）管制圖。");
      if (n > 1) warn("同一子組的樣品要在「同一時間、同一條件」下連續取（例如同一小時內連續 5 個），子組之間才看得出時間的變化*。");
      if (L != null && U != null && L >= U) bad("規格下限必須小於上限。");
      if (T != null && ((L != null && T < L) || (U != null && T > U))) bad("目標值要在規格範圍內。");
      if (R > 0 && L != null && U != null && L < U && (U - L) / R < 10) warn(`解析度 ${R} 相對於公差太粗（常見要求：解析度 ≤ 公差的 1/10*）。`);
      if (M.goal === "cap") {
        if (L == null && U == null) bad("要算 Cpk 必須至少有一邊規格（LSL 或 USL）。");
        else if (L == null || U == null) warn(`只有${L != null ? "下限" : "上限"}：會算單邊的 ${L != null ? "Cpl" : "Cpu"}（也就是 Cpk），Cp 不適用。`);
        const N = n * k; if (N < 50) warn(`總共 ${N} 個數值：算 Cpk 太少，信賴區間會很寬（常見建議 100 個以上*）。`); else if (N < 100) warn(`總共 ${N} 個數值：Cpk 可以算，但信賴區間偏寬（常見建議 100 個以上*）。`);
        const t = spNum(M.cpkTarget); if (t != null && !Number.isNaN(t)) warn(`判斷 Cpk ≥ ${t} 時，看點估計也要看信賴區間下限；目標值依公司程序與驗證計畫決定。`);
        if (M.skewed) warn("你勾了「資料可能偏態」：拉力、強度這類資料常有偏態，Cpk 假設常態，偏態時要先轉換或改用非常態方法*。帶入後程式會計算偏態係數提醒你。");
      }
    } else if (M.dataType === "defective") {
      if (k < 20) warn("少於 20 批（常見做法是 20～25 批以上*）。");
      if (!M.sizeVaries && M.sampleSize < 50) warn("每批抽樣數偏少：不良率的管制圖會很不敏感，常常整批 0 件不良也看不出變化*。");
      ok(`每批抽樣數${M.sizeVaries ? "會變動：使用 p 管制圖（看不良率）" : "固定：使用 np 管制圖（直接看不良數）"}。`);
    } else {
      if (k < 20) warn("少於 20 次檢驗（常見做法是 20～25 次以上*）。");
      ok(`檢驗單位數${M.unitsVary ? "會變動：使用 u 管制圖（看每單位缺點數）" : "固定：使用 c 管制圖（直接看缺點數）"}。`);
    }
    const st = spStrata();
    if (st.length) warn(`有分層欄位（${st.join("、")}）：不同${st[0]}的資料混在同一張圖，管制界限會被撐寬、看不出真正的異常；帶入時若發現混了多種，程式會提醒你分開畫*。`);
    else warn("建議記錄可能造成差異的分層欄位（例如機台、模具、操作員、材料），用代號即可。");
    warn("資料要依生產時間順序記錄，不要挑樣、不要重新排序；連續點的判異規則（規則 2～8）靠順序才有意義。");
    return o;
  }

  // ---- 表單 ----
  function spRenderForm() {
    const M = SP.m, dt = M.dataType;
    const inp = (k, lab, ph, type) => `<div class="field"><label for="spm_${k}">${lab}</label><input id="spm_${k}" data-sm="${k}" type="${type || "text"}" ${type === "number" ? 'step="any" inputmode="decimal"' : 'autocomplete="off"'} value="${esc(M[k] == null ? "" : M[k])}" placeholder="${ph || ""}"></div>`;
    const int = (k, lab, lo, hi) => `<div class="field"><label for="spm_${k}">${lab}</label><input id="spm_${k}" data-sm="${k}" data-int="${lo},${hi}" type="number" min="${lo}" max="${hi}" step="1" inputmode="numeric" value="${M[k]}"></div>`;
    const cb = (k, lab) => `<label><input type="checkbox" data-sm="${k}"${M[k] ? " checked" : ""}> ${lab}</label>`;
    let h = `<div class="fields"><div class="field"><label for="spm_dataType">資料型態（必填）</label><select id="spm_dataType" data-sm="dataType"><option value="">請選擇…</option>${Object.entries(SP_DT).map(([k, v]) => `<option value="${k}"${dt === k ? " selected" : ""}>${v.name}：${v.eg}</option>`).join("")}</select></div>`;
    if (dt === "continuous") h += `<div class="field"><label for="spm_goal">目的</label><select id="spm_goal" data-sm="goal">${Object.entries(SP_GOAL).map(([k, v]) => `<option value="${k}"${M.goal === k ? " selected" : ""}>${v}</option>`).join("")}</select></div>`;
    h += "</div>";
    if (dt === "continuous") {
      h += `<div class="fields">${inp("unit", "單位", "例如 N/15mm")}${inp("resolution", "量測解析度（選填）", "例如 0.01", "number")}${inp("lsl", "規格下限 LSL", "選填", "number")}${inp("target", "目標值", "選填", "number")}${inp("usl", "規格上限 USL", "選填", "number")}${M.goal === "cap" ? inp("cpkTarget", "Cpk 目標", "例如 1.33", "number") : ""}</div>`;
      h += `<div class="fields">${int("subgroupSize", "每次抽幾個（子組大小；1＝個別值）", 1, 25)}${int("subgroups", "抽幾次（子組數）", 5, 200)}${inp("frequency", "抽樣頻率（選填）", "例如 每小時、每批、每班")}</div>`;
      h += `<div class="mp-opts">${cb("skewed", "資料可能偏態（例如拉力、強度、只有單邊規格）")}</div>`;
    } else if (dt === "defective") {
      h += `<div class="fields">${int("subgroups", "抽幾批", 5, 200)}${int("sampleSize", "每批抽樣數（件）", 1, 100000)}${inp("frequency", "抽樣頻率（選填）", "例如 每批、每天")}</div><div class="mp-opts">${cb("sizeVaries", "每批抽樣數會不一樣")}</div>`;
    } else if (dt === "defect") {
      h += `<div class="fields">${int("subgroups", "檢驗幾次", 5, 200)}${int("units", "每次檢驗的單位數", 1, 100000)}${inp("frequency", "檢驗頻率（選填）", "例如 每批、每天")}</div><div class="mp-opts">${cb("unitsVary", "每次檢驗的單位數會不一樣")}</div>`;
    }
    if (dt) h += `<div class="fields">${inp("strata", "分層欄位（選填，逗號分隔，最多 4 個；記錄用代號）", "例如 機台, 模具, 操作員")}</div>`;
    $("spMeta").innerHTML = h;
    spRenderCheck();
  }
  function spRead() {
    const M = SP.m;
    $("spMeta").querySelectorAll("[data-sm]").forEach(el => {
      const k = el.dataset.sm;
      if (el.type === "checkbox") M[k] = el.checked;
      else if (el.dataset.int) { const [lo, hi] = el.dataset.int.split(",").map(Number); M[k] = spInt(el.value, lo, hi, SP_DEF[k]); }
      else M[k] = el.value.trim();
    });
  }
  function spRenderCheck() {
    const ck = spCheck(SP.m), has = ck.some(x => x.lv === "bad");
    $("spCheck").innerHTML = ck.map(x => `<li class="mp-${x.lv}"><b>${x.lv === "bad" ? "✗ 不可行" : x.lv === "warn" ? "⚠ 提醒" : "✓"}</b> ${esc(x.m)}</li>`).join("") + `<li class="hint">標 * 的是一般慣例或推論，不是法規硬性規定；以公司程序為準。</li>`;
    $("spGen").disabled = has;
  }
  function spNote(m, bad) { $("spHint").innerHTML = m ? (bad ? `<span class="status ng">${esc(m)}</span>` : esc(m)) : ""; }

  // ---- AI 建議資料結構 ----
  const SP_SCHEMA = [
    "```spcplan",
    '{"dataType":"continuous","goal":"cap","cpkTarget":1.33,"unit":"N/15mm","resolution":null,"spec":{"lsl":null,"target":null,"usl":null},"subgroupSize":5,"subgroups":25,"frequency":"每小時","skewed":true,"strata":["機台","模具"],"sampleSize":null,"sizeVaries":false,"units":null,"unitsVary":false}',
    "```",
    "欄位：dataType＝continuous（連續型量測值）、defective（不良品：每件判通過／不通過，記錄每批不良數與抽樣數）、defect（缺點數：一件可有多個缺點）。goal＝stable（只看穩定）或 cap（穩定後算 Cpk）。",
    "continuous 用 subgroupSize（每次抽幾個；1＝個別值 I-MR）、subgroups（抽幾次）、frequency、skewed（資料可能偏態）；defective 用 subgroups（幾批）、sampleSize（每批抽樣數）、sizeVaries；defect 用 subgroups、units（每次檢驗單位數）、unitsVary。strata 是建議記錄的分層欄位名稱（最多 4 個）。",
    "unit、resolution、spec（lsl／target／usl）、cpkTarget 只在使用者有提供時填，否則填 null；這些是規格與設計條件，不是量測結果。不得填入任何量測數值。"
  ].join("\n");
  const SP_RULE = [
    "你是 SPC（統計製程管制）的資料規劃助手。只依使用者描述的情境，建議「資料要怎麼收、怎麼分組」。",
    "規則：1. 全程使用繁體中文。2. 不要產生、猜測或舉例任何量測數值；只給資料結構與抽樣設計。3. 不確定的地方標 * 並說明要使用者確認什麼。4. 不要要求或重複客戶、病患、批號等可識別資訊；分層欄位用代號。",
    "回答格式：先用最多 6 點說明為什麼這樣規劃（每點一行，以「- 」開頭），口語、短句，具體到可以照做，例如「每小時從同一台機台連續取 5 個，記下機台代號」「先收 25 組，約 3 天」；常見做法的數量標 *。最後附一個 ```spcplan 區塊（JSON），格式如下：",
    SP_SCHEMA
  ].join("\n");
  const SP_CHAT_RULE = "【SPC 資料規劃】回答中如果有建議具體的資料結構（子組大小、組數、抽樣頻率、分層欄位等），最後附一個 ```spcplan 區塊，讓使用者按按鈕帶入網頁的規劃表單。區塊內只放規劃參數，不放任何量測數值。格式：\n" + SP_SCHEMA;
  function spParsePlan(text) {
    const m = String(text).match(/```spcplan\s*([\s\S]*?)```/); if (!m) return null;
    let j; try { j = JSON.parse(m[1]); } catch (_) { return null; }
    return j && typeof j === "object" && SP_DT[j.dataType] ? j : null;
  }
  function spApplyPlan(j) {
    const M = SP.m, nb = v => { const x = Number(v); return v == null || v === "" || !isFinite(x) ? "" : String(x); };
    M.dataType = j.dataType;
    if (SP_GOAL[j.goal]) M.goal = j.goal;
    if (j.cpkTarget !== undefined) M.cpkTarget = nb(j.cpkTarget);
    if (j.unit != null) M.unit = String(j.unit).slice(0, 20);
    if (j.resolution !== undefined) M.resolution = nb(j.resolution);
    if (j.spec && typeof j.spec === "object") { M.lsl = nb(j.spec.lsl); M.target = nb(j.spec.target); M.usl = nb(j.spec.usl); }
    if (j.subgroupSize != null) M.subgroupSize = spInt(j.subgroupSize, 1, 25, 5);
    if (j.subgroups != null) M.subgroups = spInt(j.subgroups, 5, 200, 25);
    if (j.frequency != null) M.frequency = String(j.frequency).slice(0, 30);
    if (j.sampleSize != null) M.sampleSize = spInt(j.sampleSize, 1, 100000, 200);
    if (j.units != null) M.units = spInt(j.units, 1, 100000, 1);
    ["sizeVaries", "unitsVary", "skewed"].forEach(k => { if (typeof j[k] === "boolean") M[k] = j[k]; });
    if (Array.isArray(j.strata)) M.strata = j.strata.map(s => String(s).slice(0, 12)).slice(0, 4).join(", ");
    SP.sheet = null; $("spSheet").hidden = true; spRenderForm();
    const bad = spCheck(M).some(x => x.lv === "bad");
    spNote(bad ? "已帶入 AI 的建議，但程式檢查發現不可行的設定，請看下方說明並修改。" : "已帶入 AI 的建議，下方可修改；程式檢查會即時更新。", bad);
  }
  async function spAsk() {
    const q = $("spDesc").value.trim(); if (!q) { spNote("請先描述要監控的製程與特性。", true); return; }
    if (!sample) { spNote("目前無法使用 AI，請在「AI 設定與案件存取」確認；也可以直接在下方自己選擇與調整。", true); return; }
    if (SP.busy) return; SP.busy = true; $("spAi").disabled = true; spNote("AI 規劃中…");
    spRead();
    const ctx = ($("spcProblem").value || "").trim(), newbie = styleFor("spc").persp === "teach";
    const msg = SP_RULE + (newbie ? "\n讀者是新人：每個名詞第一次出現就用括號白話解釋。" : "") + (SP_DT[SP.m.dataType] ? "\n\n【使用者選的資料型態】" + SP_DT[SP.m.dataType].name : "") + (ctx ? "\n【問題描述】" + ctx : "") + "\n【製程與特性】" + q;
    try {
      const res = await sample([{ role: "user", content: msg }], { cache: false, modelTier: "default" });
      const j = spParsePlan(res.text), why = res.text.replace(/```spcplan[\s\S]*?```/g, "").trim();
      $("spWhy").innerHTML = j ? `<b>AI 的規劃理由（推論，請自行判斷是否適用）</b>${mdLite(why)}` : mdLite(why || res.text); $("spWhy").hidden = false;
      if (!j) { spNote("AI 的回答沒有附上可用的規劃參數，請參考說明自己填寫。", true); return; }
      spApplyPlan(j);
    } catch (e) { spNote((ERR[e && e.code] || ERR.upstream_error) + (e && e.message ? "（" + e.message + "）" : ""), true); }
    finally { SP.busy = false; $("spAi").disabled = false; }
  }
  function spChatHtml(j) { return `<div class="fb-sug"><span class="hint">AI 建議的資料結構（${esc(SP_DT[j.dataType].name)}）：</span><button type="button" class="btn small primary" data-spcplan="${esc(JSON.stringify(j))}">帶入下方「資料規劃」表單</button></div>`; }
  $("msgs").addEventListener("click", e => {
    const b = e.target.closest("[data-spcplan]"); if (!b) return;
    let j; try { j = JSON.parse(b.dataset.spcplan); } catch (_) { return; }
    if (!j || !SP_DT[j.dataType]) return;
    closePanel(); route("spc"); spApplyPlan(j); $("spcPlan").open = true; $("spcPlan").scrollIntoView({ behavior: "smooth", block: "start" }); b.textContent = "已帶入";
  });

  // ---- 記錄表（依時間順序，不隨機） ----
  function spGen() {
    spRead(); const M = SP.m; if (spCheck(M).some(x => x.lv === "bad")) { spRenderCheck(); return; }
    const S = { m: Object.assign({}, M), chart: spChart(M), k: M.subgroups, strata: spStrata(), when: Array(M.subgroups).fill(""), st: [], v: [] };
    S.cols = M.dataType === "continuous" ? Array.from({ length: M.subgroupSize }, (_, j) => M.subgroupSize === 1 ? "量測值" : "第 " + (j + 1) + " 個")
      : M.dataType === "defective" ? ["不良數", "抽樣數"] : ["缺點數", "檢驗單位數"];
    for (let i = 0; i < S.k; i++) {
      S.st.push(S.strata.map(() => ""));
      S.v.push(S.cols.map((_, j) => M.dataType === "defective" && j === 1 && !M.sizeVaries ? String(M.sampleSize) : M.dataType === "defect" && j === 1 && !M.unitsVary ? String(M.units) : ""));
    }
    SP.sheet = S; spSheetHtml();
  }
  function spSheetHtml() {
    const S = SP.sheet, M = S.m, u = M.unit ? `（${esc(M.unit)}）` : "";
    const cell = (a, i, j, v, ph) => `<input class="mp-in" data-${a}="${i}" ${j != null ? `data-j="${j}"` : ""} value="${esc(v)}" type="text" ${a === "v" ? 'inputmode="decimal"' : ""} autocomplete="off" placeholder="${ph || ""}">`;
    const head = `<th>子組</th><th>時間／日期</th>${S.strata.map(s => `<th>${esc(s)}</th>`).join("")}${S.cols.map(c => `<th>${esc(c)}${M.dataType === "continuous" ? u : ""}</th>`).join("")}`;
    const body = S.v.map((row, i) => `<tr><td>${i + 1}</td><td>${cell("w", i, null, S.when[i], M.frequency || "")}</td>${S.strata.map((_, j) => `<td>${cell("s", i, j, S.st[i][j], "代號")}</td>`).join("")}${row.map((v, j) => `<td>${cell("v", i, j, v)}</td>`).join("")}</tr>`).join("");
    const tip = M.dataType === "continuous" ? (M.subgroupSize > 1 ? `每一列是一次抽樣：同一時間、同一條件下連續取 ${M.subgroupSize} 個，依序填入。` : "每一列是一次量測，依生產順序填。") : M.dataType === "defective" ? "每一列是一批：填不良數與抽樣數。" : "每一列是一次檢驗：填缺點數與檢驗單位數。";
    $("spSheet").innerHTML = `<h3>記錄表（${esc(QQ.CHART_NAME[S.chart])}・共 ${S.k} ${M.dataType === "continuous" ? "組" : "列"}）</h3><p class="help">${tip}依時間順序由上往下填，不要重新排序。時間與分層欄位只用來追查異常，不會送進計算。統計全部由程式計算，AI 不參與。</p>
      <div class="scroll-x mp-tblwrap"><table class="mp-tbl"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>
      <details class="mp-paste"><summary>從 Excel 一次貼上數值</summary><p class="hint">直接貼上 Excel 的數值範圍（${S.cols.length} 欄 × ${S.k} 列，只含數值欄，不含時間與分層欄）${S.cols.length > 1 && S.m.dataType !== "continuous" ? "；只貼一欄 " + S.k + " 列時，會填入第一欄（" + S.cols[0] + "）" : ""}。</p><textarea id="spBulk" rows="3" spellcheck="false"></textarea><div class="run-row"><button class="btn small" type="button" id="spBulkGo">填入表格</button></div></details>
      <div class="run-row"><button class="btn primary" type="button" id="spApply">帶入下方分析</button><button class="btn" type="button" id="spCsv">下載空白記錄表（CSV）</button><span class="hint" id="spProg"></span></div>
      <ul class="mp-check" id="spDataWarn" hidden></ul>`;
    $("spSheet").hidden = false; spProg();
  }
  function spProg() { const S = SP.sheet; if (!S) return; const all = [].concat(...S.v), f = all.filter(v => String(v).trim() !== "").length; $("spProg").textContent = `已填 ${f} / ${all.length}`; }
  $("spSheet").addEventListener("input", e => { const S = SP.sheet; if (!S) return; const el = e.target, i = +(el.dataset.v ?? el.dataset.s ?? el.dataset.w), j = +el.dataset.j;
    if (el.dataset.v != null) S.v[i][j] = el.value; else if (el.dataset.s != null) S.st[i][j] = el.value; else if (el.dataset.w != null) S.when[i] = el.value; spProg(); });
  $("spSheet").addEventListener("click", e => {
    const S = SP.sheet; if (!S) return; const id = e.target.id;
    if (id === "spBulkGo") {
      const lines = $("spBulk").value.split(/\r?\n/).map(l => l.trim()).filter(Boolean); if (!lines.length) return;
      const split = l => l.split(/[\s,，;\t]+/).filter(Boolean);
      if (lines.length > 1 && lines.some(l => split(l).length > 1)) lines.slice(0, S.k).forEach((l, i) => split(l).slice(0, S.cols.length).forEach((v, j) => { S.v[i][j] = v; }));
      else if (S.cols.length > 1 && lines.length === S.k) lines.forEach((l, i) => { S.v[i][0] = split(l)[0]; });
      else split(lines.join(" ")).slice(0, S.k * S.cols.length).forEach((v, n) => { S.v[Math.floor(n / S.cols.length)][n % S.cols.length] = v; });
      spSheetHtml(); spNote("已填入表格，請檢查。");
    } else if (id === "spCsv") {
      const q = s => `"${String(s).replace(/"/g, '""')}"`, L = [["子組", "時間／日期"].concat(S.strata, S.cols.map(c => c + (S.m.unit && S.m.dataType === "continuous" ? `（${S.m.unit}）` : ""))).map(q).join(",")];
      S.v.forEach((row, i) => L.push([i + 1, q(S.when[i])].concat(S.st[i].map(q), row.map(q)).join(",")));
      const fn = `SPC_${QQ.CHART_NAME[S.chart].replace(/[\\/:*?"<>|\s]+/g, "_")}_記錄表_${new Date().toISOString().slice(0, 10)}.csv`;
      if (!downloads) { spNote("這個檢視無法下載檔案。", true); return; }
      Promise.resolve().then(() => downloads.save({ filename: fn, data: "﻿" + L.join("\r\n") })).catch(e2 => { if (!(e2 && e2.code === "declined")) spNote("無法下載檔案。", true); });
    } else if (id === "spApply") spApply();
  });
  function spApply() {
    const S = SP.sheet, M = S.m, isN = s => s !== "" && isFinite(Number(s));
    const vals = S.v.map(r => r.map(v => String(v).trim()));
    const miss = [].concat(...vals).filter(v => v === "").length; if (miss) { spNote(`還有 ${miss} 格數值沒填，填完才能分析。`, true); return; }
    const bad = [].concat(...vals).find(v => !isN(v)); if (bad != null) { spNote(`「${bad}」不是數字。`, true); return; }
    const nums = vals.map(r => r.map(Number)), o = [], warn = m => o.push({ lv: "warn", m }), badm = m => o.push({ lv: "bad", m });
    if (M.dataType === "defective" && nums.some(r => r[0] < 0 || r[1] <= 0 || r[0] > r[1] || r.some(x => x !== Math.round(x)))) { spNote("不良數與抽樣數要是整數，且不良數介於 0 與抽樣數之間。", true); return; }
    if (M.dataType === "defect" && nums.some(r => r[0] < 0 || r[1] <= 0 || r[0] !== Math.round(r[0]))) { spNote("缺點數要是 0 以上的整數，檢驗單位數要大於 0。", true); return; }
    // 分層混雜
    S.strata.forEach((s, j) => { const set = new Set(S.st.map(r => String(r[j]).trim()).filter(Boolean)); if (set.size > 1) warn(`「${s}」有 ${set.size} 種（${[...set].slice(0, 5).join("、")}）：混在同一張管制圖，界限會被撐寬。建議依「${s}」分開各畫一張，或先用假設檢定比較是否有差異*。`); });
    if (M.dataType === "continuous") {
      const all = [].concat(...nums), n = all.length, mean = all.reduce((a, b) => a + b, 0) / n;
      const sd = Math.sqrt(all.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1));
      const distinct = new Set(all.map(x => +x.toPrecision(12))).size, R = spNum(M.resolution);
      if (distinct < 5) warn(`全部 ${n} 個值只有 ${distinct} 種不同數值：解析度太粗，管制界限與 Cpk 都會失真*。`);
      else if (R > 0 && (Math.max(...all) - Math.min(...all)) / R < 10) warn("資料範圍不到 10 個解析度刻度（常見要求至少 10 個*）：管制圖容易出現假警報。");
      if (n >= 8 && sd > 0) {
        const g1 = n / ((n - 1) * (n - 2)) * all.reduce((a, b) => a + ((b - mean) / sd) ** 3, 0);
        if (Math.abs(g1) >= 1) badm(`偏態係數 ${g1.toFixed(2)}：分布明顯偏斜，Cpk（假設常態）會失真，不建議直接用來判定是否達標*。可先做資料轉換或改用非常態的能力分析。`);
        else if (Math.abs(g1) >= 0.5) warn(`偏態係數 ${g1.toFixed(2)}：分布有些偏斜，Cpk 結果要保守解讀*。`);
      }
      if (M.goal === "cap" && n < 100) warn(`總共 ${n} 個值：Cpk 信賴區間偏寬（常見建議 100 個以上*）。`);
    }
    // 帶入 SPC 頁
    setChip("spcKind", SP_DT[M.dataType].kind);
    const k = SP_DT[M.dataType].kind; $("spcFormat").textContent = SPC_FMT[k]; document.querySelectorAll(".spc-spec").forEach(f => { f.hidden = k !== "var"; });
    $("spcType").value = S.chart;
    if (M.dataType === "continuous") { $("spcLsl").value = M.lsl; $("spcUsl").value = M.usl; $("spcTgt").value = M.target; }
    $("spcData").value = vals.map(r => r.join(", ")).join("\n");
    spcDetect(); spcRun();
    const w = $("spDataWarn"); w.hidden = !o.length; w.innerHTML = o.map(x => `<li class="mp-${x.lv}"><b>${x.lv === "bad" ? "✗" : "⚠"}</b> ${esc(x.m)}</li>`).join("");
    if (o.length) $("spcHint").insertAdjacentHTML("beforeend", `<span class="status ng"> 資料規劃的檢查有 ${o.length} 項提醒，請看上方「資料規劃」。</span>`);
    spNote(o.some(x => x.lv === "bad") ? "已帶入並分析，但資料檢查發現嚴重問題（見記錄表下方）。" : o.length ? "已帶入並分析；資料檢查有提醒，見記錄表下方。" : "已帶入並分析，結果在下方。", o.some(x => x.lv === "bad"));
    $("spcData").scrollIntoView({ behavior: "smooth", block: "center" });
  }
  $("spMeta").addEventListener("change", e => {
    spRead(); const k = e.target.dataset.sm;
    if (k === "dataType" || k === "goal") { SP.sheet = null; $("spSheet").hidden = true; spNote(""); spRenderForm(); return; }
    spRenderCheck();
  });
  $("spMeta").addEventListener("input", e => { if (e.target.tagName === "INPUT" && e.target.type !== "checkbox") { spRead(); spRenderCheck(); } });
  $("spAi").addEventListener("click", spAsk);
  $("spGen").addEventListener("click", spGen);
  $("spReset").addEventListener("click", () => { SP.m = Object.assign({}, SP_DEF); SP.sheet = null; $("spSheet").hidden = true; $("spWhy").hidden = true; spNote(""); spRenderForm(); });
  spRenderForm();
