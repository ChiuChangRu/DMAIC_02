  // =====================================================================
  // TOST 基礎入門：小視窗（圖＋重點），可開啟「統計觀念圖解」第 2 節（新分頁）
  // =====================================================================
  const LEARN_URL = /github\.io$/.test(location.hostname) ? "learn.html#s2" : "https://claude.ai/code/artifact/35d42865-eb89-4b5d-975e-9f0187a090ec#s2";
  try { $("learnLink").href = LEARN_URL.replace(/#s2$/, ""); } catch (_) {}
  function tiFigure() {
    const W = 520, L = 30, R = 500, sx = v => L + (v + 2.2) / 4.4 * (R - L), rows = [[0.1, -0.35, 0.55, "① 同等"], [0.45, 0.25, 0.65, "② 同等（但有顯著差）"], [1.4, 0.9, 1.9, "③ 不同等"], [0.2, -1.3, 1.7, "④ 無法判定"]];
    let s = `<rect x="${sx(-1)}" y="8" width="${sx(1) - sx(-1)}" height="150" fill="var(--teal)" fill-opacity=".18"/>`;
    [[-1, "−Δ"], [1, "+Δ"]].forEach(([v, t]) => { s += `<line x1="${sx(v)}" x2="${sx(v)}" y1="8" y2="158" stroke="var(--teal)" stroke-dasharray="5 4" stroke-width="1.5"/><text x="${sx(v)}" y="174" text-anchor="middle" font-size="12" fill="var(--teal)">${t}</text>`; });
    s += `<line x1="${sx(0)}" x2="${sx(0)}" y1="8" y2="158" stroke="var(--muted)"/><text x="${sx(0)}" y="174" text-anchor="middle" font-size="12" fill="var(--muted)">0</text>`;
    rows.forEach(([m, lo, hi, t], i) => { const y = 28 + i * 36; s += `<line x1="${sx(lo)}" x2="${sx(hi)}" y1="${y}" y2="${y}" stroke="var(--act)" stroke-width="5" stroke-linecap="round"/><circle cx="${sx(m)}" cy="${y}" r="5" fill="var(--act)" stroke="var(--surface)" stroke-width="2"/>`;
      const right = sx(hi) + 8 < R - 130; s += `<text x="${right ? sx(hi) + 8 : sx(lo) - 8}" y="${y + 4}" text-anchor="${right ? "start" : "end"}" font-size="12.5" fill="var(--ink)">${t}</text>`; });
    return `<svg viewBox="0 0 ${W} 182" width="100%" role="img" aria-label="四種情況：90% 信賴區間與同等界限 ±Δ">${s}</svg>`;
  }
  function tiOpen() {
    let m = $("tostIntro");
    if (!m) { m = document.createElement("div"); m.id = "tostIntro"; m.className = "ti-wrap"; m.hidden = true; document.body.appendChild(m);
      m.addEventListener("click", e => { if (e.target === m || e.target.closest("[data-ti-x]")) tiClose(); }); }
    m.innerHTML = `<div class="ti-box" role="dialog" aria-modal="true" aria-labelledby="tiTitle">
      <div class="hp-head"><b id="tiTitle">TOST 同等性檢定：一分鐘入門</b><button type="button" class="hp-x" data-ti-x aria-label="關閉">✕</button></div>
      <p style="margin:6px 0 8px">要證明「變更後<b>一樣好</b>」，看的是差異的 <b>90% 信賴區間是否整段落在 ±Δ 內</b>，不是看 p 值有沒有顯著。</p>
      <div class="ti-fig">${tiFigure()}</div>
      <ul class="ti-list">
        <li><b>「沒看到差」≠「沒有差」</b>：差異檢定 p ≥ 0.05 可能只是樣本太少（情況 ④）。</li>
        <li><b>Δ 要在看數據前訂好</b>：依功能或臨床需求、歷史變異，寫下理由。</li>
        <li><b>有顯著差也可能同等</b>：差很小、在 ±Δ 內（情況 ②）。</li>
      </ul>
      <div class="run-row" style="margin-top:10px"><a class="btn primary small" href="${LEARN_URL}" target="_blank" rel="noopener">開啟完整圖解（新分頁）↗</a><button type="button" class="btn small" data-ti-x>關閉</button></div>
      <p class="hint" style="font-size:12.5px;margin:8px 0 0">完整圖解在「統計觀念圖解」第 2 節：可拖拉的信賴區間、算式、Δ 怎麼定、樣本數概念。若開啟後停在第 1 節，請點上方「2 同等性 TOST 入門」。</p>
    </div>`;
    m.hidden = false; const x = m.querySelector("[data-ti-x]"); if (x) x.focus();
  }
  function tiClose() { const m = $("tostIntro"); if (m) m.hidden = true; }
  document.addEventListener("keydown", e => { if (e.key === "Escape") tiClose(); });
  document.addEventListener("click", e => { if (e.target.closest("[data-tostintro]")) { e.preventDefault(); tiOpen(); } });
  const tiBtn = () => `<button type="button" class="btn small ti-btn" data-tostintro>TOST 入門（圖解）</button>`;
  (function tiMount() {
    const g = $("goalHelp"); if (g && !g.parentElement.querySelector("[data-tostintro]")) g.insertAdjacentHTML("afterend", `<div style="margin-top:6px">${tiBtn()}</div>`);
    const run = $("eqRun"), card = run && run.closest(".card");
    if (card && !card.querySelector("[data-tostintro]")) { const h = card.querySelector("h2, h3, .q"); (h || card.firstElementChild).insertAdjacentHTML(h ? "afterend" : "beforebegin", `<div style="margin:4px 0 10px">${tiBtn()}</div>`); }
  })();
