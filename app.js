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
  const showRes = !examOpen() && (it.ans!==null || S.review);
  $("card").className = "card " + TC(q.tema) + (showRes ? " answered" : "");
  $("qtag").textContent = `${q.tema} · ${TEMAS[q.tema]}`;
  $("qkind").innerHTML = `<b></b> · <span></span>`;
  $("qkind").firstChild.textContent = q.id;
  $("qkind").lastChild.textContent = kindOf(q) + (examOpen() ? " · puedes cambiarla hasta entregar" : "");
  $("qtext").textContent = q.p;
  const opts = $("opts"); opts.innerHTML = "";
  q.o.forEach((t, i) => {
    const b = document.createElement("button"); b.type = "button"; b.className = "opt";
    b.innerHTML = `<span class="l">${LETTERS[i]}</span><span class="ot"><span class="otxt"></span></span>`;
    b.querySelector(".otxt").textContent = t;
    if (showRes){
      // Al corregir: etiqueta en la correcta y en la tuya, y el «por qué no» dentro de cada opción incorrecta.
      const ot = b.querySelector(".ot");
      if (i===q.c || i===it.ans){
        const bd = document.createElement("span"); bd.className = "badge";
        bd.textContent = i===q.c ? (i===it.ans ? "✓ Tu respuesta" : "✓ Correcta") : "✗ Tu respuesta";
        ot.insertBefore(bd, ot.firstChild);
      }
      if (i!==q.c && q.w && q.w[i]){ const w = document.createElement("span"); w.className = "why1"; w.textContent = q.w[i]; ot.appendChild(w); }
    }
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

/* ---------- añadir preguntas ----------
   PGPI · Quiz — «Añadir preguntas».
   1) Lee la página de revisión de un test de Blackboard guardada como .html y extrae, de cada pregunta,
      el enunciado, las 4 opciones y la opción marcada. Del archivo no sale nada más (ni la nota, ni su nombre).
   2) Con un token de GitHub guardado solo en este navegador, crea una rama preguntas/… y sube incoming/<test>.json.
   3) La GitHub Action «Añadir preguntas» (tools/procesar.js) decide la respuesta correcta con la teoría de
      theory/, clasifica cada pregunta por sesión, la añade a data/Sx.json y abre un pull request para revisarlo. */
(() => {
  const REPO_FIJO = { owner: "Tpt6731", repo: "PGPI-quiz" };
  const REPO = (() => {
    // En GitHub Pages (usuario.github.io/repo) se deduce de la URL; en local se usa el fijo.
    const h = location.hostname, seg = location.pathname.split("/").filter(Boolean)[0];
    return h.endsWith(".github.io") && seg ? { owner: h.split(".")[0], repo: seg } : REPO_FIJO;
  })();
  const R = `${REPO.owner}/${REPO.repo}`;
  const API = "https://api.github.com";
  const WORKFLOW = "anadir-preguntas.yml";
  const MAX_BYTES = 15 * 1024 * 1024;
  const TOKEN_KEY = "pgpi-gh-token";
  const LETRAS = ["A", "B", "C", "D"];
  const $ = id => document.getElementById(id);
  const limpiar = t => (t || "").replace(/[ ​]/g, " ").replace(/\s+/g, " ").trim();
  const dormir = ms => new Promise(r => setTimeout(r, ms));

  /* ---------- extracción ---------- */
  // Texto de un bloque del editor de Blackboard: quita lo oculto y separa los párrafos con un espacio.
  function textoRico(el) {
    if (!el) return "";
    const c = el.cloneNode(true);
    c.querySelectorAll('script,style,[aria-hidden="true"],[contenteditable="true"],[id^="sr-only-option-text"]').forEach(n => n.remove());
    c.querySelectorAll("p,div,li,br,h1,h2,h3,h4,h5,h6,tr,td").forEach(n => n.after(" "));
    return limpiar(c.textContent);
  }
  function subirHasta(el, ok) { for (let n = el; n && n.nodeType === 1; n = n.parentElement) if (ok(n)) return n; return null; }

  function extraer(html) {
    const doc = new DOMParser().parseFromString(html, "text/html");   // no ejecuta los scripts de la página
    const marcas = [...doc.querySelectorAll('[data-testid="question-number"]')];
    if (!marcas.length) throw new Error("No encuentro preguntas: no parece la página de revisión de un test de Blackboard («Comentarios sobre la evaluación»).");
    const test = limpiar((doc.querySelector('[aria-current="page"]') || {}).textContent)
      || limpiar((doc.querySelector("h1") || {}).textContent) || "Test sin nombre";
    const preguntas = [], avisos = [], vistos = new Set();
    for (const m of marcas) {
      const n = parseInt(m.textContent, 10);
      const raiz = m.closest("[data-index]") || subirHasta(m, r => r.querySelector('[data-testid="question-header.questionPrompt"]') && r.querySelector("input"));
      if (!raiz || !Number.isInteger(n) || vistos.has(n)) continue;
      vistos.add(n);
      const pre = `Pregunta ${n}`;
      const enun = raiz.querySelector('[data-testid="question-header.questionPrompt"]');
      const cont = enun && (enun.querySelector('[contenteditable="false"]') || enun);
      const lis = [...raiz.querySelectorAll("li")].filter(li => li.querySelector('input[type="radio"],input[type="checkbox"]'));
      if (lis.some(li => li.querySelector('input[type="checkbox"]'))) { avisos.push(`${pre}: es de respuesta múltiple; se omite.`); continue; }
      if (lis.length !== 4) { avisos.push(`${pre}: tiene ${lis.length} opciones y el quiz usa 4; se omite.`); continue; }
      const conts = lis.map(li => li.querySelector('[contenteditable="false"]') || li.querySelector("label") || li);
      if ([cont, ...conts].some(x => x && x.querySelector("img,svg,math,video,audio,iframe,canvas,object"))) { avisos.push(`${pre}: tiene imágenes o fórmulas; se omite.`); continue; }
      const p = textoRico(cont), o = conts.map(textoRico);
      if (!p || o.some(x => !x)) { avisos.push(`${pre}: enunciado u opciones vacíos; se omite.`); continue; }
      const marcada = lis.findIndex(li => li.querySelector("input").hasAttribute("checked"));
      preguntas.push({ n, p, o, marcada: marcada >= 0 ? marcada : null });
    }
    const ns = [...vistos].sort((a, b) => a - b), faltan = [];
    for (let k = 1; k <= (ns[ns.length - 1] || 0); k++) if (!vistos.has(k)) faltan.push(k);
    if (faltan.length) avisos.unshift(`No están en el archivo las preguntas ${faltan.join(", ")}. Puede que no estuvieran cargadas al guardar: baja hasta el final de la revisión y vuelve a guardar la página.`);
    if (!preguntas.length) throw new Error("He encontrado el test, pero ninguna pregunta se puede usar. " + avisos.join(" "));
    preguntas.sort((a, b) => a.n - b.n);
    return { test, preguntas, avisos };
  }
  window.PGPIExtraer = extraer;

  async function leerArchivo(file) {
    if (!/\.html?$/i.test(file.name) || (file.type && !/^(text\/html|application\/xhtml\+xml)$/.test(file.type)))
      throw new Error("Solo se admiten archivos .html: la página de revisión del test guardada desde el navegador.");
    if (file.size > MAX_BYTES) throw new Error("El archivo pesa más de 15 MB.");
    const txt = await file.text();
    if (!/<!doctype html|<html[\s>]/i.test(txt.slice(0, 5000))) throw new Error("El archivo no es HTML.");
    return txt;
  }

  /* ---------- GitHub ---------- */
  const token = {
    get() { try { return localStorage.getItem(TOKEN_KEY) || ""; } catch (e) { return ""; } },
    set(v) { try { localStorage.setItem(TOKEN_KEY, v); } catch (e) {} },
    del() { try { localStorage.removeItem(TOKEN_KEY); } catch (e) {} }
  };
  async function gh(tk, method, ruta, body) {
    const r = await fetch(API + ruta, {
      method, cache: "no-store",
      headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${tk}`, "X-GitHub-Api-Version": "2022-11-28", ...(body ? { "Content-Type": "application/json" } : {}) },
      body: body ? JSON.stringify(body) : undefined
    });
    let j = null; try { j = await r.json(); } catch (e) {}
    if (!r.ok) { const e = new Error((j && j.message) || `HTTP ${r.status}`); e.status = r.status; throw e; }
    return j;
  }
  function b64(s) {
    const bytes = new TextEncoder().encode(s); let bin = "";
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(bin);
  }
  const slug = s => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "test";
  function errorGitHub(e, paso) {
    if (e.status === 401) return "El token no es válido o ha caducado.";
    if (e.status === 403 || e.status === 404) return `El token no tiene permiso para ${paso} en ${R}. Revisa que tenga acceso a ese repo y «Contents: Read and write».`;
    return `GitHub ha respondido con un error al ${paso}: ${e.message}`;
  }

  /* ---------- modal ---------- */
  let datos = null;      // { test, preguntas, avisos }
  let gen = 0;           // sube al quitar el archivo, para cortar el seguimiento anterior
  let enviado = false;

  function abrir() { pintar(); const d = $("dlgAdd"); if (typeof d.showModal === "function") d.showModal(); else d.setAttribute("open", ""); }

  function pintar() {
    $("addDrop").classList.toggle("hidden", !!datos);
    $("addFile").disabled = !!datos;
    $("addLoaded").classList.toggle("hidden", !datos);
    const prev = $("addPrev"); prev.innerHTML = "";
    if (datos) {
      $("addTest").textContent = datos.test;
      $("addCount").textContent = `${datos.preguntas.length} pregunta${datos.preguntas.length === 1 ? "" : "s"}`;
      if (datos.avisos.length) {
        const ul = document.createElement("ul"); ul.className = "addwarn";
        datos.avisos.forEach(a => { const li = document.createElement("li"); li.textContent = a; ul.appendChild(li); });
        prev.appendChild(ul);
      }
      const ol = document.createElement("ol"); ol.className = "addlist";
      datos.preguntas.forEach(q => {
        const li = document.createElement("li");
        li.innerHTML = `<b></b><span class="tx"></span><span class="mk"></span>`;
        li.children[0].textContent = "P" + q.n;
        li.children[1].textContent = q.p.length > 150 ? q.p.slice(0, 147) + "…" : q.p;
        li.children[2].textContent = q.marcada === null ? "sin marcar" : "marcaste " + LETRAS[q.marcada];
        ol.appendChild(li);
      });
      prev.appendChild(ol);
    }
    const tk = token.get();
    $("addTokSaved").classList.toggle("hidden", !tk);
    $("addTokNew").classList.toggle("hidden", !!tk);
    $("addTokBox").classList.toggle("hidden", !datos || enviado);
    $("addSend").classList.toggle("hidden", !datos || enviado);
    $("addSend").disabled = !datos || enviado;
  }

  function mensaje(txt, tipo) {
    const m = $("addMsg"); m.className = "addmsg" + (tipo ? " " + tipo : ""); m.textContent = txt || "";
  }
  function estado(txt, tipo, enlace, textoEnlace) {
    const e = $("addEstado"); e.className = "addest" + (tipo ? " " + tipo : ""); e.innerHTML = "";
    if (!txt) return;
    const p = document.createElement("p"); p.textContent = txt; e.appendChild(p);
    if (enlace) { const a = document.createElement("a"); a.href = enlace; a.target = "_blank"; a.rel = "noopener"; a.textContent = textoEnlace || "Ver en GitHub"; e.appendChild(a); }
  }

  async function cargar(files) {
    if (datos) return;                                   // ya hay un archivo: hay que quitarlo antes
    if (!files || !files.length) return;
    if (files.length > 1) { mensaje("Sube un solo archivo.", "err"); return; }
    mensaje("Leyendo el archivo…");
    try {
      datos = extraer(await leerArchivo(files[0]));
      mensaje("");
    } catch (e) { datos = null; mensaje(e.message, "err"); $("addFile").value = ""; }
    pintar();
  }

  function quitar() {
    gen++; datos = null; enviado = false;
    $("addFile").value = ""; mensaje(""); estado("");
    pintar();
  }

  async function enviar() {
    if (!datos || enviado) return;
    let tk = token.get();
    if (!tk) {
      tk = $("addTok").value.trim();
      if (!tk) { estado("Pega tu token de GitHub para poder subir las preguntas.", "ko"); $("addTok").focus(); return; }
    }
    const g = gen;
    $("addSend").disabled = true;
    estado("Comprobando el token…", "run");
    let paso = "leer el repo";
    try {
      const repo = await gh(tk, "GET", `/repos/${R}`);
      if (!token.get() && $("addTokRem").checked) token.set(tk);
      const base = repo.default_branch;
      const ref = await gh(tk, "GET", `/repos/${R}/git/ref/heads/${encodeURIComponent(base)}`);
      const sello = new Date().toISOString().replace(/[-:]/g, "").replace("T", "-").slice(0, 15);
      const nombre = `${slug(datos.test)}-${sello}`, rama = `preguntas/${nombre}`;
      paso = "crear la rama"; estado("Creando la rama " + rama + "…", "run");
      await gh(tk, "POST", `/repos/${R}/git/refs`, { ref: `refs/heads/${rama}`, sha: ref.object.sha });
      paso = "subir las preguntas"; estado("Subiendo las preguntas…", "run");
      const lote = { version: 1, test: datos.test, subido: new Date().toISOString(), preguntas: datos.preguntas };
      await gh(tk, "PUT", `/repos/${R}/contents/incoming/${nombre}.json`, {
        message: `Preguntas de «${datos.test}» para verificar`, branch: rama, content: b64(JSON.stringify(lote, null, 2) + "\n")
      });
      enviado = true; pintar();
      seguir(tk, rama, repo.owner.login, g);
    } catch (e) {
      if (g !== gen) return;
      if (e.status === 401 && token.get()) { token.del(); pintar(); }
      estado(errorGitHub(e, paso), "ko");
      $("addSend").disabled = false;
    }
  }

  // Sigue la Action hasta que abre el pull request (o termina sin abrirlo).
  async function seguir(tk, rama, owner, g) {
    const t0 = Date.now(), web = `https://github.com/${R}`;
    estado("Subidas. La Action va a comprobar cada pregunta con la teoría; tarda unos minutos.", "run", `${web}/actions/workflows/${WORKFLOW}`, "Ver la Action");
    while (Date.now() - t0 < 15 * 60 * 1000) {
      await dormir(8000);
      if (g !== gen) return;
      let run;
      try {
        const j = await gh(tk, "GET", `/repos/${R}/actions/workflows/${WORKFLOW}/runs?branch=${encodeURIComponent(rama)}&per_page=1`);
        run = (j.workflow_runs || [])[0];
      } catch (e) {
        if (g !== gen) return;
        if (e.status === 403 || e.status === 404) { estado("Subidas. El token no puede leer las Actions (permiso «Actions: Read-only»), así que no puedo seguir el proceso desde aquí. Cuando termine verás el pull request en GitHub.", "info", `${web}/pulls`, "Ver pull requests"); return; }
        continue;
      }
      if (g !== gen) return;
      const min = Math.max(1, Math.round((Date.now() - t0) / 60000));
      if (!run) { estado("Esperando a que arranque la Action…", "run", `${web}/actions/workflows/${WORKFLOW}`, "Ver la Action"); continue; }
      if (run.status !== "completed") { estado(`La IA está comprobando las preguntas con la teoría (${min} min)…`, "run", run.html_url, "Ver la Action"); continue; }
      if (run.conclusion !== "success") { estado("La Action ha fallado y no se ha añadido nada. Mira el registro para ver el motivo.", "ko", run.html_url, "Ver el registro"); return; }
      try {
        const prs = await gh(tk, "GET", `/repos/${R}/pulls?state=all&head=${encodeURIComponent(owner + ":" + rama)}`);
        if (g !== gen) return;
        if (prs.length) { estado(`Listo: pull request #${prs[0].number}. Revísalo y, si está bien, pulsa «Merge» para publicarlas.`, "ok", prs[0].html_url, "Abrir el pull request"); return; }
      } catch (e) { if (g !== gen) return; }
      estado("La Action ha terminado sin abrir pull request: ninguna pregunta nueva ha pasado la verificación (ya estaban o la teoría no las resuelve). El informe está en el resumen de la ejecución.", "info", run.html_url, "Ver el informe");
      return;
    }
    if (g === gen) estado("Sigue en marcha. Puedes cerrar esto y mirarlo en GitHub.", "info", `${web}/actions/workflows/${WORKFLOW}`, "Ver la Action");
  }

  /* ---------- eventos ---------- */
  $("openAdd").onclick = abrir;
  $("addFile").onchange = e => cargar(e.target.files);
  $("addQuitar").onclick = quitar;
  $("addSend").onclick = enviar;
  $("addTokForget").onclick = () => { token.del(); pintar(); };
  const drop = $("addDrop");
  ["dragenter", "dragover"].forEach(t => drop.addEventListener(t, e => { e.preventDefault(); drop.classList.add("over"); }));
  ["dragleave", "drop"].forEach(t => drop.addEventListener(t, () => drop.classList.remove("over")));
  drop.addEventListener("drop", e => { e.preventDefault(); cargar(e.dataTransfer && e.dataTransfer.files); });
  $("addRepo").textContent = R;
})();
