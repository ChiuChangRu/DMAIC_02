  // =====================================================================
  // MSA 實驗規劃：AI 建議設計 → 程式檢查 → 人員修改 → 產生記錄表 → 人員填數值 → 帶入下方分析（統計仍由 JS 計算）
  // AI 只提出「設計參數」，不產生任何量測數值；數字範圍由程式限制。
  // 輸出資料型態（必填）決定可用的分析：連續型→Gage R&R／偏差／線性／穩定性；二元、序位→屬性一致性；離散計數→警語。
  // =====================================================================
  const MP_NAME = { grr: "Gage R&R", bias: "偏差", lin: "線性", stab: "穩定性", attr: "屬性一致性" };
  const MP_DT = {
    continuous: { name: "連續型（計量）", eg: "例如耐磨次數、摩擦係數、接觸角、滑動力", tools: ["grr", "bias", "lin", "stab"], def: "grr" },
    count: { name: "離散計數型", eg: "例如缺陷數、脫落點數", tools: ["grr", "bias", "lin", "stab"], def: "grr" },
    binary: { name: "屬性型（二元）", eg: "通過／不通過", tools: ["attr"], def: "attr" },
    ordinal: { name: "屬性型（序位）", eg: "例如目視等級 1～5", tools: ["attr"], def: "attr" }
  };
  const MP_DEF = { grr: { parts: 10, ops: 3, reps: 3 }, bias: { n: 15 }, lin: { refs: 5, reps: 10, min: "", max: "" }, stab: { times: 20, reps: 3 }, attr: { samples: 50, raters: 3, reps: 3 } };
  const MP_META_DEF = { dataType: "", unit: "", resolution: "", lsl: "", usl: "", censorLimit: "", levels: 5, hasStd: true, destructive: false, randomize: true, blind: true, purpose: "msa" };
  const MP_F = {
    grr: [["parts", "零件數", 2, 30], ["ops", "操作員人數", 2, 10], ["reps", "每人每件重複次數", 2, 10], ["names", "操作員代號（選填，逗號分隔；請用代號）", "txt"]],
    bias: [["n", "重複量測次數", 3, 60]],
    lin: [["refs", "參考值個數", 3, 10], ["reps", "每個參考值重複次數", 2, 30], ["min", "量測範圍下限（選填，用來均分參考值）", "num"], ["max", "量測範圍上限（選填）", "num"]],
    stab: [["times", "時間點數", 5, 60], ["reps", "每個時間點量測次數", 1, 10]],
    attr: [["samples", "樣本數", 5, 100], ["raters", "評估員人數", 2, 10], ["reps", "每人重複判定次數", 1, 5], ["names", "評估員代號（選填，逗號分隔；請用代號）", "txt"]]
  };
  const MP = { type: "grr", p: JSON.parse(JSON.stringify(MP_DEF)), m: Object.assign({}, MP_META_DEF), sheet: null, busy: false };
  const mpInt = (v, lo, hi, d) => { const x = Math.round(Number(v)); return isFinite(x) ? Math.min(hi, Math.max(lo, x)) : d; };
  const mpNum = v => { const s = String(v == null ? "" : v).trim(); if (s === "") return null; const x = Number(s); return isFinite(x) ? x : NaN; };
  const mpShuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const mpOrder = a => MP.m.randomize ? mpShuffle(a) : a;
  const mpNames = (txt, n, pre) => { const t = String(txt || "").split(/[,，、\s]+/).filter(Boolean); return Array.from({ length: n }, (_, i) => t[i] || pre + (i + 1)); };
  const mpPartWord = () => MP.m.destructive ? "均質組" : "零件";

  // ---- 程式檢查（數量門檻依一般慣例*，AIAG MSA 手冊常見做法；不是法規硬性規定） ----
  function mpCheck(type, p, M) {
    M = M || MP.m;
    const o = [], bad = m => o.push({ lv: "bad", m }), warn = m => o.push({ lv: "warn", m }), ok = m => o.push({ lv: "ok", m });
    const dt = MP_DT[M.dataType];
    if (!dt) bad("請先選擇「輸出資料型態」（必填）。");
    else if (!dt.tools.includes(type)) bad(`資料型態「${dt.name}」不能用「${MP_NAME[type]}」：${type === "attr" ? "屬性一致性是給通過／不通過或等級判定用的，連續或計數數值請用 Gage R&R" : "Gage R&R、偏差、線性、穩定性都要計算平均值與變異數，二元或等級判定請改用屬性一致性"}。請改選分析或資料型態。`);
    if (dt && M.dataType === "count" && type !== "attr") warn("離散計數型資料（缺陷數等）不一定適合 ANOVA：數值小、很多 0 時，分布偏斜且變異會隨平均值改變。建議先檢查分布（例如直方圖、是否接近卜瓦松）*；平均計數夠大時，用 ANOVA 近似通常較可接受*。");
    if (dt && (M.dataType === "continuous" || M.dataType === "count")) {
      const L = mpNum(M.lsl), U = mpNum(M.usl), R = mpNum(M.resolution), C = mpNum(M.censorLimit);
      if (Number.isNaN(L) || Number.isNaN(U) || Number.isNaN(R) || Number.isNaN(C)) bad("規格、解析度、截尾上限要填數字（不需要就留空）。");
      if (L != null && U != null && L >= U) bad("規格下限必須小於上限。");
      if (R != null && R <= 0) bad("量測解析度必須大於 0。");
      if (R > 0 && L != null && U != null && L < U && (U - L) / R < 10) warn(`解析度 ${R} 相對於公差 ${+(U - L).toPrecision(6)} 太粗：公差內只能分出約 ${Math.floor((U - L) / R)} 個刻度（常見要求：解析度 ≤ 公差的 1/10*）。`);
      if ((L == null) !== (U == null)) warn("只有單邊規格：%公差（%Tolerance）不適用，判讀以 %研究變異與區別分類數（ndc）為主；是否另行換算依公司程序。");
      if (C != null && !Number.isNaN(C)) warn("有截尾上限：測到上限仍未失效的試片會以上限值記錄。填完數值後程式會計算截尾比例，比例偏高時 ANOVA 結果不可靠。");
    }
    if (dt && (M.dataType === "binary" || M.dataType === "ordinal")) {
      if (!M.hasStd) warn("沒有標準答案：只能計算評估員自身與彼此的一致性，無法計算「與標準的一致性」（有效性）。");
      if (M.dataType === "ordinal") warn("序位資料目前以名目類別計算 Kappa（判 1 與判 2 視為和判 1 與判 5 一樣不一致），未計入等級間的距離；Kendall 係數本站尚未提供*。");
    }
    if (M.destructive) {
      if (type === "grr") warn(`破壞性測試：每個「${mpPartWord()}」要準備 ${p.ops * p.reps} 個盡量相同的試片（例如同一條封口的相鄰位置），每次量測用一個新試片。重複性會包含組內試片的差異，組內不均一時會高估量測誤差*。真正的巢狀（Nested）Gage R&R 本站尚未提供。`);
      else if (type === "bias" || type === "lin" || type === "stab") warn("破壞性測試無法重複量同一標準件：需改用一批均質、參考值已知的參考樣品，每次量一個新樣品*。");
    }
    if (type === "grr") {
      const w = mpPartWord();
      if (p.parts < 5) bad(`${w}少於 5 個：${w}間變異估不準，Gage R&R 結果不可靠。`); else if (p.parts < 10) warn(`${w}少於 10 個（常見做法是 10 個*）：建議增加。`);
      if (p.ops < 2) bad("至少要 2 位操作員，才算得出再現性。"); else if (p.ops < 3) warn("只有 2 位操作員（常見做法是 3 位*）。若實際只有 2 人使用此量具，可接受。");
      if (p.reps < 2) bad("每人每件至少量 2 次，才算得出重複性。"); else if (p.reps < 3 && p.parts * p.ops * p.reps < 30) warn("總量測數少於 30 筆，建議增加零件數或次數。");
      if (p.parts * p.ops * p.reps > 150) warn("總量測數超過 150 筆，請確認人力與時間。");
      warn(`${w}要涵蓋實際製程範圍（含接近規格上下限的），否則會低估${w}間變異、誇大量測誤差。`);
    } else if (type === "bias") {
      if (p.n < 3) bad("至少 3 次才能做檢定。"); else if (p.n < 10) warn("少於 10 次：檢定力低，容易漏掉偏差。"); else if (p.n < 15) warn("常見做法是 15 次以上*。");
      warn("需要有可追溯的標準件（參考值已知）；參考值的不確定度要遠小於量具的變異。");
    } else if (type === "lin") {
      if (p.refs < 3) bad("至少 3 個不同的參考值。"); else if (p.refs < 5) warn("少於 5 個參考值（常見做法是 5 個*）：看不出非線性。");
      if (p.reps < 5) warn("每個參考值少於 5 次：偏差估計會不穩。"); else if (p.reps < 10) warn("每個參考值常見做法是 10 次以上*。");
      if (p.min !== "" && p.max !== "" && Number(p.min) >= Number(p.max)) bad("範圍下限必須小於上限。");
      warn("參考值要涵蓋量具實際使用的整個範圍，且都要有可追溯的標準件。");
    } else if (type === "stab") {
      if (p.times < 5) bad("至少 5 個時間點。"); else if (p.times < 20) warn("少於 20 個時間點（管制圖常見做法是 20～25 個以上*）：管制界限會不穩。");
      if (p.reps < 3) warn("每個時間點少於 3 次（常見做法是 3～5 次*）：看不出組內變異。");
      warn("時間點要分散在足夠長的期間（例如每天或每週一次），並使用同一個標準件。");
    } else if (type === "attr") {
      if (p.samples < 5) bad("樣本至少 5 個。"); else if (p.samples < 30) warn("樣本少於 30 個：一致性比例的信賴區間會很寬（常見做法是 50 個以上*）。");
      if (p.raters < 2) bad("至少 2 位評估員。"); else if (p.raters < 3) warn("只有 2 位評估員（常見做法是 3 位*）。");
      if (p.reps < 2) warn("每人只判定 1 次：看不出評估員自己前後是否一致（重複性）。");
      warn(M.dataType === "ordinal" ? "樣本要涵蓋所有等級，尤其是相鄰等級交界、容易判錯的樣品。" : "樣本要同時含良品、不良品與接近判定邊界的樣品。");
    }
    if (!M.randomize) warn("未隨機化：量測順序固定時，時間漂移、疲勞會和操作員或零件混在一起。");
    if (!M.blind) warn("未盲測：量測者知道零件編號或前次結果時，容易受記憶影響。");
    if (!o.some(x => x.lv === "bad")) ok(`總共要量／判定 ${mpCount(type, p)} 次。`);
    return o;
  }
  function mpCount(t, p) { return t === "grr" ? p.parts * p.ops * p.reps : t === "bias" ? p.n : t === "lin" ? p.refs * p.reps : t === "stab" ? p.times * p.reps : p.samples * p.raters * p.reps; }

  // ---- 表單 ----
  function mpRenderMeta() {
    const M = MP.m, dt = M.dataType, isNum = dt === "continuous" || dt === "count", isAttr = dt === "binary" || dt === "ordinal";
    const inp = (k, lab, ph, type) => `<div class="field"><label for="mpm_${k}">${lab}</label><input id="mpm_${k}" data-mm="${k}" type="${type || "text"}" ${type === "number" ? 'step="any" inputmode="decimal"' : 'autocomplete="off"'} value="${esc(M[k] == null ? "" : M[k])}" placeholder="${ph || ""}"></div>`;
    const cb = (k, lab) => `<label><input type="checkbox" data-mm="${k}"${M[k] ? " checked" : ""}> ${lab}</label>`;
    $("mpMeta").innerHTML = `<div class="fields"><div class="field"><label for="mpm_dataType">輸出資料型態（必填）</label><select id="mpm_dataType" data-mm="dataType"><option value="">請選擇…</option>${Object.entries(MP_DT).map(([k, v]) => `<option value="${k}"${dt === k ? " selected" : ""}>${v.name}：${v.eg}</option>`).join("")}</select></div></div>`
      + (isNum ? `<div class="fields">${inp("unit", "單位", "例如 次、N、度")}${dt === "continuous" ? inp("resolution", "量測解析度（最小可讀刻度）", "例如 0.01", "number") : ""}${inp("lsl", "規格下限 LSL（選填）", "", "number")}${inp("usl", "規格上限 USL（選填）", "", "number")}${inp("censorLimit", "截尾上限值（選填；測至上限仍未失效者）", "例如 5000", "number")}</div>` : "")
      + (dt === "ordinal" ? `<div class="fields">${inp("levels", "等級數（1～N）", "5", "number")}</div>` : "")
      + (isAttr ? `<div class="mp-opts"><span class="group-label">標準答案（參考判定）是否可得？</span><label><input type="radio" name="mpStd" data-mm="hasStd" value="1"${M.hasStd ? " checked" : ""}> 可得（由專家或標準樣品決定）</label><label><input type="radio" name="mpStd" data-mm="hasStd" value="0"${M.hasStd ? "" : " checked"}> 不可得</label></div>` : "")
      + `<div class="mp-opts">${MP.type === "grr" ? cb("destructive", "破壞性測試（以「均質組」代替同一零件）") : ""}${cb("randomize", "量測順序隨機化")}${cb("blind", "盲測（量測者看不到零件編號與前次結果）")}</div>`;
  }
  function mpRead() {
    const t = MP.type, p = MP.p[t], M = MP.m;
    $("mpFields").querySelectorAll("[data-mp]").forEach(el => { const k = el.dataset.mp, f = MP_F[t].find(x => x[0] === k); if (!f) return; p[k] = f[2] === "txt" ? el.value : f[2] === "num" ? el.value.trim() : mpInt(el.value, f[2], f[3], MP_DEF[t][k]); });
    $("mpMeta").querySelectorAll("[data-mm]").forEach(el => {
      const k = el.dataset.mm;
      if (el.type === "checkbox") M[k] = el.checked;
      else if (el.type === "radio") { if (el.checked) M[k] = el.value === "1"; }
      else if (k === "levels") M[k] = mpInt(el.value, 2, 10, 5);
      else M[k] = el.value.trim();
    });
  }
  function mpRenderFields() {
    const t = MP.type, p = MP.p[t];
    mpRenderMeta();
    $("mpFields").innerHTML = MP_F[t].map(f => {
      const lab = t === "grr" && f[0] === "parts" ? mpPartWord() + "數" : t === "grr" && f[0] === "reps" ? `每人每${MP.m.destructive ? "組" : "件"}重複次數` : f[1];
      return f[2] === "txt" || f[2] === "num"
        ? `<div class="field"><label for="mp_${f[0]}">${lab}</label><input id="mp_${f[0]}" data-mp="${f[0]}" type="${f[2] === "num" ? "number" : "text"}" ${f[2] === "num" ? 'step="any" inputmode="decimal"' : 'autocomplete="off"'} value="${esc(p[f[0]] == null ? "" : p[f[0]])}"></div>`
        : `<div class="field"><label for="mp_${f[0]}">${lab}</label><input id="mp_${f[0]}" data-mp="${f[0]}" type="number" min="${f[2]}" max="${f[3]}" step="1" inputmode="numeric" value="${p[f[0]]}"></div>`;
    }).join("");
    mpRenderCheck();
  }
  function mpRenderCheck() {
    const t = MP.type, ck = mpCheck(t, MP.p[t]), has = ck.some(x => x.lv === "bad");
    $("mpCheck").innerHTML = ck.map(x => `<li class="mp-${x.lv}"><b>${x.lv === "bad" ? "✗ 不可行" : x.lv === "warn" ? "⚠ 提醒" : "✓"}</b> ${esc(x.m)}</li>`).join("") + `<li class="hint">標 * 的是一般慣例或推論，不是法規硬性規定；以公司程序為準。</li>`;
    $("mpGen").disabled = has;
  }
  function mpNote(m, bad) { $("mpHint").innerHTML = m ? (bad ? `<span class="status ng">${esc(m)}</span>` : esc(m)) : ""; }

  // ---- AI 建議設計（只給設計參數與理由；數值範圍由程式限制） ----
  const MP_SCHEMA = [
    "```msaplan",
    '{"type":"grr","dataType":"continuous","unit":"次","resolution":1,"spec":{"lsl":null,"usl":null},"purpose":"msa","destructive":true,"parts":8,"partUnit":"homogeneous_group","ops":3,"reps":2,"randomize":true,"blind":true,"censorLimit":null}',
    "```",
    "欄位：type＝grr（Gage R&R）、bias（偏差）、lin（線性）、stab（穩定性）、attr（屬性一致性）；dataType＝continuous（連續型）、count（離散計數型）、binary（二元：通過／不通過）、ordinal（序位：等級）。",
    "dataType 與 type 必須一致：continuous／count 只能用 grr、bias、lin、stab；binary／ordinal 只能用 attr。count 用 ANOVA 時請在文字說明需檢查分布。",
    "依分析加欄位：grr 用 parts、ops、reps、destructive、partUnit（part 或 homogeneous_group）；bias 用 n；lin 用 refs、reps、min、max；stab 用 times、reps；attr 用 samples、raters、reps、hasStd（標準答案是否可得）、levels（序位的等級數）。",
    "unit、resolution、spec（lsl／usl）、censorLimit、min／max 只在使用者有提供時填，否則填 null；這些是規格與設計條件，不是量測結果。不得填入任何量測數值。"
  ].join("\n");
  const MP_RULE = [
    "你是量測系統分析（MSA）的實驗設計助手。只依使用者描述的情境，建議「怎麼設計實驗」。",
    "規則：1. 全程使用繁體中文。2. 不要產生、猜測或舉例任何量測數值；只給設計參數。3. 不確定的地方請標 * 並說明要使用者確認什麼。4. 不要要求或重複客戶、病患、批號等可識別資訊。5. 破壞性測試（試片量完就毀損）要明確指出，並說明均質組的取樣方式與限制。",
    "回答格式：先用最多 6 點說明為什麼這樣設計（每點一行，以「- 」開頭）。用口語、短句，具體到可以照做：例如「挑 10 個零件，從最小到最大都要有，最好有 2～3 個接近規格邊緣」「3 位平常會用這台量具的人，不要只挑最熟練的」；常見做法的數量標 *。最後附一個 ```msaplan 區塊（JSON），格式如下：",
    MP_SCHEMA
  ].join("\n");
  const MP_CHAT_RULE = "【MSA 實驗參數】回答中如果有建議具體的實驗設計，最後附一個 ```msaplan 區塊，讓使用者按按鈕帶入網頁的規劃表單。區塊內只放設計參數，不放任何量測數值。格式：\n" + MP_SCHEMA;
  async function mpAsk() {
    const q = $("mpDesc").value.trim(); if (!q) { mpNote("請先描述量測情境。", true); return; }
    if (!sample) { mpNote("目前無法使用 AI，請在「AI 設定與案件存取」確認；也可以直接在下方自己選擇與調整。", true); return; }
    if (MP.busy) return; MP.busy = true; $("mpAi").disabled = true; mpNote("AI 規劃中…");
    mpRead();
    const ctx = ($("msaProblem").value || "").trim(), M = MP.m;
    const newbie = styleFor("msa").persp === "teach";
    const msg = MP_RULE + (newbie ? "\n讀者是新人：每個名詞第一次出現就用括號白話解釋，理由要說到新人聽得懂為什麼要這樣做。" : "") + "\n\n【目前選擇的分析】" + MP_NAME[MP.type] + (MP_DT[M.dataType] ? "\n【使用者選的輸出資料型態】" + MP_DT[M.dataType].name : "") + (ctx ? "\n【問題描述】" + ctx : "") + "\n【量測情境】" + q;
    try {
      const res = await sample([{ role: "user", content: msg }], { cache: false, modelTier: "default" });
      const j = mpParsePlan(res.text), why = res.text.replace(/```msaplan[\s\S]*?```/g, "").trim();
      if (!j) { $("mpWhy").innerHTML = mdLite(why || res.text); $("mpWhy").hidden = false; mpNote("AI 的回答沒有附上可用的設計參數，請參考說明自己填寫。", true); return; }
      mpApplyPlan(j);
      $("mpWhy").innerHTML = `<b>AI 的設計理由（推論，請自行判斷是否適用）</b>${mdLite(why)}`; $("mpWhy").hidden = false;
    } catch (e) { mpNote((ERR[e && e.code] || ERR.upstream_error) + (e && e.message ? "（" + e.message + "）" : ""), true); }
    finally { MP.busy = false; $("mpAi").disabled = false; }
  }
  // 解析 AI 的 msaplan：有 dataType 沒 type 時，用資料型態的預設分析
  function mpParsePlan(text) {
    const m = String(text).match(/```msaplan\s*([\s\S]*?)```/); if (!m) return null;
    let j; try { j = JSON.parse(m[1]); } catch (_) { return null; }
    if (!j || typeof j !== "object") return null;
    if (!MP_NAME[j.type] && MP_DT[j.dataType]) j.type = MP_DT[j.dataType].def;
    return MP_NAME[j.type] ? j : null;
  }
  // 把 AI 的設計參數（已由程式限制範圍）填進規劃表單；型態與分析不一致時保留，由程式檢查擋下並說明
  function mpApplyPlan(j) {
    const t = j.type, p = MP.p[t], M = MP.m, nOrBlank = v => { const x = Number(v); return v == null || v === "" || !isFinite(x) ? "" : String(x); };
    MP_F[t].forEach(f => { if (f[2] === "txt" || j[f[0]] == null) return; if (f[2] === "num") p[f[0]] = nOrBlank(j[f[0]]); else p[f[0]] = mpInt(j[f[0]], f[2], f[3], MP_DEF[t][f[0]]); });
    if (MP_DT[j.dataType]) M.dataType = j.dataType;
    if (j.unit != null) M.unit = String(j.unit).slice(0, 20);
    if (j.resolution !== undefined) M.resolution = nOrBlank(j.resolution);
    if (j.spec && typeof j.spec === "object") { M.lsl = nOrBlank(j.spec.lsl); M.usl = nOrBlank(j.spec.usl); }
    if (j.censorLimit !== undefined) M.censorLimit = nOrBlank(j.censorLimit);
    if (j.levels != null) M.levels = mpInt(j.levels, 2, 10, 5);
    if (typeof j.hasStd === "boolean") M.hasStd = j.hasStd;
    if (typeof j.randomize === "boolean") M.randomize = j.randomize;
    if (typeof j.blind === "boolean") M.blind = j.blind;
    M.destructive = t === "grr" && (j.destructive === true || j.partUnit === "homogeneous_group");
    setMpType(t, true);
    const bad = mpCheck(t, p).filter(x => x.lv === "bad");
    mpNote(bad.length ? "已帶入 AI 的建議，但程式檢查發現不可行的設定，請看下方說明並修改。" : t !== msaSub ? `AI 建議改用「${MP_NAME[t]}」，已切換。數字已由程式限制在合理範圍內，下方可修改。` : "已帶入 AI 的建議，下方可修改；程式檢查會即時更新。", bad.length > 0);
  }
  // 聊天視窗（MSA）回答中的設計參數 → 按鈕帶入規劃表單
  function mpChatHtml(text) { const j = mpParsePlan(text); return j ? `<div class="fb-sug"><span class="hint">AI 建議的實驗參數（${esc(MP_NAME[j.type])}${MP_DT[j.dataType] ? "・" + esc(MP_DT[j.dataType].name) : ""}）：</span><button type="button" class="btn small primary" data-msaplan="${esc(JSON.stringify(j))}">帶入下方「實驗規劃」表單</button></div>` : ""; }
  $("msgs").addEventListener("click", e => {
    const b = e.target.closest("[data-msaplan]"); if (!b) return;
    let j; try { j = JSON.parse(b.dataset.msaplan); } catch (_) { return; }
    if (!j || !MP_NAME[j.type]) return;
    closePanel(); route("msa"); mpApplyPlan(j); $("msaPlan").open = true; $("msaPlan").scrollIntoView({ behavior: "smooth", block: "start" }); b.textContent = "已帶入";
  });
  function setMpType(t, switchTab) {
    MP.type = t; MP.sheet = null; $("mpSheet").hidden = true; $("mpSheet").innerHTML = "";
    if (t !== "grr") MP.m.destructive = MP.m.destructive && false;
    if (switchTab) { const b = $("msaTabs").querySelector(`[data-tsub="${t}"]`); if (b && b.getAttribute("aria-selected") !== "true") b.click(); }
    $("mpTitle").textContent = "實驗規劃 · " + MP_NAME[t]; mpRenderFields();
  }
  $("msaTabs").addEventListener("click", e => { const b = e.target.closest("[data-tsub]"); if (b && b.dataset.tsub !== MP.type) { $("mpWhy").hidden = true; mpRead(); setMpType(b.dataset.tsub, false); } });

  // ---- 產生記錄表 ----
  function mpGen() {
    mpRead(); const t = MP.type, p = MP.p[t], M = MP.m; if (mpCheck(t, p).some(x => x.lv === "bad")) { mpRenderCheck(); return; }
    const S = { t, p: Object.assign({}, p), m: Object.assign({}, M), rows: [], vals: [], refs: [], stds: [] };
    if (t === "grr") {
      S.ops = mpNames(p.names, p.ops, "操作員"); S.parts = Array.from({ length: p.parts }, (_, i) => (M.destructive ? "G" : "P") + (i + 1));
      for (let r = 1; r <= p.reps; r++) { const c = []; S.ops.forEach(o => S.parts.forEach(pt => c.push({ o, pt, r }))); mpOrder(c); S.rows.push(...c); }
    } else if (t === "bias") { for (let i = 1; i <= p.n; i++) S.rows.push({ i }); S.refs = [""]; }
    else if (t === "lin") {
      const a = p.min !== "" && p.max !== "" ? Number(p.min) : null, b = a != null ? Number(p.max) : null;
      for (let i = 0; i < p.refs; i++) S.refs.push(a != null && isFinite(a) && isFinite(b) ? String(+(a + (b - a) * i / (p.refs - 1)).toPrecision(4)) : "");
      for (let r = 1; r <= p.reps; r++) { const c = S.refs.map((_, k) => ({ k, r })); mpOrder(c); S.rows.push(...c); }
    } else if (t === "stab") { for (let i = 1; i <= p.times; i++) S.rows.push({ i }); }
    else { S.raters = mpNames(p.names, p.raters, "評估員"); S.stds = Array(p.samples).fill("");
      for (let r = 1; r <= p.reps; r++) { const c = []; S.raters.forEach(o => { for (let s = 0; s < p.samples; s++) c.push({ o, s, r }); }); mpOrder(c); S.rows.push(...c); } }
    S.vals = Array(t === "stab" ? p.times * p.reps : S.rows.length).fill(""); MP.sheet = S; mpSheetHtml();
  }
  const mpJudgePh = () => MP.sheet.m.dataType === "ordinal" ? "1～" + MP.sheet.m.levels : "OK/NG";
  const mpIn = (cls, k, v) => `<input class="mp-in" data-${cls}="${k}" value="${esc(v)}" ${MP.sheet.t === "attr" ? `type="text" list="mpJudge" autocomplete="off" placeholder="${mpJudgePh()}"` : 'type="text" inputmode="decimal" autocomplete="off"'}>`;
  function mpSheetHtml() {
    const S = MP.sheet, t = S.t, M = S.m, unit = M.unit ? `（${esc(M.unit)}）` : ""; let h = "", head = "", body = "";
    const refTbl = (title, arr, pre, ph) => `<div class="mp-aux"><h4>${title}</h4><div class="mp-aux-grid">${arr.map((v, i) => `<label>${pre}${i + 1}<input class="mp-in" data-ref="${i}" type="text" inputmode="decimal" autocomplete="off" value="${esc(v)}" placeholder="${ph}"></label>`).join("")}</div></div>`;
    if (t === "grr") { head = `<th>順序</th><th>操作員</th><th>${M.destructive ? "均質組" : "零件"}</th><th>第幾輪</th><th>量測值${unit}</th>`; body = S.rows.map((r, i) => `<tr><td>${i + 1}</td><td>${esc(r.o)}</td><td>${esc(r.pt)}</td><td>${r.r}</td><td>${mpIn("v", i, S.vals[i])}</td></tr>`).join(""); }
    else if (t === "bias") { h += `<div class="mp-aux"><h4>標準件的參考值${unit}</h4><div class="mp-aux-grid"><label>參考值<input class="mp-in" data-ref="0" type="text" inputmode="decimal" autocomplete="off" value="${esc(S.refs[0])}"></label></div></div>`; head = `<th>順序</th><th>量測值${unit}</th>`; body = S.rows.map((r, i) => `<tr><td>${r.i}</td><td>${mpIn("v", i, S.vals[i])}</td></tr>`).join(""); }
    else if (t === "lin") { h += refTbl("各標準件的參考值（可修改；需有可追溯的已知值）" + unit, S.refs, "參考值 ", "數字"); head = `<th>順序</th><th>參考值編號</th><th>第幾輪</th><th>量測值${unit}</th>`; body = S.rows.map((r, i) => `<tr><td>${i + 1}</td><td>參考值 ${r.k + 1}</td><td>${r.r}</td><td>${mpIn("v", i, S.vals[i])}</td></tr>`).join(""); }
    else if (t === "stab") { head = "<th>時間點</th>" + Array.from({ length: S.p.reps }, (_, j) => `<th>第 ${j + 1} 次${unit}</th>`).join(""); body = S.rows.map((r, i) => `<tr><td>${r.i}</td>${Array.from({ length: S.p.reps }, (_, j) => `<td>${mpIn("v", i * S.p.reps + j, S.vals[i * S.p.reps + j])}</td>`).join("")}</tr>`).join(""); }
    else {
      if (M.hasStd) h += `<div class="mp-aux"><h4>標準答案（專家或標準樣品先決定）</h4><div class="mp-aux-grid">${S.stds.map((v, i) => `<label>樣本 ${i + 1}<input class="mp-in" data-std="${i}" type="text" list="mpJudge" autocomplete="off" value="${esc(v)}" placeholder="${mpJudgePh()}"></label>`).join("")}</div></div>`;
      head = "<th>順序</th><th>評估員</th><th>樣本</th><th>第幾輪</th><th>判定</th>"; body = S.rows.map((r, i) => `<tr><td>${i + 1}</td><td>${esc(r.o)}</td><td>樣本 ${r.s + 1}</td><td>${r.r}</td><td>${mpIn("v", i, S.vals[i])}</td></tr>`).join("");
    }
    const ord = M.randomize ? "請依「順序」逐列量測（每一輪都已重新隨機）。" : "順序未隨機化。";
    const tip = { grr: M.destructive ? `${ord}每一列使用該均質組的一個新試片。` : `${ord}${M.blind ? "零件不要讓量測者看到編號（盲測）。" : ""}`, bias: "同一個標準件重複量測，每次重新取放。", lin: `${ord}每次重新取放標準件。`, stab: "每個時間點量測後填入同一列；時間點要分散在不同日期。", attr: `${ord}${M.blind ? "評估員之間不要互相看答案，也不要看到標準答案。" : ""}` }[t];
    const opts = M.dataType === "ordinal" ? Array.from({ length: M.levels }, (_, i) => `<option value="${i + 1}">`).join("") : '<option value="OK"><option value="NG">';
    $("mpSheet").innerHTML = `<h3>記錄表（${MP_NAME[t]}・${esc(MP_DT[M.dataType].name)}・共 ${mpCount(t, S.p)} 筆）</h3><p class="help">${tip}填好後按「帶入下方分析」。統計全部由程式計算，AI 不參與。</p>${h}
      <datalist id="mpJudge">${opts}</datalist>
      <div class="scroll-x mp-tblwrap"><table class="mp-tbl"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>
      <details class="mp-paste"><summary>從 Excel 一次貼上量測值</summary><p class="hint">依表格由上到下的順序，貼上一欄（或以空白、逗號、換行分隔）的${t === "attr" ? "判定" : "數值"}${t === "stab" ? "；由左到右、由上到下" : ""}。</p><textarea id="mpBulk" rows="3" spellcheck="false"></textarea><div class="run-row"><button class="btn small" type="button" id="mpBulkGo">填入表格</button></div></details>
      <div class="run-row"><button class="btn primary" type="button" id="mpApply">帶入下方分析</button><button class="btn" type="button" id="mpCsv">下載空白記錄表（CSV）</button>${M.randomize ? '<button class="btn ghost" type="button" id="mpRegen">重新隨機排序</button>' : ""}<span class="hint" id="mpProg"></span></div>
      <ul class="mp-check" id="mpDataWarn" hidden></ul>`;
    $("mpSheet").hidden = false; mpProg();
  }
  function mpProg() { const S = MP.sheet; if (!S) return; const f = S.vals.filter(v => String(v).trim() !== "").length; $("mpProg").textContent = `已填 ${f} / ${S.vals.length}`; }
  $("mpSheet").addEventListener("input", e => { const S = MP.sheet; if (!S) return; const el = e.target;
    if (el.dataset.v != null) S.vals[+el.dataset.v] = el.value; else if (el.dataset.ref != null) S.refs[+el.dataset.ref] = el.value; else if (el.dataset.std != null) S.stds[+el.dataset.std] = el.value; mpProg(); });
  $("mpSheet").addEventListener("click", e => {
    const S = MP.sheet; if (!S) return; const id = e.target.id;
    if (id === "mpRegen") { mpGen(); }
    else if (id === "mpBulkGo") { const tk = $("mpBulk").value.split(/[\s,，;\t]+/).filter(Boolean); if (!tk.length) return; tk.slice(0, S.vals.length).forEach((v, i) => { S.vals[i] = v; }); mpSheetHtml(); mpNote(`已填入 ${Math.min(tk.length, S.vals.length)} 筆${tk.length > S.vals.length ? `（多出的 ${tk.length - S.vals.length} 筆已忽略）` : ""}。`); }
    else if (id === "mpCsv") { mpCsv(); }
    else if (id === "mpApply") { mpApply(); }
  });
  function mpCsv() {
    const S = MP.sheet, q = s => `"${String(s).replace(/"/g, '""')}"`, u = S.m.unit ? `（${S.m.unit}）` : "", L = [];
    if (S.t === "grr") { L.push(`順序,操作員,${S.m.destructive ? "均質組" : "零件"},第幾輪,量測值${u}`); S.rows.forEach((r, i) => L.push([i + 1, q(r.o), r.pt, r.r, ""].join(","))); }
    else if (S.t === "bias") { L.push(`順序,量測值${u}（標準件參考值：      ）`); S.rows.forEach(r => L.push(r.i + ",")); }
    else if (S.t === "lin") { L.push(`順序,參考值編號,參考值,第幾輪,量測值${u}`); S.rows.forEach((r, i) => L.push([i + 1, r.k + 1, S.refs[r.k], r.r, ""].join(","))); }
    else if (S.t === "stab") { L.push("時間點(日期)," + Array.from({ length: S.p.reps }, (_, j) => "第" + (j + 1) + "次" + u).join(",")); S.rows.forEach(r => L.push(r.i + "," + Array(S.p.reps).fill("").join(","))); }
    else { L.push("順序,評估員,樣本," + (S.m.hasStd ? "標準答案," : "") + "第幾輪,判定"); S.rows.forEach((r, i) => L.push([i + 1, q(r.o), r.s + 1].concat(S.m.hasStd ? [q(S.stds[r.s])] : []).concat([r.r, ""]).join(","))); }
    const data = "﻿" + L.join("\r\n"), fn = `MSA_${MP_NAME[S.t]}_記錄表_${new Date().toISOString().slice(0, 10)}.csv`;
    if (!downloads) { mpNote("這個檢視無法下載檔案。", true); return; }
    Promise.resolve().then(() => downloads.save({ filename: fn, data })).catch(e => { if (!(e && e.code === "declined")) mpNote("無法下載檔案。", true); });
  }
  // ---- 填完的數值檢查（解析度、截尾、計數、序位） ----
  function mpDataCheck(S, nums) {
    const M = S.m, o = [], warn = m => o.push({ lv: "warn", m }), bad = m => o.push({ lv: "bad", m });
    if (M.dataType === "continuous" || M.dataType === "count") {
      const distinct = new Set(nums.map(x => +x.toPrecision(12))).size, R = mpNum(M.resolution);
      const span = Math.max(...nums) - Math.min(...nums);
      if (distinct < 5) warn(`全部 ${nums.length} 筆只有 ${distinct} 種不同數值：解析度相對於資料範圍太粗，區別分類數（ndc）與變異估計都會失真*。`);
      else if (R > 0 && span / R < 10) warn(`資料範圍只有約 ${Math.round(span / R)} 個解析度刻度（常見要求至少 10 個*）：量具可能分辨不出零件間的差異。`);
      if (R > 0) { const off = nums.filter(x => Math.abs(x / R - Math.round(x / R)) > 1e-6).length; if (off) warn(`有 ${off} 筆數值不是解析度 ${R} 的整數倍，請確認解析度或記錄是否正確。`); }
      const C = mpNum(M.censorLimit);
      if (C != null && !Number.isNaN(C)) {
        const k = nums.filter(x => x >= C).length, r = k / nums.length;
        if (r >= 0.3) bad(`截尾比例 ${(r * 100).toFixed(0)}%（${k}/${nums.length} 筆達上限 ${C}）：比例很高，ANOVA 結果不可靠，不建議據以判定*。可考慮提高測試上限，或改用存活分析類方法。`);
        else if (r >= 0.1) warn(`截尾比例 ${(r * 100).toFixed(0)}%（${k}/${nums.length} 筆達上限 ${C}）：比例偏高，ANOVA 會低估變異，結果僅供參考*。`);
        else if (k) warn(`有 ${k} 筆達截尾上限 ${C}（${(r * 100).toFixed(0)}%）。`);
      }
      if (M.dataType === "count") {
        const nonInt = nums.filter(x => x < 0 || Math.abs(x - Math.round(x)) > 1e-9).length;
        if (nonInt) bad(`離散計數型應為 0 以上的整數，有 ${nonInt} 筆不是。`);
        const mean = nums.reduce((a, b) => a + b, 0) / nums.length, zeros = nums.filter(x => x === 0).length;
        warn(`計數資料平均 ${+mean.toPrecision(3)}、0 的比例 ${(zeros / nums.length * 100).toFixed(0)}%。${mean < 5 || zeros / nums.length > 0.2 ? "平均小或 0 很多，分布偏斜，ANOVA 結果僅供參考*；" : ""}建議先看分布再判讀。`);
      }
    }
    return o;
  }
  function mpApply() {
    const S = MP.sheet, t = S.t, M = S.m, vs = S.vals.map(v => String(v).trim()), isN = s => s !== "" && isFinite(Number(s));
    const gotoRes = () => { const el = $({ grr: "grrData", bias: "biasData", lin: "linData", stab: "stabData", attr: "attrData" }[t]); if (el) el.scrollIntoView({ behavior: "smooth", block: "center" }); };
    const showWarn = list => { const w = $("mpDataWarn"); w.hidden = !list.length; w.innerHTML = list.map(x => `<li class="mp-${x.lv}"><b>${x.lv === "bad" ? "✗" : "⚠"}</b> ${esc(x.m)}</li>`).join(""); };
    mpRead();
    const cur = mpCheck(t, S.p, Object.assign({}, S.m, { dataType: MP.m.dataType })).filter(x => x.lv === "bad");
    if (MP.m.dataType !== M.dataType) { mpNote("資料型態已改變，請重新產生記錄表。", true); return; }
    if (cur.length) { mpNote("無法套用：" + cur[0].m, true); return; }
    const miss = vs.filter(v => v === "").length; if (miss) { mpNote(`還有 ${miss} 格沒填，填完才能分析。`, true); return; }
    if (t !== "attr") { const nn = vs.findIndex(v => !isN(v)); if (nn >= 0) { mpNote(`第 ${nn + 1} 格不是數字：「${vs[nn]}」。`, true); return; } }
    const L0 = mpNum(M.lsl), U0 = mpNum(M.usl), tol = L0 != null && U0 != null && U0 > L0 ? String(+(U0 - L0).toPrecision(12)) : "";
    let dw = [];
    if (t !== "attr") { dw = mpDataCheck(S, vs.map(Number)); if (dw.some(x => x.lv === "bad") && M.dataType === "count" && dw.some(x => /整數/.test(x.m))) { showWarn(dw); mpNote("數值不符合離散計數型，請修正後再套用。", true); return; } }
    if (t === "grr") {
      const m = {}; S.rows.forEach((r, i) => { (m[r.o + "\u0001" + r.pt] = m[r.o + "\u0001" + r.pt] || []).push([r.r, vs[i]]); });
      const L = ["操作員,零件," + Array.from({ length: S.p.reps }, (_, j) => "第" + (j + 1) + "次").join(",")];
      S.ops.forEach(o => S.parts.forEach(pt => L.push([o, pt].concat(m[o + "\u0001" + pt].sort((a, b) => a[0] - b[0]).map(x => x[1])).join(","))));
      $("grrData").value = L.join("\n"); $("grrTol").value = tol; grrRun();
    } else if (t === "bias") {
      if (!isN(String(S.refs[0]).trim())) { mpNote("請填標準件的參考值。", true); return; }
      $("biasRef").value = String(S.refs[0]).trim(); $("biasTol").value = tol; $("biasData").value = vs.join("\n"); biasRun();
    } else if (t === "lin") {
      const bad = S.refs.findIndex(v => !isN(String(v).trim())); if (bad >= 0) { mpNote(`參考值 ${bad + 1} 還沒填（或不是數字）。`, true); return; }
      const m = S.refs.map(() => []); S.rows.forEach((r, i) => m[r.k].push([r.r, vs[i]]));
      $("linData").value = S.refs.map((rv, k) => [String(rv).trim()].concat(m[k].sort((a, b) => a[0] - b[0]).map(x => x[1])).join(",")).join("\n"); $("linTol").value = tol; linRun();
    } else if (t === "stab") {
      const L = []; for (let i = 0; i < S.p.times; i++) L.push(vs.slice(i * S.p.reps, (i + 1) * S.p.reps).join(","));
      $("stabData").value = L.join("\n"); stabRun();
    } else {
      const sd = M.hasStd ? S.stds.map(v => String(v).trim()) : S.stds.map(() => "");
      if (M.hasStd && sd.some(v => v === "")) { mpNote(`還有 ${sd.filter(v => v === "").length} 個樣本沒有標準答案；若標準答案不可得，請在上方改選「不可得」。`, true); return; }
      const all = vs.concat(sd.filter(Boolean));
      if (M.dataType === "ordinal") { const badV = all.find(v => !/^\d+$/.test(v) || +v < 1 || +v > M.levels); if (badV != null) { mpNote(`序位型判定只能填 1～${M.levels} 的整數，發現「${badV}」。`, true); return; } }
      else { const cats = [...new Set(all.map(v => v.toUpperCase()))]; if (cats.length > 2) { mpNote(`二元型只能有兩種判定，目前有 ${cats.length} 種：${cats.slice(0, 5).join("、")}。請統一寫法（例如都用 OK／NG）。`, true); return; } }
      const m = {}; S.rows.forEach((r, i) => { (m[r.o + "\u0001" + r.s] = m[r.o + "\u0001" + r.s] || []).push([r.r, M.dataType === "binary" ? vs[i].toUpperCase() : vs[i]]); });
      const L = ["樣本,標準," + S.raters.map(o => Array.from({ length: S.p.reps }, (_, j) => o + (j + 1)).join(",")).join(",")];
      for (let s = 0; s < S.p.samples; s++) L.push([s + 1, M.dataType === "binary" ? sd[s].toUpperCase() : sd[s]].concat(...S.raters.map(o => m[o + "\u0001" + s].sort((a, b) => a[0] - b[0]).map(x => x[1]))).join(","));
      $("attrA").value = S.p.raters; $("attrT").value = S.p.reps; $("attrData").value = L.join("\n"); attrRun();
      if (M.dataType === "ordinal") dw.push({ lv: "warn", m: "序位資料以名目類別計算 Kappa，未計入等級間距離*。" });
    }
    showWarn(dw);
    const hintEl = $(t + "Hint");
    if (hintEl && dw.length) hintEl.insertAdjacentHTML("beforeend", `<span class="status ng"> 量測規劃的資料檢查有 ${dw.length} 項提醒，請看上方「實驗規劃」。</span>`);
    mpNote(dw.some(x => x.lv === "bad") ? "已帶入並分析，但資料檢查發現嚴重問題，結果不建議據以判定（見記錄表下方）。" : dw.length ? "已帶入並分析；資料檢查有提醒，見記錄表下方。" : "已帶入並分析，結果在下方。", dw.some(x => x.lv === "bad"));
    gotoRes();
  }
  $("mpFields").addEventListener("input", () => { mpRead(); mpRenderCheck(); });
  $("mpMeta").addEventListener("change", e => {
    const el = e.target; mpRead();
    if (el.dataset.mm === "dataType") {
      const dt = MP_DT[MP.m.dataType];
      if (dt && !dt.tools.includes(MP.type)) { setMpType(dt.def, true); mpNote(`資料型態「${dt.name}」改用「${MP_NAME[dt.def]}」分析。`); return; }
      mpNote(""); mpRenderMeta();
    } else if (el.dataset.mm === "destructive" || el.dataset.mm === "hasStd") { mpRenderFields(); return; }
    mpRenderCheck();
  });
  $("mpMeta").addEventListener("input", e => { if (e.target.tagName === "INPUT" && e.target.type !== "checkbox" && e.target.type !== "radio") { mpRead(); mpRenderCheck(); } });
  $("mpAi").addEventListener("click", mpAsk);
  $("mpGen").addEventListener("click", mpGen);
  $("mpReset").addEventListener("click", () => { MP.p[MP.type] = JSON.parse(JSON.stringify(MP_DEF[MP.type])); MP.m = Object.assign({}, MP_META_DEF); MP.sheet = null; $("mpSheet").hidden = true; $("mpWhy").hidden = true; mpRenderFields(); mpNote(""); });
  setMpType("grr", false);
