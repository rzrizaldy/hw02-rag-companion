// Visual explainers for the HW02 companion: pipeline animation, search dartboard, vector playground,
// precision/recall dot map, question-index links, and the judge replay.
// Reuses globals from app.js: D, $, $$, esc, ask, topk, norm, runAsk, segCtl, KS, STORE_KEYS, labeler, isRel, ANSWER.
(() => {
  const REDUCE = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const deckEl = document.querySelector("#deck");
  const whenVisible = (el, cb, threshold = 0.35) => new IntersectionObserver((es) => {
    for (const e of es) if (e.isIntersecting) cb();
  }, { root: deckEl, threshold }).observe(el);
  const PATTERN = `<defs><pattern id="tt" width="22" height="22" patternUnits="userSpaceOnUse">
      <rect width="22" height="22" fill="#c41230"/><rect x="6" width="4" height="22" fill="rgba(20,6,8,.45)"/><rect y="6" width="22" height="4" fill="rgba(20,6,8,.45)"/>
      <rect x="15" width="1" height="22" fill="rgba(255,255,255,.6)"/><rect y="15" width="22" height="1" fill="rgba(255,255,255,.6)"/></pattern>
    <marker id="ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 10 5 0 10z" class="ahead"/></marker></defs>`;

  /* ======================================================== 1. pipeline animation */
  const B1 = D.sweeps.filter((r) => r.store.startsWith("B1") && r.k === 10).sort((a, b) => a.rank - b.rank);
  const top3 = B1.slice(0, 3).map((r) => ({ page: r.pdf_page, dist: r.distance, score: D.pool[r.resp].judges["gemma3:4b"].score }));
  const CAPS = [
    "<b>The handbook.</b> 370 pages of policy text. Nobody wants to read all of it to find one rule.",
    "<b>1 · Chunk.</b> Cut every page into small passages. The notebook uses 50-word windows with a 10-word overlap → 2,932 chunks.",
    "<b>2 · Embed.</b> The MiniLM model turns each chunk into 384 numbers. Passages that mean similar things get similar numbers.",
    "<b>3 · Index + store.</b> Chroma keeps all 2,932 vectors plus an index (HNSW) so it can find neighbours fast.",
    `<b>4 · Ask.</b> Your question becomes 384 numbers too. Chroma returns the k chunks with the smallest cosine distance: here p. ${top3[0].page} at ${top3[0].dist.toFixed(3)}.`,
    `<b>5 · Judge.</b> An LLM reads each returned chunk and scores it 1–5. These three got ${top3.map((t) => t.score).join(", ")}: about quiet hours, but none states the hours. Precision@3 = 0.`,
  ];
  const vecBars = (x, y, seed, h = 24) => Array.from({ length: 12 }, (_, j) => {
    const v = Math.abs(Math.sin(seed * 12.9898 + j * 78.233)) % 1;
    const cls = ["vb1", "vb2", "vb3", "vb4"][Math.floor(v * 4)];
    const hh = 6 + v * h;
    return `<rect x="${x + j * 8}" y="${y + h + 4 - hh}" width="6" height="${hh}" rx="2" class="${cls}"/>`;
  }).join("");
  function buildPipeline() {
    const lines = (x, y, n, w) => Array.from({ length: n }, (_, i) => `<rect x="${x}" y="${y + i * 9}" width="${w - (i % 3) * 14}" height="4" rx="2" class="pline"/>`).join("");
    let s = `<svg viewBox="0 0 1000 330" class="pipe" id="pipeSvg" role="img" aria-label="Animated diagram of retrieval: chunk, embed, store, ask, judge">${PATTERN}`;
    [[48, "Handbook"], [213, "Chunk"], [376, "Embed"], [565, "Store"], [770, "Ask + rank"]].forEach(([x, t], i) =>
      s += `<g class="phead h${i}"><text x="${x}" y="24" class="plab">${i ? i + " · " : ""}${t}</text></g>`);
    // page
    s += `<g class="ps0"><rect x="40" y="48" width="122" height="180" rx="12" class="paper"/><rect x="40" y="48" width="122" height="26" rx="12" fill="url(#tt)"/><rect x="40" y="62" width="122" height="12" fill="url(#tt)"/>
      ${lines(54, 88, 13, 94)}<text x="101" y="252" class="pcap" text-anchor="middle">370 pages</text></g>`;
    // chunks
    s += `<g class="ps1">` + [0, 1, 2, 3].map((i) => `<g class="pchunk" style="transition-delay:${i * 110}ms"><rect x="205" y="${50 + i * 46}" width="118" height="36" rx="8" class="pck pck${i}"/>${lines(215, 60 + i * 46, 2, 90)}</g>`).join("")
      + `<text x="264" y="252" class="pcap" text-anchor="middle">2,932 chunks</text></g>`;
    // vectors
    s += `<g class="ps2">` + [0, 1, 2, 3].map((i) => `<g class="pvec" style="transition-delay:${i * 110}ms"><path d="M328 ${68 + i * 46} H362" class="parrow" marker-end="url(#ah)"/>${vecBars(368, 52 + i * 46, i + 1)}</g>`).join("")
      + `<text x="415" y="252" class="pcap" text-anchor="middle">384 numbers each</text></g>`;
    // store
    const dots = Array.from({ length: 46 }, (_, i) => {
      const x = 535 + ((i * 37) % 120), y = 92 + ((i * 53) % 118);
      const hit = [7, 19, 30].includes(i);
      return `<circle cx="${x}" cy="${y}" r="${hit ? 5 : 3.4}" class="pdot${hit ? " phit" : ""}" style="transition-delay:${(i % 12) * 40}ms"/>`;
    }).join("");
    s += `<g class="ps3"><path d="M462 140 H515" class="parrow" marker-end="url(#ah)"/><ellipse cx="595" cy="232" rx="78" ry="16" class="cyl"/><rect x="517" y="76" width="156" height="156" class="cyl"/><ellipse cx="595" cy="76" rx="78" ry="16" class="cyltop"/>${dots}
      <text x="595" y="268" class="pcap" text-anchor="middle">Chroma · cosine</text></g>`;
    // ask
    s += `<g class="ps4"><rect x="742" y="40" width="226" height="40" rx="20" class="bubble"/><text x="855" y="65" class="ptext" text-anchor="middle">What are CMU’s quiet hours?</text>
      <g class="qvec">${vecBars(806, 86, 9, 20)}</g>
      <path d="M800 112 C 760 120, 720 112, 680 120" class="parrow pflow" marker-end="url(#ah)"/>
      <path d="M676 186 C 705 186, 720 186, 744 186" class="parrow pflow2" marker-end="url(#ah)"/>
      ${top3.map((t, i) => `<g class="pres" style="transition-delay:${400 + i * 160}ms"><rect x="750" y="${140 + i * 42}" width="218" height="34" rx="10" class="pres-r"/><text x="764" y="${162 + i * 42}" class="ptext">#${i + 1} · p. ${t.page} · ${t.dist.toFixed(3)}</text></g>`).join("")}</g>`;
    // judge
    s += `<g class="ps5">${top3.map((t, i) => `<g class="pjudge" style="transition-delay:${i * 160}ms"><circle cx="942" cy="${157 + i * 42}" r="13" class="score-c s${t.score}"/><text x="942" y="${162 + i * 42}" class="pscore" text-anchor="middle">${t.score}</text></g>`).join("")}
      <text x="858" y="290" class="pcap" text-anchor="middle">LLM judge: relevant only if ≥ 4</text><text x="858" y="310" class="pcap pbad" text-anchor="middle">precision@3 = 0 / 3</text></g>`;
    s += `</svg>`;
    $("#pipe").innerHTML = s;
    $("#pipeSteps").innerHTML = CAPS.map((_, i) => `<button type="button" data-i="${i}" aria-label="Step ${i}"></button>`).join("");
  }
  buildPipeline();
  const pipe = { step: 0, timer: null };
  function setStep(n) {
    pipe.step = Math.max(0, Math.min(CAPS.length - 1, n));
    const svg = $("#pipeSvg");
    for (let i = 1; i < CAPS.length; i++) svg.classList.toggle("on" + i, pipe.step >= i);
    svg.dataset.step = pipe.step;
    $("#pipeCap").innerHTML = CAPS[pipe.step];
    $$("#pipeSteps button").forEach((b, i) => b.setAttribute("aria-current", i === pipe.step));
    if (pipe.step === CAPS.length - 1) stopPipe(true);
  }
  function stopPipe(done) { clearInterval(pipe.timer); pipe.timer = null; $("#pipePlay").textContent = done ? "Replay" : "Play"; }
  function playPipe() {
    if (pipe.timer) return stopPipe(false);
    if (pipe.step >= CAPS.length - 1) setStep(0);
    $("#pipePlay").textContent = "Pause";
    pipe.timer = setInterval(() => setStep(pipe.step + 1), REDUCE ? 1800 : 2600);
  }
  $("#pipePlay").addEventListener("click", playPipe);
  $("#pipeNext").addEventListener("click", () => { stopPipe(false); setStep(pipe.step + 1); });
  $("#pipePrev").addEventListener("click", () => { stopPipe(false); setStep(pipe.step - 1); });
  $("#pipeSteps").addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) { stopPipe(false); setStep(+b.dataset.i); } });
  setStep(0);
  let pipeAuto = false;
  whenVisible($("#pipeline"), () => { if (!pipeAuto) { pipeAuto = true; setTimeout(playPipe, 500); } }, 0.5);

  /* ======================================================== 2. search dartboard */
  const sp = { store: "word", k: 5, sel: null };
  D.queries.text.forEach((t, i) => {
    const b = document.createElement("button"); b.type = "button";
    b.textContent = ["Academic integrity", "Cheating defined", "Improper communications", "Quiet hours", "Pets & animals"][i];
    b.addEventListener("click", () => { $("#q").value = t; runAsk(); });
    $("#spPresets").appendChild(b);
  });
  const mine = document.createElement("button"); mine.type = "button"; mine.textContent = "↖ my question from “Ask”";
  mine.addEventListener("click", () => document.querySelector("#ask").scrollIntoView({ behavior: REDUCE ? "auto" : "smooth" }));
  $("#spPresets").appendChild(mine);
  segCtl("#spStore", (v) => { sp.store = v; sp.sel = null; renderSpace(true); });
  $("#spK").addEventListener("input", () => { sp.k = +$("#spK").value; renderSpace(false); });
  const PAGES = 370, C = 270, R = 214, DMAX = 0.75;
  const rOf = (d) => Math.min(R, (d / DMAX) * R);
  function pointInfo(store, i) {
    if (store === "qidx") { const c = D.qidx.chunk[i]; return { page: D.sent.page[c], text: D.sent.text[c], q: D.qidx.text[i] }; }
    return { page: D[store].page[i], text: D[store].text[i] };
  }
  let lastHits = [];
  function renderSpace(fly) {
    if (!ask.vec) return;
    const hits = topk(sp.store, norm(ask.vec), 40);
    lastHits = hits.map((h, r) => ({ ...h, r: r + 1, d: 1 - h.sim, ...pointInfo(sp.store, h.i) }));
    const kd = lastHits[Math.min(sp.k, lastHits.length) - 1].d;
    const kr = (rOf(kd) + rOf(lastHits[Math.min(sp.k, lastHits.length - 1)].d)) / 2 + 2;
    let s = `<svg viewBox="0 0 540 540" class="dart" role="img" aria-label="Chunks placed by distance from your question">${PATTERN}`;
    [0.25, 0.5, 0.75].forEach((d) => s += `<circle cx="${C}" cy="${C}" r="${rOf(d)}" class="ring"/><text x="${C + 4}" y="${C - rOf(d) + 14}" class="ringl">${d}</text>`);
    s += `<line x1="${C}" y1="${C - R - 8}" x2="${C}" y2="${C - R + 10}" class="tick"/><text x="${C}" y="${C - R - 12}" class="ringl" text-anchor="middle">p. 1</text>`;
    s += `<text x="${C + R + 8}" y="${C + 4}" class="ringl">p. 93</text><text x="${C}" y="${C + R + 22}" class="ringl" text-anchor="middle">p. 185</text><text x="${C - R - 8}" y="${C + 4}" class="ringl" text-anchor="end">p. 278</text>`;
    s += `<circle cx="${C}" cy="${C}" style="r:${kr}px" class="kring"/>`;
    s += `<g class="pts">` + lastHits.map((h, idx) => {
      const ang = (h.page / PAGES) * Math.PI * 2 - Math.PI / 2 + ((idx % 7) - 3) * 0.075;   // spread chunks from the same page
      const x = C + Math.cos(ang) * rOf(h.d), y = C + Math.sin(ang) * rOf(h.d);
      const inK = h.r <= sp.k, ans = h.text.includes(ANSWER), full = ans && h.text.includes("Midnight - 9 am");
      return `<g class="pt${inK ? " in" : ""}${sp.sel === h.r ? " sel" : ""}" data-r="${h.r}" data-x="${x.toFixed(1)}" data-y="${y.toFixed(1)}" style="transform:translate(${fly && !REDUCE ? `${C}px,${C}px` : `${x.toFixed(1)}px,${y.toFixed(1)}px`});transition-delay:${idx * 14}ms" tabindex="0" role="button" aria-label="Rank ${h.r}, page ${h.page}, distance ${h.d.toFixed(3)}">
        ${ans ? `<circle r="11" class="${full ? "afull" : "ahalf"}"/>` : ""}<circle r="${inK ? 7 : 5}" class="pd"/>${inK ? `<text y="3.5" class="pr" text-anchor="middle">${h.r}</text>` : ""}</g>`;
    }).join("") + `</g>`;
    s += `<g class="qcore"><circle cx="${C}" cy="${C}" r="16" fill="url(#tt)" class="qdot"/><text x="${C}" y="${C + 34}" class="ringl qlab" text-anchor="middle">your question</text></g></svg>`;
    $("#space-svg").innerHTML = s;
    $("#spKL").textContent = `top-k = ${sp.k}`;
    if (fly && !REDUCE) requestAnimationFrame(() => requestAnimationFrame(() =>
      $$("#space-svg .pt").forEach((g) => (g.style.transform = `translate(${g.dataset.x}px,${g.dataset.y}px)`))));
    renderSpaceSide();
  }
  function renderSpaceSide() {
    const inK = lastHits.slice(0, sp.k);
    const pages = [...new Set(inK.map((h) => h.page))].sort((a, b) => a - b);
    const ansFull = lastHits.find((h) => h.text.includes(ANSWER) && h.text.includes("Midnight - 9 am"));
    const sel = lastHits.find((h) => h.r === sp.sel);
    $("#spaceSide").innerHTML = `<p class="kicker" style="margin:0 0 6px">“${esc(ask.q)}”</p>
      <div class="kpi" style="grid-template-columns:1fr 1fr;margin:0 0 10px"><div class="tile b"><span class="big">${inK.length}</span><small>chunks inside the circle</small></div>
      <div class="tile p"><span class="big">${inK[inK.length - 1].d.toFixed(2)}</span><small>distance of the k-th chunk</small></div></div>
      <p style="font-size:14px;margin:0 0 8px">Pages returned: <b>${pages.map((p) => "p. " + p).join(", ")}</b></p>
      ${ansFull ? `<p style="font-size:14px;margin:0 0 8px"><span class="badge g">full answer</span> sits at <b>rank ${ansFull.r}</b>${ansFull.r > sp.k ? `, outside the circle. Raise k to ${ansFull.r} to catch it.` : ", inside the circle."}</p>` : ""}
      <div class="sel-box">${sel ? `<p class="kicker" style="margin:0 0 4px">Rank ${sel.r} · p. ${sel.page} · distance ${sel.d.toFixed(3)}</p>${sel.q ? `<p class="via" style="margin:0 0 4px">via question: “${esc(sel.q)}”</p>` : ""}<p style="font-size:14px;margin:0">${esc(sel.text.slice(0, 320))}${sel.text.length > 320 ? "…" : ""}</p>`
        : `<p style="font-size:14px;color:var(--muted);margin:0">Click any dot to read its chunk.</p>`}</div>`;
  }
  $("#space-svg").addEventListener("click", (e) => { const g = e.target.closest(".pt"); if (!g) return; sp.sel = +g.dataset.r; $$("#space-svg .pt").forEach((x) => x.classList.toggle("sel", x === g)); renderSpaceSide(); });
  $("#space-svg").addEventListener("keydown", (e) => { if (e.key === "Enter" && e.target.closest(".pt")) e.target.closest(".pt").dispatchEvent(new MouseEvent("click", { bubbles: true })); });
  let spaceSeen = false;
  whenVisible($("#space"), () => { if (!spaceSeen) { spaceSeen = true; renderSpace(true); } });
  const _renderAsk = renderAsk;
  renderAsk = function () { _renderAsk(); sp.sel = null; renderSpace(spaceSeen); };

  /* ======================================================== 3. vector playground (metric slide) */
  $("#vecplay").innerHTML = `<div class="vp-grid"><div id="vpSvg"></div><div>
      <h3 style="margin-top:0">Try it: which document is “closest”?</h3>
      <label class="vp-l">Doc A angle from the question: <b id="vpAL">25°</b></label><input type="range" id="vpA" min="0" max="85" value="25">
      <label class="vp-l">Doc B length: <b id="vpBL">1.6</b></label><input type="range" id="vpB" min="40" max="200" value="160">
      <label class="vp-norm"><input type="checkbox" id="vpN"> Normalize all vectors to length 1 (what MiniLM does)</label>
      <table class="vp-t"><thead><tr><th>Metric</th><th>Doc A</th><th>Doc B</th><th>Winner</th></tr></thead><tbody id="vpT"></tbody></table>
      <p class="vp-msg" id="vpMsg"></p></div></div>`;
  function renderVec() {
    const norm1 = $("#vpN").checked;
    const aAng = +$("#vpA").value, bAng = 50, qAng = 0;
    const La = norm1 ? 1 : 0.6, Lb = norm1 ? 1 : +$("#vpB").value / 100;
    $("#vpAL").textContent = `${aAng}°`; $("#vpBL").textContent = Lb.toFixed(2);
    $("#vpB").disabled = norm1;
    const rad = (d) => (d * Math.PI) / 180, S = 105, O = { x: 26, y: 236 };
    const tip = (ang, L) => ({ x: O.x + Math.cos(rad(ang + 15)) * L * S, y: O.y - Math.sin(rad(ang + 15)) * L * S });
    const q = tip(qAng, 1), a = tip(aAng, La), b = tip(bAng, Lb);
    const cosA = Math.cos(rad(aAng)), cosB = Math.cos(rad(bAng));
    const m = {
      cos: [cosA, cosB, "higher"], dot: [La * cosA, Lb * cosB, "higher"],
      l2: [1 + La * La - 2 * La * cosA, 1 + Lb * Lb - 2 * Lb * cosB, "lower"],
    };
    const win = (k) => (m[k][2] === "higher" ? (m[k][0] >= m[k][1] ? "A" : "B") : (m[k][0] <= m[k][1] ? "A" : "B"));
    const arc = (ang, r) => { const p = tip(ang, r / S); return `${p.x.toFixed(1)} ${p.y.toFixed(1)}`; };
    $("#vpSvg").innerHTML = `<svg viewBox="0 0 290 250" class="vp" role="img" aria-label="Question vector and two document vectors"><defs><marker id="vhq" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="13" markerHeight="13" markerUnits="userSpaceOnUse" orient="auto"><path d="M0 0 10 5 0 10z" style="fill:var(--ink)"/></marker><marker id="vha" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="13" markerHeight="13" markerUnits="userSpaceOnUse" orient="auto"><path d="M0 0 10 5 0 10z" style="fill:var(--brand)"/></marker><marker id="vhb" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="13" markerHeight="13" markerUnits="userSpaceOnUse" orient="auto"><path d="M0 0 10 5 0 10z" style="fill:var(--orange)"/></marker></defs>
      <path d="M ${arc(-10, S)} A ${S} ${S} 0 0 0 ${arc(100, S)}" class="unit"/><text x="${O.x + S * 0.95}" y="${O.y - S * 0.95 + 8}" class="ringl">length 1</text>
      <path d="M ${arc(0, 46)} A 46 46 0 0 0 ${arc(aAng, 46)}" class="angarc"/>
      <line x1="${O.x}" y1="${O.y}" x2="${q.x}" y2="${q.y}" class="vq" marker-end="url(#vhq)"/><text x="${q.x + 6}" y="${q.y + 4}" class="vlab">question</text>
      <line x1="${O.x}" y1="${O.y}" x2="${a.x}" y2="${a.y}" class="va" marker-end="url(#vha)"/><text x="${a.x + 6}" y="${a.y}" class="vlab va-t">A</text>
      <line x1="${O.x}" y1="${O.y}" x2="${b.x}" y2="${b.y}" class="vb" marker-end="url(#vhb)"/><text x="${b.x + 6}" y="${b.y}" class="vlab vb-t">B</text>
      <circle cx="${O.x}" cy="${O.y}" r="4" class="vo"/></svg>`;
    const names = { cos: "Cosine similarity", dot: "Dot product", l2: "Squared L2 distance" };
    $("#vpT").innerHTML = Object.keys(m).map((k) => `<tr><td>${names[k]} <small>(${m[k][2]} is closer)</small></td><td>${m[k][0].toFixed(2)}</td><td>${m[k][1].toFixed(2)}</td><td><span class="badge ${win(k) === "A" ? "b" : "o"}">${win(k)}</span></td></tr>`).join("");
    const agree = new Set(["cos", "dot", "l2"].map(win)).size === 1;
    $("#vpMsg").innerHTML = agree
      ? `<span class="badge g">all agree</span> ${norm1 ? "With every vector at length 1, only the angle matters, so the three metrics always pick the same winner." : "They agree here. Now make Doc B longer and watch the dot product change its mind."}`
      : `<span class="badge r">they disagree</span> The dot product rewards B for being <b>long</b>, not for pointing the same way. Tick “Normalize” to fix it.`;
  }
  ["#vpA", "#vpB", "#vpN"].forEach((id) => $(id).addEventListener("input", renderVec));
  renderVec();

  /* ======================================================== 4. precision / recall dot map (top-k slide) */
  function renderPoolMap() {
    const k = KS[+$("#kslide").value];
    const order = D.pool.map((_, i) => i).sort((a, b) => (isRel(b) - isRel(a)) || a - b);
    const nRel = order.filter(isRel).length;
    const rows = STORE_KEYS.map((st) => {
      const got = new Set(D.sweeps.filter((r) => r.store === st && r.k === 10 && r.rank <= k).map((r) => r.resp));
      const hits = [...got].filter(isRel).length;
      return { st, got, hits, P: got.size ? hits / got.size : 0, R: nRel ? hits / nRel : 0 };
    });
    $("#poolmap").innerHTML = `<div class="pm-head"><h3>The pool: all ${D.pool.length} chunks any store returned at k = 10</h3>
      <span class="pm-legend"><i class="pmd rel"></i> relevant <i class="pmd"></i> not relevant <i class="pmd got"></i> caught at k = ${k}</span></div>
      <div class="pm-row"><span class="pm-name">relevance</span><span class="pm-dots">${order.map((i, j) => `<i class="pmd${isRel(i) ? " rel" : ""}" title="${esc(D.pool[i].text.slice(0, 120))}" style="transition-delay:${j * 12}ms"></i>`).join("")}</span><span class="pm-pr"><b>${nRel}</b> relevant in pool</span></div>
      ${rows.map((r) => `<div class="pm-row"><span class="pm-name">${esc(r.st.split(" / ")[0])}</span><span class="pm-dots">${order.map((i, j) => `<i class="pmd${r.got.has(i) ? " got" : ""}${r.got.has(i) && isRel(i) ? " catch" : ""}" style="transition-delay:${j * 12}ms"></i>`).join("")}</span>
        <span class="pm-pr"><span class="pm-bar"><i style="width:${r.P * 100}%"></i></span>P ${r.P.toFixed(2)} <span class="pm-bar r"><i style="width:${r.R * 100}%"></i></span>R ${r.R.toFixed(2)}</span></div>`).join("")}
      <p class="pm-note"><b>Precision</b> = green dots caught ÷ all dots caught. <b>Recall</b> = green dots caught ÷ all green dots. Slide k: precision usually falls while recall rises.</p>`;
  }
  const _renderLadder = renderLadder;
  renderLadder = function () { _renderLadder(); renderPoolMap(); };
  $("#kslide").addEventListener("input", renderPoolMap);   // app.js bound the slider before this wrapper existed
  renderPoolMap();

  /* ======================================================== 5. question-index connector lines */
  function drawQLines(animate) {
    const svg = $("#qlines"), flow = svg.parentElement;
    const fb = flow.getBoundingClientRect();
    const list = $("#qlist").getBoundingClientRect(), chunks = $("#qchunks").getBoundingClientRect();
    if (chunks.top > list.bottom - 20) {   // stacked on phones: no lines, and no leftover width
      svg.innerHTML = ""; svg.style.width = svg.style.height = "0px"; return;
    }
    svg.setAttribute("viewBox", `0 0 ${fb.width} ${fb.height}`);
    svg.style.width = fb.width + "px"; svg.style.height = fb.height + "px";
    const cards = Object.fromEntries($$("#qchunks .chunkcard").map((c) => [c.dataset.l, c.getBoundingClientRect()]));
    svg.innerHTML = $$("#qlist .qq").map((q, i) => {
      const a = q.getBoundingClientRect(), b = cards[q.dataset.l]; if (!b) return "";
      const x1 = a.right - fb.left, y1 = a.top + a.height / 2 - fb.top, x2 = b.left - fb.left - 2, y2 = b.top + 18 - fb.top;
      const hot = $$("#qlist .qq").filter((x) => x.dataset.l === q.dataset.l).length > 1;
      return `<path d="M${x1} ${y1} C ${x1 + 40} ${y1}, ${x2 - 40} ${y2}, ${x2} ${y2}" class="ql${hot ? " hot" : ""}${animate ? " draw" : ""}" style="animation-delay:${i * 90}ms"/>`;
    }).join("");
  }
  whenVisible($("#qidx"), () => drawQLines(true), 0.3);
  addEventListener("resize", () => drawQLines(false));

  /* ======================================================== 6. judge replay */
  const full = D.pool.find((p) => p.text.includes(ANSWER) && p.text.includes("Midnight - 9 am") && p.judges["gemma3:4b"].score === 5) || D.pool[0];
  const j4 = full.judges["gemma3:4b"];
  const TYPED = [
    { name: "gemma-3-270m", cls: "bad", sec: "~21 s per attempt",
      reply: `{\n  "document_evals": [\n    {"doc_id": "1", "score": 1, "rationale": "The document does not address the question directly."},\n    {"doc_id": "2", "score": 2, "rationale": "The document does not address the question."},\n    {"doc_id": "3", "score": 3, "rationale": "The document does not address the question."},\n    {"doc_id": "4", "score": 4, "rationale": "The document does not address the …`,
      stamp: "✗ Rejected: asked for 1 score, got 5. Failed all 3 retries." },
    { name: "gemma3:4b", cls: "good", sec: `${j4.sec} s`,
      reply: `{\n  "document_evals": [\n    {"doc_id": "1", "score": ${j4.score},\n     "rationale": "${j4.why}"}\n  ],\n  "overall_score": ${j4.score}, …`,
      stamp: `✓ Accepted: 1 document, score ${j4.score}.` },
  ];
  $("#typer").innerHTML = TYPED.map((t, i) => `<div class="term ${t.cls}"><div class="term-bar"><span></span><span></span><span></span><b>${t.name}</b><small>${t.sec}</small></div>
    <p class="term-prompt">Prompt: rate <b>1</b> passage (the one stating the quiet hours) for relevance, reply in JSON.</p>
    <pre class="term-out" id="tout${i}"></pre><div class="stamp" id="tstamp${i}">${t.stamp}</div></div>`).join("")
    + `<p class="pm-note" style="grid-column:1/-1">Real replies from the TA run, trimmed (…). The 270M reply is from the smoke test on the same quiet-hours passage.</p>`;
  let typing = [];
  function playTyper() {
    typing.forEach(clearInterval); typing = [];
    TYPED.forEach((t, i) => {
      const out = $(`#tout${i}`), stamp = $(`#tstamp${i}`);
      stamp.classList.remove("show");
      if (REDUCE) { out.textContent = t.reply; stamp.classList.add("show"); return; }
      let n = 0; out.textContent = "";
      const id = setInterval(() => {
        n += 3; out.textContent = t.reply.slice(0, n);
        if (n >= t.reply.length) { clearInterval(id); setTimeout(() => stamp.classList.add("show"), 250); }
      }, 16);
      typing.push(id);
    });
  }
  $("#typerPlay").addEventListener("click", playTyper);
  let typerSeen = false;
  whenVisible($("#typer"), () => { if (!typerSeen) { typerSeen = true; playTyper(); } }, 0.4);
})();
