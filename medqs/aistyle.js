  // ---------- AI answer perspective + fixed output templates (company default + personal override) ----------
  // 五個視角各有固定的回答樣板：res = 有結果時、plan = 尚未分析（規劃說明）、home = 定義問題 AI 診斷分析插入的專屬段落
  const STYLE_KEY = "mdqs.aistyle.v1";
  const PERSP = {
    audit: { name: "查廠", disc: "（以下為模擬查廠角度的整理，不代表稽核員的實際判定）",
      intro: "以模擬查廠（ISO 13485、FDA QMSR 21 CFR 820、TFDA 醫療器材品質管理系統準則的稽核）角度回答，讀者是準備接受稽核的人，目的是在查廠前找出紀錄的弱點。用語客觀、書面化；不做合規判定（不說「符合要求」「應該沒問題」，改說「需確認……」「稽核時可能被要求提供……」）；引用規範只寫頁面提供的依據，不確定條號時明說需要查證。",
      res: [["結論", "一句書面語"], ["稽核可能查看的紀錄", "每點寫成「紀錄名稱：目前頁面能支持／需另外準備」"], ["可能被追問的問題", "2～4 個問題，每題後面接「回應時可提出：……」"], ["需補強的紀錄", "例如抽樣依據、統計軟體確效、偏差與異常處理、原始數據可追溯性"], ["需另外查證的規範", "寫出規範名稱；不確定條號時說明需要查證"]],
      plan: [["規劃重點", "一句書面語說明這次要證明什麼"], ["事前要建立的紀錄", "每點寫成「紀錄名稱：用途」，例如抽樣計畫依據、允收標準、量具校正"], ["可能被追問的問題", "2～4 個問題，每題後面接「回應時可提出：……」"], ["需補強的紀錄", "目前規劃還缺少、需要事先訂定的文件"], ["需另外查證的規範", "寫出規範名稱；不確定條號時說明需要查證"]],
      home: ["稽核可能查看的紀錄", "每點寫成「紀錄名稱：用途」"] },
    tech: { name: "技術文件", disc: "（以下為模擬審查角度的整理，不代表主管機關的實際判定）",
      intro: "以撰寫與審查技術文件（FDA 510(k)、TFDA 查驗登記、設計歷史檔 DHF、設計驗證報告）的角度回答，讀者是撰寫送審文件的人。用語客觀、書面化，不用第一人稱；不做合規判定；引用規範只寫頁面提供的依據，不確定條號時明說需要查證。",
      res: [["結論", "一句書面語"], ["方法與依據", "統計方法、樣本數依據、允收標準、信心水準與可靠度；頁面沒有的寫「未提供」"], ["可引用的報告文字", "一段可直接貼進測試報告的書面語，數字只用頁面提供的"], ["審查可能要求補充", "2～4 點"], ["需另外查證的規範", "寫出規範名稱；不確定條號時說明需要查證"]],
      plan: [["規劃重點", "一句書面語說明這次要證明什麼"], ["方法與依據", "建議的統計方法、樣本數依據、允收標準、信心水準與可靠度；尚未決定的寫「待訂」"], ["試驗計畫書可引用的文字", "一段可直接貼進試驗計畫書（protocol）的書面語，不得出現結果數字"], ["審查可能要求補充", "2～4 點"], ["需另外查證的規範", "寫出規範名稱；不確定條號時說明需要查證"]],
      home: ["送審文件需要的證據", "每點寫成「證據：用哪個網站工具產生」"] },
    stat: { name: "統計檢查", disc: "",
      intro: "以統計檢查者的角度回答，只聚焦統計本身（方法選擇、前提、樣本數與檢定力、解讀是否過度），除非使用者問，否則不談法規。不要只看 p 值下結論。",
      res: [["結論", "統計上能說什麼、不能說什麼，各一句"], ["方法適用性", "每點寫成「檢查項目：✓ 符合／⚠ 有疑慮，原因」，項目包含資料型態、獨立或成對、常態性、變異數同質性（頁面有資料的才寫）"], ["證據強度", "效果量、信賴區間、檢定力、樣本數依據；頁面沒有的寫「頁面未提供」"], ["解讀限制", "不能下的結論，例如「未達顯著不等於相同」「統計顯著不等於實務上重要」"], ["建議的補充分析", "對應到網站的工具與模式"]],
      plan: [["規劃重點", "一句話說明這次的統計問題"], ["方法適用性", "依目前設定，說明這個方法需要的前提，每點寫成「前提：怎麼確認」"], ["樣本數與檢定力的考量", "要先決定哪些數值（例如 σ、要偵測的差值、信心水準），用哪個網站工具計算；不要自己算出數字"], ["解讀限制", "這個方法做完之後不能下的結論"], ["建議的補充分析", "對應到網站的工具與模式"]],
      home: ["統計上要先確認", "每點寫成「要確認的事：為什麼」"] },
    improve: { name: "問題改善", disc: "",
      intro: "以資深研發／製程工程師的角度回答，讀者是研發與製程工程師，重點是對產品或製程的實際意義與下一步怎麼做；考慮時間與成本，先做最快能排除或確認原因的步驟。",
      res: [["結論", "對產品或製程的實際意義"], ["與規格比較", "結果相對於規格的大小與剩下的餘裕；頁面沒有規格時，這段的小標題改為 **與目前條件比較**", "與目前條件比較"], ["可能原因", "每點句尾加 *"], ["下一步", "依時間與成本排序，每點寫成「做什麼｜收什麼資料｜用哪個網站工具」"], ["風險", "照目前結論去做，最可能出問題的地方"]],
      plan: [["規劃重點", "一句話說明這次要解決什麼"], ["要準備的資料", "資料格式、數量怎麼決定、要記錄的條件"], ["要控制的條件", "實驗或抽樣時要固定或記錄的條件，例如批次、人員、量具、環境"], ["下一步", "依時間與成本排序，每點寫成「做什麼｜收什麼資料｜用哪個網站工具」"], ["風險", "規劃上最容易出錯、讓結果無法判讀的地方"]],
      home: ["最快的下一步", "1～2 點，寫成「做什麼｜收什麼資料｜用哪個網站工具」"] },
    teach: { name: "新人教學", disc: "",
      intro: "以帶新人的資深同事角度回答，讀者是沒有統計背景的同仁；用白話，可以舉生活化的例子，但數字只用頁面提供的。",
      res: [["一句話結論", "白話"], ["怎麼看出來的", "指出頁面上的哪個數字或哪張圖"], ["名詞解釋", "最多 3 個，每個寫成「名詞：一句白話」"], ["要注意什麼", "新人最容易犯的錯"]],
      plan: [["這個工具在做什麼", "白話一兩句"], ["要準備什麼", "資料、樣品、紀錄"], ["名詞解釋", "最多 3 個，每個寫成「名詞：一句白話」"], ["要注意什麼", "新人最容易犯的錯"]],
      home: ["名詞解釋", "最多 3 個，每個寫成「名詞：一句白話」"] }
  };
  const OLD_PERSP = { reg: "tech", eng: "improve", custom: "improve" };
  const DETAIL = { short: "精簡：每段 1～2 點，段落都要保留。", std: "標準：每段 2～3 點。", long: "詳細：每段可寫 3～5 點，但不另加小標題。" };
  const FORMAT = { list: "各段內以條列為主。", para: "各段內以短段落為主，少用條列。", table: "各段內能用表格整理的內容（例如比較、清單）就用表格。" };
  const USE = { general: "一般說明，語氣自然。", report: "寫成可直接貼進報告的正式書面語：不用口語、不用第一人稱、不用表情符號。" };
  const TIER = { quick: "快速", default: "標準", complex: "深入思考" };
  // company default (edit here, then republish)
  const COMPANY_STYLE = { persp: "improve", detail: "std", format: "list", use: "report", tier: "default", extra: "" };
  let myStyle = null;
  try { myStyle = JSON.parse(localStorage.getItem(STYLE_KEY) || "null"); } catch (_) { myStyle = null; }
  if (myStyle) { if (OLD_PERSP[myStyle.persp]) myStyle.persp = OLD_PERSP[myStyle.persp]; if (!PERSP[myStyle.persp]) delete myStyle.persp; delete myStyle.custom; }
  const curStyle = () => Object.assign({}, COMPANY_STYLE, myStyle || {});
  const styleSent = {};
  const chatPersp = {};   // 各分頁對話臨時改用的視角（清除對話或改全站設定時回到預設）
  const styleFor = key => Object.assign(curStyle(), key && chatPersp[key] ? { persp: chatPersp[key] } : {});
  const perspOf = st => PERSP[st.persp] || PERSP[COMPANY_STYLE.persp];
  function perspName(st) { return perspOf(st).name; }
  // 這個對話要用哪一套樣板
  function tplMode(key) { return key === "home" ? "home" : key === "fishbone" ? "fb" : key === "cmp" ? "res" : (hasResult(key) ? "res" : "plan"); }
  function homeSections(p) {
    return [["附件重點", "有附件才寫。2～4 句摘要附件的事實內容（編號、產品、日期等可查證資訊），附件沒寫的不要補", 0, 1],
      ["目前的判斷", "條列，每點以「事實：」或「推論：」開頭；推論句尾加 *"],
      ["建議做法（由簡到繁）", "編號條列，每點寫成「工具名稱：用途與要準備的資料」，只寫網站工具，順序與最後的「建議工具」一致"],
      [p.home[0], p.home[1]],
      ["公司 KM 資料", "有【公司 KM／個人知識資料】且與問題相關才寫；條列相關內容並標註［KM-編號］", 0, 1],
      ["其他廠經驗（NyquistAI 資料）", "有外部案例資料才寫；先寫筆數與分類統計，再列 2～4 個具體個案（編號、公司、摘要、根本原因分類），最後一點固定寫相關性提醒並加 *", 0, 1],
      ["注意事項", "條列 1～3 點：需另外查證的法規或標準、目前資料不足以下結論之處"]];
  }
  // 程式檢查用：必須出現的小標題（依序）；條件段落不列入
  function tplHeads(st, mode) {
    const p = perspOf(st);
    const secs = mode === "home" ? homeSections(p) : mode === "plan" ? p.plan : mode === "res" ? p.res : [];
    return secs.filter(s => !s[3]).map(s => ({ h: s[0], alt: s[2] || "" }));
  }
  function styleText(st, key) {
    st = st || curStyle(); key = key || "cmp";
    const p = perspOf(st), mode = tplMode(key), L = [];
    L.push("【回答樣板】視角：" + p.name, p.intro);
    if (mode === "fb") {
      L.push("魚骨圖對話不使用固定樣板，依魚骨圖的規則與 fishbone 區塊格式回答，但重點與語氣依上述視角。");
    } else {
      const secs = mode === "home" ? homeSections(p) : mode === "plan" ? p.plan : p.res;
      L.push(mode === "home" ? "定義問題的 AI 診斷分析：每次給診斷建議時，依下列順序寫，使用完全相同的小標題："
        : mode === "plan" ? "目前頁面還沒有分析結果，使用「規劃」樣板，依下列順序寫，使用完全相同的小標題："
        : "說明分析結果時，依下列順序寫，使用完全相同的小標題：");
      if (p.disc) L.push("（第一行，不是小標題）固定寫：" + p.disc);
      secs.forEach((s, i) => L.push(`${i + 1}. **${s[0]}**：${s[1]}`));
      if (mode === "home") {
        L.push("接著寫「建議工具：…」一行，最後才是 fishbone 區塊（若有）。",
          "例外：資訊不足需要先追問時，不用上面的樣板，改用 **需要先確認** 一個小標題，條列 1～3 個問題（每題說明為什麼需要知道），其他段落都不寫。");
      }
      L.push("樣板規則：",
        "- 小標題用粗體單獨一行（例如 **" + secs[mode === "home" ? 1 : 0][0] + "**），名稱、順序與樣板完全相同；不要改名、不要調換順序、不要另加其他小標題，也不要用 # 標題。",
        "- 標示「…才寫」的段落，條件不成立就整段省略，不要寫「無」。",
        "- 推論或判斷在句尾加 *；數字只用頁面提供的，不要自行計算或編造。",
        "- 使用者追問時直接回答問題，不必重複整個樣板；使用者要求「依樣板重寫」時，照樣板完整重寫。");
      if (st.persp !== "stat") L.push(`- 統計底線：若發現統計方法明顯不適用、前提不成立或樣本數不足，在「${mode === "home" ? "目前的判斷" : secs[0][0]}」段的最後加一行「⚠ 統計提醒：……」，不另外展開。`);
    }
    L.push("", "【回答風格】（每段寫多少依這裡；小標題與順序依【回答樣板】；繁體中文、推論在句尾標 *、不編造數字與法規條文這三條不變）",
      "長度：" + DETAIL[st.detail], "格式：" + FORMAT[st.format], "用途：" + USE[st.use]);
    if ((st.extra || "").trim()) L.push("使用者的其他要求（不得改變樣板的小標題與順序）：" + st.extra.trim());
    return L.join("\n");
  }
  function styleForAsk(key, first) {
    const t = styleText(styleFor(key), key);
    if (styleSent[key] === t) return "";
    styleSent[key] = t;
    return first ? t : t.replace("【回答樣板】", "【回答樣板（已更新，從這則開始照新的樣板回答）】");
  }
  // 回答回來後檢查小標題是否齊全、順序是否正確
  function tplCheck(text, st, mode) {
    if (mode === "fb") return null;
    const norm = s => String(s).replace(/\*\*|#+\s*|[：:]\s*$/gm, "").replace(/[ \t　]/g, "");
    const lines = String(text).split("\n").map(l => norm(l.trim())).filter(Boolean);
    if (mode === "home" && lines.some(l => l.startsWith("需要先確認"))) return null;
    const heads = tplHeads(st, mode), missing = [], pos = [];
    heads.forEach(h => {
      const names = [h.h, h.alt].filter(Boolean).map(norm);
      const i = lines.findIndex(l => names.some(n => l === n || l.startsWith(n + "：") || l.startsWith(n + ":") || (l.startsWith(n) && l.length <= n.length + 4)));
      if (i < 0) missing.push(h.h); else pos.push(i);
    });
    const order = pos.every((v, i) => !i || v > pos[i - 1]);
    if (!missing.length && order) return null;
    return { missing, order };
  }
  function saveStyle(st) {
    const same = JSON.stringify(Object.assign({}, COMPANY_STYLE, st)) === JSON.stringify(COMPANY_STYLE);
    myStyle = same ? null : st;
    try { if (myStyle) localStorage.setItem(STYLE_KEY, JSON.stringify(myStyle)); else localStorage.removeItem(STYLE_KEY); } catch (_) {}
    renderStyleUI();
  }
  function renderPanelPersp() {
    const k = typeof chatKey === "string" ? chatKey : "", st = styleFor(k);
    setChip("aiPersp", st.persp);
    const badge = $("aiStyleBadge");
    if (badge) badge.textContent = (chatPersp[k] ? "這個分頁暫時改用：" : "視角：") + perspName(st) + (perspOf(st).disc ? perspOf(st).disc : "");
  }
  function renderStyleUI() {
    const st = curStyle();
    setChip("homePersp", st.persp);
    $("homePerspNote").textContent = myStyle ? "" : "公司預設"; $("homePerspNote").hidden = !!myStyle;
    setChip("asPersp", st.persp); setChip("asDetail", st.detail); setChip("asFormat", st.format); setChip("asUse", st.use); setChip("asTier", st.tier);
    if (document.activeElement !== $("asExtra")) $("asExtra").value = st.extra;
    $("asPreview").textContent = styleText(st, "cmp");
    $("asState").textContent = myStyle ? "目前使用：你的個人設定" : "目前使用：公司預設";
    $("asReset").disabled = !myStyle;
    $("asCompany").innerHTML = `<li>視角：${esc(perspName(COMPANY_STYLE))}</li><li>長度：${esc(DETAIL[COMPANY_STYLE.detail])}</li><li>格式：${esc(FORMAT[COMPANY_STYLE.format])}</li><li>用途：${esc(USE[COMPANY_STYLE.use])}</li><li>AI 層級：${TIER[COMPANY_STYLE.tier]}</li>`;
    $("asTplTable").innerHTML = "<thead><tr><th>視角</th><th>說明結果時的段落</th><th>還沒分析（規劃）時的段落</th><th>AI 診斷分析的專屬段落</th></tr></thead><tbody>" +
      Object.values(PERSP).map(p => `<tr><td><b>${esc(p.name)}</b></td><td>${p.res.map(s => esc(s[0])).join(" → ")}</td><td>${p.plan.map(s => esc(s[0])).join(" → ")}</td><td>${esc(p.home[0])}</td></tr>`).join("") + "</tbody>";
    renderPanelPersp();
  }
  const setStyle = patch => { Object.keys(chatPersp).forEach(k => delete chatPersp[k]); saveStyle(Object.assign(curStyle(), patch)); };
  const perspChoices = () => Object.entries(PERSP).map(([k, v]) => `<button class="chip" type="button" data-v="${k}">${v.name}</button>`).join("");
  $("homePersp").innerHTML = perspChoices(); $("asPersp").innerHTML = perspChoices(); $("aiPersp").innerHTML = perspChoices();
  chipGroup("homePersp", v => setStyle({ persp: v }));
  chipGroup("asPersp", v => setStyle({ persp: v }));
  chipGroup("aiPersp", v => { if (v === curStyle().persp) delete chatPersp[chatKey]; else chatPersp[chatKey] = v; renderPanelPersp(); });
  chipGroup("asDetail", v => setStyle({ detail: v }));
  chipGroup("asFormat", v => setStyle({ format: v }));
  chipGroup("asUse", v => setStyle({ use: v }));
  chipGroup("asTier", v => setStyle({ tier: v }));
  $("asExtra").addEventListener("input", e => setStyle({ extra: e.target.value }));
  $("asReset").addEventListener("click", () => { Object.keys(chatPersp).forEach(k => delete chatPersp[k]); saveStyle(Object.assign({}, COMPANY_STYLE)); });
  // compare two perspectives
  $("cmpA").innerHTML = $("cmpB").innerHTML = Object.entries(PERSP).map(([k, v]) => `<option value="${k}">${v.name}</option>`).join("");
  $("cmpA").value = "improve"; $("cmpB").value = "audit";
  $("cmpQ").value = "【計算結果】兩組獨立樣本（轉廠前、轉廠後）拉伸強度，每組 n=8。轉廠前平均 52.3 N（SD 1.1），轉廠後平均 51.1 N（SD 1.0），規格下限 45 N。Shapiro-Wilk 兩組 p>0.05，Levene p=0.62，Student t 檢定 p=0.03，差值 95% CI [0.1, 2.3] N。\n請說明這個結果。";
  let cmpCtl = null;
  $("cmpRun").addEventListener("click", async () => {
    if (!sample) { $("cmpHint").textContent = "目前無法使用 AI：需要在 claude.ai 中開啟本頁並登入。"; return; }
    if (cmpCtl) { cmpCtl.abort(); cmpCtl = null; return; }
    const base = curStyle(), q = $("cmpQ").value.trim(); if (!q) return;
    const sides = [["A", $("cmpA").value], ["B", $("cmpB").value]];
    cmpCtl = new AbortController(); $("cmpRun").textContent = "停止"; $("cmpHint").textContent = "兩種視角各回答一次，會用掉兩次的用量。";
    await Promise.all(sides.map(async ([s, pk]) => {
      const st = Object.assign({}, base, { persp: pk });
      $("cmpOut" + s).innerHTML = `<p class="hint">思考中…</p>`; $("cmpTitle" + s).textContent = perspName(st);
      const prompt = RULES + "\n\n" + styleText(st, "cmp") + "\n\n" + q;
      try {
        const res = await sample(prompt, { cache: false, signal: cmpCtl.signal, modelTier: st.tier, onText: ({ text }) => { $("cmpOut" + s).innerHTML = mdLite(text); } });
        $("cmpOut" + s).innerHTML = mdLite(res.text) + tierNote(st.tier, res.modelTierApplied) + tplWarnHtml(tplCheck(res.text, st, "res"), false);
      } catch (e) { $("cmpOut" + s).innerHTML = e && e.text ? mdLite(e.text) : `<p class="hint">${esc(ERR[e && e.code] || ERR.upstream_error)}</p>`; }
    }));
    cmpCtl = null; $("cmpRun").textContent = "比較這兩種視角";
  });
  // 回答下方的小字：實際回答的模型等級；格式檢查結果
  function tierNote(asked, applied) {
    if (!applied) return "";
    return `<p class="hint tier-note">由「${TIER[applied] || applied}」等級回答${applied !== asked ? `（你選的是「${TIER[asked] || asked}」，帳號方案不支援，平台改用這一級，品質可能不同）` : ""}</p>`;
  }
  function tplWarnHtml(chk, withBtn) {
    if (!chk) return "";
    const parts = [];
    if (chk.missing.length) parts.push("缺少「" + chk.missing.join("」「") + "」");
    if (!chk.order) parts.push("段落順序和樣板不同");
    return `<p class="tpl-warn">⚠ 格式不完整：${esc(parts.join("；"))}。${withBtn ? ` <button class="btn small" type="button" data-tplfix>依樣板重寫</button>` : ""}</p>`;
  }
  renderStyleUI();
