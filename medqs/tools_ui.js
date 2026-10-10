
  // =====================================================================
  // SPC / MSA / DOE 介面（計算在 quality.js：window.QT）
  // =====================================================================
  const QQ = window.QT;
  const nf = (x, s) => fmtSig(x, s || 5);
  const pc = (x, d) => x == null || !isFinite(x) ? "—" : fmt(x, d == null ? 1 : d) + "%";
  const num = v => { const t = String(v).trim().replace(/，/g, ","); if (t === "") return NaN; const x = Number(t); return isFinite(x) ? x : NaN; };
  const inNum = id => { const v = $(id).value.trim(); return v === "" ? null : (isFinite(+v) ? +v : NaN); };
  function splitLine(line, keepEmpty) {
    const s = line.replace(/　/g, " ").trim();
    if (!s) return [];
    if (/[,\t;，]/.test(s)) { const p = s.split(/\s*[,\t;，]\s*/); return keepEmpty ? p : p.filter(x => x !== ""); }
    return s.split(/\s+/);
  }
  // rows of numbers; first line may be a header
  function parseNumRows(text) {
    const lines = String(text || "").split(/\r?\n/), rows = [], labels = [];
    for (let i = 0; i < lines.length; i++) {
      const tk = splitLine(lines[i]); if (!tk.length) continue;
      const v = tk.map(num);
      if (v.some(x => isNaN(x))) {
        if (!rows.length && !labels.header) { labels.header = tk; continue; }
        return { error: `第 ${i + 1} 列有非數字內容：「${esc(lines[i].trim().slice(0, 40))}」` };
      }
      rows.push(v);
    }
    return { rows, header: labels.header || null };
  }
  function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  function gauss(r) { let u = 0, v = 0; while (u === 0) u = r(); v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

  // ---------- SVG helpers ----------
  function niceTicks(lo, hi, n) {
    if (!isFinite(lo) || !isFinite(hi)) return [];
    if (hi === lo) { hi = lo + 1; lo = lo - 1; }
    const span = hi - lo, step0 = span / (n || 5), mag = Math.pow(10, Math.floor(Math.log10(step0))), e = step0 / mag;
    const step = (e >= 5 ? 10 : e >= 2 ? 5 : e >= 1 ? 2 : 1) * mag;
    const out = []; for (let v = Math.ceil(lo / step) * step; v <= hi + step * 1e-9; v += step) out.push(+v.toPrecision(12));
    return out;
  }
  const C = { teal: "var(--teal)", copper: "var(--copper)", navy: "var(--navy)", muted: "var(--muted)", line: "var(--line)", ink: "var(--ink)", bad: "var(--bad)", good: "var(--good)" };
  const SERIES = ["var(--teal)", "var(--copper)", "var(--navy)", "#8E6BB0", "#5E9E5A", "#C2577A"];
  // frame: returns {sx, sy, open, close}
  function frame(o) {
    const W = o.w || 640, H = o.h || 240, m = Object.assign({ l: 56, r: 18, t: o.title ? 26 : 12, b: o.xTitle ? 44 : 30 }, o.m || {});
    let [y0, y1] = o.y; if (y0 === y1) { y0 -= 1; y1 += 1; } const pad = (y1 - y0) * 0.06; y0 -= pad; y1 += pad;
    const [x0, x1] = o.x;
    const sx = v => m.l + (x1 === x0 ? 0.5 : (v - x0) / (x1 - x0)) * (W - m.l - m.r);
    const sy = v => m.t + (1 - (v - y0) / (y1 - y0)) * (H - m.t - m.b);
    let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.title || o.label || "圖表")}" style="font-family:var(--font-body);font-size:11px;max-width:${Math.round(W * 1.3)}px">`;
    if (o.title) s += `<text x="${m.l}" y="16" style="fill:${C.ink};font-size:13px;font-weight:700">${esc(o.title)}</text>`;
    niceTicks(y0, y1, o.yTicks || 5).forEach(t => { const y = sy(t); if (y < m.t - 1 || y > H - m.b + 1) return; s += `<line x1="${m.l}" x2="${W - m.r}" y1="${y}" y2="${y}" style="stroke:${C.line}" stroke-width="1"/><text x="${m.l - 6}" y="${y + 3.5}" text-anchor="end" style="fill:${C.muted}">${esc(nf(t, 4))}</text>`; });
    s += `<line x1="${m.l}" x2="${m.l}" y1="${m.t}" y2="${H - m.b}" style="stroke:${C.muted}"/><line x1="${m.l}" x2="${W - m.r}" y1="${H - m.b}" y2="${H - m.b}" style="stroke:${C.muted}"/>`;
    if (o.xLabels) {
      const every = Math.max(1, Math.ceil(o.xLabels.length / Math.max(1, Math.floor((W - m.l - m.r) / 34))));
      o.xLabels.forEach((lb, i) => { if (i % every) return; const xv = o.xAt ? o.xAt(i) : i; s += `<text x="${sx(xv)}" y="${H - m.b + 14}" text-anchor="middle" style="fill:${C.muted}">${esc(String(lb).slice(0, 8))}</text>`; });
    } else if (o.xNumeric) niceTicks(x0, x1, 6).forEach(t => { s += `<text x="${sx(t)}" y="${H - m.b + 14}" text-anchor="middle" style="fill:${C.muted}">${esc(nf(t, 4))}</text>`; });
    if (o.xTitle) s += `<text x="${(m.l + W - m.r) / 2}" y="${H - 6}" text-anchor="middle" style="fill:${C.muted}">${esc(o.xTitle)}</text>`;
    if (o.yTitle) s += `<text transform="translate(12 ${(m.t + H - m.b) / 2}) rotate(-90)" text-anchor="middle" style="fill:${C.muted}">${esc(o.yTitle)}</text>`;
    return { sx, sy, W, H, m, open: s, close: "</svg>" };
  }
  const poly = (pts, color, w, dash) => pts.length ? `<polyline points="${pts.map(p => p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" ")}" fill="none" style="stroke:${color}" stroke-width="${w || 1.6}"${dash ? ` stroke-dasharray="${dash}"` : ""}/>` : "";
  function stepLine(F, arr) { // arr per point, draws step line centered on points
    const n = arr.length, pts = [];
    for (let i = 0; i < n; i++) { const xL = i === 0 ? i : i - 0.5, xR = i === n - 1 ? i : i + 0.5; pts.push([F.sx(xL), F.sy(arr[i])], [F.sx(xR), F.sy(arr[i])]); }
    return pts;
  }
  // control chart panel → svg
  function ctrlChart(panel, hits, o) {
    o = o || {};
    const v = panel.values, n = v.length;
    const lims = panel.ucl.concat(panel.lcl, v, [panel.cl]).filter(isFinite);
    const F = frame({ w: 680, h: o.h || 230, x: [-0.5, n - 0.5], y: [Math.min(...lims), Math.max(...lims)], title: panel.name, xLabels: panel.labels, m: { r: 86 } });
    let s = F.open;
    const varying = panel.ucl.some(u => Math.abs(u - panel.ucl[0]) > 1e-12);
    s += poly(stepLine(F, panel.ucl), C.bad, 1.3, "5 4") + poly(stepLine(F, panel.lcl), C.bad, 1.3, "5 4");
    s += `<line x1="${F.sx(-0.5)}" x2="${F.sx(n - 0.5)}" y1="${F.sy(panel.cl)}" y2="${F.sy(panel.cl)}" style="stroke:${C.good}" stroke-width="1.4"/>`;
    const lab = (y, t, col) => `<text x="${F.W - F.m.r + 6}" y="${F.sy(y) + 4}" style="fill:${col};font-weight:700">${esc(t)}</text>`;
    s += lab(panel.ucl[n - 1], "UCL " + nf(panel.ucl[n - 1], 4) + (varying ? "*" : ""), C.bad) + lab(panel.cl, "CL " + nf(panel.cl, 4), C.good) + lab(panel.lcl[n - 1], "LCL " + nf(panel.lcl[n - 1], 4) + (varying ? "*" : ""), C.bad);
    s += poly(v.map((y, i) => [F.sx(i), F.sy(y)]), C.navy, 1.3);
    const byIdx = {}; (hits || []).forEach(h => { (byIdx[h.idx] = byIdx[h.idx] || []).push(h.rule); });
    v.forEach((y, i) => {
      const rules = [...new Set(byIdx[i] || [])], out = panel.out[i];
      const col = out ? C.bad : rules.length ? C.copper : C.navy;
      s += `<g><title>第 ${esc(panel.labels[i])} 點：${esc(nf(y, 6))}${rules.length ? "\n觸發規則 " + rules.join("、") : ""}</title>${rules.length && !out ? `<circle cx="${F.sx(i)}" cy="${F.sy(y)}" r="6.5" fill="none" style="stroke:${C.copper}" stroke-width="2"/>` : ""}<circle cx="${F.sx(i)}" cy="${F.sy(y)}" r="${out ? 4.6 : 3.4}" style="fill:${col}"/></g>`;
    });
    if (varying) s += `<text x="${F.W - F.m.r + 6}" y="${F.H - 8}" style="fill:${C.muted}">*最後一點</text>`;
    return `<div class="chart-wrap">${s + F.close}</div>`;
  }
  function histChart(values, o) {
    o = o || {};
    const n = values.length, lo0 = Math.min(...values), hi0 = Math.max(...values);
    const marks = [o.lsl, o.usl, o.target].filter(x => x != null && isFinite(x));
    const m = values.reduce((a, b) => a + b, 0) / n;
    const lo = Math.min(lo0, ...marks, o.sw ? m - 3.5 * o.sw : lo0), hi = Math.max(hi0, ...marks, o.sw ? m + 3.5 * o.sw : hi0);
    const bins = Math.max(5, Math.min(20, Math.round(Math.sqrt(n)))), w = (hi0 - lo0) / bins || 1;
    const cnt = new Array(bins).fill(0); values.forEach(x => { cnt[Math.min(bins - 1, Math.floor((x - lo0) / w))]++; });
    const dens = c => c / (n * w);
    const curve = (sd) => { const pts = []; for (let i = 0; i <= 80; i++) { const x = lo + (hi - lo) * i / 80; pts.push([x, Math.exp(-0.5 * ((x - m) / sd) ** 2) / (sd * Math.sqrt(2 * Math.PI))]); } return pts; };
    const curves = []; if (o.so > 0) curves.push([curve(o.so), C.navy, "整體"]); if (o.sw > 0) curves.push([curve(o.sw), C.copper, "組內"]);
    const ymax = Math.max(...cnt.map(dens), ...curves.map(c => Math.max(...c[0].map(p => p[1]))));
    const F = frame({ w: o.w || 520, h: o.h || 240, x: [lo, hi], y: [0, ymax], xNumeric: true, title: o.title || "", yTicks: 3, m: { l: 20 } });
    let s = F.open.replace(/<text x="\d+(\.\d+)?" y="[\d.]+" text-anchor="end"[^<]*<\/text>/g, "");
    cnt.forEach((c, i) => { const x0 = lo0 + i * w, y = F.sy(dens(c)); s += `<rect x="${F.sx(x0) + 0.5}" y="${y}" width="${Math.max(0, F.sx(x0 + w) - F.sx(x0) - 1)}" height="${F.sy(0) - y}" style="fill:var(--teal-soft);stroke:${C.teal}"><title>${esc(nf(x0, 5))} ～ ${esc(nf(x0 + w, 5))}：${c} 筆</title></rect>`; });
    curves.forEach(([pts, col]) => { s += poly(pts.map(p => [F.sx(p[0]), F.sy(p[1])]), col, 1.8); });
    const vline = (x, t, col) => `<line x1="${F.sx(x)}" x2="${F.sx(x)}" y1="${F.m.t}" y2="${F.sy(0)}" style="stroke:${col}" stroke-width="1.6" stroke-dasharray="5 3"/><text x="${F.sx(x)}" y="${F.m.t + 10}" text-anchor="middle" style="fill:${col};font-weight:700">${esc(t)}</text>`;
    if (o.lsl != null && isFinite(o.lsl)) s += vline(o.lsl, "LSL", C.bad);
    if (o.usl != null && isFinite(o.usl)) s += vline(o.usl, "USL", C.bad);
    if (o.target != null && isFinite(o.target)) s += vline(o.target, "目標", C.good);
    if (o.ref != null && isFinite(o.ref)) s += vline(o.ref, "參考值", C.good);
    const leg = curves.map(([, col, nm]) => `<span><i style="background:${col}"></i>${nm}常態曲線</span>`).join("");
    return `<div class="chart-wrap">${s + F.close}</div>${leg ? `<div class="legend">${leg}</div>` : ""}`;
  }
  function scatterChart(o) {
    const xs = o.points.map(p => p[0]).concat(o.extraX || []), ys = o.points.map(p => p[1]).concat(o.extraY || []);
    const F = frame({ w: o.w || 520, h: o.h || 260, x: [Math.min(...xs), Math.max(...xs)].map((v, i, a) => i ? v + (a[1] - a[0] || 1) * 0.05 : v - (a[1] - a[0] || 1) * 0.05), y: [Math.min(...ys), Math.max(...ys)], xNumeric: true, title: o.title, xTitle: o.xTitle, yTitle: o.yTitle, m: o.yTitle ? { l: 62 } : null });
    let s = F.open;
    (o.hlines || []).forEach(h => { s += `<line x1="${F.m.l}" x2="${F.W - F.m.r}" y1="${F.sy(h.y)}" y2="${F.sy(h.y)}" style="stroke:${h.color || C.muted}" stroke-width="1.2" stroke-dasharray="${h.dash || "4 3"}"/>`; });
    (o.lines || []).forEach(l => { s += poly(l.pts.map(p => [F.sx(p[0]), F.sy(p[1])]), l.color || C.copper, l.w || 2); });
    o.points.forEach((p, i) => { s += `<circle cx="${F.sx(p[0])}" cy="${F.sy(p[1])}" r="${o.r || 3.4}" style="fill:${(o.colors && o.colors[i]) || C.navy}" fill-opacity=".8"><title>${esc((o.tips && o.tips[i]) || nf(p[0], 5) + ", " + nf(p[1], 5))}</title></circle>`; });
    (o.labels || []).forEach(l => { s += `<text x="${F.sx(l.x) + 6}" y="${F.sy(l.y) - 6}" style="fill:${l.color || C.ink};font-weight:700">${esc(l.t)}</text>`; });
    return `<div class="chart-wrap">${s + F.close}</div>`;
  }
  function lineCats(o) { // o: {cats, series:[{name, values, color}], title, yRange?}
    const all = [].concat(...o.series.map(s => s.values)).concat(o.ref != null ? [o.ref] : []).filter(isFinite);
    const y = o.yRange || [Math.min(...all), Math.max(...all)];
    const F = frame({ w: o.w || 300, h: o.h || 210, x: [-0.3, o.cats.length - 0.7], y, xLabels: o.cats, title: o.title, m: { l: 50, r: 12 } });
    let s = F.open;
    if (o.ref != null) s += `<line x1="${F.m.l}" x2="${F.W - F.m.r}" y1="${F.sy(o.ref)}" y2="${F.sy(o.ref)}" style="stroke:${C.muted}" stroke-dasharray="4 3"/>`;
    o.series.forEach((se, k) => {
      const col = se.color || SERIES[k % SERIES.length];
      s += poly(se.values.map((v, i) => [F.sx(i), F.sy(v)]), col, 2, se.dash);
      se.values.forEach((v, i) => { s += `<circle cx="${F.sx(i)}" cy="${F.sy(v)}" r="3.6" style="fill:${col}"><title>${esc(se.name + "：" + o.cats[i] + " → " + nf(v, 5))}</title></circle>`; });
    });
    const leg = o.series.length > 1 ? `<div class="legend">${o.series.map((se, k) => `<span><i style="background:${se.color || SERIES[k % SERIES.length]}"></i>${esc(se.name)}</span>`).join("")}</div>` : "";
    return `<div><div class="chart-wrap">${s + F.close}</div>${leg}</div>`;
  }
  function barsH(o) { // o: {items:[{name, value, color}], ref, refLabel, title, xTitle}
    const n = o.items.length, H = 40 + n * 24 + (o.xTitle ? 16 : 0), mx = Math.max(...o.items.map(i => i.value), o.ref || 0) * 1.08 || 1;
    const F = frame({ w: o.w || 520, h: H, x: [0, mx], y: [0, 1], xNumeric: true, title: o.title, xTitle: o.xTitle, m: { l: o.left || 120, t: o.title ? 26 : 10, b: o.xTitle ? 40 : 26 }, yTicks: 0 });
    let s = F.open.replace(/<line x1="\d+(\.\d+)?" x2="[\d.]+" y1="[\d.]+" y2="[\d.]+" style="stroke:var\(--line\)" stroke-width="1"\/><text[^<]*<\/text>/g, "");
    const top = F.m.t + 4, bh = 16;
    o.items.forEach((it, i) => {
      const y = top + i * 24;
      s += `<text x="${F.m.l - 6}" y="${y + 12}" text-anchor="end" style="fill:${C.ink}">${esc(it.name.length > 16 ? it.name.slice(0, 15) + "…" : it.name)}</text><rect x="${F.sx(0)}" y="${y}" width="${Math.max(1, F.sx(it.value) - F.sx(0))}" height="${bh}" rx="2" style="fill:${it.color || C.teal}"><title>${esc(it.name + "：" + nf(it.value, 4))}</title></rect><text x="${F.sx(it.value) + 4}" y="${y + 12}" style="fill:${C.muted}">${esc(it.label || nf(it.value, 3))}</text>`;
    });
    if (o.ref != null) s += `<line x1="${F.sx(o.ref)}" x2="${F.sx(o.ref)}" y1="${F.m.t}" y2="${F.H - F.m.b}" style="stroke:${C.bad}" stroke-width="1.5" stroke-dasharray="5 3"/><text x="${F.sx(o.ref) + 4}" y="${F.H - F.m.b - 4}" style="fill:${C.bad};font-weight:700">${esc(o.refLabel || nf(o.ref, 4))}</text>`;
    return `<div class="chart-wrap">${s + F.close}</div>`;
  }
  function groupedBars(o) { // o: {cats, series:[{name, values}], title, yTitle}
    const all = [].concat(...o.series.map(s => s.values)).filter(v => v != null && isFinite(v));
    const F = frame({ w: o.w || 560, h: o.h || 240, x: [-0.5, o.cats.length - 0.5], y: [0, Math.max(...all, 1)], xLabels: o.cats, title: o.title, yTitle: o.yTitle, m: { l: 58 } });
    let s = F.open; const k = o.series.length, bw = Math.min(26, (F.sx(1) - F.sx(0)) * 0.8 / k);
    o.series.forEach((se, j) => se.values.forEach((v, i) => { if (v == null || !isFinite(v)) return; const x = F.sx(i) - bw * k / 2 + j * bw, y = F.sy(v); s += `<rect x="${x}" y="${y}" width="${bw - 2}" height="${Math.max(0, F.sy(0) - y)}" style="fill:${SERIES[j]}"><title>${esc(o.cats[i] + " · " + se.name + "：" + fmt(v, 1) + "%")}</title></rect>`; }));
    (o.hlines || []).forEach(h => { s += `<line x1="${F.m.l}" x2="${F.W - F.m.r}" y1="${F.sy(h.y)}" y2="${F.sy(h.y)}" style="stroke:${h.color}" stroke-dasharray="4 3"/><text x="${F.W - F.m.r - 2}" y="${F.sy(h.y) - 3}" text-anchor="end" style="fill:${h.color}">${esc(h.t)}</text>`; });
    return `<div class="chart-wrap">${s + F.close}</div><div class="legend">${o.series.map((se, j) => `<span><i style="background:${SERIES[j]}"></i>${esc(se.name)}</span>`).join("")}</div>`;
  }
  const kv = items => `<div class="kv">${items.filter(Boolean).map(([k, v]) => `<div><span>${esc(k)}</span><b>${v}</b></div>`).join("")}</div>`;
  const pill = (cls, t) => `<span class="pill ${cls}">${esc(t)}</span>`;
  const table = (head, rows, cls) => `<thead><tr>${head.map(h => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.map(r => `<tr${cls && cls(r) ? ` class="${cls(r)}"` : ""}>${r.map(c => `<td>${c == null ? "—" : c}</td>`).join("")}</tr>`).join("")}</tbody>`;
  const notes = arr => arr.filter(Boolean).map(([k, t]) => `<p class="note ${k}">${t}</p>`).join("");

  // ---------- 共用：AI 內容與狀態 ----------
  const TQ = { spc: null, grr: null, bias: null, lin: null, stab: null, attr: null, doe: null, mix: null };
  let msaSub = "grr", doeSub = "fact";
  const TOOL_KEYS_AI = ["spc", "msa", "doe", "taguchi", "sample", "regression"];
  function toolHas(k) { return k === "regression" ? !!(REG && REG.res) : k === "sample" ? sampleHas() : k === "taguchi" ? !!TQ.tg : k === "spc" ? !!TQ.spc : k === "msa" ? !!TQ[msaSub] : k === "doe" ? !!TQ[doeSub] : false; }
  function toolName(k) { return k === "regression" ? "相關與回歸" : k === "sample" ? "樣本數規劃 · " + SS_NAME[sampleSub] : k === "taguchi" ? "田口方法" : k === "spc" ? "SPC 管制圖" : k === "msa" ? "MSA · " + ({ grr: "Gage R&R", bias: "偏差", lin: "線性", stab: "穩定性", attr: "屬性一致性" }[msaSub]) : "DOE · " + (doeSub === "fact" ? "因子設計" : "混合設計"); }
  function toolContext(k) {
    const pd = (($(k + "Problem") || {}).value || "").trim();
    if (k === "regression") return (pd ? "【使用者描述的問題】" + pd + "\n" : "") + "【目前頁面：相關與回歸】\n" + regContext();
    const body = k === "sample" ? sampleBody() : k === "taguchi" ? (TQ.tg && TQ.tg.ctx) : k === "spc" ? (TQ.spc && TQ.spc.ctx) : k === "msa" ? (TQ[msaSub] && TQ[msaSub].ctx) : (TQ[doeSub] && TQ[doeSub].ctx);
    const view = { spc: "viewSPC", msa: "viewMSA", doe: "viewDOE", taguchi: "viewTaguchi", sample: "viewSample" }[k];
    return (pd ? "【使用者描述的問題】" + pd + "\n" : "") + "【目前頁面：" + toolName(k) + "】\n" + (toolHas(k) && body ? "【計算結果】\n" + body : "【尚未分析】\n【頁面目前的設定】\n" + formSnapshot($(view)));
  }
  function toolExplainQ(k) {
    if (k === "regression") return "請說明這個相關與迴歸結果：X 和 Y 的關係有多強、斜率的實務意義、R² 代表什麼、殘差檢查與分層有沒有問題、規格反推（如果有）怎麼用，以及為什麼舊資料的相關不等於因果、下一步要怎麼用 DOE 驗證。";
    if (k === "sample") return sampleExplainQ();
    if (k === "taguchi") return "請說明這個田口實驗結果：哪些因子影響穩健性（S/N）、哪些是調整因子、建議條件與預測的改善幅度、確認實驗要注意什麼，以及這個設計的限制（例如交互作用、雜音條件是否涵蓋實際變異）。";
    if (k === "spc") return "請說明這個管制圖結果：製程是否在統計管制內、判異點可能代表什麼（只列可能性，要標 *）、製程能力是否足夠，以及下一步建議。";
    if (k === "msa") return msaSub === "grr" ? "請說明這個 Gage R&R 結果：量測系統是否可接受、變異主要來自重複性還是再現性、ndc 的意義，以及改善方向。"
      : msaSub === "attr" ? "請說明這個屬性一致性結果：評估員自身、彼此、與標準答案的一致程度，Kappa 是否足夠，以及改善方向。"
      : "請說明這個量測系統" + ({ bias: "偏差", lin: "線性", stab: "穩定性" }[msaSub]) + "結果：結論是什麼、實務意義，以及需要注意的限制。";
    return doeSub === "fact" ? "請說明這個實驗設計結果：哪些因子或交互作用有顯著影響、效應大小的實務意義、別名（混淆）的限制、建議的設定與確認實驗。"
      : "請說明這個混合設計結果：各成分與成分間交互作用的影響、模型是否適當、建議配方與確認實驗。";
  }
  function toolChanged(k) {
    setTimeout(updateChatControls, 0);
    const note = { role: "note", text: "結果已更新，下一個問題 AI 會依最新結果回答" };
    if (chatKey === k && turns.length) appendLog([note]);
    else if (chats[k] && chats[k].turns && chats[k].turns.length) { const w = document.createElement("div"); w.innerHTML = chats[k].html; w.appendChild(msgNode(note)); chats[k].html = w.innerHTML; (chats[k].log = chats[k].log || []).push(note); }
  }
  function carryProblem(name, q, log) {
    const box = $(name + "Problem"), src = $(name + "ProblemSrc");
    if (!box) return;
    if (!box.value.trim() || box.dataset.auto === box.value) { box.value = q; box.dataset.auto = q; src.textContent = "從定義問題帶入，可直接修改"; }
    else { src.innerHTML = `定義問題有新的問題：「${esc(q.slice(0, 40))}${q.length > 40 ? "…" : ""}」 <button type="button" class="linkbtn" data-take="${name}">改用這個</button>`; }
    setChatPrefix(name, homeTranscript(log));
  }
  TOOL_KEYS_AI.forEach(k => {
    $(k + "Problem").addEventListener("input", () => { $(k + "Problem").dataset.auto = ""; $(k + "ProblemSrc").textContent = ""; });
    $(k + "ProblemSrc").addEventListener("click", e => { if (!e.target.closest("[data-take]")) return; const q = lastHomeQ(homeLogNow()); $(k + "Problem").value = q; $(k + "Problem").dataset.auto = q; $(k + "ProblemSrc").textContent = "從定義問題帶入，可直接修改"; });
  });
  function bindSubtabs(id, cb) {
    $(id).addEventListener("click", e => {
      const b = e.target.closest("[data-tsub]"); if (!b) return;
      $(id).querySelectorAll("[data-tsub]").forEach(x => x.setAttribute("aria-selected", String(x === b)));
      const view = $(id).closest("[data-view]");
      view.querySelectorAll("[data-tview]").forEach(v => { v.hidden = v.dataset.tview !== b.dataset.tsub; });
      cb(b.dataset.tsub);
      updateChatControls();
    });
  }

  // =====================================================================
  // SPC
  // =====================================================================
  const SPC_FMT = {
    var: "每列一個子組（同一時間抽的幾個量測值，以空白、逗號或 Tab 分隔）；每列只有 1 個數值時是個別值（I-MR）。第一列可以是標題。",
    defective: "每列一批：不良數, 抽樣數（例如 3, 200）。抽樣數都相同時用 np 圖，不同時用 p 圖。",
    defect: "每列一次檢驗：缺點數[, 檢驗單位數]。單位數省略或都相同時用 c 圖，不同時用 u 圖。"
  };
  const spcKind = chipGroup("spcKind", v => { $("spcFormat").textContent = SPC_FMT[v]; document.querySelectorAll(".spc-spec").forEach(f => { f.hidden = v !== "var"; }); spcDetect(); });
  $("spcFormat").textContent = SPC_FMT.var;
  $("spcRules").innerHTML = QQ.NELSON.map((t, i) => `<label class="chk"><input type="checkbox" value="${i + 1}" checked> 規則 ${i + 1}：${esc(t)}</label>`).join("");
  function spcRulesOn() { return [...$("spcRules").querySelectorAll("input:checked")].map(x => +x.value); }
  function spcExample(name) {
    const r = rng(name === "xbarr" ? 7 : name === "imr" ? 11 : name === "p" ? 13 : 17), L = [];
    if (name === "xbarr") {
      L.push("x1\tx2\tx3\tx4\tx5");
      for (let i = 0; i < 25; i++) { const sh = i >= 19 ? 0.045 : 0; L.push(Array.from({ length: 5 }, () => (10 + sh + 0.03 * gauss(r)).toFixed(3)).join("\t")); }
      setChip("spcKind", "var"); $("spcLsl").value = "9.88"; $("spcUsl").value = "10.12"; $("spcTgt").value = "10";
    } else if (name === "imr") {
      L.push("拉伸強度 (N)");
      for (let i = 0; i < 30; i++) L.push((52 + 1.2 * gauss(r) + (i === 21 ? 5.2 : 0)).toFixed(1));
      setChip("spcKind", "var"); $("spcLsl").value = "47"; $("spcUsl").value = ""; $("spcTgt").value = "";
    } else if (name === "p") {
      L.push("不良數\t抽樣數");
      for (let i = 0; i < 20; i++) { const n = 180 + Math.round(40 * r()); let d = 0; for (let j = 0; j < n; j++) if (r() < (i === 14 ? 0.06 : 0.02)) d++; L.push(d + "\t" + n); }
      setChip("spcKind", "defective");
    } else {
      L.push("缺點數");
      for (let i = 0; i < 20; i++) { let c = 0, p = Math.exp(-4), t = 1; const u = r(); let cum = p; while (u > cum && c < 30) { c++; p *= 4 / c; cum += p; } L.push(String(i === 11 ? c + 9 : c)); }
      setChip("spcKind", "defect");
    }
    $("spcData").value = L.join("\n"); $("spcType").value = "auto";
    const k = spcKind(); $("spcFormat").textContent = SPC_FMT[k]; document.querySelectorAll(".spc-spec").forEach(f => { f.hidden = k !== "var"; });
    spcRun();
    $("spcHint").textContent = { xbarr: "範例：Luer 外徑，每小時抽 5 支，共 25 組（虛構數值，最後幾組有偏移）。", imr: "範例：導管拉伸強度，每批 1 個值，只有下限（虛構數值）。", p: "範例：每批外觀不良數與抽樣數（虛構數值）。", c: "範例：每片包材的缺點數（虛構數值）。" }[name];
  }
  document.querySelectorAll("#viewSPC [data-ex]").forEach(b => b.addEventListener("click", () => spcExample(b.dataset.ex)));
  function spcRows() {
    const p = parseNumRows($("spcData").value); if (p.error) return p;
    let rows = p.rows;
    if (spcKind() === "var" && rows.length === 1 && rows[0].length > 1) rows = rows[0].map(v => [v]);
    if (rows.length < 2) return { error: "資料至少要有 2 列。" };
    return { rows, header: p.header };
  }
  function spcDetect() {
    const t = $("spcData").value.trim(); if (!t) { $("spcDetect").textContent = ""; return; }
    const p = spcRows(); if (p.error) { $("spcDetect").textContent = p.error.replace(/<[^>]+>/g, ""); return; }
    const a = QQ.spcAuto(p.rows, spcKind());
    $("spcDetect").textContent = a.error ? a.error : `讀到 ${p.rows.length} 列。自動判斷：${QQ.CHART_NAME[a.type]}。${a.why.join("")}`;
  }
  $("spcData").addEventListener("input", spcDetect);
  const SPC_OK = { var: ["xbarr", "xbars", "imr"], defective: ["p", "np"], defect: ["c", "u"] };
  function spcRun() {
    const kind = spcKind(), p = spcRows();
    const fail = m => { $("spcHint").innerHTML = `<span class="status ng">${m}</span>`; };
    if (p.error) return fail(p.error);
    let rows = p.rows, type = $("spcType").value, why = [];
    if (type === "auto") { const a = QQ.spcAuto(rows, kind); if (a.error) return fail(esc(a.error)); type = a.type; why = a.why; }
    else {
      if (!SPC_OK[kind].includes(type)) return fail(`「${esc(QQ.CHART_NAME[type])}」不適用於目前的資料型態，請改選資料型態或管制圖。`);
      if (type === "imr" && rows.some(r => r.length > 1)) { rows = [].concat(...rows).map(v => [v]); why.push("已把每列的數值依序展開成個別值。"); }
      if ((type === "xbarr" || type === "xbars")) { const ns = new Set(rows.map(r => r.length)); if (ns.size > 1) return fail("每列的數值個數不一致（子組大小要相同）。"); const n = rows[0].length; if (n < 2) return fail("子組大小至少 2，個別值請用 I-MR。"); if (type === "xbarr" && n > 10) why.push("提醒：子組大小 > 10 時，X̄-S 比 X̄-R 準確。"); if (n > 25) return fail("子組大小超過 25。"); }
      if (kind === "defective") { const a = QQ.spcAuto(rows, kind); if (a.error) return fail(esc(a.error)); if (type === "np" && a.type === "p") return fail("每批抽樣數不同，不能用 np 圖，請用 p 圖。"); }
      if (kind === "defect" && type === "c") { const units = rows.map(r => r.length > 1 ? r[1] : 1); if (units.some(u => u !== units[0])) return fail("每次檢驗的單位數不同，不能用 c 圖，請用 u 圖。"); }
      why.push("手動指定：" + QQ.CHART_NAME[type] + "。");
    }
    if (rows.length < 8) why.push(`注意：只有 ${rows.length} 個點，管制界限的估計不穩定，一般建議至少 20～25 組。`);
    const res = QQ.spcRun(rows, type), on = spcRulesOn();
    const hits = res.panels.map((pn, i) => QQ.nelson(pn, i === 0 ? on : on.filter(r => r === 1)));
    let cap = null;
    const lsl = inNum("spcLsl"), usl = inNum("spcUsl"), tgt = inNum("spcTgt");
    if ([lsl, usl, tgt].some(v => Number.isNaN(v))) return fail("規格欄位要是數字。");
    if (lsl != null && usl != null && lsl >= usl) return fail("規格下限要小於上限。");
    if (kind === "var" && (lsl != null || usl != null)) cap = QQ.capability([].concat(...rows), res.sigma, lsl == null ? undefined : lsl, usl == null ? undefined : usl, tgt == null ? undefined : tgt);
    $("spcHint").textContent = "";
    TQ.spc = { res, hits, cap, type, why, rows, kind };
    spcRender(); toolChanged("spc");
  }
  $("spcRun").addEventListener("click", spcRun);
  function spcRender() {
    const { res, hits, cap, type, why, rows } = TQ.spc;
    const nHit = new Set([].concat(...hits.map((h, i) => h.map(x => i + ":" + x.idx)))).size;
    const nOut = res.panels.reduce((s, p) => s + p.out.filter(Boolean).length, 0);
    $("spcTitle").textContent = QQ.CHART_NAME[type];
    const stable = nHit === 0;
    let capLine = "";
    if (cap && (cap.Cpk != null || cap.Ppk != null)) {
      const k = cap.Cpk != null && isFinite(cap.Cpk) ? cap.Cpk : cap.Ppk;
      capLine = `<p>製程能力 ${cap.Cpk != null ? "Cpk" : "Ppk"} = <b>${fmt(k, 2)}</b>（${k >= 1.33 ? "≥ 1.33，一般視為足夠" : k >= 1 ? "1.00～1.33，勉強，需要改善或加強管制" : "< 1.00，不足，會有不良品"}）${!stable ? "；但製程不穩定，能力指數僅供參考。" : "。"}</p>`;
    }
    const center = res.panels[0];
    $("spcOut").innerHTML = `<div class="verdict">${pill(stable ? "good" : "bad", stable ? "製程在統計管制內" : "有異常訊號")}
      <p class="big">${stable ? "沒有點超出管制界限，也沒有觸發已勾選的判異規則。" : `共 ${nHit} 個點有異常訊號（其中 ${nOut} 點超出管制界限）。`}</p>${capLine}</div>
      ${kv([["子組數", rows.length], ["中心線 " + center.name.split(" ")[0], nf(center.cl, 5)], type === "xbarr" || type === "xbars" || type === "imr" ? ["組內 σ 估計", nf(res.sigma, 4)] : null, cap && cap.Cpk != null ? ["Cpk", fmt(cap.Cpk, 2)] : null, cap && cap.Ppk != null ? ["Ppk", fmt(cap.Ppk, 2)] : null])}
      <ul class="reasons">${why.map(w => `<li>${esc(w)}</li>`).join("")}</ul>`;
    $("spcCharts").innerHTML = res.panels.map((pn, i) => ctrlChart(pn, hits[i])).join("") + (res.panels.length > 1 ? `<p class="hint">第二張圖（${esc(res.panels[1].name)}）只套用規則 1；其他規則用在第一張圖。</p>` : "");
    const ar = [];
    hits.forEach((h, pi) => { const by = {}; h.forEach(x => { (by[x.idx] = by[x.idx] || new Set()).add(x.rule); }); Object.keys(by).sort((a, b) => a - b).forEach(i => ar.push([esc(res.panels[pi].name), esc(res.panels[pi].labels[i]), nf(res.panels[pi].values[i], 6), [...by[i]].sort().map(r => `規則 ${r}：${esc(QQ.NELSON[r - 1])}`).join("<br>")])); });
    $("spcAnom").innerHTML = ar.length ? table(["管制圖", "點", "數值", "觸發的規則"], ar) : `<tbody><tr><td>沒有判異點。</td></tr></tbody>`;
    const capSheet = $("spcCapSheet");
    capSheet.hidden = !cap || (cap.Ppk == null);
    if (cap && cap.Ppk != null) {
      const vals = [].concat(...rows);
      $("spcHist").innerHTML = histChart(vals, { lsl: cap.lsl, usl: cap.usl, target: cap.target, so: cap.sdOverall, sw: cap.sdWithin, title: "分布與規格" });
      $("spcCap").innerHTML = table(["指標", "組內（短期）", "整體（長期）"], [
        ["標準差", nf(cap.sdWithin, 4), nf(cap.sdOverall, 4)],
        ["Cp／Pp", fmt(cap.Cp, 2), fmt(cap.Pp, 2)], ["CPU／PPU", fmt(cap.Cpu, 2), fmt(cap.Ppu, 2)], ["CPL／PPL", fmt(cap.Cpl, 2), fmt(cap.Ppl, 2)],
        ["Cpk／Ppk", `<b>${fmt(cap.Cpk, 2)}</b>`, `<b>${fmt(cap.Ppk, 2)}</b>`], ["預估不良 ppm", fmt(cap.ppmWithin, 0), fmt(cap.ppmOverall, 0)]
      ]) + `<tbody><tr><td>平均</td><td colspan="2">${nf(cap.mean, 6)}（n = ${cap.n}）</td></tr><tr><td>實際超出規格 ppm</td><td colspan="2">${fmt(cap.ppmObserved, 0)}</td></tr>${cap.Cpm != null ? `<tr><td>Cpm</td><td colspan="2">${fmt(cap.Cpm, 2)}</td></tr>` : ""}</tbody>`;
    }
    const P = res.panels, head = ["點"].concat(...P.map(p => [esc(p.name), "UCL", "LCL"]));
    $("spcTable").innerHTML = table(head, P[0].labels.map((lb, i) => [esc(lb)].concat(...P.map(p => { const j = p.labels.indexOf(lb); return j < 0 ? ["", "", ""] : [p.out[j] ? `<b class="status ng">${nf(p.values[j], 5)}</b>` : nf(p.values[j], 5), nf(p.ucl[j], 5), nf(p.lcl[j], 5)]; }))));
    $("spcSheets").hidden = false;
    // AI context
    const L = [`管制圖：${QQ.CHART_NAME[type]}；${why.join("")}`, `點數 ${rows.length}`];
    P.forEach((p, i) => { L.push(`${p.name}：CL ${nf(p.cl, 6)}，UCL ${nf(p.ucl[p.ucl.length - 1], 6)}，LCL ${nf(p.lcl[p.lcl.length - 1], 6)}${p.ucl.some(u => u !== p.ucl[0]) ? "（界限隨樣本數變動，列最後一點）" : ""}`); });
    if (type === "xbarr" || type === "xbars" || type === "imr") L.push(`組內 σ 估計 ${nf(res.sigma, 5)}`);
    L.push(ar.length ? "判異點：" + ar.map(r => `${r[0]} 第 ${r[1]} 點（${r[2]}）${r[3].replace(/<br>/g, "；")}`).join("｜") : "判異點：無");
    if (cap && cap.Ppk != null) L.push(`規格 LSL ${cap.lsl ?? "無"}、USL ${cap.usl ?? "無"}、目標 ${cap.target ?? "無"}；平均 ${nf(cap.mean, 6)}；Cp ${fmt(cap.Cp, 3)}、Cpk ${fmt(cap.Cpk, 3)}、Pp ${fmt(cap.Pp, 3)}、Ppk ${fmt(cap.Ppk, 3)}；預估 ppm（組內）${fmt(cap.ppmWithin, 0)}、（整體）${fmt(cap.ppmOverall, 0)}；實際超出規格 ppm ${fmt(cap.ppmObserved, 0)}`);
    L.push(`使用的判異規則：${spcRulesOn().join("、") || "無"}（第二張圖只用規則 1）`);
    TQ.spc.ctx = L.join("\n");
  }

  // =====================================================================
  // MSA
  // =====================================================================
  const MSA_HINT = { grr: "重複性與再現性：同一批零件由多位操作員重複量測", bias: "量測平均值與標準件參考值的差異", lin: "偏差是否隨量測大小改變", stab: "同一標準件長時間量測，看量測系統是否漂移", attr: "目視或通過／不通過判定的一致性（Kappa）" };
  $("msaSubHint").textContent = MSA_HINT.grr;
  bindSubtabs("msaTabs", s => { msaSub = s; $("msaSubHint").textContent = MSA_HINT[s]; });
  // ---- Gage R&R ----
  const GRR_EX = (() => {
    const r = rng(23), parts = [], L = ["操作員,零件,第1次,第2次,第3次"];
    for (let j = 0; j < 10; j++) parts.push(25 + 1.6 * gauss(r));
    const opB = [0, 0.18, -0.12];
    ["王", "李", "陳"].forEach((op, o) => parts.forEach((pv, j) => L.push([op, "P" + (j + 1)].concat([0, 1, 2].map(() => (pv + opB[o] + 0.15 * gauss(r)).toFixed(2))).join(","))));
    return L.join("\n");
  })();
  $("grrEx").addEventListener("click", () => { $("grrData").value = GRR_EX; $("grrTol").value = "8"; $("grrMethod").value = "anova"; grrRun(); $("grrHint").textContent = "範例：3 位操作員 × 10 件 × 3 次，量測導管外徑相關尺寸（虛構數值，公差 8）。"; });
  function grrParse(text) {
    const lines = String(text || "").split(/\r?\n/), ops = [], parts = [], cell = {};
    let r0 = null;
    for (let i = 0; i < lines.length; i++) {
      const tk = splitLine(lines[i]); if (!tk.length) continue;
      if (tk.length < 3) return { error: `第 ${i + 1} 列至少要有：操作員, 零件, 1 個量測值。` };
      const v = tk.slice(2).map(num);
      if (v.some(isNaN)) { if (!ops.length) continue; return { error: `第 ${i + 1} 列的量測值有非數字內容。` }; }
      const o = tk[0], p = tk[1];
      if (!ops.includes(o)) ops.push(o); if (!parts.includes(p)) parts.push(p);
      (cell[o + "\u0001" + p] = cell[o + "\u0001" + p] || []).push(...v);
    }
    if (ops.length < 2 || parts.length < 2) return { error: "至少要 2 位操作員、2 件零件。" };
    const data = ops.map(o => parts.map(p => cell[o + "\u0001" + p] || []));
    const sizes = new Set([].concat(...data.map(o => o.map(c => c.length))));
    if (sizes.has(0)) { const miss = []; ops.forEach((o, i) => parts.forEach((p, j) => { if (!data[i][j].length) miss.push(o + "×" + p); })); return { error: "缺少資料：" + esc(miss.slice(0, 6).join("、")) + (miss.length > 6 ? "…" : "") + "。每位操作員都要量每一件零件。" }; }
    if (sizes.size > 1) return { error: "每位操作員對每件零件的重複次數要相同。" };
    r0 = [...sizes][0];
    if (r0 < 2) return { error: "每件零件每位操作員至少要量 2 次（才能估計重複性）。" };
    return { data, ops, parts, r: r0 };
  }
  function grrRun() {
    const P = grrParse($("grrData").value);
    if (P.error) { $("grrHint").innerHTML = `<span class="status ng">${P.error}</span>`; return; }
    const tol = inNum("grrTol"); if (Number.isNaN(tol) || (tol != null && tol <= 0)) { $("grrHint").innerHTML = `<span class="status ng">公差要是正數。</span>`; return; }
    const k = +$("grrK").value, method = $("grrMethod").value, aRm = +$("grrAlpha").value;
    const res = method === "anova" ? QQ.grrAnova(P.data, { k, alphaRemove: aRm < 0 ? 2 : aRm, tol: tol || undefined }) : QQ.grrXbarR(P.data, { k, tol: tol || undefined });
    if (res.error) { $("grrHint").innerHTML = `<span class="status ng">${esc(res.error)}</span>`; return; }
    if (!(res.vc.total > 0) || !isFinite(res.pctGRR)) { $("grrHint").innerHTML = `<span class="status ng">資料沒有變異（所有量測值相同或零件間沒有差異），無法評估量測系統。請確認零件涵蓋製程範圍、量具解析度是否足夠。</span>`; return; }
    $("grrHint").textContent = P.parts.length < 5 ? "提醒：零件少於 5 件，零件間變異與 ndc 的估計會不穩定。" : "";
    TQ.grr = { res, P, tol, k, method }; grrRender(); toolChanged("msa");
  }
  $("grrRun").addEventListener("click", grrRun);
  const grrJudge = v => v == null || !isFinite(v) ? null : v < 10 ? ["good", "可接受（< 10%）"] : v <= 30 ? ["warn", "有條件接受（10%～30%）"] : ["bad", "不可接受（> 30%）"];
  function grrRender() {
    const { res, P, tol, k, method } = TQ.grr;
    const j = grrJudge(res.pctGRR), jt = grrJudge(res.pctTolGRR);
    $("grrTitle").textContent = "Gage R&R（" + (method === "anova" ? "ANOVA 法" : "平均全距法") + "）";
    const rep = res.rows[1], rpd = res.rows[2];
    const main = rep.var >= rpd.var ? "重複性（量具本身）" : "再現性（人員或方法差異）";
    $("grrOut").innerHTML = `<div class="verdict">${pill(j[0], "%研究變異 " + j[1])}${jt ? pill(jt[0], "%公差 " + jt[1]) : ""}
      <p class="big">%GRR = ${pc(res.pctGRR)}${res.pctTolGRR != null ? `，%公差 = ${pc(res.pctTolGRR)}` : ""}，ndc = ${isFinite(res.ndc) ? res.ndc : "∞"}${isFinite(res.ndc) ? (res.ndc >= 5 ? "（≥ 5，可分辨零件差異）" : "（< 5，鑑別力不足）") : ""}。</p>
      <p>量測變異主要來自${main}。</p></div>
      ${kv([["%GRR（研究變異）", pc(res.pctGRR)], ["%GRR（公差）", res.pctTolGRR != null ? pc(res.pctTolGRR) : "未填公差"], ["%貢獻（變異數）", pc(res.rows[0].pctContrib)], ["ndc", isFinite(res.ndc) ? res.ndc : "∞"], ["資料", `${P.ops.length} 人 × ${P.parts.length} 件 × ${P.r} 次`], method === "anova" ? ["交互作用 p", fmtP(res.interactionP) + (res.interactionRemoved ? "（已併入誤差）" : "")] : null])}
      <p class="hint">判斷門檻採 AIAG MSA 第 4 版常用經驗值（%GRR &lt; 10% 可接受、10%～30% 視用途有條件接受、&gt; 30% 不可接受；ndc ≥ 5）。公司程序另有規定時以公司為準。</p>`;
    $("grrVC").innerHTML = table(["來源", "變異數", "%貢獻", "標準差", `研究變異（${k}σ）`, "%研究變異", "%公差"], res.rows.map(r => [esc(r.name), nf(r.var, 4), pc(r.pctContrib, 2), nf(r.sd, 4), nf(r.sv, 4), pc(r.pctSV, 2), r.pctTol != null ? pc(r.pctTol, 2) : "—"]));
    const pick = [0, 1, 2, 5];
    $("grrBar").innerHTML = groupedBars({ cats: ["量測系統 GRR", "重複性", "再現性", "零件間"], series: [{ name: "%貢獻", values: pick.map(i => res.rows[i].pctContrib) }, { name: "%研究變異", values: pick.map(i => res.rows[i].pctSV) }].concat(tol ? [{ name: "%公差", values: pick.map(i => res.rows[i].pctTol) }] : []), title: "變異來源", yTitle: "%", hlines: [{ y: 10, t: "10%", color: C.good }, { y: 30, t: "30%", color: C.bad }] });
    if (method === "anova") {
      $("grrAnovaTitle").textContent = "Gage R&R ANOVA 表";
      const T = (rows) => table(["來源", "自由度", "平方和 SS", "均方 MS", "F", "p"], rows.map(r => [esc(r.src), r.df, nf(r.ss, 5), r.ms != null ? nf(r.ms, 5) : "", r.F != null ? fmt(r.F, 3) : "", r.p != null ? fmtP(r.p) : ""]));
      $("grrAnovaT").innerHTML = T(res.full.rows) + (res.interactionRemoved ? `<tbody><tr><td colspan="6"><b>交互作用併入誤差後</b></td></tr></tbody>` + T(res.table.rows).replace(/<thead>.*?<\/thead>/, "") : "");
      $("grrAnovaNote").textContent = res.alphaRemove > 1 ? `設定為不併入交互作用（交互作用 p = ${fmtP(res.interactionP)}）。` : `交互作用 p = ${fmtP(res.interactionP)}，${res.interactionRemoved ? `大於 ${res.alphaRemove}，併入誤差後重新估計（AIAG 做法）。` : `不大於 ${res.alphaRemove}，保留在模型中。`}`;
    } else {
      $("grrAnovaTitle").textContent = "平均全距法計算明細";
      $("grrAnovaT").innerHTML = table(["項目", "數值"], [["R̄（各組全距平均）", nf(res.Rbar, 5)], ["X̄diff（操作員平均的最大差）", nf(res.Xdiff, 5)], ["Rp（零件平均的全距）", nf(res.Rp, 5)], ["K1／K2／K3", `${res.consts.K1}／${res.consts.K2}／${res.consts.K3}`], ["EV（重複性 σ）", nf(Math.sqrt(res.vc.rep), 5)], ["AV（再現性 σ）", nf(Math.sqrt(res.vc.op), 5)], ["PV（零件 σ）", nf(Math.sqrt(res.vc.part), 5)]]);
      $("grrAnovaNote").textContent = "平均全距法不估計操作員 × 零件交互作用；有交互作用疑慮時請用 ANOVA 法。";
    }
    // charts
    const cm = P.data.map(o => o.map(c => c.reduce((a, b) => a + b, 0) / c.length));
    const rg = P.data.map(o => o.map(c => Math.max(...c) - Math.min(...c)));
    const Rbar = [].concat(...rg).reduce((a, b) => a + b, 0) / (P.ops.length * P.parts.length), K = QQ.spcConst(P.r);
    const flatR = [].concat(...rg), labs = [].concat(...P.ops.map(o => P.parts.map(p => o + "·" + p)));
    const rPanel = { name: "全距 R（依操作員）", values: flatR, cl: Rbar, ucl: flatR.map(() => K.D4 * Rbar), lcl: flatR.map(() => K.D3 * Rbar), labels: labs, out: flatR.map(v => v > K.D4 * Rbar + 1e-12) };
    const G = res.means.grand != null ? res.means.grand : [].concat(...cm).reduce((a, b) => a + b, 0) / (P.ops.length * P.parts.length);
    const flatX = [].concat(...cm), A2 = K.A2;
    const xPanel = { name: "平均 X̄（依操作員）", values: flatX, cl: G, ucl: flatX.map(() => G + A2 * Rbar), lcl: flatX.map(() => G - A2 * Rbar), labels: labs, out: flatX.map(v => v > G + A2 * Rbar || v < G - A2 * Rbar) };
    const outX = xPanel.out.filter(Boolean).length;
    $("grrCharts").innerHTML = lineCats({ cats: P.parts, series: P.ops.map((o, i) => ({ name: "操作員 " + o, values: cm[i] })), title: "操作員 × 零件交互作用圖", w: 520, h: 240 })
      + `<div>${ctrlChart(rPanel, null, { h: 200 })}<p class="hint">全距圖：所有點在 UCL 內，表示重複性一致；超出代表該次量測異常或該操作員手法不穩定。</p></div>`
      + `<div>${ctrlChart(xPanel, null, { h: 200 })}<p class="hint">平均圖：量測系統好時，大多數點（建議 &gt; 50%）應超出界限，代表能分辨零件；目前 ${outX}/${flatX.length} 點（${fmt(100 * outX / flatX.length, 0)}%）超出。</p></div>`;
    $("grrSheets").hidden = false;
    TQ.grr.ctx = [`方法：${method === "anova" ? "ANOVA 法" : "平均全距法"}；${P.ops.length} 位操作員、${P.parts.length} 件零件、每件 ${P.r} 次；研究變異倍數 ${k}σ；公差 ${tol || "未填"}`,
      method === "anova" ? `交互作用 p = ${fmtP(res.interactionP)}，${res.interactionRemoved ? "已併入誤差" : "保留"}` : "",
      ...res.rows.map(r => `${r.name.trim()}：變異數 ${nf(r.var, 4)}，%貢獻 ${pc(r.pctContrib, 2)}，%研究變異 ${pc(r.pctSV, 2)}${r.pctTol != null ? "，%公差 " + pc(r.pctTol, 2) : ""}`),
      `ndc = ${res.ndc}`, `X̄ 圖超出界限的點：${outX}/${flatX.length}`, "判斷門檻：%GRR < 10% 可接受、10～30% 有條件、> 30% 不可接受；ndc ≥ 5（AIAG 經驗值）"].filter(Boolean).join("\n");
  }
  // ---- Bias ----
  $("biasEx").addEventListener("click", () => { $("biasRef").value = "10.00"; $("biasTol").value = "0.6"; $("biasData").value = "10.02 10.05 9.99 10.04 10.03 10.06 10.01 10.04 10.02 10.05 10.03 10.00 10.04 10.03 10.06"; biasRun(); $("biasHint").textContent = "範例：10.00 mm 標準塊規量 15 次（虛構數值）。"; });
  function biasRun() {
    const ref = inNum("biasRef"), tol = inNum("biasTol");
    const vals = String($("biasData").value).split(/[\s,，;\t]+/).filter(Boolean).map(num);
    const fail = m => { $("biasHint").innerHTML = `<span class="status ng">${m}</span>`; };
    if (ref == null || Number.isNaN(ref)) return fail("請填參考值。");
    if (vals.some(isNaN)) return fail("量測值有非數字內容。");
    if (vals.length < 3) return fail("至少要 3 個量測值（建議 10 個以上）。");
    if (Number.isNaN(tol)) return fail("公差要是數字。");
    const r = QQ.msaBias(vals, ref, tol || undefined);
    $("biasHint").textContent = vals.length < 10 ? "提醒：量測次數少於 10，檢定力偏低。" : "";
    TQ.bias = { r, vals }; const sig = r.p < 0.05;
    $("biasTitle").textContent = "偏差分析";
    $("biasOut").innerHTML = `<div class="verdict">${pill(sig ? "bad" : "good", sig ? "偏差顯著（p < 0.05）" : "偏差不顯著")}
      <p class="big">偏差 = ${nf(r.bias, 4)}（平均 ${nf(r.mean, 6)} − 參考值 ${nf(r.ref, 6)}），${pEq(r.p)}。</p>
      <p>${sig ? "量測平均值與參考值有統計上的差異，建議評估是否需要校正或修正。" : "沒有足夠證據顯示有偏差；這不代表偏差為 0，請看 95% 信賴區間。"}${r.pctBias != null ? `偏差占公差 ${pc(r.pctBias)}。` : ""}</p></div>
      ${kv([["n", r.n], ["平均", nf(r.mean, 6)], ["標準差", nf(r.sd, 4)], ["偏差", nf(r.bias, 4)], ["偏差 95% CI", `${nf(r.ciBias[0], 4)} ～ ${nf(r.ciBias[1], 4)}`], ["t（df）", `${fmt(r.t, 3)}（${r.df}）`], ["p", fmtP(r.p)], r.pctBias != null ? ["%偏差（公差）", pc(r.pctBias)] : null])}
      ${histChart(vals, { ref: r.ref, title: "量測值分布與參考值", h: 200 })}`;
    TQ.bias.ctx = `偏差分析：參考值 ${r.ref}，n ${r.n}，平均 ${nf(r.mean, 6)}，標準差 ${nf(r.sd, 5)}，偏差 ${nf(r.bias, 5)}，95% CI ${nf(r.ciBias[0], 5)} ～ ${nf(r.ciBias[1], 5)}，t ${fmt(r.t, 3)}，df ${r.df}，p ${fmtP(r.p)}${r.pctBias != null ? "，%偏差（公差 " + tol + "）" + pc(r.pctBias) : ""}`;
    toolChanged("msa");
  }
  $("biasRun").addEventListener("click", biasRun);
  // ---- Linearity ----
  $("linEx").addEventListener("click", () => { $("linData").value = "參考值,第1次,第2次,第3次,第4次\n2,2.02,2.03,2.01,2.02\n4,4.03,4.02,4.04,4.03\n6,6.03,6.05,6.04,6.04\n8,8.05,8.06,8.04,8.06\n10,10.06,10.07,10.05,10.07"; $("linTol").value = "1"; linRun(); $("linHint").textContent = "範例：5 個標準件各量 4 次，偏差隨尺寸增加（虛構數值）。"; });
  function linRun() {
    const p = parseNumRows($("linData").value), fail = m => { $("linHint").innerHTML = `<span class="status ng">${m}</span>`; };
    if (p.error) return fail(p.error);
    const rows = p.rows.filter(r => r.length >= 2).map(r => ({ ref: r[0], values: r.slice(1) }));
    if (new Set(rows.map(r => r.ref)).size < 3) return fail("至少要 3 個不同的參考值（建議 5 個）。");
    const tol = inNum("linTol"); if (Number.isNaN(tol)) return fail("公差要是數字。");
    const r = QQ.msaLinearity(rows, tol || undefined); if (r.error) return fail(esc(r.error));
    $("linHint").textContent = "";
    TQ.lin = { r, rows }; const sigS = r.pSlope < 0.05, sigB = r.pAvgBias < 0.05;
    const xs = rows.map(x => x.ref), x0 = Math.min(...xs), x1 = Math.max(...xs);
    $("linTitle").textContent = "線性分析";
    $("linOut").innerHTML = `<div class="verdict">${pill(sigS ? "bad" : "good", sigS ? "有線性問題（斜率顯著）" : "線性良好（斜率不顯著）")}
      <p class="big">偏差 = ${nf(r.intercept, 4)} ${r.slope < 0 ? "−" : "+"} ${nf(Math.abs(r.slope), 4)} × 參考值；斜率 ${pEq(r.pSlope)}。</p>
      <p>${sigS ? "偏差會隨量測大小改變，單一校正值不能涵蓋整個量測範圍。" : "沒有證據顯示偏差隨量測大小改變。"}平均偏差 ${nf(r.avgBias, 4)}（${pEq(r.pAvgBias)}）。</p></div>
      ${kv([["斜率", nf(r.slope, 4)], ["斜率 p", fmtP(r.pSlope)], ["截距", nf(r.intercept, 4)], ["截距 p", fmtP(r.pIntercept)], ["R²", fmt(r.r2, 3)], ["S", nf(r.s, 4)], ["%線性（|斜率|×100）", pc(r.pctLinearity, 2)], r.pctAvgBias != null ? ["%平均偏差（公差）", pc(r.pctAvgBias, 2)] : null])}
      ${scatterChart({ points: r.points, title: "偏差 vs 參考值", xTitle: "參考值", yTitle: "偏差", hlines: [{ y: 0, color: C.muted }], lines: [{ pts: [[x0, r.intercept + r.slope * x0], [x1, r.intercept + r.slope * x1]] }, { pts: r.per.map(q => [q.ref, q.bias]), color: C.teal, w: 1.4 }], h: 240 })}
      <div class="legend"><span><i style="background:var(--copper)"></i>回歸線</span><span><i style="background:var(--teal)"></i>各參考值平均偏差</span></div>`;
    $("linTable").innerHTML = table(["參考值", "n", "平均偏差", "p（偏差 = 0）"], r.per.map(q => [nf(q.ref, 6), q.n, nf(q.bias, 4), fmtP(q.p)]));
    $("linSheets").hidden = false;
    TQ.lin.ctx = `線性分析：${rows.length} 個參考值；偏差 = ${nf(r.intercept, 5)} + ${nf(r.slope, 5)} × 參考值；斜率 p ${fmtP(r.pSlope)}，截距 p ${fmtP(r.pIntercept)}，R² ${fmt(r.r2, 3)}，S ${nf(r.s, 4)}；%線性 ${pc(r.pctLinearity, 2)}；平均偏差 ${nf(r.avgBias, 5)}（p ${fmtP(r.pAvgBias)}）${r.pctAvgBias != null ? "，%平均偏差 " + pc(r.pctAvgBias, 2) : ""}\n各參考值：` + r.per.map(q => `${q.ref}：偏差 ${nf(q.bias, 4)}（p ${fmtP(q.p)}）`).join("；");
    toolChanged("msa");
  }
  $("linRun").addEventListener("click", linRun);
  // ---- Stability ----
  $("stabEx").addEventListener("click", () => {
    const r = rng(31), L = ["第1次,第2次,第3次"];
    for (let i = 0; i < 20; i++) L.push([0, 1, 2].map(() => (10.01 + (i >= 15 ? 0.03 : 0) + 0.012 * gauss(r)).toFixed(3)).join(","));
    $("stabData").value = L.join("\n"); $("stabRef").value = "10.00"; stabRun(); $("stabHint").textContent = "範例：每週量同一個標準件 3 次，共 20 週（虛構數值，後段有漂移）。";
  });
  function stabRun() {
    const p = parseNumRows($("stabData").value), fail = m => { $("stabHint").innerHTML = `<span class="status ng">${m}</span>`; };
    if (p.error) return fail(p.error);
    let rows = p.rows; if (rows.length === 1 && rows[0].length > 1) rows = rows[0].map(v => [v]);
    const a = QQ.spcAuto(rows, "var"); if (a.error) return fail(esc(a.error));
    if (rows.length < 5) return fail("至少要 5 個時間點（建議 20 個以上）。");
    const ref = inNum("stabRef"); if (Number.isNaN(ref)) return fail("參考值要是數字。");
    const res = QQ.spcRun(rows, a.type), hits = res.panels.map((pn, i) => QQ.nelson(pn, i === 0 ? null : [1]));
    const nH = new Set([].concat(...hits.map((h, i) => h.map(x => i + ":" + x.idx)))).size;
    const all = [].concat(...rows), m = all.reduce((x, y) => x + y, 0) / all.length;
    $("stabHint").textContent = rows.length < 20 ? "提醒：時間點少於 20，管制界限的估計不穩定。" : "";
    TQ.stab = { res, hits }; const ok = nH === 0;
    $("stabTitle").textContent = "穩定性（" + QQ.CHART_NAME[a.type] + "）";
    $("stabOut").innerHTML = `<div class="verdict">${pill(ok ? "good" : "bad", ok ? "量測系統穩定" : "有漂移或異常訊號")}
      <p class="big">${ok ? "沒有點超出管制界限，也沒有觸發判異規則。" : `${nH} 個點有異常訊號，量測系統可能隨時間變化。`}</p>
      ${ref != null ? `<p>整體平均 ${nf(m, 6)}，與參考值的偏差 ${nf(m - ref, 4)}。</p>` : ""}</div>
      ${kv([["時間點", rows.length], ["每次量測", rows[0].length + " 次"], ["整體平均", nf(m, 6)], ["組內 σ", nf(res.sigma, 4)], ref != null ? ["偏差", nf(m - ref, 4)] : null])}`;
    $("stabCharts").innerHTML = res.panels.map((pn, i) => ctrlChart(pn, hits[i])).join("") + `<p class="hint">第一張圖套用 Nelson 8 條規則，第二張只用規則 1。</p>`;
    $("stabSheets").hidden = false;
    TQ.stab.ctx = `穩定性：${QQ.CHART_NAME[a.type]}，${rows.length} 個時間點，每次 ${rows[0].length} 次；整體平均 ${nf(m, 6)}，組內 σ ${nf(res.sigma, 5)}${ref != null ? `，參考值 ${ref}，偏差 ${nf(m - ref, 5)}` : ""}\n` + res.panels.map((pn, i) => `${pn.name}：CL ${nf(pn.cl, 6)}，UCL ${nf(pn.ucl[0], 6)}，LCL ${nf(pn.lcl[0], 6)}；判異：${hits[i].length ? hits[i].map(h => `第 ${h.idx + 1} 點規則 ${h.rule}`).join("、") : "無"}`).join("\n");
    toolChanged("msa");
  }
  $("stabRun").addEventListener("click", stabRun);
  // ---- Attribute agreement ----
  $("attrEx").addEventListener("click", () => {
    $("attrA").value = "3"; $("attrT").value = "2";
    $("attrData").value = ["樣本,標準,甲1,甲2,乙1,乙2,丙1,丙2", "1,OK,OK,OK,OK,OK,OK,OK", "2,NG,NG,NG,NG,NG,NG,NG", "3,OK,OK,OK,OK,NG,OK,OK", "4,NG,NG,NG,NG,NG,OK,NG", "5,OK,OK,OK,OK,OK,OK,OK", "6,OK,OK,OK,OK,OK,OK,OK", "7,NG,NG,NG,OK,NG,NG,NG", "8,OK,OK,OK,OK,OK,OK,OK", "9,NG,NG,NG,NG,NG,NG,NG", "10,OK,OK,OK,OK,OK,NG,NG", "11,NG,NG,NG,NG,NG,NG,NG", "12,OK,OK,OK,OK,OK,OK,OK", "13,NG,NG,OK,NG,NG,NG,NG", "14,OK,OK,OK,OK,OK,OK,OK", "15,NG,NG,NG,NG,NG,NG,NG", "16,OK,OK,OK,OK,OK,OK,OK"].join("\n");
    attrRun(); $("attrHint").textContent = "範例：16 件外觀樣品，3 位檢驗員各判 2 次（虛構資料）。";
  });
  function attrRun() {
    const A = parseInt($("attrA").value, 10), T = parseInt($("attrT").value, 10), fail = m => { $("attrHint").innerHTML = `<span class="status ng">${m}</span>`; };
    if (!(A >= 1 && T >= 1)) return fail("評估員人數與重複次數至少 1。");
    if (A * T < 2) return fail("至少要有 2 個判定（2 位評估員或重複 2 次）。");
    const raw = String($("attrData").value).split(/\r?\n/), need = 2 + A * T;
    const lines = raw.map((l, i) => ({ l, n: i + 1 })).filter(x => x.l.trim());
    const ratings = [], std = [];
    // 第一列是標題：含「樣本／標準」等字樣，或第一欄不是數字而其他列都是數字
    const firstTok = x => splitLine(x.l, true)[0].trim();
    const isHeader = lines.length > 1 && (/樣本|sample|標準|standard|part|std/i.test(lines[0].l) || (isNaN(num(firstTok(lines[0]))) && lines.slice(1).every(x => !isNaN(num(firstTok(x))))));
    for (let i = isHeader ? 1 : 0; i < lines.length; i++) {
      const tk = splitLine(lines[i].l, true).map(s => s.trim());
      if (tk.length !== need) return fail(`第 ${lines[i].n} 列有 ${tk.length} 欄，應為 ${need} 欄（樣本, 標準答案, ${A} 人 × ${T} 次）。沒有標準答案時，用逗號保留空欄。`);
      if (tk.slice(2).some(v => v === "")) return fail(`第 ${lines[i].n} 列有空白的判定。`);
      std.push(tk[1] === "" || tk[1] === "-" ? null : tk[1]);
      const per = []; for (let a = 0; a < A; a++) per.push(tk.slice(2 + a * T, 2 + (a + 1) * T)); ratings.push(per);
    }
    if (ratings.length < 5) return fail("至少要 5 個樣本（建議 30 個以上，含邊界樣品）。");
    const hasStd = std.every(v => v != null); if (!hasStd && std.some(v => v != null)) return fail("標準答案要全部填，或全部留空。");
    const r = QQ.attrAgreement(ratings, hasStd ? std : null);
    $("attrHint").textContent = ratings.length < 30 ? "提醒：樣本少於 30，一致性比例的信賴區間會很寬。" : "";
    TQ.attr = { r }; const kmin = hasStd ? r.allStd.kappa : r.between.kappa;
    const kj = k => !isFinite(k) ? "—" : k >= 0.9 ? "良好" : k >= 0.7 ? "尚可" : "不足";
    const cls = k => !isFinite(k) ? "ns" : k >= 0.9 ? "good" : k >= 0.7 ? "warn" : "bad";
    $("attrTitle").textContent = "屬性一致性";
    $("attrOut").innerHTML = `<div class="verdict">${pill(cls(kmin), (hasStd ? "全體與標準" : "評估員之間") + " κ " + kj(kmin))}
      <p class="big">${hasStd ? `所有人所有次數都判對的樣本：${r.allStd.matched}/${r.S}（${pc(r.allStd.pct)}），κ = ${fmt(r.allStd.kappa, 3)}。` : `評估員之間完全一致的樣本：${r.between.matched}/${r.S}（${pc(r.between.pct)}），Fleiss κ = ${fmt(r.between.kappa, 3)}。`}</p></div>
      ${kv([["樣本", r.S], ["評估員", r.A + " 位"], ["每人次數", r.T], ["判定類別", esc(r.cats.join("、"))], ["評估員之間 κ", fmt(r.between.kappa, 3)], hasStd ? ["全體與標準 κ", fmt(r.allStd.kappa, 3)] : null])}`;
    const rows = [];
    r.within.forEach(w => rows.push([`評估員 ${w.appraiser}`, "自身重複一致", `${w.matched}/${w.n}`, pc(w.pct), r.T > 1 ? fmt(w.kappa, 3) : "—（只判 1 次）", r.T > 1 ? kj(w.kappa) : "—"]));
    (r.vsStd || []).forEach(w => rows.push([`評估員 ${w.appraiser}`, "與標準答案", `${w.matched}/${w.n}`, pc(w.pct), fmt(w.kappa, 3), kj(w.kappa)]));
    rows.push(["全體", "評估員之間", `${r.between.matched}/${r.between.n}`, pc(r.between.pct), fmt(r.between.kappa, 3), kj(r.between.kappa)]);
    if (r.allStd) rows.push(["全體", "與標準答案", `${r.allStd.matched}/${r.allStd.n}`, pc(r.allStd.pct), fmt(r.allStd.kappa, 3), kj(r.allStd.kappa)]);
    $("attrTable").innerHTML = table(["對象", "比較", "一致樣本", "一致比例", "κ", "判讀"], rows);
    $("attrSheets").hidden = false;
    TQ.attr.ctx = `屬性一致性：${r.S} 個樣本、${r.A} 位評估員、每人 ${r.T} 次；類別 ${r.cats.join("、")}\n` + rows.map(x => x.slice(0, 5).join("｜")).join("\n") + "\n（自身一致與評估員之間用 Fleiss κ，與標準答案用 Cohen κ；判讀經驗值 ≥0.9 良好、0.7～0.9 尚可、<0.7 不足）";
    toolChanged("msa");
  }
  $("attrRun").addEventListener("click", attrRun);

  // =====================================================================
  // DOE · 因子設計
  // =====================================================================
  const DOE_HELP = { full: "全因子：所有水準組合都做，能估計所有主效應與交互作用。因子多時次數會倍增（2⁵ = 32 次）。", frac: "部分因子：只做一部分組合，用較少次數篩選因子；代價是部分效應會混淆（別名）。解析度 IV 以上，主效應不會和二因子交互作用混淆。", pb: "Plackett-Burman：12 次實驗篩選最多 11 個因子，只估主效應；主效應會和交互作用部分混淆，適合初期篩選。" };
  $("doeSubHint").textContent = "2 水準因子設計、主效應與交互作用；配方比例用混合設計";
  bindSubtabs("doeTabs", s => { doeSub = s; $("doeSubHint").textContent = s === "fact" ? "2 水準因子設計、主效應與交互作用；配方比例用混合設計" : "成分比例加總為 100% 的配方實驗（Scheffé 模型）"; });
  const doeF = []; for (let i = 0; i < 11; i++) doeF.push({ name: "因子 " + QQ.LETTERS[i], lo: "-1", hi: "+1" });
  let doe = null;
  const doeKind = chipGroup("doeKind", v => { doeKOptions(v); $("doeKindHelp").textContent = DOE_HELP[v]; doeFactorsUI(); });
  function doeKOptions(kind) {
    const s = $("doeK");
    if (kind === "full") s.innerHTML = [2, 3, 4, 5].map(k => `<option value="${k}"${k === 3 ? " selected" : ""}>${k} 因子（${1 << k} 次）</option>`).join("");
    else if (kind === "frac") s.innerHTML = Object.entries(QQ.FRACTIONS).map(([key, f]) => `<option value="${key}">${f.k} 因子 2^(${key})，${1 << (f.k - f.p)} 次，解析度 ${f.res}</option>`).join("");
    else s.innerHTML = [5, 6, 7, 8, 9, 10, 11].map(k => `<option value="${k}"${k === 7 ? " selected" : ""}>${k} 因子（12 次）</option>`).join("");
  }
  function doeKNow() { const kind = doeKind(), v = $("doeK").value; return kind === "frac" ? QQ.FRACTIONS[v].k : +v; }
  function doeFactorsUI() {
    const k = doeKNow();
    $("doeFactors").innerHTML = `<div class="doe-frow doe-fhead"><span>代號</span><span>因子名稱（含單位）</span><span>低水準（−）</span><span>高水準（+）</span></div>` + doeF.slice(0, k).map((f, i) => `<div class="doe-frow"><b>${QQ.LETTERS[i]}</b><input type="text" data-fi="${i}" data-fk="name" value="${esc(f.name)}" aria-label="因子 ${QQ.LETTERS[i]} 名稱"><input type="text" data-fi="${i}" data-fk="lo" value="${esc(f.lo)}" aria-label="因子 ${QQ.LETTERS[i]} 低水準"><input type="text" data-fi="${i}" data-fk="hi" value="${esc(f.hi)}" aria-label="因子 ${QQ.LETTERS[i]} 高水準"></div>`).join("");
  }
  $("doeFactors").addEventListener("input", e => { const t = e.target.closest("[data-fi]"); if (!t) return; doeF[+t.dataset.fi][t.dataset.fk] = t.value; if (doe) doeMatrixLabels(); });
  $("doeK").addEventListener("change", doeFactorsUI);
  doeKOptions("full"); $("doeKindHelp").textContent = DOE_HELP.full; doeFactorsUI();
  function doeGenerate(keepY) {
    const kind = doeKind(), v = $("doeK").value, design = QQ.makeDesign(kind, kind === "frac" ? { key: v } : { k: +v });
    const r = +$("doeRep").value, runs = design.matrix.length, N = runs * r;
    const trials = []; for (let i = 0; i < runs; i++) for (let j = 0; j < r; j++) trials.push({ run: i, rep: j });
    for (let i = N - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [trials[i], trials[j]] = [trials[j], trials[i]]; }
    const order = {}; trials.forEach((t, i) => { order[t.run + "_" + t.rep] = i + 1; });
    doe = { design, r, order, y: keepY || {} };
    TQ.doe = null; $("doeSheets").hidden = true; $("doeTitle").textContent = "尚未分析"; $("doeOut").innerHTML = `<p class="help">照執行順序做實驗、填入結果後按「分析效應」。</p>`;
    doeMatrix();
    $("doeGenHint").textContent = `${design.res}；共 ${runs} 組 × ${r} 次 = ${N} 次實驗${design.defining.length ? "；產生器 " + design.defining.join("、") : ""}。`;
    if (r === 1) $("doeGenHint").textContent += kind === "pb" && design.k < 11 ? ` 不重複時，用未指派的 ${11 - design.k} 欄當誤差估計。` : kind === "pb" ? " 不重複且 11 欄全用時，用 Lenth 法判斷顯著性。" : " 不重複時用 Lenth 法判斷顯著性（若有未指派的欄位，則用它們當誤差）。";
  }
  function doeMatrix() {
    const { design, r, order } = doe, k = design.k;
    const head = ["標準順序", "執行順序", "重複"].concat(doeF.slice(0, k).map((f, i) => `<span data-fh="${i}">${esc(QQ.LETTERS[i] + " " + f.name)}</span>`), [esc($("doeY").value || "反應")]);
    const rows = [];
    design.matrix.forEach((row, i) => { for (let j = 0; j < r; j++) rows.push([i + 1, order[i + "_" + j], j + 1].concat(row.map((s, c) => `<span data-fc="${c}" data-s="${s}">${esc(s > 0 ? doeF[c].hi : doeF[c].lo)}</span>`), [`<input type="number" step="any" inputmode="decimal" data-run="${i}" data-rep="${j}" value="${doe.y[i + "_" + j] ?? ""}" aria-label="第 ${i + 1} 組第 ${j + 1} 次結果">`])); });
    $("doeMatrix").innerHTML = table(head, rows);
  }
  function doeMatrixLabels() { $("doeMatrix").querySelectorAll("[data-fc]").forEach(s => { const c = +s.dataset.fc; s.textContent = +s.dataset.s > 0 ? doeF[c].hi : doeF[c].lo; }); $("doeMatrix").querySelectorAll("[data-fh]").forEach(s => { const i = +s.dataset.fh; s.textContent = QQ.LETTERS[i] + " " + doeF[i].name; }); }
  $("doeMatrix").addEventListener("input", e => { const t = e.target.closest("[data-run]"); if (t && doe) doe.y[t.dataset.run + "_" + t.dataset.rep] = t.value; });
  $("doeGen").addEventListener("click", () => {
    const k = doeKNow(), miss = doeF.slice(0, k).map((f, i) => (!String(f.lo).trim() || !String(f.hi).trim()) ? i : -1).filter(i => i >= 0);
    $("doeFactors").querySelectorAll('[data-fk="lo"], [data-fk="hi"]').forEach(el => el.classList.toggle("pk-miss", +el.dataset.fi < k && !el.value.trim()));
    if (miss.length) { $("doeGenHint").innerHTML = `<span class="status ng">請填實際範圍：${esc(miss.map(i => QQ.LETTERS[i] + " " + doeF[i].name).join("、"))} 的低／高水準還沒填（紅色格子）。</span>`; return; }
    doeGenerate(); const b = $("doeSrcBadge"); if (b) b.hidden = true;
  });
  $("doeY").addEventListener("input", () => { if (doe) { const th = $("doeMatrix").querySelector("th:last-child"); if (th) th.textContent = $("doeY").value || "反應"; } });
  $("doeGoal").addEventListener("change", () => { $("doeTgtF").hidden = $("doeGoal").value !== "target"; });
  $("doePasteBtn").addEventListener("click", () => {
    if (!doe) { $("doeHint").textContent = "請先產生實驗矩陣。"; return; }
    const p = parseNumRows($("doePaste").value); if (p.error) { $("doeHint").innerHTML = `<span class="status ng">${p.error}</span>`; return; }
    const runs = doe.design.matrix.length;
    let vals = p.rows; if (vals.length === 1 && vals[0].length === runs * doe.r) vals = Array.from({ length: runs }, (_, i) => vals[0].slice(i * doe.r, (i + 1) * doe.r));
    if (vals.length !== runs || vals.some(v => v.length !== doe.r)) { $("doeHint").innerHTML = `<span class="status ng">要貼 ${runs} 列、每列 ${doe.r} 個數值（依標準順序）。目前是 ${vals.length} 列。</span>`; return; }
    vals.forEach((v, i) => v.forEach((x, j) => { doe.y[i + "_" + j] = String(x); }));
    doeMatrix(); $("doeHint").textContent = "已帶入。";
  });
  $("doeEx").addEventListener("click", () => {
    setChip("doeKind", "full"); doeKOptions("full"); $("doeK").value = "3"; $("doeRep").value = "2"; $("doeKindHelp").textContent = DOE_HELP.full;
    [["模溫 (°C)", "40", "60"], ["保壓 (MPa)", "50", "70"], ["冷卻時間 (s)", "10", "20"]].forEach((f, i) => { doeF[i] = { name: f[0], lo: f[1], hi: f[2] }; });
    $("doeY").value = "Luer 破裂力 (N)"; doeFactorsUI();
    const Y = [[44.1, 45.0], [49.9, 49.0], [46.0, 47.1], [57.9, 57.2], [45.2, 46.1], [50.9, 50.1], [47.0, 48.0], [58.8, 58.1]], y = {};
    Y.forEach((v, i) => v.forEach((x, j) => { y[i + "_" + j] = String(x); }));
    doeGenerate(y); $("doeGoal").value = "max"; $("doeTgtF").hidden = true; doeRun();
    $("doeHint").textContent = "範例：射出成型 3 因子 × 2 次重複，看 Luer 破裂力（虛構數值）。";
  });
  const fName = term => [...term].map(ch => { const i = QQ.LETTERS.indexOf(ch); return doeF[i] ? doeF[i].name : ch; }).join(" × ");
  function doeRun() {
    if (!doe) { $("doeHint").textContent = "請先產生實驗矩陣。"; return; }
    const runs = doe.design.matrix.length, y = [], miss = [];
    for (let i = 0; i < runs; i++) { const row = []; for (let j = 0; j < doe.r; j++) { const v = num(doe.y[i + "_" + j] ?? ""); if (isNaN(v)) miss.push(i + 1); row.push(v); } y.push(row); }
    if (miss.length) { $("doeHint").innerHTML = `<span class="status ng">還有 ${miss.length} 個結果沒填（標準順序第 ${[...new Set(miss)].slice(0, 8).join("、")} 組${miss.length > 8 ? "…" : ""}）。</span>`; return; }
    const goal = $("doeGoal").value, tgt = inNum("doeTgt");
    if (goal === "target" && (tgt == null || Number.isNaN(tgt))) { $("doeHint").innerHTML = `<span class="status ng">望目時請填目標值。</span>`; return; }
    const res = QQ.doeAnalyze(doe.design, y, { alpha: 0.05, goal, target: tgt });
    { const sc = Math.max(...res.effects.map(e => Math.abs(e.effect)), 1e-300); res.effects.forEach(e => { if (Math.abs(e.effect) < 1e-9 * sc) { e.effect = 0; e.coef = 0; e.ss = 0; if (isFinite(e.t)) e.t = 0; if (e.F != null) e.F = 0; } }); res.halfNormal.forEach(h => { if (h.abs < 1e-9 * sc) h.abs = 0; }); }
    $("doeHint").textContent = "";
    TQ.doe = { res, design: doe.design, y, goal, tgt, names: doeF.slice(0, doe.design.k).map(f => Object.assign({}, f)), yName: $("doeY").value || "反應" };
    doeRender(); toolChanged("doe");
  }
  $("doeRun").addEventListener("click", doeRun);
  function doeRender() {
    const { res, design, goal, tgt, names, yName } = TQ.doe, k = design.k;
    const sig = res.effects.filter(e => e.sig).sort((a, b) => Math.abs(b.effect) - Math.abs(a.effect));
    const lvl = (j, s) => s > 0 ? names[j].hi : names[j].lo;
    $("doeTitle").textContent = (design.kind === "full" ? "全因子 2^" + k : design.kind === "frac" ? "部分因子 2^(" + design.key + ")" : "Plackett-Burman 12 次") + "（" + (res.method === "anova" ? "ANOVA" : "Lenth 法") + "）";
    const bestTxt = res.best ? res.best.row.map((s, j) => `${names[j].name} = ${esc(lvl(j, s))}`).join("、") : "";
    const notes0 = [];
    if (design.kind === "frac" && design.res === "III") notes0.push(["warn", "解析度 III：主效應與二因子交互作用混淆，顯著的主效應可能其實是它的別名；建議以折疊設計或確認實驗驗證。"]);
    if (design.kind === "pb") notes0.push(["warn", "PB 設計只估主效應；若交互作用存在，會部分混入主效應。篩選出的重要因子建議再做全因子或部分因子實驗。"]);
    if (res.method === "lenth" && res.lenthDegenerate) notes0.push(["warn", "不重複設計且大多數效應剛好為 0（Lenth 虛擬標準誤 PSE = 0），無法判斷顯著性。請檢查資料是否輸入正確，或增加重複。"]);
    else if (res.method === "lenth") notes0.push(["info", `不重複設計沒有誤差的自由度，用 Lenth 虛擬標準誤（PSE = ${nf(res.PSE, 4)}）判斷；效應絕對值 &gt; ${nf(res.ME, 4)}（邊際誤差 ME）視為顯著。`]);
    if (res.method === "anova" && res.noPureError) notes0.push(["info", `沒有重複，用未指派給效應的 ${res.dfE} 個自由度當誤差（殘差）估計；沒有純誤差，無法檢定適合度缺失。`]);
    if (!sig.length) notes0.push(["info", "沒有顯著效應，不提供建議設定（任何設定的差異都可能只是隨機變異）。"]);
    if (res.method === "anova" && res.plof != null && res.plof < 0.05) notes0.push(["warn", `適合度缺失（Lack of fit）p = ${fmtP(res.plof)}，模型可能漏了效應（例如曲率），請考慮加中心點或更高階的設計。`]);
    $("doeOut").innerHTML = `<div class="verdict">${pill(sig.length ? "sig" : "ns", sig.length ? `${sig.length} 個顯著效應（α = 0.05）` : "沒有顯著效應")}
      <p class="big">${sig.length ? "影響最大：" + sig.slice(0, 4).map(e => `${esc(e.name)}（${esc(fName(e.name))}，效應 ${nf(e.effect, 4)}）`).join("、") + (sig.length > 4 ? "…" : "") : "在這次實驗範圍與次數下，沒有偵測到顯著的效應。"}</p>
      ${res.best && sig.length ? `<p>依模型（${res.method === "anova" ? "所有可估計的效應" : "顯著效應"}）${goal === "max" ? "最大化" : goal === "min" ? "最小化" : "接近目標 " + tgt}的設定：<b>${bestTxt}</b>，預測 ${esc(yName)} ≈ ${nf(res.best.pred, 5)}。*需以確認實驗驗證。</p>` : ""}</div>
      ${kv([["實驗次數", `${res.runs} 組 × ${res.r} 次`], ["總平均", nf(res.grand, 5)], ["R²", isFinite(res.model.R2) ? pc(100 * res.model.R2, 1) : "—"], ["R²（調整）", isFinite(res.model.R2adj) ? pc(100 * res.model.R2adj, 1) : "—"], ["S", nf(res.model.S, 4)], ["解析度", esc(design.res)]])}
      ${notes(notes0)}`;
    const head = res.method === "anova" ? ["項", "因子", "別名", "效應", "係數", "SE 係數", "t", "p", ""] : ["項", "因子", "別名", "效應", "係數", "t（效應/PSE）", "p", ""];
    $("doeEffects").innerHTML = table(head, res.effects.map(e => [`<b>${esc(e.name)}</b>`, esc(fName(e.name)), esc(e.aliases.join("、") || "—"), nf(e.effect, 4), nf(e.coef, 4)].concat(res.method === "anova" ? [nf(e.se, 4), fmt(e.t, 3), fmtP(e.p)] : [fmt(e.t, 3), fmtP(e.p)], [e.sig ? pill("sig", "顯著") : ""])));
    $("doeEffNote").textContent = (design.defining.length ? `產生器：${design.defining.join("、")}。` : "") + "效應 = 高水準平均 − 低水準平均 = 2 × 係數。" + (design.kind !== "full" ? "別名欄列出與該項混淆、無法分開估計的項。" : "");
    const ord = res.effects.slice().sort((a, b) => Math.abs(b.t) - Math.abs(a.t));
    $("doePareto").innerHTML = barsH({ items: ord.map(e => ({ name: e.name + " " + fName(e.name), value: Math.abs(e.t), color: e.sig ? C.copper : C.teal })), ref: res.refT, refLabel: "臨界 " + fmt(res.refT, 2), title: "標準化效應柏拉圖（|t|）", left: 170, w: 600 });
    $("doeHalf").innerHTML = scatterChart({ points: res.halfNormal.map(h => [h.abs, h.q]), colors: res.halfNormal.map(h => h.sig ? C.copper : C.navy), tips: res.halfNormal.map(h => `${h.name}：|效應| ${nf(h.abs, 4)}`), labels: res.halfNormal.filter(h => h.sig).map(h => ({ x: h.abs, y: h.q, t: h.name, color: C.copper })), title: "半常態機率圖", xTitle: "|效應|", yTitle: "半常態分位數", r: 4 });
    const allM = [].concat(...res.main.map(m => [m.lo, m.hi]));
    const yR = [Math.min(...allM, res.grand), Math.max(...allM, res.grand)];
    $("doeMain").innerHTML = res.main.map((m, j) => lineCats({ cats: [names[j].lo, names[j].hi], series: [{ name: names[j].name, values: [m.lo, m.hi], color: res.effects.find(e => e.name === m.factor && e.sig) ? C.copper : C.teal }], ref: res.grand, title: m.factor + " " + names[j].name, yRange: yR, w: 240, h: 190 })).join("");
    const inters = res.inter.slice().sort((a, b) => { const ea = res.effects.find(e => e.name === a.a + a.b), eb = res.effects.find(e => e.name === b.a + b.b); return (eb ? Math.abs(eb.t) : 0) - (ea ? Math.abs(ea.t) : 0); }).slice(0, 6);
    $("doeInter").innerHTML = inters.map(it => { const ia = QQ.LETTERS.indexOf(it.a), ib = QQ.LETTERS.indexOf(it.b); return lineCats({ cats: [names[ia].lo, names[ia].hi], series: [{ name: it.b + " = " + names[ib].lo, values: [it.mm, it.pm] }, { name: it.b + " = " + names[ib].hi, values: [it.mp, it.pp], dash: "5 3" }], title: it.a + " × " + it.b + "（" + names[ia].name + " × " + names[ib].name + "）", w: 280, h: 200 }); }).join("") + (res.inter.length > 6 ? `<p class="hint">只列出最重要的 6 組交互作用。</p>` : "") + (design.kind === "pb" ? `<p class="hint">PB 設計不畫交互作用圖。</p>` : "");
    if (res.method === "anova") {
      const rows = res.effects.map(e => [esc(e.name + " " + fName(e.name)), 1, nf(e.ss, 5), nf(e.ss, 5), fmt(e.F, 3), fmtP(e.p)]);
      rows.push(["誤差（殘差）", res.dfE, nf(res.SSE, 5), nf(res.MSE, 5), "", ""]);
      if (res.dflof > 0) rows.push(["　適合度缺失", res.dflof, nf(res.SSlof, 5), nf(res.MSlof, 5), fmt(res.Flof, 3), fmtP(res.plof)]);
      if (res.dfpe > 0) rows.push(["　純誤差", res.dfpe, nf(res.SSpe, 5), nf(res.MSpe, 5), "", ""]);
      rows.push(["總計", res.dfTotal, nf(res.SSt, 5), "", "", ""]);
      $("doeAnova").innerHTML = table(["來源", "自由度", "SS", "MS", "F", "p"], rows);
    } else {
      $("doeAnova").innerHTML = table(["項", "SS", "效應", "t（效應/PSE）", "p（Lenth）"], res.effects.map(e => [esc(e.name + " " + fName(e.name)), nf(e.ss, 5), nf(e.effect, 4), fmt(e.t, 3), fmtP(e.p)])) + `<tbody><tr><td colspan="5">不重複設計：總 SS ${nf(res.SSt, 5)}，自由度 ${res.dfTotal}，全部用於估計效應，沒有誤差項。PSE ${nf(res.PSE, 4)}，Lenth 自由度 ${fmt(res.dfLenth, 2)}。</td></tr></tbody>`;
    }
    const rs = res.model.resid, ft = res.model.fitted;
    if (rs.length && rs.some(v => Math.abs(v) > 1e-12)) {
      const srt = rs.map((v, i) => [v, i]).sort((a, b) => a[0] - b[0]), nq = srt.map((_, i) => HT.normInv((i + 1 - 0.375) / (rs.length + 0.25)));
      $("doeResid").innerHTML = scatterChart({ points: ft.map((f, i) => [f, rs[i]]), hlines: [{ y: 0 }], title: "殘差 vs 配適值", xTitle: "配適值", yTitle: "殘差" }) + scatterChart({ points: srt.map((s, i) => [s[0], nq[i]]), title: "殘差常態機率圖", xTitle: "殘差", yTitle: "常態分位數", lines: [{ pts: (() => { const s = Math.sqrt(rs.reduce((a, b) => a + b * b, 0) / Math.max(1, rs.length - 1)), lo = srt[0][0], hi = srt[srt.length - 1][0]; return [[lo, lo / (s || 1)], [hi, hi / (s || 1)]]; })(), color: C.muted, w: 1.2 }] });
    } else $("doeResid").innerHTML = `<p class="hint">${res.method === "lenth" ? "不重複設計且沒有顯著效應以外的殘差可畫（或所有效應都進入模型）。" : "殘差全為 0。"}</p>`;
    $("doeSheets").hidden = false;
    TQ.doe.ctx = [`設計：${$("doeTitle").textContent}；${res.runs} 組 × ${res.r} 次；反應變數 ${yName}；目標 ${goal === "max" ? "望大" : goal === "min" ? "望小" : "望目 " + tgt}`,
      "因子：" + names.map((f, j) => `${QQ.LETTERS[j]} ${f.name}（低 ${f.lo}／高 ${f.hi}）`).join("；"),
      design.defining.length ? "產生器：" + design.defining.join("、") + "；解析度 " + design.res : "解析度：" + design.res,
      res.method === "anova" ? `誤差：殘差 df ${res.dfE}，MSE ${nf(res.MSE, 5)}；純誤差 df ${res.dfpe}${res.noPureError ? "（不重複，殘差來自未指派的欄位）" : ""}${res.dflof > 0 ? `；適合度缺失 F ${fmt(res.Flof, 3)}，p ${fmtP(res.plof)}` : ""}` : (res.lenthDegenerate ? "Lenth 法：PSE = 0，無法判斷顯著性" : `Lenth 法：PSE ${nf(res.PSE, 5)}，ME ${nf(res.ME, 5)}`),
      "效應：" + res.effects.map(e => `${e.name}${e.aliases.length ? "（別名 " + e.aliases.join("、") + "）" : ""} 效應 ${nf(e.effect, 4)}，p ${fmtP(e.p)}${e.sig ? " 顯著" : ""}`).join("；"),
      `模型 R² ${fmt(100 * res.model.R2, 1)}%，調整 R² ${fmt(100 * res.model.R2adj, 1)}%，S ${nf(res.model.S, 4)}`,
      res.best && sig.length ? "模型建議設定：" + res.best.row.map((s, j) => `${names[j].name}=${lvl(j, s)}`).join("、") + `，預測 ${nf(res.best.pred, 5)}（只在實驗的兩個水準之間選，未經確認實驗）` : ""].filter(Boolean).join("\n");
  }

  // =====================================================================
  // DOE · 混合設計
  // =====================================================================
  const mixNamesArr = ["樹脂", "溶劑", "添加劑", "成分 D"];
  function mixNamesUI() { const q = +$("mixQ").value; $("mixNames").innerHTML = `<div class="doe-frow doe-fhead mix"><span>代號</span><span>成分名稱</span></div>` + mixNamesArr.slice(0, q).map((n, i) => `<div class="doe-frow mix"><b>${QQ.LETTERS[i]}</b><input type="text" data-mi="${i}" value="${esc(n)}" aria-label="成分 ${QQ.LETTERS[i]} 名稱"></div>`).join(""); }
  $("mixNames").addEventListener("input", e => { const t = e.target.closest("[data-mi]"); if (t) { mixNamesArr[+t.dataset.mi] = t.value; if (mix) mixMatrix(); } });
  $("mixQ").addEventListener("change", mixNamesUI); mixNamesUI();
  $("mixGoal").addEventListener("change", () => { $("mixTgtF").hidden = $("mixGoal").value !== "target"; });
  let mix = null;
  function mixPoints(q, d) {
    if (d === "lat2") return QQ.simplexLattice(q, 2);
    if (d === "lat3") return QQ.simplexLattice(q, 3);
    if (d === "cen") return QQ.simplexCentroid(q);
    const pts = QQ.simplexLattice(q, 2); pts.push(new Array(q).fill(1 / q));
    for (let i = 0; i < q; i++) pts.push(Array.from({ length: q }, (_, j) => j === i ? (q + 1) / (2 * q) : 1 / (2 * q)));
    return pts;
  }
  function mixGenerate(keepY) {
    const q = +$("mixQ").value, pts = mixPoints(q, $("mixDesign").value), r = +$("mixRep").value;
    mix = { q, pts, r, y: keepY || {} }; TQ.mix = null; $("mixSheets").hidden = true; $("mixTitle").textContent = "尚未分析"; $("mixOut").innerHTML = `<p class="help">填入結果後按「分析」。</p>`;
    mixMatrix(); $("mixGenHint").textContent = `${pts.length} 個配方 × ${r} 次 = ${pts.length * r} 次實驗（建議隨機順序進行）。`;
  }
  function mixMatrix() {
    const { q, pts, r } = mix;
    $("mixMatrix").innerHTML = table(["#"].concat(mixNamesArr.slice(0, q).map((n, i) => esc(QQ.LETTERS[i] + " " + n) + "（%）"), Array.from({ length: r }, (_, j) => esc($("mixY").value || "反應") + (r > 1 ? ` 第 ${j + 1} 次` : ""))),
      pts.map((p, i) => [i + 1].concat(p.map(v => fmt(100 * v, 1)), Array.from({ length: r }, (_, j) => `<input type="number" step="any" inputmode="decimal" data-mrun="${i}" data-mrep="${j}" value="${mix.y[i + "_" + j] ?? ""}" aria-label="配方 ${i + 1} 結果">`))));
  }
  $("mixMatrix").addEventListener("input", e => { const t = e.target.closest("[data-mrun]"); if (t && mix) mix.y[t.dataset.mrun + "_" + t.dataset.mrep] = t.value; });
  $("mixGen").addEventListener("click", () => mixGenerate());
  $("mixY").addEventListener("input", () => { if (mix) mixMatrix(); });
  $("mixEx").addEventListener("click", () => {
    $("mixQ").value = "3"; $("mixDesign").value = "lat2c"; $("mixRep").value = "1"; mixNamesArr.splice(0, 3, "樹脂", "溶劑", "添加劑"); mixNamesUI(); $("mixY").value = "接觸角 (°)";
    const noise = [0.6, -0.4, 0.3, -0.7, 0.5, -0.2, 0.4, -0.5, 0.2, -0.3], y = {};
    mixPoints(3, "lat2c").forEach((p, i) => { y[i + "_0"] = (70 * p[0] + 85 * p[1] + 60 * p[2] + 30 * p[0] * p[1] - 10 * p[0] * p[2] + 15 * p[1] * p[2] + noise[i]).toFixed(1); });
    mixGenerate(y); $("mixModel").value = "auto"; $("mixGoal").value = "max"; $("mixTgtF").hidden = true; mixRun();
    $("mixHint").textContent = "範例：塗層 3 成分配方，看接觸角（虛構數值）。";
  });
  function mixRun() {
    if (!mix) { $("mixHint").textContent = "請先產生實驗點。"; return; }
    const X = [], Y = [], miss = [];
    mix.pts.forEach((p, i) => { for (let j = 0; j < mix.r; j++) { const v = num(mix.y[i + "_" + j] ?? ""); if (isNaN(v)) miss.push(i + 1); else { X.push(p); Y.push(v); } } });
    if (miss.length) { $("mixHint").innerHTML = `<span class="status ng">還有結果沒填（配方 ${[...new Set(miss)].slice(0, 8).join("、")}）。</span>`; return; }
    const names = mixNamesArr.slice(0, mix.q), want = $("mixModel").value;
    let fit = null;
    let autoWhy = "";
    if (want === "auto") {
      // 由線性開始，逐階加入高階項；只有新增項的 F 檢定 p < 0.05 才升階（序列 F 檢定）
      fit = QQ.mixtureFit(X, Y, "linear", names); autoWhy = "線性模型";
      for (const m of ["quadratic", "cubic"]) {
        if (fit.error) break;
        const f = QQ.mixtureFit(X, Y, m, names);
        if (f.error || !(f.dfE >= 1) || !f.terms.every(t => isFinite(t.se))) break;
        const dfAdd = (fit.dfE - f.dfE), F = ((fit.SSE - f.SSE) / dfAdd) / f.MSE, pv = HT.fSf(F, dfAdd, f.dfE);
        if (dfAdd > 0 && pv < 0.05) { fit = f; autoWhy = `升到${MODEL_NAME[m]}（新增項的序列 F 檢定 p = ${fmtP(pv)}）`; }
        else { autoWhy += `；${MODEL_NAME[m]}項不顯著（序列 F 檢定 p = ${fmtP(pv)}），不升階`; break; }
      }
    } else fit = QQ.mixtureFit(X, Y, want, names);
    if (fit.error) { $("mixHint").innerHTML = `<span class="status ng">${esc(fit.error)}</span>`; return; }
    const goal = $("mixGoal").value, tgt = inNum("mixTgt");
    if (goal === "target" && (tgt == null || Number.isNaN(tgt))) { $("mixHint").innerHTML = `<span class="status ng">望目時請填目標值。</span>`; return; }
    const opt = QQ.mixtureOptimum(fit, mix.q, goal, tgt);
    $("mixHint").textContent = fit.dfE < 3 ? `提醒：誤差自由度只有 ${fit.dfE}，檢定力很低，建議加重複或檢查點。` : "";
    TQ.mix = { fit, opt, names, goal, tgt, X, Y, q: mix.q, yName: $("mixY").value || "反應", autoWhy };
    mixRender(); toolChanged("doe");
  }
  $("mixRun").addEventListener("click", mixRun);
  const MODEL_NAME = { linear: "線性", quadratic: "二次", cubic: "特殊三次" };
  function mixRender() {
    const { fit, opt, names, goal, tgt, q, yName } = TQ.mix;
    const sigInt = fit.terms.filter(t => t.idx.length > 1 && t.p < 0.05);
    $("mixTitle").textContent = "混合設計（" + MODEL_NAME[fit.model] + "模型）";
    $("mixOut").innerHTML = `<div class="verdict">${pill(fit.p < 0.05 ? "sig" : "ns", fit.p < 0.05 ? "模型顯著" : "模型不顯著")}
      <p class="big">建議配方（${goal === "max" ? "望大" : goal === "min" ? "望小" : "望目 " + tgt}）：${opt.x.map((v, i) => `${esc(names[i])} ${fmt(100 * v, 0)}%`).join("、")}，預測 ${esc(yName)} ≈ ${nf(opt.v, 4)}。</p>
      <p>${sigInt.length ? "顯著的成分交互作用：" + sigInt.map(t => `${esc(t.name)}（係數 ${nf(t.coef, 4)}，${t.coef > 0 ? "加乘" : "抵消"}）`).join("、") + "。" : "沒有顯著的成分交互作用。"}*建議配方是依模型在設計範圍內搜尋，需以確認實驗驗證。</p></div>
      ${TQ.mix.autoWhy ? `<p class="hint">自動選模型：${esc(TQ.mix.autoWhy)}。</p>` : ""}
      ${kv([["模型", MODEL_NAME[fit.model]], ["實驗數", TQ.mix.Y.length], ["R²", pc(100 * fit.R2)], ["R²（調整）", pc(100 * fit.R2adj)], ["S", nf(fit.S, 4)], ["模型 p", fmtP(fit.p)]])}`;
    $("mixCoef").innerHTML = table(["項", "係數", "SE", "t", "p"], fit.terms.map(t => [esc(t.name), nf(t.coef, 5), nf(t.se, 4), t.idx.length > 1 ? fmt(t.t, 3) : "—", t.idx.length > 1 ? fmtP(t.p) : "—"]));
    $("mixAnova").innerHTML = table(["來源", "自由度", "SS", "MS", "F", "p"], [["迴歸", fit.dfR, nf(fit.SSR, 5), nf(fit.SSR / fit.dfR, 5), fmt(fit.F, 3), fmtP(fit.p)], ["誤差", fit.dfE, nf(fit.SSE, 5), nf(fit.MSE, 5), "", ""], ["總計", fit.dfR + fit.dfE, nf(fit.SST, 5), "", "", ""]]);
    $("mixPlotSheet").hidden = q !== 3;
    if (q === 3) $("mixPlot").innerHTML = ternary(fit, names, TQ.mix.X, opt);
    $("mixSheets").hidden = false;
    TQ.mix.ctx = `混合設計：${q} 成分（${names.join("、")}），${TQ.mix.Y.length} 筆；${MODEL_NAME[fit.model]}模型（Scheffé，無截距）${TQ.mix.autoWhy ? "；自動選模型：" + TQ.mix.autoWhy : ""}\n係數：` + fit.terms.map(t => `${t.name} ${nf(t.coef, 5)}${t.idx.length > 1 ? `（p ${fmtP(t.p)}）` : ""}`).join("；") + `\n迴歸 F ${fmt(fit.F, 3)}，p ${fmtP(fit.p)}，R² ${fmt(100 * fit.R2, 1)}%，調整 R² ${fmt(100 * fit.R2adj, 1)}%，S ${nf(fit.S, 4)}，誤差 df ${fit.dfE}\n模型建議配方：` + opt.x.map((v, i) => `${names[i]} ${fmt(100 * v, 0)}%`).join("、") + `，預測 ${nf(opt.v, 5)}（未經確認實驗）`;
  }
  function ternary(fit, names, pts, opt) {
    const W = 520, H = 470, top = [W / 2, 40], bl = [50, 430], br = [W - 50, 430];
    const P = x => [x[0] * top[0] + x[1] * bl[0] + x[2] * br[0], x[0] * top[1] + x[1] * bl[1] + x[2] * br[1]];
    const m = 30, vals = {}; let lo = Infinity, hi = -Infinity;
    for (let i = 0; i <= m; i++) for (let j = 0; i + j <= m; j++) { const v = fit.predict([i / m, j / m, (m - i - j) / m]); vals[i + "_" + j] = v; lo = Math.min(lo, v); hi = Math.max(hi, v); }
    const stops = [[59, 110, 143], [233, 226, 201], [184, 101, 44]];
    const col = v => { const t = hi > lo ? (v - lo) / (hi - lo) : 0.5, a = t < 0.5 ? stops[0] : stops[1], b = t < 0.5 ? stops[1] : stops[2], u = t < 0.5 ? t * 2 : (t - 0.5) * 2; return `rgb(${a.map((c, k) => Math.round(c + (b[k] - c) * u)).join(",")})`; };
    let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="三角等高線圖" style="font-family:var(--font-body);font-size:12px">`;
    const tri = (a, b, c) => { const pa = P(a), pb = P(b), pc = P(c), v = fit.predict([(a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3, (a[2] + b[2] + c[2]) / 3]); return `<polygon points="${[pa, pb, pc].map(p => p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" ")}" fill="${col(v)}" stroke="${col(v)}" stroke-width=".6"/>`; };
    const pt = (i, j) => [i / m, j / m, (m - i - j) / m];
    for (let i = 0; i < m; i++) for (let j = 0; i + j < m; j++) { s += tri(pt(i, j), pt(i + 1, j), pt(i, j + 1)); if (i + j + 2 <= m) s += tri(pt(i + 1, j), pt(i + 1, j + 1), pt(i, j + 1)); }
    // contour lines
    const levels = niceTicks(lo, hi, 7).filter(l => l > lo && l < hi);
    const seg = (A, B, l) => { const va = A[1], vb = B[1]; if ((va - l) * (vb - l) >= 0 || va === vb) return null; const t = (l - va) / (vb - va); return [A[0][0] + (B[0][0] - A[0][0]) * t, A[0][1] + (B[0][1] - A[0][1]) * t]; };
    const lab = {};
    const cell = (a, b, c) => { const V = [[P(pt(...a)), vals[a[0] + "_" + a[1]]], [P(pt(...b)), vals[b[0] + "_" + b[1]]], [P(pt(...c)), vals[c[0] + "_" + c[1]]]]; levels.forEach(l => { const e = [seg(V[0], V[1], l), seg(V[1], V[2], l), seg(V[2], V[0], l)].filter(Boolean); if (e.length === 2) { s += `<line x1="${e[0][0].toFixed(1)}" y1="${e[0][1].toFixed(1)}" x2="${e[1][0].toFixed(1)}" y2="${e[1][1].toFixed(1)}" stroke="#1F2933" stroke-opacity=".55" stroke-width="1"/>`; if (!lab[l] || Math.abs(e[0][0] - W / 2) < Math.abs(lab[l][0] - W / 2)) lab[l] = e[0]; } }); };
    for (let i = 0; i < m; i++) for (let j = 0; i + j < m; j++) { cell([i, j], [i + 1, j], [i, j + 1]); if (i + j + 2 <= m) cell([i + 1, j], [i + 1, j + 1], [i, j + 1]); }
    Object.entries(lab).forEach(([l, p]) => { s += `<text x="${p[0].toFixed(1)}" y="${(p[1] - 2).toFixed(1)}" text-anchor="middle" style="fill:#1F2933;font-size:10.5px;font-weight:700;paint-order:stroke;stroke:rgba(255,255,255,.75);stroke-width:3px">${esc(nf(+l, 4))}</text>`; });
    s += `<polygon points="${[top, bl, br].map(p => p.join(",")).join(" ")}" fill="none" style="stroke:${C.ink}" stroke-width="1.5"/>`;
    s += `<text x="${top[0]}" y="${top[1] - 12}" text-anchor="middle" style="fill:${C.ink};font-weight:700">${esc("A " + names[0])} 100%</text><text x="${bl[0] - 4}" y="${bl[1] + 22}" text-anchor="start" style="fill:${C.ink};font-weight:700">${esc("B " + names[1])}</text><text x="${br[0] + 4}" y="${br[1] + 22}" text-anchor="end" style="fill:${C.ink};font-weight:700">${esc("C " + names[2])}</text>`;
    pts.forEach(x => { const p = P(x); s += `<circle cx="${p[0]}" cy="${p[1]}" r="4" fill="#fff" stroke="#1F2933" stroke-width="1.5"><title>${x.map((v, i) => names[i] + " " + fmt(100 * v, 1) + "%").join("、")}</title></circle>`; });
    const po = P(opt.x); s += `<path d="M${po[0]} ${po[1] - 9}l2.6 6h6.4l-5.2 3.9 2 6.3-5.8-3.8-5.8 3.8 2-6.3-5.2-3.9h6.4z" fill="#FFD447" stroke="#1F2933" stroke-width="1.2"><title>建議配方</title></path>`;
    s += "</svg>";
    return `<div class="chart-wrap tern">${s}</div><div class="legend"><span><i style="background:rgb(59,110,143)"></i>低 ${esc(nf(lo, 4))}</span><span><i style="background:rgb(233,226,201)"></i>中</span><span><i style="background:rgb(184,101,44)"></i>高 ${esc(nf(hi, 4))}</span><span>○ 實驗點　★ 建議配方</span></div>`;
  }
