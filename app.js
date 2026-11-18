// HW02 companion: concept explainers on a small made-up handbook (Plaid House).
// Nothing here uses results from the real HW02 handbook.
const D = window.HW02;
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const store = { get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } },
                set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} } };
const REDUCE = matchMedia("(prefers-reduced-motion: reduce)").matches;
const deck = $("#deck");
const whenVisible = (el, cb, threshold = 0.35) => new IntersectionObserver((es) => { for (const e of es) if (e.isIntersecting) cb(); }, { root: deck, threshold }).observe(el);
const PATTERN = `<defs><pattern id="tt" width="22" height="22" patternUnits="userSpaceOnUse">
    <rect width="22" height="22" fill="#c41230"/><rect x="6" width="4" height="22" fill="rgba(20,6,8,.45)"/><rect y="6" width="22" height="4" fill="rgba(20,6,8,.45)"/>
    <rect x="15" width="1" height="22" fill="rgba(255,255,255,.6)"/><rect y="15" width="22" height="1" fill="rgba(255,255,255,.6)"/></pattern>
  <marker id="ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 10 5 0 10z" class="ahead"/></marker></defs>`;

/* ================================================================ deck */
const slides = $$(".slide");
const dots = $("#dots");
slides.forEach((s, i) => {
  const b = document.createElement("button");
  b.type = "button"; b.className = ["mB", "mC", "mD"].find((c) => s.classList.contains(c)) || "";
  b.dataset.label = s.dataset.label; b.setAttribute("aria-label", `Slide ${i + 1}: ${s.dataset.label}`);
  b.addEventListener("click", () => go(i));
  dots.appendChild(b);
});
let current = 0;
const seen = new Set();
function go(i) { i = Math.max(0, Math.min(slides.length - 1, i)); slides[i].scrollIntoView({ behavior: REDUCE ? "auto" : "smooth" }); }
function setCurrent(i) {
  current = i; seen.add(i); slides[i].classList.add("seen");
  $$("button", dots).forEach((b, j) => b.setAttribute("aria-current", j === i));
  $("#counter").textContent = `${i + 1} / ${slides.length}`;
  $("#streak").textContent = seen.size;
  let full = 0;
  for (const part of ["A", "B", "C", "D"]) {
    const idx = slides.map((s, j) => (s.dataset.part === part ? j : -1)).filter((j) => j >= 0);
    const frac = idx.filter((j) => seen.has(j)).length / idx.length;
    $(`.seg[data-part=${part}] span`).style.width = `${frac * 100}%`;
    if (frac === 1) full++;
  }
  $(".segs").setAttribute("aria-valuenow", full);
  if (slides[i].id && location.hash !== "#" + slides[i].id) history.replaceState(null, "", "#" + slides[i].id);
}
const io = new IntersectionObserver((entries) => { for (const e of entries) if (e.isIntersecting) setCurrent(slides.indexOf(e.target)); }, { root: deck, threshold: 0.45 });
slides.forEach((s) => io.observe(s));
deck.addEventListener("scroll", () => {   // very tall slides never reach 45% visibility on phones
  const y = deck.scrollTop + 80;
  for (let i = slides.length - 1; i >= 0; i--) if (slides[i].offsetTop <= y) { if (i !== current && slides[i].offsetHeight > innerHeight * 1.6) setCurrent(i); break; }
}, { passive: true });
document.addEventListener("keydown", (e) => {
  if (e.target.closest("input,textarea,select,[contenteditable]") || e.metaKey || e.ctrlKey || e.altKey) return;
  const tall = slides[current].offsetHeight > innerHeight + 40;
  if (["ArrowDown", "PageDown"].includes(e.key) || (e.key === " " && !e.shiftKey)) {
    if (tall && deck.scrollTop + innerHeight < slides[current].offsetTop + slides[current].offsetHeight - 20) return;
    e.preventDefault(); go(current + 1);
  } else if (["ArrowUp", "PageUp"].includes(e.key) || (e.key === " " && e.shiftKey)) {
    if (tall && deck.scrollTop > slides[current].offsetTop + 20) return;
    e.preventDefault(); go(current - 1);
  } else if (e.key === "Home") { e.preventDefault(); go(0); } else if (e.key === "End") { e.preventDefault(); go(slides.length - 1); }
});
$$('a[href^="#"]').forEach((a) => a.addEventListener("click", (e) => {
  const i = slides.findIndex((s) => "#" + s.id === a.getAttribute("href"));
  if (i >= 0) { e.preventDefault(); go(i); }
}));
const startAt = Math.max(0, slides.findIndex((s) => "#" + s.id === location.hash));
setCurrent(startAt);
if (startAt > 0) setTimeout(() => { deck.style.scrollBehavior = "auto"; slides[startAt].scrollIntoView(); deck.style.scrollBehavior = ""; }, 60);

const root = document.documentElement;
const savedTheme = store.get("hw02-theme", null);
if (savedTheme) root.dataset.theme = savedTheme;
$("#theme").addEventListener("click", () => {
  const dark = root.dataset.theme ? root.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
  root.dataset.theme = dark ? "light" : "dark"; store.set("hw02-theme", root.dataset.theme);
});

$$("[data-quiz]").forEach((q) => {
  const fb = $(".feedback", q);
  $$(".opts button", q).forEach((b) => b.addEventListener("click", () => {
    const ok = b.dataset.ok === "1";
    fb.className = "feedback show " + (ok ? "correct" : "retry");
    fb.innerHTML = `<svg class="ic"><use href="#i-${ok ? "check" : "x"}"/></svg><span>${ok ? "Yes! " + esc(q.dataset.why || "") : "Not quite. Try another option."}</span>`;
  }));
});
function segCtl(id, onChange) {
  const el = $(id);
  el.addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b || b.disabled) return;
    $$("button", el).forEach((x) => x.setAttribute("aria-pressed", x === b)); onChange(b.dataset.v);
  });
}
function chips(id, items, onPick, active) {
  const el = $(id);
  el.innerHTML = items.map((p, i) => `<button type="button" data-i="${i}" aria-pressed="${i === active}" title="${esc(p.q)}">${esc(p.label)}</button>`).join("");
  el.addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    $$("button", el).forEach((x) => x.setAttribute("aria-pressed", x === b)); onPick(+b.dataset.i);
  });
}

/* ================================================================ text, chunks, vectors */
const PRESETS = D.presets;
const WORDS = D.guide.text.split(" ");
const SECTIONS = D.guide.sections;
const sectionAt = (pos) => { let s = "Contents"; for (const x of SECTIONS) if (x.at <= pos + 0.004) s = x.name; return s; };
const SENT_RE = /[^.!?]+[.!?]+["”)]?(?:\s|$)|[^.!?]+$/g;   // same as export_companion_data.py
function windows(items, size, ov) {
  const out = [], step = Math.max(1, size - ov);
  for (let i = 0; i < items.length; i += step) { out.push([i, items.slice(i, i + size)]); if (i + size >= items.length) break; }
  return out;
}
function makeChunks(mode, size, ov) {
  if (mode === "word") return windows(WORDS, size, ov).map(([i, w]) => ({ text: w.join(" "), pos: i / WORDS.length }));
  const sents = D.guide.text.match(SENT_RE).map((s) => s.trim()).filter(Boolean);
  const starts = []; let acc = 0; for (const s of sents) { starts.push(acc); acc += s.split(" ").length; }
  return windows(sents, size, ov).map(([i, g]) => ({ text: g.join(" "), pos: starts[i] / WORDS.length }));
}
const BUILT = {};
for (const name of ["word", "sent"]) {
  const s = D[name];
  BUILT[name] = { key: `${name}-${s.size}-${s.overlap}`, text: s.text, pos: s.pos, vecs: s.emb.map((r) => Float32Array.from(r)) };
}
const dot = (a, b) => { let s = 0; for (let j = 0; j < a.length; j++) s += a[j] * b[j]; return s; };
function rankAll(st, qv) { return st.vecs.map((v, i) => ({ i, sim: dot(v, qv) })).sort((a, b) => b.sim - a.sim); }
const hasFact = (text, facts) => facts.some((f) => text.includes(f));
function markFacts(html, facts) { for (const f of facts) html = html.split(esc(f)).join(`<mark>${esc(f)}</mark>`); return html; }
function markWords(html, q) {
  const stop = new Set(["what", "when", "where", "does", "with", "that", "this", "have", "your", "about", "should", "allowed", "there", "from"]);
  const words = [...new Set(q.toLowerCase().match(/[a-z]{4,}/g) || [])].filter((w) => !stop.has(w));
  for (const w of words) html = html.replace(new RegExp(`\\b(${w}\\w*)`, "gi"), "<mark>$1</mark>");
  return html;
}

/* ================================================================ embedding model */
let extractor = null, modelState = "loading";
const setStatus = (el, cls, html) => { el.className = "status " + cls; el.innerHTML = `<span class="pip"></span><span>${html}</span>`; };
const modelWaiters = [];
async function loadModel() {
  try {
    const { pipeline, env } = await import("https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.6");
    env.allowLocalModels = false;
    extractor = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2", { dtype: "q8" });
    modelState = "ready";
    setStatus($("#mstatus"), "ok", "Model ready: <b>all-MiniLM-L6-v2</b> runs in your browser, the same model as your notebook. Ask anything about Plaid House.");
    setStatus($("#fstatus"), "ok", "Semantic search on: your question and every answer are embedded with the same MiniLM model.");
  } catch (err) {
    modelState = "off";
    setStatus($("#mstatus"), "off", "Couldn't load the model (offline or blocked). The example questions still work.");
    setStatus($("#fstatus"), "off", "Model not loaded, so answers are ranked by shared keywords instead.");
    console.warn(err);
  }
  modelWaiters.splice(0).forEach((f) => f());
}
async function embedText(t) {
  t = t.trim();
  const p = PRESETS.find((x) => x.q === t); if (p) return Float32Array.from(p.emb);
  const qi = D.qidx.text.indexOf(t); if (qi >= 0) return Float32Array.from(D.qidx.emb[qi]);
  if (extractor) return Float32Array.from((await extractor(t, { pooling: "mean", normalize: true })).data);
  return null;
}
async function getStore(name) {
  if (name !== "mine") return BUILT[name];
  const key = `${lab.mode}-${+$("#csize").value}-${labOverlap()}`;
  const same = Object.values(BUILT).find((b) => b.key === key);
  if (same) return same;
  if (!extractor) return null;
  const chunks = makeChunks(lab.mode, +$("#csize").value, labOverlap());
  const out = await extractor(chunks.map((c) => c.text), { pooling: "mean", normalize: true });
  const d = out.dims[1], data = out.data;
  BUILT[key] = { key, text: chunks.map((c) => c.text), pos: chunks.map((c) => c.pos), vecs: chunks.map((_, r) => data.slice(r * d, r * d + d)) };
  return BUILT[key];
}
setTimeout(loadModel, 500);

/* ================================================================ 1. pipeline animation */
(function pipeline() {
  const P = PRESETS.find((p) => p.label === "Being quiet") || PRESETS[0];
  const st = BUILT.word, top3 = rankAll(st, Float32Array.from(P.emb)).slice(0, 3)
    .map((h) => ({ sec: sectionAt(st.pos[h.i]), ok: hasFact(st.text[h.i], P.facts) }));
  const good = top3.filter((t) => t.ok).length;
  const CAPS = [
    `<b>The document.</b> Plaid House has ${SECTIONS.length} short sections. A real handbook has hundreds of pages, and nobody wants to read all of it to find one rule.`,
    `<b>1 · Chunk.</b> Cut the text into small pieces. Here: windows of 50 words that overlap by 10 → ${st.text.length} chunks.`,
    "<b>2 · Embed.</b> A model turns every chunk into 384 numbers: an arrow in “meaning space”. Similar meaning, similar arrow.",
    "<b>3 · Store.</b> A vector database (Chroma) keeps every arrow plus an index, so it can find near neighbours fast.",
    `<b>4 · Ask.</b> Your question becomes an arrow too. The store hands back the k closest chunks. The top hit here comes from <i>${esc(top3[0].sec)}</i>.`,
    `<b>5 · Judge.</b> Close is not the same as useful. ${good} of these 3 actually contain the answer, so precision@3 = ${good}/3.`,
  ];
  const vecBars = (x, y, seed, h = 24) => Array.from({ length: 12 }, (_, j) => {
    const v = Math.abs(Math.sin(seed * 12.9898 + j * 78.233)) % 1, hh = 6 + v * h;
    return `<rect x="${x + j * 8}" y="${y + h + 4 - hh}" width="6" height="${hh}" rx="2" class="${["vb1", "vb2", "vb3", "vb4"][Math.floor(v * 4)]}"/>`;
  }).join("");
  const lines = (x, y, n, w) => Array.from({ length: n }, (_, i) => `<rect x="${x}" y="${y + i * 9}" width="${w - (i % 3) * 14}" height="4" rx="2" class="pline"/>`).join("");
  let s = `<svg viewBox="0 0 1000 330" class="pipe" id="pipeSvg" role="img" aria-label="Animated diagram: chunk, embed, store, ask, judge">${PATTERN}`;
  [[48, "Document"], [213, "Chunk"], [376, "Embed"], [565, "Store"], [770, "Ask + rank"]].forEach(([x, t], i) => s += `<g class="phead h${i}"><text x="${x}" y="24" class="plab">${i ? i + " · " : ""}${t}</text></g>`);
  s += `<g class="ps0"><rect x="40" y="48" width="122" height="180" rx="12" class="paper"/><rect x="40" y="48" width="122" height="26" rx="12" fill="url(#tt)"/><rect x="40" y="62" width="122" height="12" fill="url(#tt)"/>${lines(54, 88, 13, 94)}<text x="101" y="252" class="pcap" text-anchor="middle">${SECTIONS.length} sections</text></g>`;
  s += `<g class="ps1">` + [0, 1, 2, 3].map((i) => `<g class="pchunk" style="transition-delay:${i * 110}ms"><rect x="205" y="${50 + i * 46}" width="118" height="36" rx="8" class="pck pck${i}"/>${lines(215, 60 + i * 46, 2, 90)}</g>`).join("") + `<text x="264" y="252" class="pcap" text-anchor="middle">${st.text.length} chunks</text></g>`;
  s += `<g class="ps2">` + [0, 1, 2, 3].map((i) => `<g class="pvec" style="transition-delay:${i * 110}ms"><path d="M328 ${68 + i * 46} H362" class="parrow" marker-end="url(#ah)"/>${vecBars(368, 52 + i * 46, i + 1)}</g>`).join("") + `<text x="415" y="252" class="pcap" text-anchor="middle">384 numbers each</text></g>`;
  const pts = Array.from({ length: 46 }, (_, i) => { const hit = [7, 19, 30].includes(i); return `<circle cx="${535 + ((i * 37) % 120)}" cy="${92 + ((i * 53) % 118)}" r="${hit ? 5 : 3.4}" class="pdot${hit ? " phit" : ""}" style="transition-delay:${(i % 12) * 40}ms"/>`; }).join("");
  s += `<g class="ps3"><path d="M462 140 H515" class="parrow" marker-end="url(#ah)"/><ellipse cx="595" cy="232" rx="78" ry="16" class="cyl"/><rect x="517" y="76" width="156" height="156" class="cyl"/><ellipse cx="595" cy="76" rx="78" ry="16" class="cyltop"/>${pts}<text x="595" y="268" class="pcap" text-anchor="middle">vector store</text></g>`;
  s += `<g class="ps4"><rect x="742" y="40" width="226" height="40" rx="20" class="bubble"/><text x="855" y="65" class="ptext" text-anchor="middle">${esc(P.q)}</text><g class="qvec">${vecBars(806, 86, 9, 20)}</g>
    <path d="M800 112 C 760 120, 720 112, 680 120" class="parrow pflow" marker-end="url(#ah)"/><path d="M676 186 C 705 186, 720 186, 744 186" class="parrow pflow2" marker-end="url(#ah)"/>
    ${top3.map((t, i) => `<g class="pres" style="transition-delay:${400 + i * 160}ms"><rect x="750" y="${140 + i * 42}" width="218" height="34" rx="10" class="pres-r"/><text x="764" y="${162 + i * 42}" class="ptext">#${i + 1} · ${esc(t.sec)}</text></g>`).join("")}</g>`;
  s += `<g class="ps5">${top3.map((t, i) => `<g class="pjudge" style="transition-delay:${i * 160}ms"><circle cx="942" cy="${157 + i * 42}" r="13" class="score-c ${t.ok ? "s5" : "s2"}"/><text x="942" y="${162 + i * 42}" class="pscore" text-anchor="middle">${t.ok ? "✓" : "✗"}</text></g>`).join("")}
    <text x="858" y="290" class="pcap" text-anchor="middle">does it contain the answer?</text><text x="858" y="310" class="pcap${good ? "" : " pbad"}" text-anchor="middle">precision@3 = ${good} / 3</text></g></svg>`;
  $("#pipe").innerHTML = s;
  $("#pipeSteps").innerHTML = CAPS.map((_, i) => `<button type="button" data-i="${i}" aria-label="Step ${i}"></button>`).join("");
  const pipe = { step: 0, timer: null };
  function setStep(n) {
    pipe.step = Math.max(0, Math.min(CAPS.length - 1, n));
    const svg = $("#pipeSvg");
    for (let i = 1; i < CAPS.length; i++) svg.classList.toggle("on" + i, pipe.step >= i);
    svg.dataset.step = pipe.step;
    $("#pipeCap").innerHTML = CAPS[pipe.step];
    $$("#pipeSteps button").forEach((b, i) => b.setAttribute("aria-current", i === pipe.step));
    if (pipe.step === CAPS.length - 1) stop(true);
  }
  function stop(done) { clearInterval(pipe.timer); pipe.timer = null; $("#pipePlay").textContent = done ? "Replay" : "Play"; }
  function play() {
    if (pipe.timer) return stop(false);
    if (pipe.step >= CAPS.length - 1) setStep(0);
    $("#pipePlay").textContent = "Pause";
    pipe.timer = setInterval(() => setStep(pipe.step + 1), REDUCE ? 1800 : 2800);
  }
  $("#pipePlay").addEventListener("click", play);
  $("#pipeNext").addEventListener("click", () => { stop(false); setStep(pipe.step + 1); });
  $("#pipePrev").addEventListener("click", () => { stop(false); setStep(pipe.step - 1); });
  $("#pipeSteps").addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) { stop(false); setStep(+b.dataset.i); } });
  setStep(0);
  let auto = false;
  whenVisible($("#pipeline"), () => { if (!auto) { auto = true; setTimeout(play, 500); } }, 0.5);
})();

/* ================================================================ 2. vector playground */
(function vectors() {
  $("#vecplay").innerHTML = `<div class="vp-grid"><div id="vpSvg"></div><div>
      <h3 style="margin-top:0">Which document is “closest” to the question?</h3>
      <label class="vp-l">Doc A angle from the question: <b id="vpAL">25°</b></label><input type="range" id="vpA" min="0" max="85" value="25">
      <label class="vp-l">Doc B length: <b id="vpBL">1.6</b></label><input type="range" id="vpB" min="40" max="200" value="160">
      <label class="vp-norm"><input type="checkbox" id="vpN"> Make every arrow length 1 (normalize)</label>
      <table class="vp-t"><thead><tr><th>Metric</th><th>Doc A</th><th>Doc B</th><th>Winner</th></tr></thead><tbody id="vpT"></tbody></table>
      <p class="vp-msg" id="vpMsg"></p></div></div>`;
  function render() {
    const norm1 = $("#vpN").checked, aAng = +$("#vpA").value, bAng = 50;
    const La = norm1 ? 1 : 0.6, Lb = norm1 ? 1 : +$("#vpB").value / 100;
    $("#vpAL").textContent = `${aAng}°`; $("#vpBL").textContent = Lb.toFixed(2); $("#vpB").disabled = norm1;
    const rad = (d) => (d * Math.PI) / 180, S = 105, O = { x: 26, y: 236 };
    const tip = (ang, L) => ({ x: O.x + Math.cos(rad(ang + 15)) * L * S, y: O.y - Math.sin(rad(ang + 15)) * L * S });
    const q = tip(0, 1), a = tip(aAng, La), b = tip(bAng, Lb);
    const cosA = Math.cos(rad(aAng)), cosB = Math.cos(rad(bAng));
    const m = { cos: [cosA, cosB, "higher"], dot: [La * cosA, Lb * cosB, "higher"], l2: [1 + La * La - 2 * La * cosA, 1 + Lb * Lb - 2 * Lb * cosB, "lower"] };
    const win = (k) => (m[k][2] === "higher" ? (m[k][0] >= m[k][1] ? "A" : "B") : (m[k][0] <= m[k][1] ? "A" : "B"));
    const arc = (ang, r) => { const p = tip(ang, r / S); return `${p.x.toFixed(1)} ${p.y.toFixed(1)}`; };
    const mk = (id, col) => `<marker id="${id}" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="13" markerHeight="13" markerUnits="userSpaceOnUse" orient="auto"><path d="M0 0 10 5 0 10z" style="fill:var(${col})"/></marker>`;
    $("#vpSvg").innerHTML = `<svg viewBox="0 0 290 250" class="vp" role="img" aria-label="Question arrow and two document arrows"><defs>${mk("vhq", "--ink")}${mk("vha", "--brand")}${mk("vhb", "--orange")}</defs>
      <path d="M ${arc(-10, S)} A ${S} ${S} 0 0 0 ${arc(100, S)}" class="unit"/><text x="${O.x + S * 0.95}" y="${O.y - S * 0.95 + 8}" class="ringl">length 1</text>
      <path d="M ${arc(0, 46)} A 46 46 0 0 0 ${arc(aAng, 46)}" class="angarc"/>
      <line x1="${O.x}" y1="${O.y}" x2="${q.x}" y2="${q.y}" class="vq" marker-end="url(#vhq)"/><text x="${q.x + 6}" y="${q.y + 4}" class="vlab">question</text>
      <line x1="${O.x}" y1="${O.y}" x2="${a.x}" y2="${a.y}" class="va" marker-end="url(#vha)"/><text x="${a.x + 6}" y="${a.y}" class="vlab va-t">A</text>
      <line x1="${O.x}" y1="${O.y}" x2="${b.x}" y2="${b.y}" class="vb" marker-end="url(#vhb)"/><text x="${b.x + 6}" y="${b.y}" class="vlab vb-t">B</text>
      <circle cx="${O.x}" cy="${O.y}" r="4" class="vo"/></svg>`;
    const names = { cos: "Cosine similarity", dot: "Dot product", l2: "Squared L2 distance" };
    $("#vpT").innerHTML = Object.keys(m).map((k) => `<tr><td>${names[k]} <small>(${m[k][2]} = closer)</small></td><td>${m[k][0].toFixed(2)}</td><td>${m[k][1].toFixed(2)}</td><td><span class="badge ${win(k) === "A" ? "b" : "o"}">${win(k)}</span></td></tr>`).join("");
    const agree = new Set(["cos", "dot", "l2"].map(win)).size === 1;
    $("#vpMsg").innerHTML = agree
      ? `<span class="badge g">all agree</span> ${norm1 ? "Every arrow has length 1, so only the angle is left. The three metrics always pick the same winner." : "They agree for now. Make Doc B longer and watch the dot product change its mind."}`
      : `<span class="badge r">they disagree</span> The dot product prefers B because it is <b>long</b>, not because it points the same way. Tick “normalize” and see what happens.`;
  }
  ["#vpA", "#vpB", "#vpN"].forEach((id) => $(id).addEventListener("input", render));
  render();
})();

/* ================================================================ 3. chunking lab */
const FACTUAL = PRESETS.filter((p) => p.facts.length);
const lab = { mode: "word", pi: Math.max(0, FACTUAL.findIndex((p) => p.label === "Being quiet")) };
const labOverlap = () => Math.min(+$("#cov").value, +$("#csize").value - 1);
const S = { q: "", vec: null, facts: null, store: "word", k: 3, sel: null, hits: [] };
let searchSeen = false;
chips("#cPresets", FACTUAL, (i) => { lab.pi = i; renderChunks(); }, lab.pi);
segCtl("#cmode", (v) => {
  lab.mode = v;
  const cs = $("#csize"), co = $("#cov");
  if (v === "word") { cs.min = 10; cs.max = 150; cs.value = 50; co.max = 40; co.value = 10; } else { cs.min = 1; cs.max = 8; cs.value = 4; co.max = 3; co.value = 1; }
  renderChunks();
});
$("#csize").addEventListener("input", renderChunks);
$("#cov").addEventListener("input", renderChunks);
function renderChunks() {
  const size = +$("#csize").value, ov = labOverlap(), unit = lab.mode === "word" ? "words" : "sentences";
  $("#csizeL").textContent = `Chunk size: ${size} ${unit}`; $("#covL").textContent = `Overlap: ${ov} ${unit}`;
  const facts = FACTUAL[lab.pi].facts, chunks = makeChunks(lab.mode, size, ov);
  $("#chunkview").innerHTML = chunks.map((c, i) => {
    const h = esc(c.text).replace(/\b([A-Z][A-Z-]{2,}(?: [A-Z][A-Z-]{2,})*)\b/g, "<b>$1</b>");
    return `<span class="ck ck${i % 4}${hasFact(c.text, facts) ? " has-answer" : ""}" style="animation-delay:${Math.min(i, 30) * 28}ms"><span class="cknum">${i + 1}</span>${markFacts(h, facts)}</span> `;
  }).join("");
  const first = $("#chunkview .has-answer");
  if (first) $("#chunkview").scrollTop = first.offsetTop - $("#chunkview").offsetTop - 40;
  const holders = chunks.map((c, i) => (hasFact(c.text, facts) ? i + 1 : 0)).filter(Boolean);
  const whole = chunks.findIndex((c) => facts.every((f) => c.text.includes(f)));
  const avg = chunks.reduce((t, c) => t + c.text.split(" ").length, 0) / chunks.length;
  $("#kN").textContent = chunks.length;
  $("#kWhole").textContent = whole >= 0 ? "Yes" : "No";
  $("#kWhole").parentElement.className = "tile " + (whole >= 0 ? "g" : "r");
  $("#kLen").textContent = Math.round(avg);
  const sec = whole >= 0 ? sectionAt(chunks[whole].pos) : "";
  $("#ctip").innerHTML = whole >= 0
    ? `The whole answer sits in chunk <b>${whole + 1}</b>. Does that chunk also contain the heading (<b>${esc(sec.toUpperCase())}</b>)? Words like that help the search recognise what the chunk is about.${avg > 80 ? " But big chunks mix several topics, which blurs their meaning." : ""}`
    : `The answer is spread over chunks <b>${holders.join(", ") || "–"}</b>. Each piece alone may not look like a match. What size or overlap would keep it together, and what would that cost?`;
  if (searchSeen && S.store === "mine") renderSearch(false);
}
renderChunks();

/* ================================================================ 4. search + dartboard */
chips("#presets", PRESETS, (i) => { $("#q").value = PRESETS[i].q; runSearch(); }, -1);
segCtl("#store", (v) => { S.store = v; S.sel = null; renderSearch(true); });
$("#kslide").addEventListener("input", () => { S.k = +$("#kslide").value; renderSearch(false); });
$("#go").addEventListener("click", runSearch);
$("#q").addEventListener("keydown", (e) => { if (e.key === "Enter") runSearch(); });
$("#q").value = (PRESETS.find((p) => p.label === "Late laundry") || PRESETS[0]).q;
async function runSearch() {
  const q = $("#q").value.trim(); if (!q) return;
  const vec = await embedText(q);
  if (!vec) {
    $("#spaceSide").innerHTML = `<div class="tip warn"><svg class="ic"><use href="#i-bulb"/></svg><span>${modelState === "loading" ? "The model is still loading. It will search as soon as it's ready, or pick an example question." : "Without the model, only the example questions can be searched."}</span></div>`;
    if (modelState === "loading") modelWaiters.push(runSearch);
    return;
  }
  Object.assign(S, { q, vec, sel: null, facts: PRESETS.find((p) => p.q === q)?.facts ?? null });
  $$("#presets button").forEach((b) => b.setAttribute("aria-pressed", PRESETS[+b.dataset.i].q === q));
  renderSearch(true);
}
const C = 270, R = 192;
async function renderSearch(fly) {
  if (!S.vec || !searchSeen) return;
  const st = await getStore(S.store);
  if (!st) {
    $("#space-svg").innerHTML = "";
    $("#spaceSide").innerHTML = `<div class="tip warn"><svg class="ic"><use href="#i-bulb"/></svg><span>“Mine” re-embeds the chunks from your chunking lab, which needs the model. ${modelState === "loading" ? "It's still loading…" : "It couldn't load here. Set the lab back to 50 words / 10 overlap or 4 sentences / 1 overlap to use the built-in chunks."}</span></div>`;
    if (modelState === "loading") modelWaiters.push(() => renderSearch(true));
    return;
  }
  S.hits = rankAll(st, S.vec).map((h, r) => ({ ...h, r: r + 1, d: 1 - h.sim, text: st.text[h.i], pos: st.pos[h.i] }));
  const k = Math.min(S.k, S.hits.length);
  $("#kL").textContent = `top-k = ${k}`;
  const dmax = Math.max(0.6, Math.ceil(S.hits[S.hits.length - 1].d * 10) / 10);
  const dmin = Math.max(0, Math.floor(S.hits[0].d * 10) / 10 - 0.1);
  const rOf = (d) => 18 + ((d - dmin) / (dmax - dmin)) * (R - 18);
  const kr = k < S.hits.length ? (rOf(S.hits[k - 1].d) + rOf(S.hits[k].d)) / 2 : rOf(S.hits[k - 1].d) + 8;
  const ang = (pos) => pos * Math.PI * 2 - Math.PI / 2;
  let s = `<svg viewBox="0 0 540 540" class="dart" role="img" aria-label="Chunks placed by distance from your question">${PATTERN}`;
  [0.25, 0.5, 0.75, 1].filter((d) => d > dmin && d < dmax).forEach((d) => s += `<circle cx="${C}" cy="${C}" r="${rOf(d)}" class="ring"/><text x="${C + 4}" y="${C - rOf(d) + 13}" class="ringl">${d}</text>`);
  s += SECTIONS.map((x) => {
    const a = ang(x.at + 0.004), co = Math.cos(a), si = Math.sin(a);
    const anchor = co > 0.25 ? "start" : co < -0.25 ? "end" : "middle";
    return `<line x1="${(C + co * (R + 4)).toFixed(1)}" y1="${(C + si * (R + 4)).toFixed(1)}" x2="${(C + co * (R + 12)).toFixed(1)}" y2="${(C + si * (R + 12)).toFixed(1)}" class="tick"/><text x="${(C + co * (R + 16)).toFixed(1)}" y="${(C + si * (R + 16) + 4).toFixed(1)}" class="ringl seclab" text-anchor="${anchor}">${esc(x.name)}</text>`;
  }).join("");
  s += `<circle cx="${C}" cy="${C}" style="r:${kr}px" class="kring"/><g class="pts">`;
  s += S.hits.map((h, idx) => {
    const x = C + Math.cos(ang(h.pos)) * rOf(h.d), y = C + Math.sin(ang(h.pos)) * rOf(h.d);
    const inK = h.r <= k, ans = S.facts && hasFact(h.text, S.facts);
    return `<g class="pt${inK ? " in" : ""}${S.sel === h.r ? " sel" : ""}" data-r="${h.r}" data-x="${x.toFixed(1)}" data-y="${y.toFixed(1)}" style="transform:translate(${fly && !REDUCE ? `${C}px,${C}px` : `${x.toFixed(1)}px,${y.toFixed(1)}px`});transition-delay:${idx * 16}ms" tabindex="0" role="button" aria-label="Rank ${h.r}, ${esc(sectionAt(h.pos))}, distance ${h.d.toFixed(2)}">
      ${ans ? `<circle r="12" class="afull"/>` : ""}<circle r="${inK ? 8 : 5}" class="pd"/>${inK ? `<text y="3.5" class="pr" text-anchor="middle">${h.r}</text>` : ""}</g>`;
  }).join("") + `</g><g class="qcore"><circle cx="${C}" cy="${C}" r="14" fill="url(#tt)" class="qdot"/></g></svg>`;
  $("#space-svg").innerHTML = s;
  if (fly && !REDUCE) requestAnimationFrame(() => requestAnimationFrame(() => $$("#space-svg .pt").forEach((g) => (g.style.transform = `translate(${g.dataset.x}px,${g.dataset.y}px)`))));
  renderSearchSide();
}
function renderSearchSide() {
  const k = Math.min(S.k, S.hits.length), top = S.hits.slice(0, k);
  const sel = S.sel && S.sel > k ? S.hits[S.sel - 1] : null;
  const card = (h, extra = "") => {
    const t = S.facts ? markFacts(esc(h.text), S.facts) : markWords(esc(h.text), S.q);
    const ans = S.facts && hasFact(h.text, S.facts);
    return `<article class="hit${ans ? " answer" : ""}${S.sel === h.r ? " open" : ""}" data-r="${h.r}" style="animation-delay:${Math.min(h.r, 10) * 40}ms"><div class="meta"><span class="rank">${h.r}</span><span>${esc(sectionAt(h.pos))}</span><span class="distbar" title="similarity"><i style="width:${Math.max(4, h.sim * 100)}%"></i></span><span>distance ${h.d.toFixed(2)}</span>${ans ? `<span class="badge g">has the answer</span>` : ""}${extra}</div><p>${t}</p></article>`;
  };
  $("#spaceSide").innerHTML = `<p class="kicker" style="margin:0 0 8px">“${esc(S.q)}” · top ${k}</p><div class="results">${top.map((h) => card(h)).join("")}${sel ? card(sel, `<span class="badge o">outside top-k</span>`) : ""}</div>`;
  let tip;
  const firstAns = S.facts?.length ? S.hits.find((h) => hasFact(h.text, S.facts)) : null;
  if (S.facts && !S.facts.length) tip = `Plaid House says nothing about this, yet search still returns ${k} chunks. <b>Retrieval always returns something.</b> Being closest doesn't make it an answer.`;
  else if (firstAns && firstAns.r <= k) tip = `The answer is at <b>rank ${firstAns.r}</b>, inside your top-${k}. Is everything else inside the circle useful too, or just noise?`;
  else if (firstAns) tip = `The answer is at <b>rank ${firstAns.r}</b>, outside the circle. What k would you need, and how many unhelpful chunks come with it?`;
  else tip = `Read the top hit. Does it actually <b>answer</b> your question, or does it just share words with it? That's the gap between similarity and relevance.`;
  $("#asktip").innerHTML = `Each dot is a chunk. Closer to the centre = more similar; the angle shows where in the guide it lives. ${tip}`;
}
$("#space-svg").addEventListener("click", (e) => { const g = e.target.closest(".pt"); if (!g) return; S.sel = +g.dataset.r; $$("#space-svg .pt").forEach((x) => x.classList.toggle("sel", x === g)); renderSearchSide(); });
$("#space-svg").addEventListener("keydown", (e) => { if (e.key === "Enter" && e.target.closest(".pt")) e.target.closest(".pt").dispatchEvent(new MouseEvent("click", { bubbles: true })); });
$("#spaceSide").addEventListener("click", (e) => { const a = e.target.closest(".hit"); if (!a) return; S.sel = S.sel === +a.dataset.r ? null : +a.dataset.r; $$("#space-svg .pt").forEach((x) => x.classList.toggle("sel", +x.dataset.r === S.sel)); renderSearchSide(); });
whenVisible($("#search"), () => { if (!searchSeen) { searchSeen = true; runSearch(); } }, 0.25);

/* ================================================================ 5. precision & recall */
// Plaid House is tiny, so we know every chunk that holds the answer. Recall uses all of them.
const PR = { pi: Math.max(0, PRESETS.findIndex((p) => p.label === "Being quiet")), k: 3, sel: null };
const STORE_NAMES = { word: "50 words", sent: "4 sentences" };
chips("#pPresets", PRESETS, (i) => { PR.pi = i; PR.sel = null; renderPR(); }, PR.pi);
$("#pk").addEventListener("input", () => { PR.k = +$("#pk").value; renderPR(); });
function rankedFor(pi, name) {
  const qv = Float32Array.from(PRESETS[pi].emb), facts = PRESETS[pi].facts;
  return rankAll(BUILT[name], qv).map((h, r) => ({ id: name[0] + h.i, store: name, r: r + 1, text: BUILT[name].text[h.i], pos: BUILT[name].pos[h.i], rel: hasFact(BUILT[name].text[h.i], facts) }));
}
function prAt(list, k) {
  const total = list.filter((x) => x.rel).length, hits = list.filter((x) => x.r <= k && x.rel).length;
  return { P: hits / k, R: total ? hits / total : null, total };
}
function renderPR() {
  const k = PR.k, lists = { word: rankedFor(PR.pi, "word"), sent: rankedFor(PR.pi, "sent") };
  $("#pkL").textContent = `top-k = ${k}`;
  const rows = ["word", "sent"].map((name) => {
    const m = prAt(lists[name], k);
    const dots = lists[name].map((x, j) => `<i class="pmd${x.rel ? " rel" : ""}${x.r <= k ? " got" : " out"}${x.r <= k && x.rel ? " catch" : ""}${PR.sel === x.id ? " sel" : ""}" data-id="${x.id}" title="rank ${x.r}" style="transition-delay:${j * 14}ms"></i>`).join("");
    return `<div class="pm-row"><span class="pm-name">${STORE_NAMES[name]}</span><span class="pm-dots">${dots}</span>
      <span class="pm-pr"><span class="pm-bar"><i style="width:${m.P * 100}%"></i></span>P ${m.P.toFixed(2)} <span class="pm-bar r"><i style="width:${(m.R ?? 0) * 100}%"></i></span>R ${m.R == null ? "n/a" : m.R.toFixed(2)}</span></div>`;
  }).join("");
  const none = !PRESETS[PR.pi].facts.length;
  $("#poolmap").innerHTML = `<div class="pm-head"><h3>Every chunk, ranked from closest to furthest</h3>
    <span class="pm-legend"><i class="pmd rel"></i> has the answer <i class="pmd got"></i> returned at k = ${k} <i class="pmd out"></i> not returned</span></div>
    ${rows}
    <p class="pm-note">${none ? "Nothing in the guide answers this question, so recall is 0 ÷ 0: it can't be computed." : "<b>Precision</b> = green dots returned ÷ k. <b>Recall</b> = green dots returned ÷ all green dots in that row."}</p>`;
  const W = 380, H = 230, L = 34, B = 30, T = 14, Rt = 12, xs = (kk) => L + ((kk - 1) / 9) * (W - L - Rt), ys = (v) => T + (1 - v) * (H - T - B);
  const series = [];
  for (const name of ["word", "sent"]) {
    const pts = Array.from({ length: 10 }, (_, i) => prAt(lists[name], i + 1));
    const path = (key) => pts.map((m, i) => `${i ? "L" : "M"}${xs(i + 1).toFixed(1)} ${ys(m[key] ?? 0).toFixed(1)}`).join(" ");
    series.push({ name, kind: "P", d: path("P") });
    if (!none) series.push({ name, kind: "R", d: path("R") });
  }
  $("#prchart").innerHTML = `<h3 style="margin:0 0 6px">As k grows…</h3><svg viewBox="0 0 ${W} ${H}" class="prsvg" role="img" aria-label="Precision and recall for k from 1 to 10">
    ${[0, 0.5, 1].map((v) => `<line x1="${L}" x2="${W - Rt}" y1="${ys(v)}" y2="${ys(v)}" class="grid"/><text x="${L - 6}" y="${ys(v) + 4}" text-anchor="end" class="ax">${v}</text>`).join("")}
    ${Array.from({ length: 10 }, (_, i) => `<text x="${xs(i + 1)}" y="${H - 10}" text-anchor="middle" class="ax">${i + 1}</text>`).join("")}
    <text x="${W - Rt}" y="${H}" text-anchor="end" class="ax">k</text>
    <line x1="${xs(k)}" x2="${xs(k)}" y1="${T - 4}" y2="${H - B}" class="kline"/>
    ${series.map((s) => `<path d="${s.d}" class="pl ${s.name} ${s.kind}"/>`).join("")}</svg>
    <div class="pr-legend"><span><i class="sw word P"></i>precision · 50 words</span><span><i class="sw word R"></i>recall · 50 words</span><span><i class="sw sent P"></i>precision · 4 sentences</span><span><i class="sw sent R"></i>recall · 4 sentences</span></div>`;
  const x = [...lists.word, ...lists.sent].find((p) => p.id === PR.sel);
  $("#poolSel").innerHTML = x
    ? `<p class="kicker" style="margin:0 0 4px">${STORE_NAMES[x.store]} · rank ${x.r} · ${esc(sectionAt(x.pos))} · ${x.rel ? '<span class="badge g">has the answer</span>' : '<span class="badge r">no answer</span>'}</p><p style="font-size:14px;margin:0">${markFacts(esc(x.text), PRESETS[PR.pi].facts)}</p>`
    : `<p style="margin:0;color:var(--muted);font-size:14px">“${esc(PRESETS[PR.pi].q)}” · click any dot to read its chunk.</p>`;
}
$("#poolmap").addEventListener("click", (e) => {
  const d = e.target.closest(".pmd[data-id]"); if (!d) return;
  PR.sel = d.dataset.id; renderPR();
});
renderPR();

/* ================================================================ 6. question index */
const QX = { pi: Math.max(0, PRESETS.findIndex((p) => p.label === "Being quiet")), k: 5 };
const QVECS = D.qidx.emb.map((e) => Float32Array.from(e));
chips("#qPresets", PRESETS, (i) => { QX.pi = i; renderQidx(true); }, QX.pi);
function renderQidx(animate) {
  const P = PRESETS[QX.pi], qv = Float32Array.from(P.emb);
  const qs = QVECS.map((e, i) => ({ i, sim: dot(e, qv) })).sort((a, b) => b.sim - a.sim).slice(0, QX.k);
  const counts = new Map(); qs.forEach((h) => { const c = D.qidx.chunk[h.i]; counts.set(c, (counts.get(c) || 0) + 1); });
  const letters = new Map([...counts.keys()].map((c, i) => [c, String.fromCharCode(65 + i)]));
  $("#qlist").innerHTML = `<h3>Closest stored questions</h3>` + qs.map((h, r) => { const c = D.qidx.chunk[h.i];
    return `<div class="qq" data-l="${letters.get(c)}"><span class="badge p tag">${r + 1}</span><span>${esc(D.qidx.text[h.i])}</span><span class="badge ${counts.get(c) > 1 ? "o" : "b"} tag" style="margin-left:auto">${letters.get(c)}</span></div>`; }).join("");
  $("#qchunks").innerHTML = `<h3>Chunks you get back</h3>` + [...counts.entries()].map(([c, n]) => { const t = BUILT.sent.text[c], ans = P.facts.length && hasFact(t, P.facts);
    return `<div class="chunkcard${n > 1 ? " hot" : ""}" data-l="${letters.get(c)}"><span class="badge ${n > 1 ? "o" : "b"}">${letters.get(c)}</span> <b>${n}×</b> ${P.facts.length ? (ans ? '<span class="badge g">has the answer</span>' : '<span class="badge r">no answer</span>') : ""}<p style="margin:6px 0 0;font-size:13px;max-width:none">${markFacts(esc(t), P.facts)}</p></div>`; }).join("");
  const found = P.facts.length && [...counts.keys()].some((c) => hasFact(BUILT.sent.text[c], P.facts));
  $("#qtip").innerHTML = `${QX.k} matched questions → <b>${counts.size} unique chunk${counts.size > 1 ? "s" : ""}</b>. Each stored question carries one chunk. ` +
    (!P.facts.length ? "This question has no answer in the guide, yet the index still returns chunks." : found ? "The answer is in at least one of them." : "None of them holds the answer.");
  requestAnimationFrame(() => drawQLines(animate));
}
function drawQLines(animate) {
  const svg = $("#qlines"), fb = svg.parentElement.getBoundingClientRect();
  const list = $("#qlist").getBoundingClientRect(), chunksR = $("#qchunks").getBoundingClientRect();
  if (!fb.width || chunksR.top > list.bottom - 20) { svg.innerHTML = ""; svg.style.width = svg.style.height = "0px"; return; }
  svg.setAttribute("viewBox", `0 0 ${fb.width} ${fb.height}`); svg.style.width = fb.width + "px"; svg.style.height = fb.height + "px";
  const cards = Object.fromEntries($$("#qchunks .chunkcard").map((c) => [c.dataset.l, c.getBoundingClientRect()]));
  const qqs = $$("#qlist .qq");
  svg.innerHTML = qqs.map((q, i) => {
    const a = q.getBoundingClientRect(), b = cards[q.dataset.l]; if (!b) return "";
    const x1 = a.right - fb.left, y1 = a.top + a.height / 2 - fb.top, x2 = b.left - fb.left - 2, y2 = b.top + 18 - fb.top;
    const hot = qqs.filter((x) => x.dataset.l === q.dataset.l).length > 1;
    return `<path d="M${x1} ${y1} C ${x1 + 40} ${y1}, ${x2 - 40} ${y2}, ${x2} ${y2}" class="ql${hot ? " hot" : ""}${animate ? " draw" : ""}" style="animation-delay:${i * 90}ms"/>`;
  }).join("");
}
renderQidx(false);
whenVisible($("#qidx"), () => drawQLines(true), 0.3);
addEventListener("resize", () => drawQLines(false));

/* ================================================================ 7. FAQ */
function md(s) {
  const inline = (t) => esc(t).replace(/`([^`]+)`/g, "<code>$1</code>").replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>").replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  const out = []; let list = null, ordered = false, code = null;
  const flush = () => { if (list) { out.push(`<${ordered ? "ol" : "ul"}>${list.join("")}</${ordered ? "ol" : "ul"}>`); list = null; } };
  for (const line of s.split("\n")) {
    if (line.startsWith("```")) { if (code) { out.push(`<pre>${esc(code.join("\n"))}</pre>`); code = null; } else code = []; continue; }
    if (code) { code.push(line); continue; }
    const li = line.match(/^\s*([-*]|\d+\.)\s+(.*)/);
    if (li) { if (!list) { list = []; ordered = /\d/.test(li[1]); } list.push(`<li>${inline(li[2])}</li>`); continue; }
    flush();
    if (line.trim()) out.push(`<p>${inline(line)}</p>`);
  }
  flush();
  return out.join("");
}
const FAQ = D.faq.items;
const CATS = [...new Set(FAQ.map((f) => f.cat))];
let fcat = "All";
$("#fcats").innerHTML = ["All", ...CATS].map((c) => `<button type="button" aria-pressed="${c === fcat}" data-c="${esc(c)}">${esc(c)}</button>`).join("");
$("#fcats").addEventListener("click", (e) => {
  const b = e.target.closest("button"); if (!b) return;
  fcat = b.dataset.c; $$("#fcats button").forEach((x) => x.setAttribute("aria-pressed", x === b));
  $("#fq").value = ""; renderFaq(FAQ.map((_, i) => i).filter((i) => fcat === "All" || FAQ[i].cat === fcat));
});
function renderFaq(order, scores) {
  $("#faqlist").innerHTML = order.map((i, r) => `<details class="faqhit"${r === 0 && scores ? " open" : ""}><summary><span class="badge p">${esc(FAQ[i].cat)}</span>${esc(FAQ[i].q)}${scores ? `<span class="match">${scores[i].toFixed(2)}</span>` : ""}</summary><div class="body">${md(FAQ[i].a)}</div></details>`).join("");
}
renderFaq(FAQ.map((_, i) => i));
let ft;
$("#fq").addEventListener("input", () => {
  clearTimeout(ft);
  ft = setTimeout(async () => {
    const q = $("#fq").value.trim();
    fcat = "All"; $$("#fcats button").forEach((x) => x.setAttribute("aria-pressed", x.dataset.c === "All"));
    if (!q) return renderFaq(FAQ.map((_, i) => i));
    let scores;
    if (extractor) {
      const v = Array.from((await extractor(q, { pooling: "mean", normalize: true })).data);
      const d = (e) => e.reduce((t, x, j) => t + x * v[j], 0);
      scores = D.faq.emb.map((e, i) => Math.max(d(e), d(D.faq.emb_title[i])));
    } else {
      const words = new Set(q.toLowerCase().match(/[a-z0-9]{3,}/g) || []);
      scores = FAQ.map((f) => { const w = (f.q + " " + f.a).toLowerCase().match(/[a-z0-9]{3,}/g) || []; return w.filter((x) => words.has(x)).length / Math.sqrt(w.length + 1); });
    }
    renderFaq(FAQ.map((_, i) => i).sort((a, b) => scores[b] - scores[a]).slice(0, 6), scores);
  }, 280);
});
