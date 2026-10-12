  // =====================================================================
  // 給初學者的說明：每組選項旁的「？」＋「新手模式」（試做：同等性 TOST 相關選項）
  // 內容是固定文字（不經 AI），四段：白話、什麼時候選、選錯會怎樣、醫材例子。推論標 *。
  // =====================================================================
  const HELP = {
    goal: { t: "檢定目的：差異 還是 同等性？",
      plain: "你想證明的是「不一樣」，還是「一樣」？",
      when: "要證明「有差、有改善」→ 差異。要證明「沒有變、和比對品一樣」→ 同等性（TOST），例如轉廠、換料、換設備、和 510(k) 比對品比較。",
      wrong: "用差異檢定得到「沒有顯著差異」，不能拿來證明一樣：樣本數少時，幾乎一定會得到「沒有顯著差異」。",
      eg: "轉廠後射出件內徑：要說明新廠和舊廠一樣 → 選同等性。" },
    rel: { t: "樣本關係：獨立 還是 成對？",
      plain: "兩組數據是不是「同一批東西」量出來的、可以一列一列對應。",
      when: "成對：同一支導管換廠前後各量一次、同一批樣品用兩台機器各量一次。獨立：舊廠抽 15 支、新廠另外抽 15 支，彼此沒有對應。",
      wrong: "成對資料選成獨立，樣品之間本來的差異會把要看的差異蓋掉，比較難判出結果*；獨立資料硬要配對，結果沒有意義。",
      eg: "同一批原料分兩半，一半在舊廠、一半在新廠加工 → 若能一一對應同一批原料，可以視為成對*。" },
    hypEqDelta: { t: "同等界限 Δ：差多少以內算「一樣」",
      plain: "實務上可以接受的最大差異。90% 信賴區間整條落在 −Δ～+Δ 之內，才判定同等。",
      when: "一定要在看數據之前決定，寫進試驗計畫書。依據可以是：臨床或功能需求、規格寬度的一部分、比對品本身批次間的變異、相關標準。",
      wrong: "看完數據才訂 Δ，等於讓結果決定標準，審查時會被質疑。Δ 訂太大一定判同等但沒意義；訂太小需要非常多樣本。",
      eg: "內徑規格 ±0.10 mm，取 Δ = ±0.02 mm（約公差的 20%）*，並寫明理由。" },
    alphaSel: { t: "顯著水準 α（同等性時）",
      plain: "把「其實不一樣」誤判成「一樣」的風險上限，每一邊各 α。",
      when: "一般用 0.05。同等性時 α = 0.05 等於看 90% 信賴區間（1 − 2α），這也是藥品生體相等性常用的做法。",
      wrong: "把 α 調成 0.10 會比較容易判定同等，但誤判風險跟著變大；α 要在試驗前決定，不能看結果再改。",
      eg: "轉廠驗證計畫書：「以 TOST、α = 0.05（90% 信賴區間）判定」。" },
    ci90: { t: "90% 信賴區間",
      plain: "真正的平均差「很可能」落在這個範圍。",
      when: "判讀：整條區間都在 −Δ～+Δ 之內 → 判定同等；只要有一端超出 → 不能宣稱同等。",
      wrong: "不要只看中間的平均差。平均差在 Δ 內、但區間很寬，代表資訊不夠（樣本太少或波動太大），還不能宣稱同等。",
      eg: "Δ = ±2、區間 −0.71～1.24 → 同等；Δ = ±1 → 上端 1.24 超出，不能宣稱同等。" },
    tostp: { t: "TOST p 值（兩個單尾檢定）",
      plain: "分別檢定「差異不低於 −Δ」與「差異不高於 +Δ」，各得一個 p，取較大的那個。",
      when: "兩個 p 都小於 α 才判定同等；結論和「90% 區間是否在 ±Δ 內」完全一致。",
      wrong: "不要和差異檢定的 p 值混在一起看：差異檢定 p 很大，不代表一樣。",
      eg: "下界 p = 0.0002、上界 p = 0.0026，都 < 0.05 → 判定同等。" },
    // ---- 樣本數規劃：同等性（TOST） ----
    eqDelta: { t: "差多少以內算「一樣」（± δ）",
      plain: "同等界限：新、舊的平均差在 ±δ 之內，就當作一樣。這是工程或臨床判斷，不是統計算出來的。",
      when: "在試驗前決定並寫下依據（下方「δ 的依據」）。可以參考規格寬度的一部分、功能或臨床影響、舊廠批次間的變異。",
      wrong: "δ 太大：一定判同等，但說服不了審查員；δ 太小：要測非常多個。不要為了少測幾個而放寬 δ。",
      eg: "內徑 ±0.10 mm 的規格，δ 取 0.02 mm*。" },
    eqBasis: { t: "δ 的依據",
      plain: "說明 δ 是怎麼來的，會寫進計畫書的樣本數理由。",
      when: "選最主要的依據，旁邊用一句話寫具體內容（例如「公差的 20%」「比對品 3 批的批間差」）。",
      wrong: "沒有依據的 δ，審查時最常被追問。",
      eg: "依據：規格；說明：內徑公差 0.20 mm 的 10%，δ = 0.02 mm*。" },
    eqSd: { t: "平常的波動有多大（σ）",
      plain: "這個特性本來的標準差，決定要測幾個：σ 越大，要測越多。",
      when: "用舊廠歷史數據、SPC 紀錄或預試驗估計；可以按「貼上舊數據幫我算」。成對比較時要用「兩次量測差值」的標準差。",
      wrong: "σ 估得太小 → 算出的數量不夠，量完後信賴區間太寬，即使真的一樣也判不出同等。",
      eg: "舊廠 SPC 近 3 個月內徑 σ ≈ 0.008 mm。" },
    eqD: { t: "比較方式：兩組獨立 還是 成對？",
      plain: "新、舊兩邊的樣品是不是可以一一對應。",
      when: "各自抽樣 → 兩組獨立；同一批料分兩邊做、同一件量兩次 → 成對。",
      wrong: "選錯會讓算出的數量不對；量完分析時也要用同一種方式。",
      eg: "新廠、舊廠各抽 n 支 → 兩組獨立。" },
    eqTrue: { t: "預期新、舊的真實差異",
      plain: "你預期兩邊實際上大概會差多少。",
      when: "不知道就填 0。若已知新廠會稍微偏一點，就填那個量。",
      wrong: "預期差異越接近 δ，需要的數量越多；等於或超過 δ 時，再多樣本也證明不了同等（程式會告訴你無法規劃）。",
      eg: "預試驗顯示新廠平均大 0.005 mm → 填 0.005。" },
    eqTol: { t: "規格公差寬度（選填）",
      plain: "只用來顯示 δ 佔公差的比例，幫你判斷 δ 合不合理，不影響樣本數。",
      when: "雙邊規格填上限減下限，例如 ±0.10 填 0.20。",
      wrong: "—",
      eg: "δ = 0.02、公差 0.20 → δ 佔 10%。" },
    eqAlpha: { t: "把「不一樣」誤判成「一樣」的風險（α）",
      plain: "消費者（使用者）承擔的風險；每一邊各 α。",
      when: "一般用 5%（對應 90% 信賴區間）。",
      wrong: "調大會少測幾個，但誤判成「一樣」的風險變大，計畫書要說明理由。",
      eg: "α = 5%、檢定力 90% 是常見組合*。" },
    eqPower: { t: "真的一樣時，能成功證明的把握（檢定力）",
      plain: "如果新、舊真的一樣，這次試驗能判定同等的機率。",
      when: "常用 80% 或 90%*。越高要測越多。",
      wrong: "檢定力太低，真的一樣也常常證明不了，試驗白做。",
      eg: "90% 表示真的一樣時，大約 10 次有 1 次會判不出同等。" }
  };
  // [說明 key, 要放「？」的標籤元素]
  const HELP_AT = [
    ["goal", "#goalBlock > .group-label"], ["rel", "#relBlock > .group-label"], ["hypEqDelta", 'label[for="hypEqDelta"]'], ["alphaSel", 'label[for="alphaSel"]'],
    ["eqDelta", 'label[for="eqDelta"]'], ["eqBasis", 'label[for="eqDelta"] ~ .eq-basis'], ["eqSd", 'label[for="eqSd"]'], ["eqD", 'label[for="eqD"]'],
    ["eqTrue", 'label[for="eqTrue"]'], ["eqTol", 'label[for="eqTol"]'], ["eqAlpha", 'label[for="eqAlpha"]'], ["eqPower", 'label[for="eqPower"]']
  ];
  const NOVICE_KEY = "mdqs.novice";
  let novice = false;
  try { const v = localStorage.getItem(NOVICE_KEY); novice = v === null ? (typeof curStyle === "function" && curStyle().persp === "teach") : v === "1"; } catch (_) {}
  const hq = k => `<button type="button" class="hq" data-help="${k}" aria-label="說明：${esc(HELP[k].t)}" title="這是什麼？">?</button>`;
  function helpDecorate(root) {
    root = root || document;
    HELP_AT.forEach(([k, sel]) => {
      const el = root.querySelector(sel); if (!el || el.querySelector(`.hq[data-help="${k}"]`) || el.dataset.hqDone === k) return;
      el.dataset.hqDone = k;
      if (el.classList.contains("eq-basis")) el.insertAdjacentHTML("afterbegin", `<span class="hq-wrap">${hq(k)}<span class="hint">δ 的依據</span></span>`);
      else el.insertAdjacentHTML("beforeend", " " + hq(k));
      const line = `<p class="nb-line" data-nb="${k}">${esc(HELP[k].plain)}</p>`;
      if (el.tagName === "LABEL" && el.parentElement.classList.contains("field")) el.parentElement.insertAdjacentHTML("beforeend", line);   // 放在欄位最下方，不打亂並排欄位的對齊
      else if (el.classList.contains("eq-basis")) el.insertAdjacentHTML("afterend", line);
      else el.insertAdjacentHTML("afterend", line);
    });
    // 結果區（同等性）
    const pb = $("previewBody");
    if (pb && pb.querySelector(".eqc")) pb.querySelectorAll(".kv > div > span").forEach(s => {
      const k = /信賴區間/.test(s.textContent) ? "ci90" : /TOST p/.test(s.textContent) ? "tostp" : null;
      if (k && !s.querySelector(".hq")) s.insertAdjacentHTML("beforeend", " " + hq(k));
    });
    noviceApply();
  }
  function noviceApply() {
    document.body.classList.toggle("novice", novice);
    document.querySelectorAll("[data-novice]").forEach(b => b.setAttribute("aria-pressed", String(novice)));
  }
  // 頁首加「新手模式」開關（假設檢定、樣本數規劃）
  ["viewAnalyze", "viewSample"].forEach(v => {
    const h = $(v) && $(v).querySelector(".tool-head"); if (!h) return;
    h.insertAdjacentHTML("beforeend", `<button type="button" class="chip nov-chip" data-novice="1" aria-pressed="false" title="開啟後，每組選項下方直接顯示白話說明">新手模式</button>`);
  });
  document.addEventListener("click", e => {
    const nb = e.target.closest("[data-novice]");
    if (nb) { novice = !novice; try { localStorage.setItem(NOVICE_KEY, novice ? "1" : "0"); } catch (_) {} noviceApply(); return; }
    const b = e.target.closest(".hq[data-help]");
    if (b) { e.preventDefault(); e.stopPropagation(); helpOpen(b); return; }
    const pop = $("helpPop");
    if (pop && !pop.hidden && !e.target.closest("#helpPop")) pop.hidden = true;
  }, true);
  document.addEventListener("keydown", e => { if (e.key === "Escape") { const p = $("helpPop"); if (p) p.hidden = true; } });
  function helpOpen(b) {
    const H = HELP[b.dataset.help]; if (!H) return;
    let pop = $("helpPop");
    if (!pop) { pop = document.createElement("div"); pop.id = "helpPop"; pop.className = "help-pop"; pop.setAttribute("role", "dialog"); document.body.appendChild(pop); }
    pop.innerHTML = `<div class="hp-head"><b>${esc(H.t)}</b><button type="button" class="hp-x" aria-label="關閉" onclick="this.closest('#helpPop').hidden=true">✕</button></div>
      <p class="hp-plain">${esc(H.plain)}</p>
      <dl><dt>什麼時候選／怎麼看</dt><dd>${esc(H.when)}</dd>${H.wrong && H.wrong !== "—" ? `<dt>選錯會怎樣</dt><dd>${esc(H.wrong)}</dd>` : ""}<dt>醫材例子</dt><dd>${esc(H.eg)}</dd></dl>
      <p class="hint">標 * 的是一般慣例或推論，請依公司程序判斷。</p>`;
    pop.hidden = false;
    const r = b.getBoundingClientRect(), W = Math.min(380, window.innerWidth - 24);
    pop.style.width = W + "px";
    let x = r.left + window.scrollX - 12; x = Math.max(12 + window.scrollX, Math.min(x, window.scrollX + window.innerWidth - W - 12));
    pop.style.left = x + "px"; pop.style.top = (r.bottom + window.scrollY + 8) + "px";
    const pr = pop.getBoundingClientRect(); if (pr.bottom > window.innerHeight - 8 && r.top > pr.height + 16) pop.style.top = (r.top + window.scrollY - pr.height - 8) + "px";
  }
  helpDecorate();
