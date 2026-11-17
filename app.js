// HW02 companion: deck navigation, in-browser retrieval, chunking lab, judge results, FAQ search.
const D = window.HW02;
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const store = { get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } },
                set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} } };
const ANSWER = "8 pm - 8 am";

/* ------------------------------------------------------------------ deck */
const deck = $("#deck");
const slides = $$(".slide");
const dots = $("#dots");
slides.forEach((s, i) => {
  const b = document.createElement("button");
  b.type = "button"; b.className = s.classList.contains("mB") ? "mB" : s.classList.contains("mC") ? "mC" : s.classList.contains("mD") ? "mD" : "";
  b.dataset.label = s.dataset.label; b.setAttribute("aria-label", `Slide ${i + 1}: ${s.dataset.label}`);
  b.addEventListener("click", () => go(i));
  dots.appendChild(b);
});
let current = 0;
const seen = new Set();
function go(i) { i = Math.max(0, Math.min(slides.length - 1, i)); slides[i].scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }); }
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
const io = new IntersectionObserver((entries) => {
  for (const e of entries) if (e.isIntersecting) setCurrent(slides.indexOf(e.target));
}, { root: deck, threshold: 0.45 });
slides.forEach((s) => io.observe(s));
// Very tall slides never reach 45% visibility on small screens; mark them seen when their top reaches the header.
deck.addEventListener("scroll", () => {
  const y = deck.scrollTop + 80;
  for (let i = slides.length - 1; i >= 0; i--) if (slides[i].offsetTop <= y) { if (i !== current && slides[i].offsetHeight > innerHeight * 1.6) setCurrent(i); break; }
}, { passive: true });
document.addEventListener("keydown", (e) => {
  if (e.target.closest("input,textarea,select,[contenteditable]") || e.metaKey || e.ctrlKey || e.altKey) return;
  const tall = slides[current].offsetHeight > innerHeight + 40;
  if (["ArrowDown", "PageDown"].includes(e.key) || (e.key === " " && !e.shiftKey)) {
    if (tall && deck.scrollTop + innerHeight < slides[current].offsetTop + slides[current].offsetHeight - 20) return; // let tall slides scroll
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

/* -------------------------------------------------------- quizzes */
$$("[data-quiz]").forEach((q) => {
  const fb = $(".feedback", q);
  $$(".opts button", q).forEach((b) => b.addEventListener("click", () => {
    const ok = b.dataset.ok === "1";
    fb.className = "feedback show " + (ok ? "correct" : "retry");
    fb.innerHTML = `<svg class="ic"><use href="#i-${ok ? "check" : "x"}"/></svg><span>${ok ? "Yes! " + (q.dataset.why || "") : "Not quite. Try another option."}</span>`;
  }));
});
$$("[data-quiz]")[0].dataset.why = "The ranking is the same because MiniLM vectors have length 1. Only the distance values change (squared L2 = 2 × cosine distance).";
$$("[data-quiz]")[1].dataset.why = "Rate something that separates good retrieval from bad, like relevance or answer support, and write anchors for every score.";

/* -------------------------------------------------------- vectors */
const cache = {};
function matrix(name) {
  if (cache[name]) return cache[name];
  const e = D[name].emb, bin = atob(e.b64), n = e.n, d = e.dim, a = new Float32Array(n * d);
  const bytes = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const ints = new Int16Array(bytes.buffer);   // little-endian int16 written by export_companion_data.py
  for (let i = 0; i < n * d; i++) a[i] = ints[i] * e.scale;
  for (let r = 0; r < n; r++) { let s = 0; for (let j = 0; j < d; j++) s += a[r * d + j] ** 2; s = Math.sqrt(s) || 1; for (let j = 0; j < d; j++) a[r * d + j] /= s; }
  return (cache[name] = { a, n, d });
}
function topk(name, qv, k) {
  const { a, n, d } = matrix(name);
  const sims = new Float32Array(n);
  for (let r = 0; r < n; r++) { let s = 0; const o = r * d; for (let j = 0; j < d; j++) s += a[o + j] * qv[j]; sims[r] = s; }
  const idx = Array.from({ length: n }, (_, i) => i).sort((x, y) => sims[y] - sims[x]).slice(0, k);
  return idx.map((i) => ({ i, sim: sims[i] }));
}
const norm = (v) => { const s = Math.sqrt(v.reduce((t, x) => t + x * x, 0)) || 1; return v.map((x) => x / s); };

/* -------------------------------------------------------- embedding model */
let extractor = null, modelState = "loading";
const setStatus = (el, cls, html) => { el.className = "status " + cls; el.innerHTML = `<span class="pip"></span><span>${html}</span>`; };
async function loadModel() {
  try {
    const { pipeline, env } = await import("https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.6");
    env.allowLocalModels = false;
    extractor = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2", { dtype: "q8" });
    modelState = "ready";
    setStatus($("#mstatus"), "ok", "Model ready: <b>all-MiniLM-L6-v2</b> runs in your browser, the same model as the notebook. Ask anything.");
    setStatus($("#fstatus"), "ok", "Semantic search on: your question and every FAQ answer are embedded with the same MiniLM model.");
  } catch (err) {
    modelState = "off";
    setStatus($("#mstatus"), "off", "Couldn't load the model (offline or blocked). The 5 preset queries and any of the 1,000 policy questions (type one exactly) still work.");
    setStatus($("#fstatus"), "off", "Model not loaded, so the FAQ is ranked by shared keywords instead.");
    console.warn(err);
  }
}
async function embed(text) {
  const t = text.trim();
  const p = D.queries.text.indexOf(t);
  if (p >= 0) return D.queries.emb[p];
  const qi = D.qidx.text.indexOf(t);
  if (qi >= 0) { const { a, d } = matrix("qidx"); return Array.from(a.slice(qi * d, qi * d + d)); }
  if (extractor) { const out = await extractor(t, { pooling: "mean", normalize: true }); return Array.from(out.data); }
  return null;
}
setTimeout(loadModel, 600);

/* -------------------------------------------------------- ask the handbook */
const ask = { q: D.queries.text[3], store: "word", k: 5, metric: "cos", vec: null };
const presets = $("#presets");
D.queries.text.forEach((t, i) => {
  const b = document.createElement("button"); b.type = "button";
  b.textContent = `Q${i + 1} ${["Academic integrity", "Cheating defined", "Improper communications", "Quiet hours", "Pets & animals"][i]}`;
  b.title = t; b.addEventListener("click", () => { $("#q").value = t; runAsk(); });
  presets.appendChild(b);
});
function segCtl(id, onChange) {
  const el = $(id);
  el.addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    $$("button", el).forEach((x) => x.setAttribute("aria-pressed", x === b)); onChange(b.dataset.v);
  });
}
segCtl("#store", (v) => { ask.store = v; renderAsk(); });
segCtl("#kctl", (v) => { ask.k = +v; renderAsk(); });
segCtl("#metric", (v) => { ask.metric = v; renderAsk(); });
$("#go").addEventListener("click", runAsk);
$("#q").addEventListener("keydown", (e) => { if (e.key === "Enter") runAsk(); });
$("#q").value = ask.q;

async function runAsk() {
  ask.q = $("#q").value.trim(); if (!ask.q) return;
  $("#results").innerHTML = `<p class="lead">Embedding your question…</p>`;
  ask.vec = await embed(ask.q);
  if (!ask.vec) {
    $("#results").innerHTML = `<div class="tip warn"><svg class="ic"><use href="#i-bulb"/></svg><span>${modelState === "loading" ? "The model is still loading. Try again in a few seconds." : "Without the model, only the preset queries and the 1,000 policy questions can be searched."}</span></div>`;
    return;
  }
  renderAsk();
}
function highlight(text, q) {
  const words = [...new Set(q.toLowerCase().match(/[a-z’']{4,}/g) || [])].filter((w) => !["what", "where", "when", "does", "with", "that", "this", "policy", "about"].includes(w));
  let h = esc(text);
  for (const w of words) h = h.replace(new RegExp(`\\b(${w.replace(/[’']/g, ".")}\\w*)`, "gi"), "<mark>$1</mark>");
  return h.replace(/8 pm - 8 am/g, "<mark>8 pm - 8 am</mark>");
}
function distLabel(sim) {
  if (ask.metric === "cos") return { v: 1 - sim, txt: `cosine distance ${(1 - sim).toFixed(3)}` };
  if (ask.metric === "ip") return { v: 1 - sim, txt: `1 − dot ${(1 - sim).toFixed(3)} (dot ${sim.toFixed(3)})` };
  return { v: 2 - 2 * sim, txt: `squared L2 ${(2 - 2 * sim).toFixed(3)}` };
}
function renderAsk() {
  if (!ask.vec) return;
  const qv = norm(ask.vec);
  const hits = topk(ask.store, qv, ask.k);
  const seenChunks = new Map();
  const html = hits.map((h, r) => {
    let text, page, via = "";
    if (ask.store === "qidx") {
      const c = D.qidx.chunk[h.i]; text = D.sent.text[c]; page = D.sent.page[c];
      const dupOf = seenChunks.get(c); if (dupOf === undefined) seenChunks.set(c, r + 1);
      via = `<div class="via">matched question: “${esc(D.qidx.text[h.i])}” → chunk ${c}${dupOf ? ` · <b>same chunk as #${dupOf}</b>` : ""}</div>`;
    } else { text = D[ask.store].text[h.i]; page = D[ask.store].page[h.i]; }
    const d = distLabel(h.sim), isAns = text.includes(ANSWER);
    return `<article class="hit${isAns ? " answer" : ""}" style="animation-delay:${r * 40}ms"><div class="meta"><span class="rank">${r + 1}</span><span>p. ${page}</span><span class="distbar" title="closeness"><i style="width:${Math.max(4, h.sim * 100)}%"></i></span><span>${d.txt}</span>${isAns ? (text.includes("Midnight - 9 am") ? `<span class="badge g"><svg class="ic"><use href="#i-star"/></svg>full answer</span>` : `<span class="badge o"><svg class="ic"><use href="#i-star"/></svg>half the hours</span>`) : ""}</div>${via}<p>${highlight(text, ask.q)}</p></article>`;
  }).join("");
  $("#results").innerHTML = html;
  const texts = hits.map((h) => (ask.store === "qidx" ? D.sent.text[D.qidx.chunk[h.i]] : D[ask.store].text[h.i]));
  const ans = texts.findIndex((t) => t.includes(ANSWER));
  const full = texts.findIndex((t) => t.includes(ANSWER) && t.includes("Midnight - 9 am"));
  let tip;
  if (/quiet/i.test(ask.q)) {
    if (full >= 0) tip = `The <b>full</b> answer (Sun–Thu, Fri–Sat, finals) is at <b>rank ${full + 1}</b>.${ans >= 0 && ans !== full ? ` Rank ${ans + 1} has only the Sun–Thu half.` : ""}`;
    else if (ans >= 0) tip = `Rank ${ans + 1} has only <b>half</b> the answer (Sun–Thu, cut off mid-sentence). The Fri–Sat hours aren't in the top ${ask.k}. Try k = 10.`;
    else tip = `None of these ${ask.k} chunks contains “8 pm – 8 am”. They're <i>about</i> quiet hours but don't state them. Try a bigger k or another store.`;
    if (ask.store === "qidx") tip += ` Unique chunks: <b>${seenChunks.size}</b> of ${ask.k}. Repeats happen because several questions are attached to the same chunk.`;
  } else if (ask.store === "qidx") tip = `You're searching <b>questions</b>, not passages. Each hit shows the matched question, then its attached chunk. Unique chunks: <b>${seenChunks.size}</b> of ${ask.k}.`;
  else tip = `Does the #1 hit actually <b>answer</b> your question, or just mention its words? That's the difference between similarity and relevance.`;
  $("#asktip span").innerHTML = tip;
}

/* -------------------------------------------------------- chunk lab */
const pageText = D.page266.replace(/\s+/g, " ").trim();
const chunkState = { mode: "word", size: 50, overlap: 10 };
const sentSplit = (t) => t.match(/[^.!?]+[.!?]+["”)]?(\s|$)|[^.!?]+$/g).map((s) => s.trim()).filter(Boolean);
segCtl("#cmode", (v) => {
  chunkState.mode = v;
  const cs = $("#csize"), co = $("#cov");
  if (v === "word") { cs.min = 10; cs.max = 150; cs.value = 50; co.max = 40; co.value = 10; }
  else { cs.min = 1; cs.max = 8; cs.value = 4; co.max = 3; co.value = 1; }
  renderChunks();
});
$("#csize").addEventListener("input", renderChunks);
$("#cov").addEventListener("input", renderChunks);
function renderChunks() {
  const size = +$("#csize").value; let ov = +$("#cov").value; if (ov >= size) ov = size - 1;
  const unit = chunkState.mode === "word" ? "words" : "sentences";
  $("#csizeL").textContent = `Chunk size: ${size} ${unit}`; $("#covL").textContent = `Overlap: ${ov} ${unit}`;
  const items = chunkState.mode === "word" ? pageText.split(" ") : sentSplit(pageText);
  const chunks = [];
  for (let i = 0; i < items.length; i += size - ov) { chunks.push(items.slice(i, i + size).join(" ")); if (i + size >= items.length) break; }
  const full = (c) => c.includes(ANSWER) && c.includes("Midnight - 9 am") && /finals week/.test(c);
  $("#chunkview").innerHTML = chunks.map((c, i) => `<span class="ck ck${i % 4}${c.includes(ANSWER) ? " has-answer" : ""}" style="animation-delay:${Math.min(i, 30) * 28}ms"><span class="cknum">${i + 1}</span>${esc(c).replace(/(Quiet Hours|quiet hours)/g, "<b>$1</b>").replace(/8 pm - 8 am|Midnight - 9 am/g, "<mark>$&</mark>")}</span> `).join("");
  const ansChunks = chunks.filter((c) => c.includes(ANSWER));
  $("#kN").textContent = chunks.length;
  $("#kTogether").textContent = chunks.some(full) ? "Yes" : "No";
  $("#kTogether").parentElement.className = "tile " + (chunks.some(full) ? "g" : "r");
  $("#kTogether").nextElementSibling.textContent = "full answer (Sun–Thu, Fri–Sat, finals) in one chunk?";
  $("#kLen").textContent = ansChunks.length ? ansChunks[0].split(" ").length : "–";
}
renderChunks();

/* -------------------------------------------------------- top-k ladder */
const KS = [1, 3, 5, 10];
const STORE_KEYS = [...new Set(D.sweeps.map((s) => s.store))];
const JUDGES = Object.keys(D.pool[0].judges);
const LABELERS = ["Reference", ...JUDGES.slice().reverse(), "Mine"];
let labeler = "Reference";
const mine = new Set(store.get("hw02-mine", D.pool.map((p, i) => (p.ref >= 4 ? i : -1)).filter((i) => i >= 0)));
const labelerEl = $("#labeler");
LABELERS.forEach((l) => { const b = document.createElement("button"); b.type = "button"; b.dataset.v = l; b.textContent = l === "Reference" ? "TA reference" : l; b.setAttribute("aria-pressed", l === labeler); labelerEl.appendChild(b); });
segCtl("#labeler", (v) => { labeler = v; renderLadder(); });
$("#kslide").addEventListener("input", renderLadder);
const scoreOf = (resp) => labeler === "Reference" ? D.pool[resp].ref : labeler === "Mine" ? (mine.has(resp) ? 5 : 1) : D.pool[resp].judges[labeler].score;
const isRel = (resp) => { const s = scoreOf(resp); return s != null && s >= 4; };
function renderLadder() {
  const k = KS[+$("#kslide").value];
  $("#kL").textContent = `top-k = ${k}`;
  const poolRel = D.pool.map((_, i) => i).filter(isRel).length;
  $("#ladder").innerHTML = STORE_KEYS.map((st) => {
    const rows = D.sweeps.filter((r) => r.store === st && r.k === 10).sort((a, b) => a.rank - b.rank);
    const firstAt = new Map(); rows.forEach((r) => { if (!firstAt.has(r.resp)) firstAt.set(r.resp, r.rank); });
    const inTop = [...new Set(rows.filter((r) => r.rank <= k).map((r) => r.resp))];
    const hits = inTop.filter(isRel).length;
    const P = inTop.length ? hits / inTop.length : 0, R = poolRel ? hits / poolRel : 0;
    return `<div class="lcol"><h3><span>${esc(st.split(" / ")[0])}</span><span class="badge b">${inTop.length} unique</span></h3>
      <div class="pr"><span>Precision@${k}<b>${P.toFixed(2)}</b></span><span>Recall@${k}<b>${R.toFixed(2)}</b></span></div><div style="height:8px"></div>
      ${rows.map((r) => { const s = scoreOf(r.resp), text = D.pool[r.resp].text, dup = firstAt.get(r.resp) < r.rank;
        return `<button type="button" class="rung${isRel(r.resp) ? " rel" : ""}${s == null ? " fail" : ""}${r.rank > k ? " out" : ""}${dup ? " dup" : ""}" data-resp="${r.resp}" aria-expanded="false">
          <span class="n">${r.rank}</span><span class="t">${text.includes(ANSWER) ? "★ " : ""}${dup ? `repeat of #${firstAt.get(r.resp)} · ` : ""}${r.matched_question ? `<i>Q: ${esc(r.matched_question)}</i> → ` : ""}${esc(text)}</span>
          <span class="score ${s == null ? "sx" : "s" + s}">${s == null ? "fail" : labeler === "Mine" ? (isRel(r.resp) ? "rel" : "no") : s}</span></button>`; }).join("")}</div>`;
  }).join("");
}
$("#ladder").addEventListener("click", (e) => {
  const b = e.target.closest(".rung"); if (!b) return;
  const resp = +b.dataset.resp;
  if (labeler === "Mine") { mine.has(resp) ? mine.delete(resp) : mine.add(resp); store.set("hw02-mine", [...mine]); renderLadder(); return; }
  const t = $(".t", b), open = b.getAttribute("aria-expanded") === "true";
  b.setAttribute("aria-expanded", !open);
  t.style.webkitLineClamp = open ? 2 : "unset";
  if (!open) {
    const why = labeler === "Reference" ? D.pool[resp].note : D.pool[resp].judges[labeler]?.why;
    if (why) t.insertAdjacentHTML("beforeend", `<br><small style="color:var(--purple-edge)">${labeler === "Reference" ? "TA note" : labeler}: ${esc(why)}</small>`);
  } else renderLadder();
});
renderLadder();

/* -------------------------------------------------------- question index */
(function renderQidx() {
  const rows = D.sweeps.filter((r) => r.store.startsWith("B3") && r.k === 10).sort((a, b) => a.rank - b.rank);
  const counts = new Map(); rows.forEach((r) => counts.set(r.resp, (counts.get(r.resp) || 0) + 1));
  const letters = new Map([...counts.keys()].map((r, i) => [r, String.fromCharCode(65 + i)]));
  $("#qlist").innerHTML = `<h3>Nearest stored questions</h3>` + rows.map((r) => `<div class="qq" data-l="${letters.get(r.resp)}"><span class="badge p tag">${r.rank}</span><span>${esc(r.matched_question)}</span><span class="badge ${counts.get(r.resp) > 1 ? "o" : "b"} tag" style="margin-left:auto">${letters.get(r.resp)}</span></div>`).join("");
  $("#qchunks").innerHTML = `<h3>Chunks you get back</h3>` + [...counts.entries()].map(([resp, n]) => { const t = D.pool[resp].text;
    return `<div class="chunkcard${n > 1 ? " hot" : ""}" data-l="${letters.get(resp)}"><span class="badge ${n > 1 ? "o" : "b"}">${letters.get(resp)}</span> <b>${n}×</b> ${t.includes(ANSWER) ? '<span class="badge g">has the hours</span>' : '<span class="badge r">no hours</span>'}<p style="margin:6px 0 0;font-size:13px;max-width:none">${esc(t.slice(0, 230))}…</p></div>`; }).join("");
  const [topResp, topN] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  $("#qtip span").innerHTML = `${topN} of the top 10 questions point to chunk <b>${letters.get(topResp)}</b>, which ${D.pool[topResp].text.includes(ANSWER) ? "does" : "<b>does not</b>"} contain “8 pm – 8 am”. The questions were right; the <b>question→chunk link</b> (top-1 match) was wrong. Ways to fix it: attach the top 2–3 chunks per question, or use bigger chunks for the attachment.`;
})();

/* -------------------------------------------------------- judges */
(function renderJudges() {
  const order = JUDGES.slice();
  $("#judges").innerHTML = order.map((j, i) => {
    const vals = D.pool.map((p) => p.judges[j]);
    const valid = vals.filter((v) => v.score != null).length;
    const sec = vals.reduce((t, v) => t + v.sec, 0) / vals.length;
    const ag = D.agreement[j] || {};
    const wk = ag.weighted_kappa, w1 = ag.within_one;
    const pct = (x) => (x == null ? "n/a" : `${Math.round(x * 100)}%`);
    return `<div class="card judge j${i}"><h3><span class="jav">${j.includes("270") ? "S" : j.includes("1b") ? "M" : "L"}</span>${esc(j)}</h3>
      <div class="statline"><span>Valid JSON on the 20 pooled chunks</span><b>${valid}/20</b></div><div class="meter"><i style="width:${valid / 20 * 100}%;background:var(--${i === 0 ? "red" : i === 1 ? "orange" : "green"})"></i></div>
      <div class="statline"><span>Agreement within 1 point (vs TA labels)</span><b>${pct(w1)}</b></div><div class="meter"><i style="width:${(w1 || 0) * 100}%;background:var(--blue)"></i></div>
      <div class="statline"><span>Weighted kappa</span><b>${wk == null ? "n/a" : wk.toFixed(3)}</b></div>
      <div class="statline"><span>Valid rows in the 60-row check</span><b>${ag["valid judgments"] ?? "–"}/${ag["rows judged"] ?? "–"}</b></div>
      <div class="statline"><span>Avg seconds per judgment</span><b>${sec.toFixed(1)} s</b></div></div>`;
  }).join("");
})();

/* -------------------------------------------------------- C.II table */
let tjudge = "gemma3:4b";
["Reference", ...JUDGES.slice().reverse()].forEach((l) => { const b = document.createElement("button"); b.type = "button"; b.dataset.v = l === "Reference" ? "reference" : l; b.textContent = l === "Reference" ? "TA reference" : l; b.setAttribute("aria-pressed", b.dataset.v === tjudge); $("#tjudge").appendChild(b); });
segCtl("#tjudge", (v) => { tjudge = v; renderTable(); });
function renderTable() {
  const rows = D.metrics.filter((m) => m.judge === tjudge);
  const money = (x) => (x == null || x < 0 ? "–" : `$${(+x).toFixed(7)}`);
  $("#ctable").innerHTML = `<thead><tr><th>Store</th><th>Chunking</th><th>k</th><th>Unique</th><th>Search ms</th><th>Avg distance</th><th>Precision</th><th>Recall</th><th>Failed</th><th>Cost / search</th></tr></thead><tbody>` +
    rows.map((r) => `<tr><td>${esc(r.experiment)}</td><td>${esc(r.chunking)}</td><td>${r.top_k}</td><td>${r.unique}</td><td>${(+r.search_ms).toFixed(2)}</td><td>${(+r.avg_distance).toFixed(3)}</td><td><b>${(+r.precision).toFixed(2)}</b></td><td><b>${(+r.recall).toFixed(2)}</b></td><td>${r.failed}</td><td>${money(r.cost_usd)}</td></tr>`).join("") + "</tbody>";
}
renderTable();

/* -------------------------------------------------------- cost */
(function initCost() {
  const v = D.pool.map((p) => p.judges["gemma3:4b"]).filter((x) => x && x.score != null);
  if (v.length) { $("#cin").value = Math.round(v.reduce((t, x) => t + x.tin, 0) / v.length); $("#cout").value = Math.round(v.reduce((t, x) => t + x.tout, 0) / v.length); }
  const calc = () => {
    const per = (+$("#cin").value * +$("#pin").value + +$("#cout").value * +$("#pout").value) / 1e6;
    const tot = per * +$("#calls").value;
    $("#costOut").textContent = tot < 0.01 ? `$${tot.toFixed(6)}` : `$${tot.toFixed(4)}`;
    $("#costPer").textContent = `${(per * 1e6).toFixed(0)} µ$ per judge call · ${(1 / (tot || 1e-12)).toLocaleString(undefined, { maximumFractionDigits: 0 })} searches per $1`;
  };
  $$("#cost input").forEach((i) => i.addEventListener("input", calc)); calc();
})();

/* -------------------------------------------------------- checklist */
const CHECKS = [
  ["A.I", "Name your metric (cosine), one pro, and how it differs from dot and Euclidean", "Mention that MiniLM vectors are unit length, so the ranking is identical."],
  ["A.II", "Paste the 5 responses for each of the 5 queries (k = 5)", "Use the exact query wording from the PDF. Include the page numbers if you can."],
  ["A.III", "Did each query find what you expected? Why or why not?", "Look for table-of-contents lines, headings glued to text, and answers split across chunks."],
  ["B.I", "Say which query you chose and why", "A query with one checkable answer makes the k experiment easy to read."],
  ["B.II/III", "Record unique responses for k = 1, 3, 5, 10 in all three stores", "Mark repeats; the question index returns the same chunk several times."],
  ["B.IV/V", "Which k was best per store, and why?", "Tie it to where the answer chunk ranked, not to the k value itself."],
  ["C.I", "Describe your judge: construct, anchors, model, prompt, failures", "Report how many judgments failed, and how you treated them."],
  ["C.I", "Give 1–3 judge best practices from your own results", "One document per prompt; anchors for every score; check against your own labels."],
  ["C.II", "Fill the table: search time, avg distance, judge, precision, recall, avg cost", "Say how recall's denominator was built (pooling)."],
  ["Files", "PDF report + spreadsheet + judge code; share the sheet with the teaching team", "Grant access before you submit."],
];
const done = new Set(store.get("hw02-checks", []));
$("#checklist").innerHTML = CHECKS.map(([tag, t, s], i) => `<label class="check${done.has(i) ? " done" : ""}"><input type="checkbox" data-i="${i}"${done.has(i) ? " checked" : ""}><span><span class="badge p">${tag}</span> ${esc(t)}<small>${esc(s)}</small></span></label>`).join("");
$("#checklist").addEventListener("change", (e) => {
  const i = +e.target.dataset.i; e.target.checked ? done.add(i) : done.delete(i);
  e.target.closest(".check").classList.toggle("done", e.target.checked); store.set("hw02-checks", [...done]);
});

/* -------------------------------------------------------- FAQ */
function md(s) {
  const inline = (t) => esc(t).replace(/`([^`]+)`/g, "<code>$1</code>").replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>").replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  const out = []; let list = null, code = null;
  for (const line of s.split("\n")) {
    if (line.startsWith("```")) { if (code) { out.push(`<pre>${esc(code.join("\n"))}</pre>`); code = null; } else code = []; continue; }
    if (code) { code.push(line); continue; }
    const li = line.match(/^\s*(?:[-*]|\d+\.)\s+(.*)/);
    if (li) { if (!list) { list = []; } list.push(`<li>${inline(li[1])}</li>`); continue; }
    if (list) { out.push(`<ul>${list.join("")}</ul>`); list = null; }
    if (line.startsWith("|")) { out.push(`<pre>${esc(line)}</pre>`); continue; }
    if (line.trim()) out.push(`<p>${inline(line)}</p>`);
  }
  if (list) out.push(`<ul>${list.join("")}</ul>`);
  return out.join("");
}
const FAQ = D.faq.items;
function renderFaq(order, scores) {
  $("#faqlist").innerHTML = order.map((i, r) => `<details class="faqhit"${r === 0 && scores ? " open" : ""}><summary><span class="badge p">${i + 1}</span>${esc(FAQ[i].q)}${scores ? `<span class="match">${scores[i].toFixed(2)}</span>` : ""}</summary><div class="body">${md(FAQ[i].a)}</div></details>`).join("");
}
renderFaq(FAQ.map((_, i) => i));
let ft;
$("#fq").addEventListener("input", () => {
  clearTimeout(ft);
  ft = setTimeout(async () => {
    const q = $("#fq").value.trim();
    if (!q) return renderFaq(FAQ.map((_, i) => i));
    let scores;
    if (extractor) {
      const v = norm(Array.from((await extractor(q, { pooling: "mean", normalize: true })).data));
      const dot = (e) => e.reduce((t, x, j) => t + x * v[j], 0);
      scores = D.faq.emb.map((e, i) => Math.max(dot(e), dot(D.faq.emb_title[i])));   // best of title-only and title+answer
    } else {
      const words = new Set(q.toLowerCase().match(/[a-z0-9]{3,}/g) || []);
      scores = FAQ.map((f) => { const w = (f.q + " " + f.a).toLowerCase().match(/[a-z0-9]{3,}/g) || []; return w.filter((x) => words.has(x)).length / Math.sqrt(w.length + 1); });
    }
    renderFaq(FAQ.map((_, i) => i).sort((a, b) => scores[b] - scores[a]).slice(0, 6), scores);
  }, 280);
});

runAsk();
