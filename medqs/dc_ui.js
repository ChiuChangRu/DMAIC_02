  // =====================================================================
  // 「差異比較」頁：選問題 → ① 規劃數量 → ② 記錄表 → ③ 判定（一次只顯示一個階段；設定只填一次）
  // 計算全部在 sample.js（SS）與 stats.js（HT）；這裡只處理介面與條件的串接。
  // =====================================================================
  const DCQ = {
    diff: { label: "① 兩邊有沒有差？", short: "兩邊有沒有差", purpose: "two", note: "找原因、驗證改善效果（證明有差）。要證明「一樣」請改選 ②。" },
    equiv: { label: "② 變更後一樣嗎？", short: "變更後一樣嗎", purpose: "two", note: "轉廠、換料、換設備：證明相當（同等性 TOST），不能用 p > 0.05 證明一樣。" },
    noninf: { label: "③ 換了不會變差吧？", short: "換了不會變差", purpose: "two", note: "只在意不能變差（不劣性，單邊）；方向要在試驗前決定。" },
    target: { label: "④ 平均達到目標值？", short: "平均達到目標值", purpose: "one", note: "單組對目標值；成對資料（同一件前後量）請選 ① 並在規劃選「單組或成對」。" },
    multi: { label: "⑤ 三組以上有沒有差？", short: "三組以上有沒有差", purpose: "multi", note: "3 組以上沒有專用的數量計算；可先用 ① 以「最在意的兩組差異」估算每組數量*。量完後做整體檢定，有差再看兩兩比較。" }
  };
  const DC = { q: "", stage: 1, locked: true, refOpen: false };
  const dcEl = (tag, cls, html) => { const d = document.createElement(tag); if (cls) d.className = cls; if (html != null) d.innerHTML = html; return d; };
  (() => {
    const tabs = $("hypTabs"), vs = $("viewSample");
    const qCard = dcEl("section", "card dc-qcard", `<div class="group-label">你要回答什麼問題？</div><div class="dc-qs" role="group" aria-label="要回答的問題">${Object.entries(DCQ).map(([k, d]) => `<button type="button" class="dc-qb" data-dq="${k}" aria-pressed="false">${d.label}</button>`).join("")}</div><p class="hint" id="dcQNote">先選問題；已經有數據、只要判定，選好問題後直接按「③ 判定」。可靠度、抽樣方案、不良率、允差區間等數量在「樣本數規劃」頁。</p>`);
    qCard.id = "dcQ";
    const bar = dcEl("div", "dc-stages", [1, 2, 3].map(n => `<button type="button" class="dc-st" data-stage="${n}"><b>${["", "① 規劃數量", "② 記錄表", "③ 判定"][n]}</b><small id="dcSt${n}Sub"></small></button>`).join("")); bar.id = "dcStages"; bar.hidden = true;
    const sum = dcEl("div", "dc-sum"); sum.id = "dcSum"; sum.hidden = true;
    const st1 = dcEl("div", "dc-stage"); st1.id = "dcSt1"; st1.hidden = true;
    const st2 = dcEl("div", "dc-stage"); st2.id = "dcSt2"; st2.hidden = true;
    const st3 = dcEl("div", "dc-stage"); st3.id = "dcSt3";
    tabs.before(qCard, bar, sum, st1, st2, st3);
    // ① 規劃數量：計量型（t 檢定）、同等性、不劣性的計算，從樣本數規劃頁移過來
    [vs.querySelector('[data-tview="power"]'), vs.querySelector('[data-tview="tost"]'), vs.querySelector('[data-tview="ni"]')].forEach(v => { v.dataset.dcview = v.dataset.tview; v.removeAttribute("data-tview"); v.hidden = true; st1.append(v); });
    const multi = dcEl("section", "card", `<h3>三組以上：每組要測幾個</h3><p class="help">${DCQ.multi.note}</p><div class="run-row"><button type="button" class="btn small" id="dcMultiUse">用 ① 的計算估算每組數量</button></div>`); multi.dataset.dcview = "multi"; multi.hidden = true; st1.append(multi);
    st1.append(dcEl("div", "run-row dc-next", `<button type="button" class="btn primary" data-go-stage="2">下一步：記錄表 →</button><span class="hint">沒有要規劃數量也可以直接到下一步</span>`));
    // ② 記錄表
    st2.append(dcEl("section", "card", `<span class="qref">記錄表</span><h2 class="q" style="margin-top:6px">組別與每組數量</h2>
      <p class="help">每組數量由「① 規劃數量」的計算帶入，可以修改。產生記錄表 → 填入量測值 → 帶入判定；統計全部由程式計算。</p>
      <div class="fields">
        <div class="field"><label for="dcGroups">組別名稱（逗號分隔，第 1 組＝現行、第 2 組＝新）</label><input id="dcGroups" type="text" autocomplete="off" value="A, B"></div>
        <div class="field"><label for="dcN" id="dcNLab">每組數量</label><input id="dcN" type="number" min="3" max="500" step="1" value="10" inputmode="numeric"><small id="dcNHelp"></small></div>
        <div class="field" id="dcRelF"><label for="dcRel">比較方式</label><select id="dcRel"><option value="ind">兩組獨立（各自抽樣）</option><option value="paired">成對（同一件量兩次、同一批料分兩邊做）</option></select></div>
        <div class="field" id="dcTargetF" hidden><label for="dcTarget">目標值</label><input id="dcTarget" type="number" step="any" inputmode="decimal" placeholder="必填"></div>
        <div class="field"><label for="dcLsl">規格下限（選填）</label><input id="dcLsl" type="number" step="any" inputmode="decimal"></div>
        <div class="field"><label for="dcUsl">規格上限（選填）</label><input id="dcUsl" type="number" step="any" inputmode="decimal"></div>
      </div>
      <ul class="mp-check" id="dcRecCheck"></ul>
      <div class="run-row"><button type="button" class="btn primary" id="dcGen">產生記錄表</button><span class="hint" id="dcRecHint"></span></div>
      <div id="dcSheet" hidden></div>`));
    st2.append(dcEl("div", "run-row dc-next", `<button type="button" class="btn primary" data-go-stage="3">下一步：判定 →</button><span class="hint">已經有數據，可以直接到「③ 判定」貼上</span>`));
    // ③ 判定：原本的比較檢定
    st3.append($("subCompare"));
    const judge = dcEl("section", "card dc-judge"); judge.id = "dcJudge"; judge.hidden = true; judge.dataset.ask = "判定";
    $("subCompare").querySelector(".grid").append(judge);
    // 統計允差區間移到樣本數規劃 ⑨
    const tolView = vs.querySelector('[data-tview="tolp"]'), tol = $("subTol");
    tolView.append(dcEl("div", "dc-step", `<span class="ss-step">✓</span><b>量完後：統計允差區間判定</b><span class="hint">貼上量測值，計算允差區間是否落在規格內</span>`), tol); tol.hidden = false;
  })();

  // ---------------- 問題、階段、摘要 ----------------
  function dcPlan() {
    const q = DC.q;
    if (q === "diff" || q === "target") {
      const r = pw.result; if (!r || r.solve !== "n") return null;
      if (q === "target" && r.design !== "one") return null;
      return { kind: "power", n: r.n, sd: r.sd, alpha: r.alpha, alt: r.alt, design: r.design === "two" ? "two" : q === "target" ? "one" : "paired", delta: r.delta };
    }
    if (q === "equiv" || q === "noninf") {
      const r = TQ[q === "equiv" ? "tost" : "ni"]; if (!r) return null;
      return { kind: q === "equiv" ? "tost" : "ni", n: r.n, sd: r.sd, alpha: r.alpha, alt: "two-sided", design: r.design === "two" ? "two" : "paired", delta: r.delta, dir: r.dir, name: r.name, unit: r.unit, basis: r.basis, basisNote: r.basisNote };
    }
    return null;
  }
  function dcStage(n, noScroll) {
    DC.stage = n;
    [1, 2, 3].forEach(k => { $("dcSt" + k).hidden = k !== n; });
    $("dcStages").querySelectorAll("[data-stage]").forEach(b => b.setAttribute("aria-selected", String(+b.dataset.stage === n)));
    if (n === 3) dcApplySettings();
    dcSummary();
    if (!noScroll) $("dcStages").scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function dcPick(q, opts) {
    if (!DCQ[q]) return; opts = opts || {};
    DC.q = q;
    $("dcQ").querySelectorAll("[data-dq]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.dq === q)));
    $("dcQNote").textContent = DCQ[q].note;
    const view = q === "diff" || q === "target" ? "power" : q === "equiv" ? "tost" : q === "noninf" ? "ni" : "multi";
    $("dcSt1").querySelectorAll("[data-dcview]").forEach(v => { v.hidden = v.dataset.dcview !== view; });
    if (view === "power" && !opts.keep) { pkClick(`#pwDesign [data-v="${q === "target" ? "one" : "two"}"]`); pkClick('#pwSolve [data-v="n"]'); }
    $("dcStages").hidden = false; $("dcSum").hidden = false;
    DC.locked = true;
    dcSyncRecord();
    if (!opts.keepStage) dcStage(1, opts.noScroll);
    dcAfterRun();
  }
  function dcSummary() {
    const p = dcPlan(), q = DCQ[DC.q]; if (!q) return;
    const dz = { two: "兩組獨立", paired: "成對", one: "單組對目標值" };
    const parts = [`<b>${esc(q.label)}</b>`];
    if (p) {
      if (p.name) parts.push(`<b>${esc(p.name)}</b>`);
      parts.push(dz[p.design] || "");
      const u = p.unit ? " " + esc(p.unit) : "";
      if (p.kind === "tost") parts.push(`δ = <b>±${nf(p.delta)}${u}</b>${p.basis ? `（依據：${esc(EQ_BASIS.find(o => o[0] === p.basis)[1])}）` : "（未填依據）"}`);
      else if (p.kind === "ni") parts.push(`δ = <b>${nf(p.delta)}${u}</b>（${p.dir === "lower" ? "越小越好" : "越大越好"}）`);
      else parts.push(`要抓到的差異 Δ = ${nf(p.delta)}`);
      parts.push(`σ = ${nf(p.sd)}${u}`, `${p.design === "two" ? "每組" : ""} <b>${p.n}</b> ${p.design === "paired" ? "對" : "件"}`, `α = ${p.alpha}`);
    } else parts.push(`<span class="hint">尚未規劃數量</span>`);
    $("dcSum").innerHTML = parts.join("｜") + `<button type="button" class="dc-edit" data-go-stage="1">修改 ✎</button>`;
    $("dcSt1Sub").textContent = p ? (p.design === "two" ? `各量 ${p.n} 件` : p.design === "paired" ? `${p.n} 對` : `${p.n} 件`) : DC.q === "multi" ? "手動決定" : "尚未計算";
    const prog = $("dcSheet").querySelector(".pk-prog");
    $("dcSt2Sub").textContent = !$("dcSheet").hidden && prog ? prog.textContent : "尚未產生";
    $("dcSt3Sub").textContent = dcLast ? (dcLast.r.ok ? (dcLast.kind === "tost" ? "同等" : "沒有變差") : (dcLast.kind === "tost" ? "不能宣稱同等" : "不能宣稱沒有變差")) : state.result ? "已分析" : "尚未判定";
  }
  $("dcQ").addEventListener("click", e => { const b = e.target.closest("[data-dq]"); if (b) dcPick(b.dataset.dq); });
  $("viewAnalyze").addEventListener("click", e => { const b = e.target.closest("[data-go-stage]"); if (b) dcStage(+b.dataset.goStage); });
  $("dcStages").addEventListener("click", e => { const b = e.target.closest("[data-stage]"); if (b) dcStage(+b.dataset.stage); });
  $("dcMultiUse").addEventListener("click", () => { dcPick("diff"); $("pwHint").textContent = "以最在意的兩組差異估算每組數量；算完後回到 ⑤ 三組以上，在記錄表把組數加到 3 組以上*。"; });

  // ---------------- ② 記錄表 ----------------
  function dcSyncRecord() {
    const q = DCQ[DC.q]; if (!q) return "";
    const p = dcPlan(), g = $("dcGroups"), rel = $("dcRel");
    $("dcRelF").hidden = q.purpose !== "two"; $("dcTargetF").hidden = q.purpose !== "one";
    $("dcNLab").textContent = q.purpose === "two" && rel.value === "paired" ? "配對數" : q.purpose === "one" ? "樣本數" : "每組數量";
    const names = String(g.value).split(/[,，、]+/).map(x => x.trim()).filter(Boolean), defaults = ["A, B", "現行, 新", "樣本", "A, B, C"];
    const want = DC.q === "equiv" || DC.q === "noninf" ? "現行, 新" : q.purpose === "one" ? "樣本" : q.purpose === "multi" ? "A, B, C" : "A, B";
    if (defaults.includes(names.join(", ")) || (q.purpose === "one" && names.length !== 1) || (q.purpose === "two" && names.length !== 2) || (q.purpose === "multi" && names.length < 3)) g.value = want;
    let msg = "";
    if (p) {
      if (q.purpose === "two") rel.value = p.design === "paired" ? "paired" : "ind";
      if (+$("dcN").value !== Math.min(500, p.n)) { $("dcN").value = Math.min(500, Math.max(3, p.n)); msg = `已帶入「② 記錄表」：${p.design === "two" ? `每組 ${p.n} 件` : p.design === "paired" ? `${p.n} 對` : `${p.n} 件`}。`; }
      $("dcNHelp").textContent = `規劃建議 ${p.n}${p.n > 500 ? "（記錄表上限 500，請分批）" : ""}`;
    } else $("dcNHelp").textContent = "";
    dcRecCheck();
    return msg;
  }
  function dcRecModel() {
    const q = DCQ[DC.q] || DCQ.diff, p = dcPlan();
    return Object.assign({}, PLANS.hyp._def, {
      purpose: q.purpose, relation: $("dcRel").value, groups: $("dcGroups").value, n: Math.round(+$("dcN").value) || 0,
      alt: p && p.kind === "power" && p.alt !== "two-sided" ? "greater" : "two-sided",
      alpha: p && p.kind === "power" ? (p.alpha === 0.01 ? "0.01" : p.alpha === 0.1 ? "0.10" : "0.05") : "0.05",
      target: $("dcTarget").value.trim(), lsl: $("dcLsl").value.trim(), usl: $("dcUsl").value.trim()
    });
  }
  function dcRecCheck() {
    const ck = PLANS.hyp ? PLANS.hyp._check(dcRecModel()).filter(x => !/樣本數規劃/.test(x.m)) : [];
    $("dcRecCheck").innerHTML = pkCheckHtml(ck); $("dcGen").disabled = ck.some(x => x.lv === "bad");
    return ck;
  }
  ["dcGroups", "dcN", "dcRel", "dcTarget", "dcLsl", "dcUsl"].forEach(id => $(id).addEventListener("input", () => { if (id === "dcRel") dcSyncRecord(); dcRecCheck(); }));
  $("dcRel").addEventListener("change", () => { dcSyncRecord(); });
  $("dcGen").addEventListener("click", () => {
    if (dcRecCheck().some(x => x.lv === "bad")) return;
    const hint = $("dcRecHint");
    const ui = {
      sheet: $("dcSheet"),
      note: (m, bad) => { hint.innerHTML = m ? (bad ? `<span class="status ng">${esc(m)}</span>` : esc(m)) : ""; if (/已帶入並分析/.test(m || "")) { dcStage(3); } dcSummary(); },
      ask: (m, opts) => { if (window.confirm(m)) { const o = opts[0]; if (o && o.fn) o.fn(); } }
    };
    const r = PLANS.hyp._go(dcRecModel(), ui); if (r) ui.note(r.msg || "", r.bad);
    $("dcSheet").addEventListener("input", dcSummary);
  });

  // ---------------- ③ 判定：設定沿用規劃 ----------------
  function dcStep2() { return $("panel").querySelectorAll(":scope > .step")[1]; }
  function dcApplySettings() {
    const q = DCQ[DC.q], st = dcStep2(); if (!st) return;
    let line = st.querySelector(".dc-lockline");
    if (!q) { st.classList.remove("dc-locked"); if (line) line.remove(); return; }
    const m = dcRecModel();
    if (q.purpose === "two" && state.mode !== m.relation) pkClick(`#modeChips [data-mode="${m.relation}"]`);
    if (q.purpose !== "multi") pkClick(`#altChips [data-alt="${m.alt}"]`);
    pkSet("alphaSel", m.alpha, "change");
    if (q.purpose === "one") pkSet("target", m.target); else pkSet("target", "");
    if (m.lsl !== "" || $("lsl").value === "") pkSet("lsl", m.lsl); if (m.usl !== "" || $("usl").value === "") pkSet("usl", m.usl);
    const locked = DC.locked && !(q.purpose === "one" && m.target === "");
    if (!line) { line = dcEl("div", "dc-lockline"); st.prepend(line); }
    line.innerHTML = `<b>設定沿用規劃：</b>${q.purpose === "two" ? (m.relation === "paired" ? "成對" : "兩組獨立") + "・" : q.purpose === "one" ? `目標值 ${esc(m.target || "未填")}・` : "3 組以上・"}${m.alt === "two-sided" ? "雙尾" : "單尾"}・α ${m.alpha}${m.lsl || m.usl ? `・規格 ${esc(m.lsl || "—")}～${esc(m.usl || "—")}` : ""} <button type="button" class="linkbtn" id="dcUnlock">${locked ? "修改設定" : "收起設定"}</button>`;
    st.classList.toggle("dc-locked", locked);
    line.querySelector("#dcUnlock").onclick = () => { DC.locked = !locked; dcApplySettings(); };
  }

  // ---------------- ③ 判定：結果 ----------------
  function dcBox(data, names, dec) {
    const all = [].concat(...data), lo = Math.min(...all), hi = Math.max(...all), pad = (hi - lo) * 0.08 || 1, sc = niceScale(lo - pad, hi + pad, 5);
    const W = 560, rowH = 40, H = 30 + rowH * data.length, L = 70, R = 16, X = v => L + (v - sc.lo) / (sc.hi - sc.lo) * (W - L - R);
    const q = (a, p) => HT.quantile(a.slice().sort((u, v) => u - v), p);
    let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="箱型圖與數據點">`;
    for (const t of sc.ticks) s += `<line x1="${X(t)}" x2="${X(t)}" y1="6" y2="${H - 22}" stroke="var(--grid)"/><text x="${X(t)}" y="${H - 6}" text-anchor="middle" font-size="11" fill="var(--muted)" font-family="var(--font-mono)">${+t.toFixed(Math.min(dec, 6))}</text>`;
    data.forEach((a, i) => {
      const y = 22 + i * rowH, col = i === 0 ? "var(--muted)" : "var(--chart-a)", q1 = q(a, 0.25), q3 = q(a, 0.75), md = q(a, 0.5), iqr = q3 - q1;
      const wl = Math.min(...a.filter(v => v >= q1 - 1.5 * iqr)), wh = Math.max(...a.filter(v => v <= q3 + 1.5 * iqr));
      s += `<text x="${L - 8}" y="${y + 4}" text-anchor="end" font-size="12" fill="var(--ink)">${esc(String(names[i]).slice(0, 8))}</text>`;
      s += `<line x1="${X(wl)}" x2="${X(wh)}" y1="${y}" y2="${y}" stroke="${col}"/><rect x="${X(q1)}" y="${y - 9}" width="${Math.max(1, X(q3) - X(q1))}" height="18" fill="var(--surface)" stroke="${col}"/><line x1="${X(md)}" x2="${X(md)}" y1="${y - 9}" y2="${y + 9}" stroke="${col}" stroke-width="2.5"/>`;
      a.forEach((v, j) => { s += `<circle cx="${X(v)}" cy="${y + ((j * 7919) % 13) - 6}" r="3.2" fill="${col}" fill-opacity=".7"/>`; });
    });
    return s + "</svg>";
  }
  function dcCiSvg(r, kind) {
    const D = r.delta, ni = kind === "ni", lower = ni && r.dir === "lower";
    const lo = ni ? (lower ? r.d - (r.bound - r.d) : r.bound) : r.lo, hi = ni ? (lower ? r.bound : r.d + (r.d - r.bound)) : r.hi;
    const span = Math.max(1.6 * D, Math.abs(lo) * 1.15, Math.abs(hi) * 1.15), W = 560, L = 30, R = 30, X = v => L + (v + span) / (2 * span) * (W - L - R), cy = 62;
    let s = `<svg viewBox="0 0 ${W} 150" role="img" aria-label="信賴區間與可接受範圍">`;
    s += ni ? (lower ? `<rect x="${X(-span)}" y="22" width="${X(D) - X(-span)}" height="78" fill="var(--good)" fill-opacity=".12"/>` : `<rect x="${X(-D)}" y="22" width="${X(span) - X(-D)}" height="78" fill="var(--good)" fill-opacity=".12"/>`) : `<rect x="${X(-D)}" y="22" width="${X(D) - X(-D)}" height="78" fill="var(--good)" fill-opacity=".12"/>`;
    const marks = ni ? [[lower ? D : -D, lower ? "+δ" : "−δ"]] : [[-D, "−δ"], [D, "+δ"]];
    marks.forEach(([v, t]) => { s += `<line x1="${X(v)}" x2="${X(v)}" y1="18" y2="104" stroke="var(--good)" stroke-width="2" stroke-dasharray="6 4"/><text x="${X(v)}" y="14" text-anchor="middle" font-size="12" font-weight="700" fill="var(--good)">${t} = ${v < 0 ? "−" : "+"}${nf(D, 4)}</text>`; });
    s += `<line x1="${X(0)}" x2="${X(0)}" y1="22" y2="104" stroke="var(--muted)"/><line x1="${L}" x2="${W - R}" y1="104" y2="104" stroke="var(--line)"/>`;
    const col = r.ok ? "var(--chart-a)" : "var(--bad)";
    if (ni) s += lower ? `<line x1="${L}" x2="${X(r.bound)}" y1="${cy}" y2="${cy}" stroke="${col}" stroke-width="6" stroke-dasharray="2 6"/><line x1="${X(r.d)}" x2="${X(r.bound)}" y1="${cy}" y2="${cy}" stroke="${col}" stroke-width="6" stroke-linecap="round"/>` : `<line x1="${X(r.bound)}" x2="${W - R}" y1="${cy}" y2="${cy}" stroke="${col}" stroke-width="6" stroke-dasharray="2 6"/><line x1="${X(r.bound)}" x2="${X(r.d)}" y1="${cy}" y2="${cy}" stroke="${col}" stroke-width="6" stroke-linecap="round"/>`;
    else s += `<line x1="${X(r.lo)}" x2="${X(r.hi)}" y1="${cy}" y2="${cy}" stroke="${col}" stroke-width="6" stroke-linecap="round"/>`;
    s += `<circle cx="${X(r.d)}" cy="${cy}" r="7" fill="var(--surface)" stroke="${col}" stroke-width="3"/><text x="${X(0)}" y="122" text-anchor="middle" font-size="12" fill="var(--muted)">0</text><text x="${(L + W - R) / 2}" y="142" text-anchor="middle" font-size="12" fill="var(--muted)">平均差（第 2 組 − 第 1 組）</text>`;
    return s + "</svg>";
  }
  function dcPlanCompare(p, paired, n1, n2, s, unit) {
    if (!p) return "";
    const u = unit ? " " + unit : "", short = paired || p.design === "one" ? n1 < p.n : Math.min(n1, n2) < p.n, rows = [];
    rows.push(`<tr><td>樣本數</td><td class="num">${p.design === "two" ? "每組 " + p.n : p.n}</td><td class="num">${p.design === "two" ? n1 + "／" + n2 : n1}</td><td>${short ? `<span class="status ng">少於規劃</span>` : `<span class="status ok">符合</span>`}</td></tr>`);
    if (isFinite(s)) { const ratio = s / p.sd; rows.push(`<tr><td>${paired ? "差值的標準差" : p.design === "one" ? "標準差" : "合併標準差"}</td><td class="num">σ = ${nf(p.sd)}${esc(u)}</td><td class="num">s = ${nf(s)}${esc(u)}</td><td>${ratio > 1.2 ? `<span class="status ng">實際波動大 ${fmt((ratio - 1) * 100, 0)}%：這次的把握低於規劃</span>` : `<span class="status ok">在規劃範圍內（${ratio >= 1 ? "+" : "−"}${fmt(Math.abs(ratio - 1) * 100, 0)}%）</span>`}</td></tr>`); }
    return `<h3 style="margin-top:14px">與規劃比對</h3><div class="scroll-x"><table><thead><tr><th>項目</th><th class="num">規劃</th><th class="num">實際</th><th>判讀</th></tr></thead><tbody>${rows.join("")}</tbody></table></div><p class="hint">只比較規劃假設的 σ 與實際的 s；不用實際數據回推「事後檢定力」（那只是 p 值的換算，不能用來解釋結果）*。</p>`;
  }
  let dcLast = null;
  const dcSd = a => { const m = a.reduce((t, v) => t + v, 0) / a.length; return Math.sqrt(a.reduce((t, v) => t + (v - m) ** 2, 0) / (a.length - 1)); };
  function dcAfterRun() {
    const box = $("dcJudge"), aside = $("subCompare").querySelector(".grid > aside"), q = DC.q, R = state.result;
    dcLast = null;
    const show = v => { aside.hidden = !v; if (!v) $("sheets").hidden = true; else if (R) $("sheets").hidden = false; };
    if (!R || !state.data || !DCQ[q]) { box.hidden = true; show(true); dcSummary(); return; }
    const paired = !!(state.opts && state.opts.paired), p = dcPlan(), names = state.groups.map(g => g.name), dec = Math.min((state.dec || 2) + 2, 8);
    if (q === "equiv" || q === "noninf") {
      const kind = q === "equiv" ? "tost" : "ni", f = eqRead(kind === "tost" ? "eq" : "ni"), title = kind === "tost" ? "同等性判定（TOST）" : "不劣性判定";
      show(DC.refOpen);
      const refBtn = `<button type="button" class="btn small" id="dcRef">${DC.refOpen ? "收起" : "▸"} 一般差異檢定（參考）</button>`;
      if (state.data.length !== 2) { box.innerHTML = `<h3>${title}</h3><p class="help">需要剛好 2 組數據（第 1 組＝現行、第 2 組＝新）。</p>${refBtn}`; box.hidden = false; dcBindRef(); dcSummary(); return; }
      if (!(f.delta > 0)) { box.innerHTML = `<h3>${title}</h3><p class="help" style="color:var(--bad)">請先在「① 規劃數量」填寫 δ（並寫下依據），才能判定。δ 要在量測前決定。</p><button type="button" class="btn small" data-go-stage="1">到 ① 規劃數量</button> ${refBtn}`; box.hidden = false; dcBindRef(); dcSummary(); return; }
      const x = state.data[0], y = state.data[1], a = f.alpha;
      const r = kind === "tost" ? SSE.tostTest(x, y, f.delta, a, paired) : SSE.niTest(x, y, f.delta, a, paired, f.dir);
      const g1 = names[0], g2 = names[1], u = f.unit ? " " + f.unit : "";
      const cl = kind === "tost" ? `${fmt((1 - 2 * a) * 100, 0)}% 信賴區間` : `${fmt((1 - a) * 100, 1).replace(/\.0$/, "")}% 單邊信賴界限`;
      const verdict = kind === "tost"
        ? (r.ok ? `平均差（${g2} − ${g1}）的 ${cl}（${fmt(r.lo, dec)} ～ ${fmt(r.hi, dec)}${u}）整條落在 ±${nf(f.delta)}${u} 內，可以宣稱兩者同等。` : `平均差（${g2} − ${g1}）的 ${cl}（${fmt(r.lo, dec)} ～ ${fmt(r.hi, dec)}${u}）沒有整條落在 ±${nf(f.delta)}${u} 內，不能宣稱同等。${r.hi - r.lo > 2 * f.delta ? "區間比 ±δ 還寬，數據不足以判定，需要更多樣本或更小的波動。" : ""}`)
        : (r.ok ? `平均差（${g2} − ${g1}）的 ${cl}（${fmt(r.bound, dec)}${u}）沒有越過 ${f.dir === "lower" ? "+" : "−"}${nf(f.delta)}${u}，可以宣稱「${g2}」沒有比「${g1}」差超過 δ。` : `平均差（${g2} − ${g1}）的 ${cl}（${fmt(r.bound, dec)}${u}）越過 ${f.dir === "lower" ? "+" : "−"}${nf(f.delta)}${u}，不能宣稱沒有變差。`);
      const rows = kind === "tost"
        ? [[`平均差（${g2} − ${g1}）`, fmt(r.d, dec)], ["標準誤 SE", fmt(r.se, dec)], ["自由度", r.df], [cl, `${fmt(r.lo, dec)} ～ ${fmt(r.hi, dec)}`], ["檢定 1：H₀ 差異 ≤ −δ 的 p", fmtP(r.pLow)], ["檢定 2：H₀ 差異 ≥ +δ 的 p", fmtP(r.pUp)], ["TOST p（取較大者）", fmtP(r.p)]]
        : [[`平均差（${g2} − ${g1}）`, fmt(r.d, dec)], ["標準誤 SE", fmt(r.se, dec)], ["自由度", r.df], [cl, fmt(r.bound, dec)], [`H₀：差異 ${f.dir === "lower" ? "≥ +δ" : "≤ −δ"} 的 p`, fmtP(r.p)]];
      box.innerHTML = `<h3>${title}</h3>
        <div class="verdict">${r.ok ? `<span class="pill sig" style="background:var(--good-soft);color:var(--good)">${kind === "tost" ? "同等" : "沒有變差"}</span>` : `<span class="pill sig" style="background:var(--bad-soft);color:var(--bad)">${kind === "tost" ? "不能宣稱同等" : "不能宣稱沒有變差"}</span>`}<p class="big">${esc(verdict)}</p></div>
        <div class="chart-wrap" style="max-width:600px">${dcCiSvg(Object.assign({}, r, { delta: f.delta }), kind)}</div>
        <div class="scroll-x"><table><tbody>${rows.map(([k, v]) => `<tr><td>${esc(k)}</td><td class="num">${v}</td></tr>`).join("")}</tbody></table></div>
        <div class="chart-wrap" style="max-width:600px;margin-top:10px">${dcBox(state.data, names, state.dec || 2)}</div>
        <p class="hint">${paired ? "成對：以每對的差值計算。" : "兩組獨立：合併標準差（假設兩組標準差相近）。"}δ = ${kind === "tost" ? "±" : ""}${nf(f.delta)}${esc(u)}${f.basis ? "，依據：" + esc(EQ_BASIS.find(o => o[0] === f.basis)[1]) + (f.basisNote ? "——" + esc(f.basisNote) : "") : "（尚未填寫依據）"}；α = ${a}。計算方法：${kind === "tost" ? "兩個單尾 t 檢定（Schuirmann 1987）" : "單邊 t 檢定"}，已與 statsmodels 比對確效。</p>
        ${dcPlanCompare(p, paired, r.n1, r.n2, r.s, f.unit)}
        <div class="run-row" style="margin-top:10px">${refBtn}</div>`;
      box.hidden = false; dcBindRef();
      dcLast = { kind, r, f, g1, g2, paired };
      dcSummary(); return;
    }
    // ①④⑤：判定用上面的差異檢定，這裡只做「與規劃比對」
    show(true);
    let s = NaN; const n1 = state.data[0].length, n2 = state.data[1] ? state.data[1].length : n1;
    if (state.data.length === 1) s = dcSd(state.data[0]);
    else if (state.data.length === 2) s = paired ? dcSd(state.data[1].map((v, i) => v - state.data[0][i])) : SSE.eqStats(state.data[0], state.data[1], false).s;
    if (p && isFinite(s)) { box.innerHTML = dcPlanCompare(p, paired || state.data.length === 1, n1, n2, s, "").replace("margin-top:14px", "margin-top:0"); box.hidden = false; } else box.hidden = true;
    dcSummary();
  }
  function dcBindRef() { const b = $("dcRef"); if (b) b.onclick = () => { DC.refOpen = !DC.refOpen; dcAfterRun(); }; }
  // 規劃結果算完：帶到記錄表、更新摘要
  [["pwRun", "pwOut"], ["eqRun", "eqOut"], ["niRun", "niOut"]].forEach(([b, o]) => $(b).addEventListener("click", () => setTimeout(() => {
    if (!DC.q) return;
    const msg = dcSyncRecord(), out = $(o), old = out.querySelector(".dc-pushed"); if (old) old.remove();
    if (msg) out.insertAdjacentHTML("afterbegin", `<p class="dc-pushed">✓ ${esc(msg)}</p>`);
    if (!out.querySelector(".dc-nextin") && dcPlan()) out.insertAdjacentHTML("beforeend", `<div class="run-row dc-nextin"><button type="button" class="btn primary small" data-go-stage="2">下一步：記錄表 →</button></div>`);
    dcSummary(); dcAfterRun();
  }, 0)));
  ["eqPanel", "niPanel"].forEach(id => $(id).addEventListener("change", () => { if (state.result) dcAfterRun(); }));

  // ---------------- AI 建議帶入 ----------------
  function dcFromAi(m) {
    const q = DCQ[m.q] ? m.q : m.purpose === "one" ? "target" : m.purpose === "multi" ? "multi" : "diff";
    dcPick(q, { noScroll: true });
    const paired = m.relation === "paired";
    if (q === "diff" || q === "target") {
      pkClick(`#pwDesign [data-v="${q === "target" || paired ? "one" : "two"}"]`); pkClick('#pwSolve [data-v="n"]'); pkClick(`#pwAlt [data-v="${m.alt === "two-sided" ? "two-sided" : "greater"}"]`);
      pkSet("pwSd", m.sd); pkSet("pwDelta", m.delta); pkSet("pwTarget", m.power, "change"); pkSet("pwAlpha", m.alpha, "change");
    } else if (q === "equiv" || q === "noninf") {
      const p = q === "equiv" ? "eq" : "ni";
      pkSet(p + "D", paired ? "one" : "two", "change"); if (q === "noninf") pkSet("niDir", m.dir, "change");
      pkSet(p + "Sd", m.sd); pkSet(p + "Delta", m.delta); pkSet(p + "True", m.trueDiff === "" ? "0" : m.trueDiff);
      pkSet(p + "Alpha", m.alpha === "0.01" ? "0.025" : m.alpha, "change"); pkSet(p + "Power", m.power, "change");
    }
    if (m.groups) { const g = String(m.groups).split(/[,，、]+/).map(x => x.trim()).filter(Boolean); if (g.length) $("dcGroups").value = g.join(", "); }
    if (DCQ[q].purpose === "two") $("dcRel").value = paired ? "paired" : "ind";
    if (m.target !== undefined && m.target !== "") $("dcTarget").value = m.target; if (m.lsl) $("dcLsl").value = m.lsl; if (m.usl) $("dcUsl").value = m.usl;
    dcSyncRecord();
    let ck = [];
    if (q === "equiv" || q === "noninf") { const c = eqCheck(q === "equiv" ? "eq" : "ni", q === "equiv" ? "tost" : "ni"); ck = c.ok ? [] : [{ lv: "bad", m: "δ、σ 要由你填寫（AI 不提供數值），補上後按「計算」。" }]; }
    else if (q !== "multi") ck = PLANS.sample._check({ calc: "power", sd: $("pwSd").value, delta: $("pwDelta").value, alt: m.alt });
    const run = q === "equiv" ? "tost" : q === "noninf" ? "ni" : q === "multi" ? "" : "power";
    if (run) pkInline(run, `<span class="pk-src">來源：AI 建議・待確認</span><ul class="mp-check">${pkCheckHtml(ck)}</ul><p class="hint">確認或修改上面的數值後，按「計算」。</p>`);
    $("dcStages").scrollIntoView({ behavior: "smooth", block: "start" });
    return { bad: ck.some(x => x.lv === "bad") };
  }

  // ---------------- 案件存取與 AI 說明 ----------------
  function dcRestore(d, sampleSub, ssQ) {
    const legacy = { power: "diff", tost: "equiv", ni: "noninf" }[sampleSub] || { q1: "diff", q2: "equiv", q3: "noninf", q4: "target" }[ssQ];
    const q = d && DCQ[d.q] ? d.q : legacy;
    if (!q) return;
    dcPick(q, { keep: true, keepStage: true, noScroll: true });
    dcStage(d && d.stage ? d.stage : state.result ? 3 : 1, true);
    dcAfterRun();
  }
  function dcHasPlan() { return !!(DC.q && (pw.result || TQ.tost || TQ.ni)); }
  function dcPlanContext() {
    const q = DCQ[DC.q]; if (!q) return "";
    let t = `【使用者選的問題】${q.label}\n`;
    const p = dcPlan(); if (p) t += "【規劃數量的計算結果】\n" + (p.kind === "power" ? powerContext() : (TQ[p.kind] && TQ[p.kind].ctx) || "") + "\n";
    if (dcLast) { const { kind, r, f, g1, g2 } = dcLast; t += `【${kind === "tost" ? "同等性" : "不劣性"}判定（程式計算）】${g2} − ${g1}：平均差 ${fmtSig(r.d, 6)}、SE ${fmtSig(r.se, 6)}、df ${r.df}、` + (kind === "tost" ? `${(1 - 2 * f.alpha) * 100}% CI ${fmtSig(r.lo, 6)} ～ ${fmtSig(r.hi, 6)}、兩個單尾 p ${fmtP(r.pLow)}／${fmtP(r.pUp)}` : `單邊界限 ${fmtSig(r.bound, 6)}、p ${fmtP(r.p)}`) + `；δ=${f.delta}；結論：${r.ok ? (kind === "tost" ? "同等" : "沒有變差超過 δ") : (kind === "tost" ? "不能宣稱同等" : "不能宣稱沒有變差")}\n`; }
    return t;
  }
  // 統計允差區間（從其他地方連過來時）
  function dcGotoTol() { route("sample"); ssPick("q8", { noScroll: true }); setTimeout(() => $("subTol").scrollIntoView({ behavior: "smooth", block: "start" }), 50); }

  // =====================================================================
  // 樣本數規劃頁：算完一鍵帶到判定處（⑥ 可靠度、⑧ 不良率、⑨ 允差區間、⑩ DOE）
  // =====================================================================
  function ssCarry(outId, html, bind) { const o = $(outId); if (!o) return; const old = o.querySelector(".ss-carry"); if (old) old.remove(); o.insertAdjacentHTML("beforeend", `<div class="run-row ss-carry">${html}</div>`); bind(o.querySelector(".ss-carry")); }
  $("atRun").addEventListener("click", () => setTimeout(() => {
    const r = at.result; if (!r || r.mode !== "plan") return;
    ssCarry("atOut", `<button type="button" class="btn primary small">量完後輸入失效數判定 →</button>`, el => el.querySelector("button").onclick = () => {
      pkClick('#atMode [data-v="eval"]'); pkSet("atC", r.C, "change"); pkSet("atN", r.n); pkSet("atAc", r.c);
      ssPick("q6", { keep: true, noScroll: true });
      $("atHint").textContent = `已帶入 n = ${r.n}、信心 ${Math.round(r.C * 100)}%。請把「實際失效數」填入上面的欄位（目前是規劃允許的 ${r.c} 個），按「計算」。`;
      $("atAc").focus(); $("atAc").scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }, 0));
  $("tpRun").addEventListener("click", () => setTimeout(() => {
    const r = TQ.tolp; if (!r || !isFinite(r.n)) return;
    ssCarry("tpOut", `<button type="button" class="btn primary small">量完後到允差區間判定 →</button>`, el => el.querySelector("button").onclick = () => {
      $("tlP").value = String(r.p); $("tlG").value = String(r.g); setChip("tlSide", r.side === "two" ? "two" : r.side);
      if (r.m === "norm") { $("tlLsl").value = r.side !== "upper" && r.lsl != null ? r.lsl : ""; $("tlUsl").value = r.side !== "lower" && r.usl != null ? r.usl : ""; }
      $("tlHint").textContent = `已帶入涵蓋比例 ${r.p}、信心 ${r.g}、${r.side === "two" ? "雙邊" : r.side === "lower" ? "單邊下限" : "單邊上限"}${r.m === "np" ? "（規劃用無母數法；這裡的允差區間為常態法，數據不近似常態時請注意*）" : ""}。貼上 ${r.n} 個以上的量測值後按「計算」。`;
      $("subTol").scrollIntoView({ behavior: "smooth", block: "start" }); $("tlBox").focus();
    });
  }, 0));
  $("drRun").addEventListener("click", () => setTimeout(() => {
    const r = TQ.doer; if (!r || !isFinite(r.r)) return;
    const k = { f2: 2, f3: 3, f4: 4, f5: 5 }[$("drDesign").value];
    ssCarry("drOut", `<button type="button" class="btn primary small">帶到 DOE 產生實驗矩陣 →</button>${k ? "" : `<span class="hint">部分因子或 PB 設計請在 DOE 頁選擇設計，重複次數已帶入。</span>`}`, el => el.querySelector("button").onclick = () => {
      route("doe");
      if (k) { pkClick('#doeKind [data-v="full"]'); pkSet("doeK", String(k), "change"); }
      const sel = $("doeRep"); if (![...sel.options].some(o => o.value === String(r.r))) sel.insertAdjacentHTML("beforeend", `<option value="${r.r}">${r.r}</option>`);
      pkSet("doeRep", String(r.r), "change");
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }, 0));
  // ⑧ 不良率：量完後判定（單組精確二項；兩組 z 檢定＋Fisher）
  (() => {
    const view = $("viewSample").querySelector('[data-tview="prop"]');
    const card = dcEl("section", "card", `<span class="qref">判定</span><h2 class="q" style="margin-top:6px">量完後：不良率判定</h2><p class="help" id="prJHelp"></p><div class="fields" id="prJFields"></div><div class="run-row"><button type="button" class="btn primary" id="prJRun">判定</button><span class="hint" id="prJHint"></span></div><div id="prJOut"></div>`);
    card.id = "prJudge"; card.style.marginTop = "16px"; view.append(card);
    const one = () => (($("prDesign").querySelector('[aria-pressed="true"]') || {}).dataset || {}).v !== "two";
    function form() {
      const r = TQ.prop, o = one();
      $("prJHelp").textContent = o ? "填入實際測試的件數與不良數。單組用精確二項檢定（不用常態近似）。" : "填入兩組實際的件數與不良數。用合併比例的 z 檢定（與規劃相同的近似），並列出 Fisher 精確檢定供小樣本參考。";
      $("prJFields").innerHTML = o
        ? `<div class="field"><label for="prJn">測試件數 n</label><input id="prJn" type="number" min="1" step="1" value="${r && r.d === "one" ? r.n : ""}"></div><div class="field"><label for="prJx">實際不良數</label><input id="prJx" type="number" min="0" step="1"></div>`
        : `<div class="field"><label for="prJn1">第 1 組件數</label><input id="prJn1" type="number" min="1" step="1" value="${r && r.d === "two" ? r.n : ""}"></div><div class="field"><label for="prJx1">第 1 組不良數</label><input id="prJx1" type="number" min="0" step="1"></div><div class="field"><label for="prJn2">第 2 組件數</label><input id="prJn2" type="number" min="1" step="1" value="${r && r.d === "two" ? Math.ceil(r.n * r.ratio) : ""}"></div><div class="field"><label for="prJx2">第 2 組不良數</label><input id="prJx2" type="number" min="0" step="1"></div>`;
      $("prJOut").innerHTML = "";
    }
    form();
    $("prDesign").addEventListener("click", () => setTimeout(form, 0));
    $("prRun").addEventListener("click", () => setTimeout(form, 0));
    $("prJRun").addEventListener("click", () => {
      const hint = $("prJHint"), alt = (($("prAlt").querySelector('[aria-pressed="true"]') || {}).dataset || {}).v, a = +$("prAlpha").value, P0 = inNum("prP0");
      hint.textContent = "";
      const int = id => { const v = inNum(id); return v != null && Number.isInteger(v) && v >= 0 ? v : NaN; };
      if (one()) {
        const n = int("prJn"), x = int("prJx"), p0 = P0 / 100;
        if (!(n >= 1) || !(x >= 0) || x > n) { hint.innerHTML = `<span class="status ng">請填件數與不良數（不良數 0～n 的整數）。</span>`; return; }
        if (!(p0 > 0 && p0 < 1)) { hint.innerHTML = `<span class="status ng">請在上方填目標不良率 p₀。</span>`; return; }
        const r = SSE.prop1Test(x, n, p0, alt, a), pc = v => fmt(v * 100, 2) + "%";
        const claim = alt === "less" ? (r.sig ? `可以宣稱不良率低於 ${pc(p0)}` : `不能宣稱不良率低於 ${pc(p0)}`) : alt === "greater" ? (r.sig ? `判定不良率高於 ${pc(p0)}` : `不能判定不良率高於 ${pc(p0)}`) : (r.sig ? `判定不良率與 ${pc(p0)} 不同` : `不能判定與 ${pc(p0)} 不同`);
        $("prJOut").innerHTML = `<div class="verdict"><span class="pill sig" style="background:${r.sig ? "var(--good-soft)" : "var(--bad-soft)"};color:${r.sig ? "var(--good)" : "var(--bad)"}">${esc(claim)}</span><p class="big">${n} 件中 ${x} 件不良（${pc(r.phat)}），精確二項 p = ${fmtP(r.p)}（α = ${a}）。</p></div>
          <div class="kv"><div><span>觀測不良率</span><b>${pc(r.phat)}</b></div><div><span>p 值</span><b>${fmtP(r.p)}</b></div><div><span>${alt === "two-sided" ? `${fmt((1 - a) * 100, 0)}% 信賴區間` : alt === "less" ? `${fmt((1 - a) * 100, 0)}% 信賴上限` : `${fmt((1 - a) * 100, 0)}% 信賴下限`}</span><b>${alt === "less" ? pc(r.ci[1]) : alt === "greater" ? pc(r.ci[0]) : pc(r.ci[0]) + " ～ " + pc(r.ci[1])}</b></div></div>
          ${TQ.prop && TQ.prop.d === "one" ? `<p class="hint">與規劃比對：規劃 ${TQ.prop.n} 件${n < TQ.prop.n ? `，實際只測 ${n} 件（少於規劃）` : "，件數符合"}。</p>` : ""}
          <p class="hint">計算方法：精確二項檢定與 Clopper-Pearson 信賴界限，已與 SciPy 比對確效。</p>`;
      } else {
        const n1 = int("prJn1"), x1 = int("prJx1"), n2 = int("prJn2"), x2 = int("prJx2");
        if (![n1, n2].every(v => v >= 1) || ![x1, x2].every(v => v >= 0) || x1 > n1 || x2 > n2) { hint.innerHTML = `<span class="status ng">請填兩組的件數與不良數（不良數 0～n 的整數）。</span>`; return; }
        const r = SSE.prop2Test(x1, n1, x2, n2, alt, a), pc = v => fmt(v * 100, 2) + "%", small = r.minExp < 5;
        const sig = small ? r.pFisher <= a : r.sig;
        const claim = alt === "larger" ? (sig ? "第 1 組不良率較高" : "不能判定第 1 組較高") : alt === "smaller" ? (sig ? "第 1 組不良率較低" : "不能判定第 1 組較低") : (sig ? "兩組不良率不同" : "不能判定兩組不同");
        $("prJOut").innerHTML = `<div class="verdict"><span class="pill sig" style="background:${sig ? "var(--good-soft)" : "var(--surface)"};color:${sig ? "var(--good)" : "var(--ink)"}">${esc(claim)}</span><p class="big">第 1 組 ${x1}/${n1}（${pc(r.p1)}），第 2 組 ${x2}/${n2}（${pc(r.p2)}）；${small ? `預期不良數少於 5，以 Fisher 精確檢定為準：p = ${fmtP(r.pFisher)}` : `z 檢定 p = ${fmtP(r.pz)}`}（α = ${a}）。</p></div>
          <div class="kv"><div><span>差異（第 1 組 − 第 2 組）</span><b>${pc(r.diff)}</b></div><div><span>差異 ${fmt((1 - a) * 100, 0)}% 信賴區間（Wald）</span><b>${pc(r.ci[0])} ～ ${pc(r.ci[1])}</b></div><div><span>z 檢定 p</span><b>${fmtP(r.pz)}</b></div><div><span>Fisher 精確 p</span><b>${fmtP(r.pFisher)}</b></div></div>
          <p class="hint">「不能判定不同」不代表兩組相同。計算方法：合併比例 z 檢定（statsmodels 相同定義）、Fisher 精確檢定（SciPy 相同定義），已比對確效${small ? "；預期不良數少，Wald 區間僅供參考*" : ""}。</p>`;
      }
    });
  })();
