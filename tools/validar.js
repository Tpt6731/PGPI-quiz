#!/usr/bin/env node
// Valida las preguntas del quiz antes de publicar.
// Uso: node tools/validar.js            (desde la raíz del proyecto)
//      node tools/validar.js --largas   lista las preguntas cuya correcta es claramente la más larga
// Sale con código 1 si encuentra errores, para que GitHub Actions no publique.
"use strict";
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const DATA = path.join(ROOT, "data");
const FUENTES = ["oficial", "practica", "banco"];
const errores = [];
const avisos = [];
const largas = [];
const VER_LARGAS = process.argv.includes("--largas");
const err = (donde, msg) => errores.push(`✗ ${donde}: ${msg}`);
const aviso = (donde, msg) => avisos.push(`! ${donde}: ${msg}`);

function leerJSON(fichero) {
  const ruta = path.join(DATA, fichero);
  let texto;
  try { texto = fs.readFileSync(ruta, "utf8"); }
  catch (e) { err(fichero, "no existe o no se puede leer"); return null; }
  try { return JSON.parse(texto); }
  catch (e) { err(fichero, `JSON no válido (${e.message})`); return null; }
}

const indice = leerJSON("index.json");
if (!indice || !Array.isArray(indice.temas) || indice.temas.length === 0) {
  err("index.json", "debe tener una lista «temas» con al menos un tema");
} else {
  const ids = new Map();
  const temasVistos = new Set();
  let total = 0;
  const texto = v => typeof v === "string" && v.trim().length > 0;

  for (const t of indice.temas) {
    if (!texto(t.id) || !texto(t.nombre) || !texto(t.archivo)) {
      err("index.json", `cada tema necesita id, nombre y archivo (revisa ${JSON.stringify(t)})`);
      continue;
    }
    if (temasVistos.has(t.id)) err("index.json", `tema repetido: ${t.id}`);
    temasVistos.add(t.id);

    const preguntas = leerJSON(t.archivo);
    if (preguntas === null) continue;
    if (!Array.isArray(preguntas)) { err(t.archivo, "debe ser una lista [ … ] de preguntas"); continue; }

    preguntas.forEach((q, n) => {
      const donde = `${t.archivo} #${n + 1}${q && q.id ? ` (${q.id})` : ""}`;
      if (!q || typeof q !== "object") { err(donde, "no es un objeto"); return; }
      if (!texto(q.id)) err(donde, "falta «id»");
      else if (ids.has(q.id)) err(donde, `id repetido (ya está en ${ids.get(q.id)})`);
      else ids.set(q.id, t.archivo);
      if (q.tema !== t.id) err(donde, `«tema» debe ser "${t.id}" (está en ${t.archivo}) y es ${JSON.stringify(q.tema)}`);
      if (!FUENTES.includes(q.fuente)) err(donde, `«fuente» debe ser una de ${FUENTES.join(", ")}`);
      if (!texto(q.p)) err(donde, "falta el enunciado «p»");
      if (!Array.isArray(q.o) || q.o.length !== 4 || !q.o.every(texto)) err(donde, "«o» debe tener exactamente 4 opciones con texto");
      if (!Number.isInteger(q.c) || q.c < 0 || q.c > 3) err(donde, "«c» debe ser 0, 1, 2 o 3 (posición de la correcta)");
      if (!texto(q.e)) err(donde, "falta la explicación «e»");
      if (q.w !== undefined) {
        if (!Array.isArray(q.w) || q.w.length !== 4) err(donde, "«w» debe tener 4 textos (uno por opción)");
        else if (Number.isInteger(q.c) && q.c >= 0 && q.c < 4) {
          if (q.w[q.c] !== "") err(donde, `«w»[${q.c}] debe ser "" (es la correcta)`);
          q.w.forEach((x, i) => { if (i !== q.c && !texto(x)) err(donde, `«w»[${i}] está vacío: explica por qué no vale esa opción`); });
        }
      } else aviso(donde, "no tiene «w» (por qué no valen las otras)");
      if (q.t !== undefined && typeof q.t !== "string") err(donde, "«t» (trampa) debe ser texto");
      if (q.s !== undefined && typeof q.s !== "string") err(donde, "«s» (fuente) debe ser texto");
      if (Array.isArray(q.o) && q.o.length === 4 && Number.isInteger(q.c) && q.o[q.c]) {
        const largos = q.o.map(x => String(x).length), max = Math.max(...largos);
        if (largos[q.c] === max && largos.filter(l => l === max).length === 1 && max > 1.3 * Math.min(...largos))
          largas.push(donde);
      }
      total++;
    });
  }
  if (!errores.length) console.log(`✓ ${indice.temas.length} temas y ${total} preguntas correctas.`);
}

if (largas.length) {
  console.log(`\nEn ${largas.length} preguntas la correcta es claramente la opción más larga (no bloquea).` + (VER_LARGAS ? "" : " Para verlas: node tools/validar.js --largas"));
  if (VER_LARGAS) largas.forEach(l => console.log("  · " + l));
}
if (avisos.length) { console.log(`\nAvisos (${avisos.length}, no bloquean):`); avisos.slice(0, 40).forEach(a => console.log(a)); if (avisos.length > 40) console.log(`… y ${avisos.length - 40} más`); }
if (errores.length) {
  console.error(`\nErrores (${errores.length}):`);
  errores.forEach(e => console.error(e));
  process.exit(1);
}
