  // =====================================================================
  // 樣本數規劃 → 假設檢定：把情境（選的題目、問題描述）、判定參數與數量帶過去
  // 只接有對應判定的題目：① t 檢定、② 同等性、④ 單組對目標值、⑧ 允差區間。
  // 帶過去的判定條件記為「計畫」；假設檢定執行時若條件被改，提醒並記入 AI 說明。
  // =====================================================================
  let ssPlanRef = null;   // { goal, rel, alt, alpha, eqd, k }
  function ssCtxText(extra) {
    const q = SSQ[ssCurQ], desc = ($("sampleProblem").value || "").trim();
    return [q ? "情境：" + q.title : "", extra || "", desc ? "描述：" + desc : ""].filter(Boolean).join("\n");
  }
  function ssFillProblem(text) {
    const tb = $("hypProblem"); if (!tb || !text) return;
    const cur = tb.value.trim();
    tb.value = !cur || tb.dataset.auto === tb.value || cur === text ? text : text + "\n（原本的描述）" + cur;
    tb.dataset.auto = tb.value; tb.dispatchEvent(new Event("input", { bubbles: true }));
    const src = $("hypProblemSrc"); if (src) src.textContent = "從樣本數規劃帶入，可直接修改";
  }
  function ss2hyp(kind) {
    if (kind === "power") {
      const r = pw.result; if (!r) return;
      const one = r.design !== "two", target = ssCurQ === "q4";
      const purpose = one && target ? "one" : "two", rel = one ? "paired" : "ind";
      const alt = r.alt === "two-sided" ? "two-sided" : "greater";
      const j = { purpose, relation: rel, groups: purpose === "one" ? ["樣品"] : one ? ["前", "後"] : ["A", "B"], n: r.n, alt, alpha: r.alpha, goal: "diff", eqd: null, target: null, lsl: null, usl: null };
      ssPlanRef = { goal: "diff", rel: purpose === "two" ? rel : "", alt, alpha: String(r.alpha), eqd: "", k: purpose === "one" ? 1 : 2 };
      ssFillProblem(ssCtxText(`樣本數規劃：t 檢定，σ = ${r.sd}、要偵測 Δ = ${fmtSig(r.delta, 6)}、檢定力 ${fmt(r.power * 100, 0)}%，${purpose === "one" ? "" : one ? "成對 " : "每組 "}n = ${r.n}`));
      PLANS.hyp.apply(j, "ss");
      pkHypNote(alt !== "two-sided" ? "單尾：方向預設為「第 1 組較大／大於目標」，請確認是否正確。" : "", purpose === "one" ? "單組對目標值：請在確認區填目標值。" : "");
    } else if (kind === "tost") {
      const m = TQ.tost; if (!m) return;
      const rel = m.design === "two" ? "ind" : "paired";
      const j = { purpose: "two", relation: rel, groups: ["新", "舊"], n: m.n, alt: "two-sided", alpha: m.alpha, goal: "equiv", eqd: m.delta, target: null, lsl: null, usl: null };
      ssPlanRef = { goal: "equiv", rel, alt: "", alpha: String(m.alpha), eqd: String(m.delta), k: 2 };
      const u = m.unit ? " " + m.unit : "";
      ssFillProblem(ssCtxText(`樣本數規劃：同等性（TOST），${m.name ? "特性 " + m.name + "，" : ""}δ = ±${m.delta}${u}${m.basisNote ? "（依據：" + m.basisNote + "）" : ""}、σ = ${m.sd}${u}、α = ${m.alpha}、把握 ${fmt(m.power * 100, 0)}%，${rel === "ind" ? "每組" : "成對"} n = ${m.n}`));
      PLANS.hyp.apply(j, "ss");
      pkHypNote("組別順序「新, 舊」：結果的平均差 = 新 − 舊，與樣本數規劃相同。");
    } else if (kind === "tolp") {
      const t = TQ.tolp; if (!t) return;
      ssPlanRef = null;
      ssFillProblem(ssCtxText(`樣本數規劃：允差區間，涵蓋 ${t.p * 100}%、信心 ${t.g * 100}%（${t.side === "two" ? "雙邊" : t.side === "lower" ? "單邊下限" : "單邊上限"}），建議量 n = ${t.n}`));
      closePanel(); route("hypothesis"); setSub("tol");
      pkClick(`#tlSide [data-v="${t.side === "two" ? "two" : t.side}"]`);
      pkSet("tlP", String(t.p), "change"); pkSet("tlG", String(t.g), "change");
      if (t.lsl != null && isFinite(t.lsl)) pkSet("tlLsl", t.lsl); if (t.usl != null && isFinite(t.usl)) pkSet("tlUsl", t.usl);
      $("tlHint").textContent = `已帶入樣本數規劃的條件。量完 ${t.n} 個後貼上數據，再按「計算」。`;
      $("tlPanel").scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }
  function pkHypNote(...xs) { const h = $("pkhHint"); if (h) { const add = xs.filter(Boolean).join(" "); if (add) h.textContent = (h.textContent ? h.textContent + " " : "") + add; } }
  // 假設檢定執行時：判定條件是否和帶過來的計畫不同
  function ssPlanDiff(k, paired) {
    const P = ssPlanRef; if (!P || P.k !== k) return [];
    const d = [], goal = state.goal === "equiv" && k <= 2 ? "equiv" : "diff";
    if (P.goal !== goal) d.push("檢定目的");
    if (k === 2 && P.rel && P.rel !== (paired ? "paired" : "ind")) d.push("樣本關係");
    if (goal === "diff" && P.alt && P.alt !== state.alt) d.push("對立假設");
    if (Number(P.alpha) !== Number($("alphaSel").value)) d.push("α");
    if (goal === "equiv" && P.eqd && Number(P.eqd) !== Number($("hypEqDelta").value)) d.push("同等界限 Δ");
    return d;
  }
  // 結果區加「帶到假設檢定」按鈕（只在有對應判定的題目）
  const SS2H = [["pwOut", "power", () => !!pw.result], ["eqOut", "tost", () => !!TQ.tost], ["tpOut", "tolp", () => !!TQ.tolp]];
  SS2H.forEach(([id, kind, ok]) => {
    const el = $(id); if (!el) return;
    const add = () => { if (!ok() || el.querySelector("[data-tohyp]")) return; el.insertAdjacentHTML("beforeend", `<div class="ss2hyp"><button type="button" class="btn primary small" data-tohyp="${kind}">帶到假設檢定 →</button><span class="hint">帶過去：情境、判定條件${kind === "tolp" ? "" : "與每組數量"}；量完在假設檢定判定</span></div>`); };
    new MutationObserver(add).observe(el, { childList: true });
  });
  document.addEventListener("click", e => { const b = e.target.closest("[data-tohyp]"); if (b) ss2hyp(b.dataset.tohyp); });
