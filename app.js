"use strict";
/* PGPI · Quiz — lógica de la aplicación.
   Las preguntas se cargan de data/index.json y de los archivos de cada tema. */
let Q = [];           // todas las preguntas
let TEMAS = {};       // { S1: "Fundamentos", ... } en el orden de data/index.json
let TEMA_IDX = {};    // { S1: 0, ... } para asignar colores
const TC = t => "c" + ((TEMA_IDX[t] || 0) % 8 + 1);
const LETTERS = ["A","B","C","D"];
const $ = id => document.getElementById(id);
const WIDE = window.matchMedia("(min-width:1024px)");

function store(k, v){ try{ if(v===undefined){ const r=localStorage.getItem(k); return r?JSON.parse(r):null; } localStorage.setItem(k, JSON.stringify(v)); }catch(e){ return null; } }
function shuffle(a){ a=a.slice(); for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; }
const all = () => Q.map((_,i)=>i);
const ids = fn => all().filter(i=>fn(Q[i]));
const pick = (a,n) => shuffle(a).slice(0,n);
const fmt = x => x.toFixed(1).replace(".",",");

let miss = new Set(store("pgpi-test1-fallos") || []);
const saveMiss = () => store("pgpi-test1-fallos", [...miss]);

/* ---------- secciones ---------- */
const KIND = {oficial:"oficial", practica:"no oficial", banco:"banco de alumnos"};
const kindOf = q => KIND[q.fuente] || q.fuente;
let TOPICROWS = [];

/* ---------- simulacro configurable ---------- */
const SRC = {
  off: {name:"Oficiales", f:q=>q.fuente==="oficial"},
  prac:{name:"Práctica (no oficial)", f:q=>q.fuente==="practica"},
  alu: {name:"Banco de alumnos", f:q=>q.fuente==="banco"}
};
const NUMS = [10, 20, 40, "all"];
let SIM = {temas:[], src:[], n:20, inst:false};
const loadSim = () => { const v = store("pgpi-sim"); return (v && Array.isArray(v.temas) && Array.isArray(v.src)) ? {temas:v.temas.filter(t=>TEMAS[t]), src:v.src.filter(k=>SRC[k]), n:NUMS.includes(v.n)?v.n:20, inst:!!v.inst} : {temas:[], src:[], n:20, inst:false}; };
const saveSim = () => store("pgpi-sim", SIM);
const srcCount = (temas, k) => ids(q=>temas.includes(q.tema) && SRC[k].f(q)).length;
const activeSrc = () => SIM.src.filter(k=>srcCount(SIM.temas, k)>0);
const simPool = cfg => ids(q=>cfg.temas.includes(q.tema) && cfg.src.some(k=>SRC[k].f(q)));
function simPick(cfg){
  // Reparto equilibrado: se va tomando una pregunta de cada tema por turnos; si un tema se agota, siguen los demás.
  const byT = shuffle(cfg.temas.slice()).map(t=>shuffle(ids(q=>q.tema===t && cfg.src.some(k=>SRC[k].f(q)))));
  const total = byT.reduce((a,b)=>a+b.length, 0);
  const n = cfg.n==="all" ? total : Math.min(cfg.n, total);
  const out = [], ptr = byT.map(()=>0);
  while (out.length < n){
    let moved = false;
    for (let k=0; k<byT.length && out.length<n; k++){ if (ptr[k] < byT[k].length){ out.push(byT[k][ptr[k]++]); moved = true; } }
    if (!moved) break;
  }
  return out;
}
const simKey = cfg => "sim-" + cfg.temas.slice().sort().join("") + "-" + cfg.src.slice().sort().join("+") + "-" + cfg.n + (cfg.inst ? "-inst" : "");
function simSection(){
  const cfg = {temas: SIM.temas.slice().sort(), src: activeSrc(), n: SIM.n};
  const fuentes = Object.keys(SRC).filter(k=>cfg.src.includes(k)).map(k=>SRC[k].name.toLowerCase());
  cfg.inst = !!SIM.inst;
  return {id: simKey(cfg), sim:true, exam:!cfg.inst, name: (cfg.inst ? "Simulacro con autocheck · " : "Simulacro · ") + cfg.temas.join(", ") + " · " + fuentes.join(", "), pick: ()=>simPick(cfg)};
}
function renderSim(){
  $("simInstant").checked = !!SIM.inst;
  const tw = $("simTemas"); tw.innerHTML = "";
  Object.keys(TEMAS).forEach(t=>{
    const b = document.createElement("button"); b.type = "button"; b.className = "chip " + TC(t);
    const on = SIM.temas.includes(t); b.setAttribute("aria-pressed", on);
    b.innerHTML = `<span class="dot"></span><span></span><span class="n">${ids(q=>q.tema===t).length}</span>`;
    b.children[1].textContent = t + " " + TEMAS[t];
    b.onclick = () => { SIM.temas = on ? SIM.temas.filter(x=>x!==t) : [...SIM.temas, t]; saveSim(); renderSim(); };
    tw.appendChild(b);
  });
  const hasT = SIM.temas.length > 0;
  $("stepFuentes").classList.toggle("locked", !hasT);
  const fw = $("simFuentes"); fw.innerHTML = "";
  Object.keys(SRC).forEach(k=>{
    const cnt = hasT ? srcCount(SIM.temas, k) : 0;
    const b = document.createElement("button"); b.type = "button"; b.className = "chip";
    b.setAttribute("aria-pressed", SIM.src.includes(k) && cnt>0);
    b.innerHTML = `<span></span>` + (hasT ? `<span class="n">${cnt}</span>` : "");
    b.firstChild.textContent = SRC[k].name;
    b.disabled = cnt===0;
    b.onclick = () => { SIM.src = SIM.src.includes(k) ? SIM.src.filter(x=>x!==k) : [...SIM.src, k]; saveSim(); renderSim(); };
    fw.appendChild(b);
  });
  const src = hasT ? activeSrc() : [];
  const pool = src.length ? simPool({temas:SIM.temas, src}).length : 0;
  $("stepNum").classList.toggle("locked", pool===0);
  const nw = $("simNum"); nw.innerHTML = "";
  NUMS.forEach(n=>{
    const b = document.createElement("button"); b.type = "button"; b.className = "chip";
    b.setAttribute("aria-pressed", pool>0 && SIM.n===n);
    b.textContent = n==="all" ? (pool ? `Todas (${pool})` : "Todas") : String(n);
    b.disabled = pool===0;
    b.onclick = () => { SIM.n = n; saveSim(); renderSim(); };
    nw.appendChild(b);
  });
  const info = $("simInfo");
  if (!hasT) info.textContent = "Elige uno o varios temas para empezar.";
  else if (!src.length) info.textContent = "Ahora elige una o varias fuentes.";
  else {
    const n = SIM.n==="all" ? pool : Math.min(SIM.n, pool);
    const best = bestOf(simKey({temas:SIM.temas, src, n:SIM.n, inst:SIM.inst}));
    const caps = Object.keys(TEMAS).filter(t=>SIM.temas.includes(t)).map(t=>[t, ids(q=>q.tema===t && src.some(k=>SRC[k].f(q))).length]);
    const alloc = caps.map(()=>0); let left = n;
    while (left>0){ let moved=false; caps.forEach(([t,c],i)=>{ if (left>0 && alloc[i]<c){ alloc[i]++; left--; moved=true; } }); if(!moved) break; }
    const even = Math.max(...alloc) - Math.min(...alloc) <= 1;
    const split = caps.map(([t],i)=>`${t}: ${alloc[i]}`).join(" · ");
    info.innerHTML = `Banco elegido: <b>${pool}</b> preguntas. El test tendrá <b>${n}</b>` + (SIM.temas.length>1 ? (even ? `, repartidas por igual (${split}).` : `. Algún tema no tiene bastantes con estas fuentes, así que el reparto queda ${split}.`) : ".") + (SIM.n!=="all" && SIM.n>pool ? " No hay tantas, así que entran todas." : "") + (SIM.inst ? " Con autocheck verás si aciertas y la explicación en cada pregunta; la mejor nota se guarda aparte." : "") + (best!==null ? ` Tu mejor nota con esta combinación: <b class="${band(best)}">${fmt(best)}</b>.` : "");
  }
  $("simGo").disabled = pool===0;
}
$("simInstant").onchange = e => { SIM.inst = e.target.checked; saveSim(); renderSim(); };
$("simGo").onclick = () => { closeDialogs(); start(simSection()); };
function closeDialogs(){ document.querySelectorAll("dialog").forEach(d=>{ if (d.open) d.close(); }); }
function openDlg(id){ renderHome(); const d = $(id); if (typeof d.showModal === "function") d.showModal(); else d.setAttribute("open",""); }
$("openSim").onclick = () => openDlg("dlgSim");
$("openStudy").onclick = () => openDlg("dlgStudy");
document.querySelectorAll("dialog").forEach(d=>{
  d.addEventListener("click", e=>{ if (e.target===d) d.close(); });
  d.querySelectorAll("[data-close]").forEach(b=>b.onclick = () => d.close());
});

/* ---------- inicio ---------- */
const band = n => n>=10 ? "g10" : n<5 ? "g0" : "g"+(Math.floor(n)-4);
function bestOf(id){ const b = store("pgpi-best-"+id); return typeof b==="number" ? b : null; }
function renderHome(){
  const nOff = Q.filter(q=>q.fuente==="oficial").length, nAlu = Q.filter(q=>q.fuente==="banco").length;
  const tl = Object.keys(TEMAS);
  $("heroSub").textContent = `${tl.length} temas (${tl[0]}–${tl[tl.length-1]}), ${Q.length} preguntas: ${nOff} oficiales, ${Q.length-nOff-nAlu} de práctica no oficiales y ${nAlu} del banco de alumnos. Al estudiar se corrige cada respuesta al momento; el simulacro se corrige al entregar, con nota.`;
  const mk = (s, meta) => {
    const b = document.createElement("button"); b.type = "button";
    const best = bestOf(s.id);
    b.className = "row " + s.cls + (best!==null && best>=10 ? " perfect" : "");
    b.innerHTML = `<span class="plug"></span><span class="body"><span class="name"></span><span class="meta"></span></span>` + (best!==null ? `<span class="best">Mejor<b class="${band(best)}">${fmt(best)}</b></span>` : "");
    b.querySelector(".plug").textContent = s.plug;
    b.querySelector(".name").textContent = s.name;
    b.querySelector(".meta").textContent = meta;
    if (s.pick().length===0) b.disabled = true;
    b.onclick = () => { closeDialogs(); start(s); };
    return b;
  };
  renderSim();
  const tr = $("topicRows"); tr.innerHTML = "";
  TOPICROWS.forEach(s=>{ const p = s.pick(); const o = p.filter(i=>Q[i].fuente==="oficial").length; tr.appendChild(mk(s, `${p.length} preguntas · ${o} oficiales`)); });
  const nb = TOPICROWS.filter(s=>bestOf(s.id)!==null).length;
  $("studyBadge").textContent = nb ? `${nb} de ${TOPICROWS.length} temas con nota` : "";
  $("simBadge").textContent = SIM.temas.length ? `Última: ${Object.keys(TEMAS).filter(t=>SIM.temas.includes(t)).join(", ")} · ${SIM.n==="all" ? "todas" : SIM.n + " preguntas"}` : "";
}
$("resetMiss").onclick = () => { miss = new Set(); saveMiss(); renderHome(); };

function show(id){ closeDialogs(); ["loading","home","quiz","results"].forEach(x=>$(x).classList.toggle("hidden", x!==id)); window.scrollTo(0,0); }

/* ---------- sesión ---------- */
let S = null;
function start(sec, list, opts){
  opts = opts || {};
  let qs = list || sec.pick();
  if (!sec.fixed || list) qs = shuffle(qs);
  const exam = opts.practice ? false : !!sec.exam;
  S = {sec, items: qs.map(qi=>({qi, ans:null})), cur:0, review:false, exam, isRetry:!!opts.retry};
  $("map").classList.add("hidden"); $("mapBtn").setAttribute("aria-expanded","false");
  show("quiz"); renderQ();
}
const examOpen = () => S.exam && !S.review;

function renderQ(){
  $("ask").classList.add("hidden");
  const it = S.items[S.cur], q = Q[it.qi];
  $("card").className = "card " + TC(q.tema);
  $("qtag").textContent = `${q.tema} · ${TEMAS[q.tema]}`;
  $("qkind").innerHTML = `<b></b> · <span></span>`;
  $("qkind").firstChild.textContent = q.id;
  $("qkind").lastChild.textContent = kindOf(q) + (examOpen() ? " · puedes cambiarla hasta entregar" : "");
  $("qtext").textContent = q.p;
  const opts = $("opts"); opts.innerHTML = "";
  const showRes = !examOpen() && (it.ans!==null || S.review);
  q.o.forEach((t, i) => {
    const b = document.createElement("button"); b.type = "button"; b.className = "opt";
    b.innerHTML = `<span class="l">${LETTERS[i]}</span><span></span>`;
    b.lastChild.textContent = t;
    b.onclick = () => answer(i);
    if (examOpen()){ if (i===it.ans) b.classList.add("sel"); b.setAttribute("aria-pressed", i===it.ans); }
    else if (showRes){
      b.disabled = true;
      if (i===q.c) b.classList.add("right"); else if (i===it.ans) b.classList.add("wrong"); else b.classList.add("dim");
    }
    opts.appendChild(b);
  });
  $("blankBtn").classList.toggle("hidden", !(examOpen() && it.ans!==null));
  renderFb(showRes);
  renderTop();
  $("prevBtn").disabled = S.cur===0;
  const last = S.cur===S.items.length-1;
  $("nextBtn").textContent = last ? (examOpen() ? "Entregar examen" : "Ver resultados") : "Siguiente";
}

function renderFb(showRes){
  const it = S.items[S.cur], q = Q[it.qi], fb = $("fb");
  fb.innerHTML = "";
  if (!showRes) return;
  const blank = it.ans===null, ok = it.ans===q.c;
  const box = document.createElement("div");
  box.className = "fb " + (blank ? "blank" : ok ? "ok" : "ko"); box.setAttribute("role","status");
  const v = document.createElement("div"); v.className = "verdict";
  v.textContent = blank ? `En blanco. La respuesta es la ${LETTERS[q.c]}.` : ok ? "Correcto." : `Incorrecto. La respuesta es la ${LETTERS[q.c]}.`;
  box.appendChild(v);
  const e = document.createElement("p"); e.textContent = q.e; box.appendChild(e);
  if (q.w){
    const w = document.createElement("div"); w.className = "why";
    w.innerHTML = "<h3>Por qué no las demás</h3><ul></ul>";
    q.o.forEach((_, i) => {
      if (i===q.c) return;
      const li = document.createElement("li"); if (i===it.ans) li.className = "mine";
      li.innerHTML = `<span class="l">${LETTERS[i]}</span><span></span>`;
      li.lastChild.textContent = q.w[i];
      if (i===it.ans){ const em = document.createElement("em"); em.textContent = " (tu respuesta)"; li.lastChild.appendChild(em); }
      w.lastChild.appendChild(li);
    });
    box.appendChild(w);
  }
  if (q.t){ const t = document.createElement("p"); t.className = "trap"; t.innerHTML = "<b>Trampa:</b> "; t.appendChild(document.createTextNode(q.t)); box.appendChild(t); }
  if (q.s){ const s = document.createElement("p"); s.className = "src"; s.textContent = "Fuente: " + q.s; box.appendChild(s); }
  fb.appendChild(box);
}

function renderTop(){
  const n = S.items.length;
  const okN = S.items.filter(i=>i.ans!==null && i.ans===Q[i.qi].c).length;
  const koN = S.items.filter(i=>i.ans!==null && i.ans!==Q[i.qi].c).length;
  $("counter").innerHTML = `${S.cur+1} <small>de ${n}</small>`;
  const bar = $("bar").children;
  if (examOpen()){ const d = S.items.filter(i=>i.ans!==null).length; bar[0].style.width = "0%"; bar[1].style.width = (d/n*100)+"%"; bar[1].style.background = "var(--soft)"; }
  else { bar[1].style.background = ""; bar[0].style.width = (okN/n*100)+"%"; bar[1].style.width = (koN/n*100)+"%"; }
  if (WIDE.matches || !$("map").classList.contains("hidden")) renderMap();
}
function renderMap(){
  const m = $("map"); m.innerHTML = "";
  S.items.forEach((it, i) => {
    const q = Q[it.qi], b = document.createElement("button"); b.type = "button";
    b.textContent = i+1; b.className = TC(q.tema);
    if (it.ans!==null) b.classList.add(examOpen() ? "done" : (it.ans===q.c ? "ok" : "ko"));
    if (i===S.cur) b.classList.add("cur");
    b.setAttribute("aria-label", `Ir a la pregunta ${i+1} (${q.id})`);
    b.onclick = () => { S.cur = i; renderQ(); };
    m.appendChild(b);
  });
}

function answer(i){
  const it = S.items[S.cur], q = Q[it.qi];
  if (examOpen()){ it.ans = (it.ans===i ? null : i); renderQ(); return; }
  if (it.ans!==null || S.review) return;
  it.ans = i;
  if (i===q.c) miss.delete(q.id); else miss.add(q.id);
  saveMiss(); renderQ();
  $("fb").scrollIntoView({behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block:"nearest"});
}
function next(){ if (S.cur < S.items.length-1){ S.cur++; renderQ(); window.scrollTo(0,0); } else finish(); }
function prev(){ if (S.cur>0){ S.cur--; renderQ(); window.scrollTo(0,0); } }
WIDE.addEventListener("change", () => { if (S && !$("quiz").classList.contains("hidden")) renderTop(); });

let askCb = null;
function ask(msg, yes, cb){ $("askMsg").textContent = msg; $("askYes").textContent = yes; askCb = cb; $("ask").classList.remove("hidden"); $("ask").scrollIntoView({block:"nearest"}); $("askYes").focus(); }
function hideAsk(){ $("ask").classList.add("hidden"); askCb = null; }
$("askNo").onclick = hideAsk;
$("askYes").onclick = () => { const cb = askCb; hideAsk(); if (cb) cb(); };

function finish(force){
  const n = S.items.length;
  const answered = S.items.filter(i=>i.ans!==null);
  const ok = answered.filter(i=>i.ans===Q[i.qi].c).length;
  const ko = answered.length - ok, blank = n - answered.length;
  if (blank>0 && !S.review && !force){
    ask(S.exam ? `Dejas ${blank} en blanco. ¿Entregar el examen?` : `Te quedan ${blank} sin responder. ¿Ver resultados igualmente?`, S.exam ? "Entregar" : "Ver resultados", () => finish(true));
    return;
  }
  hideAsk();
  if (S.exam && !S.review){
    answered.forEach(i => { const q = Q[i.qi]; if (i.ans===q.c) miss.delete(q.id); else miss.add(q.id); });
    saveMiss();
  }
  const raw = ok/n*10, nota = Math.max(0, (ok - ko/3)/n*10);
  $("resTitle").textContent = S.sec.name + (S.isRetry ? " · repaso" : "");
  $("resNota").textContent = fmt(nota); $("resNota").className = "big " + band(nota);
  $("resSub").textContent = `${ok} aciertos, ${ko} fallos${blank ? `, ${blank} en blanco` : ""}. Cada fallo resta 1/3 de acierto y los blancos no restan. Sin penalizar sería un ${fmt(raw)}.`;
  const r = $("resRing").children; r[0].style.width = (ok/n*100)+"%"; r[1].style.width = (ko/n*100)+"%";
  const bd = $("resBreak"); bd.innerHTML = "";
  const temas = [...new Set(S.items.map(i=>Q[i.qi].tema))].sort();
  if (temas.length>1){
    temas.forEach(t => {
      const its = S.items.filter(i=>Q[i.qi].tema===t), o = its.filter(i=>i.ans===Q[i.qi].c).length, p = Math.round(o/its.length*100);
      const d = document.createElement("div"); d.className = "bd " + TC(t);
      d.innerHTML = `<span class="tag">${t}</span><span class="nm"></span><span class="mini" role="img" aria-label="${o} de ${its.length}"><i style="width:${p}%"></i></span><span class="pc">${o}/${its.length}</span>`;
      d.querySelector(".nm").textContent = TEMAS[t];
      bd.appendChild(d);
    });
  }
  if (!S.isRetry && !S.review){ const pb = bestOf(S.sec.id); if (pb===null || nota>pb) store("pgpi-best-"+S.sec.id, Math.round(nota*10)/10); }
  const wrong = S.items.filter(i=>i.ans===null || i.ans!==Q[i.qi].c);
  $("retryWrongBtn").classList.toggle("hidden", wrong.length===0);
  $("retryWrongBtn").textContent = blank ? `Repetir falladas y en blanco (${wrong.length})` : `Repetir las que he fallado (${wrong.length})`;
  $("retryBtn").textContent = S.sec.sim ? "Nuevo simulacro" : "Repetir la sección";
  S.review = true;
  show("results");
}

$("blankBtn").onclick = () => { S.items[S.cur].ans = null; renderQ(); };
$("nextBtn").onclick = next;
$("prevBtn").onclick = prev;
$("exitBtn").onclick = () => {
  const go = () => { hideAsk(); renderHome(); show("home"); };
  if (S && !S.review && S.items.some(i=>i.ans!==null)){ ask("¿Salir? Perderás el progreso de este intento.", "Salir", go); return; }
  go();
};
$("mapBtn").onclick = () => {
  const m = $("map"), open = m.classList.toggle("hidden")===false;
  $("mapBtn").setAttribute("aria-expanded", open); if (open) renderMap();
};
$("reviewBtn").onclick = () => { S.cur = 0; show("quiz"); renderQ(); };
$("retryBtn").onclick = () => start(S.sec, null, {});
$("homeBtn").onclick = () => { renderHome(); show("home"); };
$("retryWrongBtn").onclick = () => {
  const wrong = S.items.filter(i=>i.ans===null || i.ans!==Q[i.qi].c).map(i=>i.qi);
  start(S.sec, wrong, {retry:true, practice:true});
};

document.addEventListener("keydown", e => {
  if ($("quiz").classList.contains("hidden") || e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.target && e.target.closest && e.target.closest("#ask")) return;
  const it = S.items[S.cur], k = e.key.toLowerCase();
  if (k==="arrowright" || (k==="enter" && (it.ans!==null || S.review) && e.target.tagName!=="BUTTON")){ e.preventDefault(); next(); return; }
  if (k==="arrowleft"){ e.preventDefault(); prev(); return; }
  if (examOpen() && (k==="backspace" || k==="0")){ e.preventDefault(); it.ans = null; renderQ(); return; }
  const map = {a:0,b:1,c:2,d:3,"1":0,"2":1,"3":2,"4":3};
  if (k in map) answer(map[k]);
});

/* ---------- carga de datos ---------- */
async function getJSON(url){
  const r = await fetch(url, {cache:"no-cache"});
  if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`);
  return r.json();
}
async function boot(){
  try {
    const idx = await getJSON("data/index.json");
    const temas = idx.temas || [];
    temas.forEach((t, i) => { TEMAS[t.id] = t.nombre; TEMA_IDX[t.id] = i; });
    const parts = await Promise.all(temas.map(t => getJSON("data/" + t.archivo)));
    Q = parts.flat().filter(q => q && TEMAS[q.tema] && Array.isArray(q.o) && q.o.length === 4 && q.c >= 0 && q.c < 4);
    TOPICROWS = Object.keys(TEMAS).map(t=>({id:"t"+t, name:TEMAS[t], plug:t, cls:TC(t), pick:()=>ids(q=>q.tema===t)}));
    $("cables").innerHTML = Object.keys(TEMAS).map(t=>`<span class="${TC(t)}"></span>`).join("");
    SIM = loadSim();
    renderHome();
    show("home");
  } catch (err) {
    console.error(err);
    const local = location.protocol === "file:";
    $("loadMsg").innerHTML = local
      ? `<div class="err"><b>No se pueden cargar las preguntas abriendo el archivo directamente.</b><br>Sirve la carpeta con un servidor local, por ejemplo <code>python -m http.server</code>, y abre <code>http://localhost:8000</code>.</div>`
      : `<div class="err"><b>No se han podido cargar las preguntas.</b><br>Revisa que <code>data/index.json</code> y los archivos de cada tema existen y son JSON válido.</div>`;
  }
}
boot();
