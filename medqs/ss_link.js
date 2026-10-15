  // =====================================================================
  // 驗證項目 ↔ 樣本數規劃：每個勾選的驗證項目都要有「樣本數＋理由」（ISO 13485 §7.3.6）
  // 樣本數由本頁計算（AI 不產生）；理由由系統依參數產生，選定依據由使用者填寫。
  // 資料存在 fb.vplan[i].ss = { q, n, sum, why }，跟著魚骨圖存檔、案件存檔。
  // =====================================================================
  const SV_Q = [["", "請選擇"], ["q1", "① 改善後有沒有變好／兩組有沒有差"], ["q2", "② 變更後一樣嗎（同等性）"], ["q3", "③ 不會變差吧（不劣性）"], ["q4", "④ 平均有沒有達到目標值"], ["q5", "⑤ 全部通過才算（可靠度）"], ["q6", "⑥ 現有抽樣方案能宣稱什麼"], ["q7", "⑦ 不良率低於目標／兩組不良率"], ["q8", "⑧ 99% 產品落在規格內（允差區間）"], ["q9", "⑪ 實驗要重複幾次（DOE）"], ["q10", "⑫ MSA、SPC 要收多少"], ["q11", "⑨ 進料、出貨抽檢（AQL）"], ["rule", "依標準或公司程序規定"], ["none", "不需統計（寫理由）"]];
  const SV_MANUAL = { q10: 1, q11: 1, q12: 1, rule: 1, none: 1 };   // 本頁沒有可帶回的計算結果：自行填數量與理由
  const SV_TODO = "（請填：例如風險等級、失效嚴重度、公司程序或標準編號）";
  const svPct = (x, d) => (Math.round(x * 100 * Math.pow(10, d || 0)) / Math.pow(10, d || 0)) + "%";
  const svNum = x => (x == null || !isFinite(x) ? "—" : String(+(+x).toPrecision(6)));
  function svGuessQ(tool) {
    const t = String(tool || "");
    if (/不需統計|不用統計/.test(t)) return "none";
    if (/對目標/.test(t)) return "q4";
    if (/兩組獨立|兩組成對/.test(t)) return "q1";
    if (/同等/.test(t)) return "q2";
    if (/次數|不良率|卡方/.test(t)) return "q7";
    if (/允差/.test(t)) return "q8";
    if (/DOE|實驗設計/.test(t)) return "q9";
    if (/MSA|SPC|Gage|管制/.test(t)) return "q10";
    return "";
  }
  const svItems = () => (fb.vplan || []).filter(x => x.on);
  const svOk = x => { const s = x.ss; if (!s || !s.q) return false; if (s.q === "none") return !!(s.why || "").trim(); return !!String(s.n || "").trim() && !!(s.why || "").trim(); };
  const svNoBasis = x => x.ss && x.ss.q !== "none" && /（請填|＿＿/.test(x.ss.why || "");
  // 目前這一題的計算結果 → { n, sum, why }；沒有結果回傳 null
  function svResult(q) {
    const alt = a => a === "two-sided" ? "雙尾" : "單尾";
    if (q === "q1" || q === "q4") {
      const r = pw.result; if (!r || !isFinite(r.n)) return null;
      const two = r.design === "two", one = q === "q4" || r.design === "one", kind = two ? "兩組獨立 t 檢定" : one && q === "q4" ? "單組 t 檢定（對目標值）" : "成對 t 檢定";
      const n = two ? `每組 n = ${r.n}（共 ${2 * r.n}）` : `n = ${r.n}`;
      return { n, sum: `${kind}檢定力分析：σ = ${svNum(r.sd)}、要偵測差異 Δ = ${svNum(r.delta)}、α = ${r.alpha}（${alt(r.alt)}）、檢定力 ${svPct(r.power, 0)}`,
        why: `依${kind}的檢定力分析：σ = ${svNum(r.sd)}（來源：＿＿）、要偵測的最小差異 Δ = ${svNum(r.delta)}、α = ${r.alpha}（${alt(r.alt)}）、檢定力 ${svPct(r.power, 0)}，需 ${n}。\nΔ 與 σ 的選定依據：${SV_TODO}` };
    }
    if (q === "q2" || q === "q3") {
      const m = TQ[q === "q2" ? "tost" : "ni"]; if (!m || !isFinite(m.n)) return null;
      const two = m.design === "two", u = m.unit ? " " + m.unit : "", nm = q === "q2" ? "同等性（TOST）" : "不劣性";
      const n = two ? `每組 n = ${m.n}（共 ${2 * m.n}）` : `n = ${m.n} 對`;
      const d = q === "q2" ? `±${svNum(m.delta)}${u}` : `${svNum(m.delta)}${u}`;
      return { n, sum: `${nm}：δ = ${d}、σ = ${svNum(m.sd)}${u}、α = ${m.alpha}、檢定力 ${svPct(m.power, 0)}`,
        why: `依${nm}的樣本數計算（${two ? "兩組獨立" : "成對"}）：${m.name ? "特性 " + m.name + "，" : ""}可接受差異 δ = ${d}、σ = ${svNum(m.sd)}${u}、α = ${m.alpha}、檢定力 ${svPct(m.power, 0)}，需 ${n}。\nδ 的選定依據：${m.basisNote ? m.basisNote : SV_TODO}` };
    }
    if (q === "q5" || q === "q6") {
      const r = at.result; if (!r) return null;
      if (r.mode === "plan" && q === "q5") return { n: `n = ${r.n}，允許失效 ${r.c} 個`, sum: `成功試驗法（二項分布）：信心 ${svPct(r.C, 0)}／可靠度 ${svPct(r.R, 1)}、允許失效 ${r.c} 個`,
        why: `依成功試驗法（二項分布）：信心水準 ${svPct(r.C, 0)}、可靠度 ${svPct(r.R, 1)}、允許失效 ${r.c} 個，需測 ${r.n} 個，失效不超過 ${r.c} 個。\n信心與可靠度的選定依據：${SV_TODO}` };
      if (r.mode === "eval" && q === "q6") return { n: `n = ${r.n}，Ac = ${r.ac}`, sum: `現有抽樣方案 n = ${r.n}、Ac = ${r.ac}：${svPct(r.C, 0)} 信心可宣稱可靠度 ${svPct(r.rel, 1)}`,
        why: `採用現有抽樣方案 n = ${r.n}、允收數 Ac = ${r.ac}；以二項分布計算，${svPct(r.C, 0)} 信心下可宣稱可靠度 ${svPct(r.rel, 1)}。\n方案來源與可接受理由：${SV_TODO}` };
      return null;
    }
    if (q === "q7") {
      const r = TQ.prop; if (!r || !isFinite(r.n)) return null;
      if (r.d === "one") return { n: `n = ${r.n}`, sum: `單組不良率（精確二項）：目標 ${svPct(r.p0, 2)}、預期 ${svPct(r.p1, 2)}、α = ${r.a}、檢定力 ${svPct(r.power, 0)}`,
        why: `依單組不良率檢定（精確二項）：目標不良率 p₀ = ${svPct(r.p0, 2)}、預期實際不良率 p₁ = ${svPct(r.p1, 2)}、α = ${r.a}、檢定力 ${svPct(r.power, 0)}，需 n = ${r.n}。\np₀、p₁ 的選定依據：${SV_TODO}` };
      const n2 = Math.ceil(r.n * (r.ratio || 1));
      return { n: n2 === r.n ? `每組 n = ${r.n}（共 ${2 * r.n}）` : `n₁ = ${r.n}、n₂ = ${n2}`, sum: `兩組不良率比較：${svPct(r.p0, 2)} vs ${svPct(r.p1, 2)}、α = ${r.a}、檢定力 ${svPct(r.power, 0)}`,
        why: `依兩組不良率比較：預期不良率 ${svPct(r.p0, 2)} 與 ${svPct(r.p1, 2)}、α = ${r.a}、檢定力 ${svPct(r.power, 0)}，需 ${n2 === r.n ? "每組 " + r.n : "n₁ = " + r.n + "、n₂ = " + n2}。\n預期不良率的選定依據：${SV_TODO}` };
    }
    if (q === "q8") {
      const t = TQ.tolp; if (!t || !isFinite(t.n)) return null;
      const side = t.side === "two" ? "雙邊" : t.side === "lower" ? "單邊下限" : "單邊上限", np = t.m === "np";
      return { n: `n = ${t.n}`, sum: `統計允差區間（${np ? "無母數" : "常態"}，${side}）：涵蓋 ${svPct(t.p, 1)}、信心 ${svPct(t.g, 0)}`,
        why: `依統計允差區間（${np ? "無母數" : "常態"}，${side}）：涵蓋比例 ${svPct(t.p, 1)}、信心 ${svPct(t.g, 0)}${np ? "" : `；前期平均 ${svNum(t.mu)}、σ = ${svNum(t.sd)}`}，需 n = ${t.n}。\n涵蓋比例與信心的選定依據：${SV_TODO}` };
    }
    if (q === "q9") {
      const d = TQ.doer; if (!d || !isFinite(d.r)) return null;
      const N = d.runs * d.r + d.cp;
      return { n: `重複 ${d.r} 次（共 ${N} 次實驗）`, sum: `DOE 重複次數：每次重複 ${d.runs} 次、模型 ${d.terms} 項、Δ = ${svNum(d.delta)}、σ = ${svNum(d.sd)}、α = ${d.a}、檢定力 ${d.tgt}`,
        why: `依 DOE 效應的檢定力分析：每次重複 ${d.runs} 次實驗、模型項數 ${d.terms}、中心點 ${d.cp}、要偵測效應 Δ = ${svNum(d.delta)}、σ = ${svNum(d.sd)}、α = ${d.a}、檢定力 ${d.tgt}，需重複 ${d.r} 次（共 ${N} 次實驗）。\nΔ 與 σ 的選定依據：${SV_TODO}` };
    }
    return null;
  }
  const svManualWhy = q => q === "none" ? "" : q === "rule" ? `依＿＿（標準或公司程序編號、條次）規定的數量。` : q === "q10" ? `依＿＿（MSA 手冊或公司程序）建議的數量。` : q === "q11" ? `依 ISO 2859-1 抽樣方案：批量＿＿、檢驗水準＿＿、AQL＿＿ → n＿＿、Ac＿＿。\nAQL 的選定依據：${SV_TODO}` : "";

  // ---------------- 清單（樣本數規劃頁最上面） ----------------
  let svCur = "";   // 正在規劃的驗證項目 id
  function svRender() {
    const box = $("svList"); if (!box) return;
    if (box.contains(document.activeElement) && /^(TEXTAREA|INPUT)$/.test(document.activeElement.tagName)) return;
    const L = svItems();
    if (!L.length) { box.hidden = true; svBar(); return; }
    box.hidden = false;
    const nOk = L.filter(svOk).length;
    const cell = x => {
      const s = x.ss || {};
      if (s.q === "none") return s.why ? `<span class="sv-na">不需統計</span><div class="sv-why">${esc(s.why)}</div>` : `<span class="sv-no">請寫理由</span>`;
      if (!svOk(x)) return `<span class="sv-no">尚未規劃</span>`;
      return `<span class="sv-ok">${esc(s.n)}</span><div class="sv-why">${esc(s.sum || s.why.split("\n")[0])}</div>${svNoBasis(x) ? `<div class="sv-warn">理由還有空白（＿＿）或「請填」沒寫</div>` : ""}`;
    };
    box.innerHTML = `<h3>驗證項目的樣本數（魚骨圖 STEP 3 勾選的 ${L.length} 項）</h3><p class="help" style="margin:0">每一項選「要證明什麼」，再按「規劃」算出樣本數；數量與理由會帶進 PDCA 報告第 4 段。</p>
      <div class="scroll-x"><table class="sv-tbl"><thead><tr><th>驗證項目</th><th class="sv-qc">要證明什麼</th><th class="sv-rc">樣本數與理由</th><th class="sv-bc"></th></tr></thead><tbody>${L.map(x => {
        const s = x.ss || {}, q = s.q != null ? s.q : svGuessQ(x.tool), act = svCur === x.id;
        return `<tr class="${act ? "sv-act" : ""}"><td>${esc(x.cause || "（未命名）")}${x.tool ? `<div class="sv-why">策略：${esc(x.tool)}</div>` : ""}</td>
          <td><select data-svq="${x.id}" aria-label="要證明什麼">${SV_Q.map(o => `<option value="${o[0]}"${o[0] === q ? " selected" : ""}>${o[1]}</option>`).join("")}</select></td>
          <td>${cell(x)}</td><td><button type="button" class="sv-btn${svOk(x) ? "" : " p"}" data-svgo="${x.id}"${q ? "" : " disabled"}>${act ? "規劃中…" : svOk(x) ? (SV_MANUAL[q] ? "修改" : "重算") : (SV_MANUAL[q] ? "填寫 →" : "規劃 →")}</button></td></tr>`;
      }).join("")}</tbody></table></div>
      <p class="hint" style="margin:6px 0 0">已完成 ${nOk}／${L.length}。${nOk < L.length ? "全部完成後，流程列「④ 樣本數」才會打勾。" : "全部完成。"}</p>`;
    svBar();
  }
  // ---------------- 規劃中的提示列（頁面底部固定） ----------------
  function svBar() {
    const bar = $("svBar"); if (!bar) return;
    const x = svItems().find(y => y.id === svCur);
    if (!x) { bar.hidden = true; svCur = ""; return; }
    if (bar.contains(document.activeElement) && /^(TEXTAREA|INPUT)$/.test(document.activeElement.tagName)) return;
    const s = x.ss || {}, q = s.q, man = !!SV_MANUAL[q], qt = (SV_Q.find(o => o[0] === q) || ["", ""])[1];
    const r = man ? null : svResult(q);
    const prevWhy = s.q === q && s.why ? s.why : "";
    const why = man ? (prevWhy || (q === "none" ? [String(x.tool || "").replace(/^不用統計－|^（不需統計：|）$/g, ""), x.method].filter(Boolean).join("：") : svManualWhy(q))) : r ? (s.q === q && s.auto === r.why && prevWhy ? prevWhy : r.why) : "";
    bar.dataset.auto = r ? r.why : "";
    bar.innerHTML = `<div class="sv-bar-h"><b>正在為「${esc(x.cause || "未命名")}」規劃樣本數</b><span class="sv-why">（${esc(qt)}）</span><button type="button" class="sv-btn" data-svcancel="1">取消</button></div>
      ${man ? `${q === "none" ? "" : `<div class="sv-row"><label for="svN">樣本數</label><input id="svN" type="text" value="${esc(s.q === q ? s.n || "" : "")}" placeholder="例如：n = 10（每批 10，共 3 批）"></div>`}
        <label class="group-label" for="svWhy">${q === "none" ? "不需統計的理由（必填）" : "樣本數理由（必填）"}</label><textarea id="svWhy" rows="3" placeholder="${q === "none" ? "例如：文件審查，非抽樣試驗" : ""}">${esc(why)}</textarea>`
      : r ? `<p class="sv-got">算出：<b>${esc(r.n)}</b>　<span class="sv-why">${esc(r.sum)}</span></p>
        <label class="group-label" for="svWhy">樣本數理由（系統依你的設定產生，可修改；「選定依據」請自己填）</label><textarea id="svWhy" rows="3">${esc(why)}</textarea>`
      : `<p class="sv-got">請在下方設定條件後按「計算」，算完這裡會出現樣本數與理由。</p>`}
      ${man || r ? `<div class="sv-bar-f"><span class="hint" id="svHint"></span><button type="button" class="sv-btn p" data-svsave="1">帶回驗證項目</button></div>` : ""}`;
    bar.hidden = false;
  }
  function svOnResult() { try { if (svCur) svBar(); } catch (_) {} }
  function svSave() {
    const x = svItems().find(y => y.id === svCur); if (!x) return;
    const q = (x.ss || {}).q, man = !!SV_MANUAL[q], why = ($("svWhy") ? $("svWhy").value : "").trim(), h = $("svHint");
    if (!why) { if (h) h.textContent = "理由必須填寫。"; return; }
    if (man) {
      const n = q === "none" ? "" : ($("svN") ? $("svN").value : "").trim();
      if (q !== "none" && !n) { if (h) h.textContent = "請填樣本數。"; return; }
      x.ss = { q, n, sum: q === "none" ? "" : why.split("\n")[0].slice(0, 80), why };
    } else {
      const r = svResult(q); if (!r) return;
      x.ss = { q, n: r.n, sum: r.sum, why, auto: r.why };
    }
    const name = x.cause; svCur = ""; fbSave(); svRender(); try { pdcaRender(); } catch (_) {}
    try { flowRender(); } catch (_) {}
    const box = $("svList"); if (box) box.scrollIntoView({ behavior: "smooth", block: "start" });
    try { fbNote(`已把「${name}」的樣本數與理由帶回驗證項目。`); } catch (_) {}
  }
  (function svInit() {
    const box = $("svList"), bar = $("svBar"); if (!box || !bar) return;
    box.addEventListener("change", e => {
      const s = e.target.closest("[data-svq]"); if (!s) return;
      const x = svItems().find(y => y.id === s.dataset.svq); if (!x) return;
      const old = x.ss || {}; x.ss = old.q === s.value ? old : { q: s.value, n: "", sum: "", why: "" };
      if (svCur === x.id) svCur = ""; fbSave(); svRender(); try { pdcaRender(); } catch (_) {}
    });
    box.addEventListener("click", e => {
      const b = e.target.closest("[data-svgo]"); if (!b) return;
      const x = svItems().find(y => y.id === b.dataset.svgo); if (!x) return;
      const sel = box.querySelector(`[data-svq="${x.id}"]`), q = sel ? sel.value : ""; if (!q) return;
      if (!x.ss || x.ss.q !== q) x.ss = { q, n: "", sum: "", why: "" };
      svCur = x.id; svRender();
      if ((!SV_MANUAL[q] || q === "q10") && SSQ[q]) ssPick(q);
      else bar.scrollIntoView({ behavior: "smooth", block: "end" });
    });
    bar.addEventListener("click", e => {
      if (e.target.closest("[data-svcancel]")) { svCur = ""; svRender(); return; }
      if (e.target.closest("[data-svsave]")) svSave();
    });
    svRender();
  })();
