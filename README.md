# PGPI · Quiz

Cuestionario para preparar los tests de **Planificación y Gestión de Proyectos Informáticos** (PMBOK 8.ª ed.).
Es una web estática: HTML, CSS y JavaScript sin dependencias, con las preguntas en archivos JSON.

- **Simulacro:** eliges temas, fuentes (oficiales, práctica, test real) y número de preguntas. Corrige al entregar, con nota sobre 10 penalizada (−1/3 por fallo). Con **Autocheck** corrige cada pregunta al momento.
- **Estudiar:** por tema, con la corrección, el «por qué no son las otras», la trampa y la fuente de cada pregunta.
- El progreso (mejores notas, fallos, última configuración) se guarda **solo en el navegador de cada uno**.

## Estructura

```
index.html            página
styles.css            estilos (responsive: móvil, tablet y escritorio; modo claro y oscuro)
app.js                lógica (al final, el modal «Añadir preguntas»)
data/index.json       lista de temas y el archivo de cada uno
data/S1.json … S6.json  preguntas de cada tema
tools/validar.js      comprueba las preguntas (lo ejecuta GitHub Actions)
tools/procesar.js     verifica con la teoría las preguntas subidas desde el modal (lo ejecuta GitHub Actions)
tools/comandos.js     comandos /incluir, /corregir y /quitar en los pull requests de preguntas
theory/               teoría de la asignatura en PDF (no se publica en la web)
.github/workflows/pages.yml  valida y publica en GitHub Pages
.github/workflows/anadir-preguntas.yml  verifica las preguntas del modal y abre un pull request
.github/workflows/comandos-pr.yml       aplica los comandos que escribes en los comentarios del pull request
```

## Probar en local

Las preguntas se cargan con `fetch`, así que **no funciona abriendo `index.html` con doble clic**. Sirve la carpeta:

```bash
python -m http.server 8000
# y abre http://localhost:8000
```

Antes de subir cambios:

```bash
node tools/validar.js
```

## Publicar en GitHub Pages (una sola vez)

1. Mueve `tools/github-pages.yml` a `.github/workflows/pages.yml` (crea las carpetas si no existen). Es el workflow que valida y publica.
2. Sube el repo a GitHub con la rama `main`.
3. En el repo: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
4. Cada push a `main` valida las preguntas y, si todo está bien, publica. Si el validador encuentra un error, **no se publica** y la web sigue con la versión anterior.

> Aunque el repo sea privado, la web de GitHub Pages es pública para quien tenga el enlace.

## Añadir preguntas

Añade la pregunta al final del archivo de su tema (`data/S5.json`, por ejemplo). Formato:

```json
{
  "id": "S5-E60",
  "tema": "S5",
  "fuente": "practica",
  "p": "Enunciado de la pregunta",
  "o": ["Opción A", "Opción B", "Opción C", "Opción D"],
  "c": 2,
  "e": "Por qué la correcta es la correcta",
  "w": ["Por qué no vale A", "Por qué no vale B", "", "Por qué no vale D"],
  "t": "La trampa típica",
  "s": "Presentación S6, diap. 12"
}
```

| Campo | Obligatorio | Qué es |
|---|---|---|
| `id` | sí | Único en todo el banco. Convenio: `S5-E60` práctica, `P04-6` batería de grupo, `S6-7` profesora, `B1-1` y `S5-T2G2-10` test real |
| `tema` | sí | El id del tema, igual que en `data/index.json` y que el archivo donde está |
| `fuente` | sí | `oficial` (profesora o batería de un grupo), `practica` (no oficial) o `banco` (test real: ha salido en un test; en la web se muestra como «Test real») |
| `p` | sí | Enunciado |
| `o` | sí | Exactamente 4 opciones |
| `c` | sí | Posición de la correcta: `0`=A, `1`=B, `2`=C, `3`=D |
| `e` | sí | Explicación |
| `w` | recomendado | Por qué no vale cada opción; en la posición de la correcta va `""` |
| `t` | no | Trampa a evitar |
| `s` | no | De dónde sale (sesión, documento, página o diapositiva) |

Consejos para preguntas nuevas:
- Que la correcta **no sea siempre la opción más larga** (ni siempre la más corta). El validador avisa si lo es claramente.
- Reparte las correctas entre A, B, C y D.
- Pregunta conceptos, no datos sueltos de un caso concreto.

### Desde un test de Blackboard (botón «Añadir preguntas»)

1. En Blackboard abre la revisión del test («Comentarios sobre la evaluación»), baja hasta la última pregunta y guárdala con <kbd>Ctrl</kbd>+<kbd>S</kbd>.
2. En la web, **+ Añadir preguntas de un test** → elige el `.html` (solo admite `.html`, uno cada vez) → **Enviar a revisión**.
   Del archivo solo se envían los enunciados, las opciones y la que marcaste; ni la nota ni nada más de la página.
3. La web crea la rama `preguntas/<test>-<fecha>` con `incoming/<test>.json`. La Action **Añadir preguntas** (`tools/procesar.js`):
   - salta las que ya están en el banco (y avisa si lo que marcaste no coincide con su respuesta);
   - pide a Gemini (capa gratuita) la respuesta correcta usando **solo** los PDF de `theory/`, sin enseñarle lo que marcaste, con una cita literal que la respalde. Van varias preguntas por petición para gastar poca cuota;
   - comprueba la cita contra los PDF (sin IA): si no aparece tal cual, o la teoría no basta, la pregunta **se descarta**;
   - la guarda en el `data/Sx.json` de la sesión del documento citado, con `fuente: "banco"`, id `S5-T2G2-10` (sesión, test 2, grupo 2 y número seguido dentro de ese test: si ya hay hasta el 9, la siguiente es la 10, sea de la sesión que sea) y `s` con la diapositiva o página;
   - pasa `validar.js` y abre un **pull request** con el informe: confirmadas, corregidas (marcaste X, la teoría dice Y), descartadas y duplicadas.
4. Revisa el pull request (sobre todo las corregidas) y pulsa **Merge**: «Validar y publicar» lo publica. Si no lo quieres, ciérralo.

#### Corregir el pull request con comentarios

Antes de fusionar, escribe un comentario en el pull request con uno o varios comandos. `P5` es el número de la pregunta en el test subido (el mismo que sale en el informe):

| Comando | Qué hace |
|---|---|
| `/incluir P5 C` | Añade la pregunta 5 (por ejemplo, una descartada) con la C como correcta. La IA escribe las explicaciones y elige la sesión. |
| `/incluir P5` | Igual, pero la IA decide la respuesta: con la teoría si basta y, si no, con el PMBOK 8. Queda indicado para que la revises. |
| `/corregir P3 B` | Cambia a B la respuesta de una pregunta que ya está en el PR y rehace sus explicaciones. |
| `/quitar P3` | Quita del PR una pregunta añadida en él. |

Se pueden poner varios a la vez (`/incluir P1 D, P9 C`) o uno por línea. En un minuto o dos la Action **Comandos del PR** hace el commit en la rama y responde con un comentario de lo que ha hecho. Solo hace caso a los comentarios del dueño del repo y de los colaboradores. Las duplicadas no se pueden incluir: ya están en el banco.

Configuración (una sola vez):
- **Secret** `GEMINI_API_KEY`: crea una clave gratis (sin tarjeta) en [aistudio.google.com](https://aistudio.google.com) → *Get API key*, y guárdala en Settings → Secrets and variables → Actions → New repository secret. Usa la capa gratuita: si un día se agota la cuota, la Action falla con un aviso y basta con relanzarla al día siguiente (*Re-run all jobs*).
- Opcional, **variable** `GEMINI_MODEL` en la misma pantalla (pestaña Variables) para cambiar el modelo (por defecto `gemini-3.8-flash`; `gemini-3.5-flash-lite` tiene más cuota pero razona peor).
- Settings → Actions → General → Workflow permissions → marca **Allow GitHub Actions to create and approve pull requests**.
- En tu navegador, un **token fine-grained** (Settings → Developer settings → Fine-grained tokens) con acceso solo a este repo y permisos *Contents: Read and write*, *Pull requests: Read-only* y *Actions: Read-only*. Se pega en el modal la primera vez y se guarda solo en ese navegador.

La teoría está en `theory/`: la sesión de cada PDF sale de su nombre (`PresentacionS3.pdf`, `Memoria P04 (S5).pdf`). Para que la IA resuelva más preguntas de un tema, añade sus PDF ahí. Para probar en local sin escribir nada:
```bash
GEMINI_API_KEY=… node tools/procesar.js --seco incoming/mi-test.json
```

### Añadir un tema nuevo

1. Crea `data/S7.json` con una lista `[ … ]` de preguntas con `"tema": "S7"`.
2. Añádelo a `data/index.json`:
   ```json
   { "id": "S7", "nombre": "Riesgos", "archivo": "S7.json" }
   ```
La app lo carga sola: aparece en Estudiar y en el Simulacro con su color.

### Trabajar varios a la vez

Cada uno en su rama, con un pull request a `main`. El validador se ejecuta en el PR y avisa de errores antes de fusionar. Al tener un archivo por tema, es raro que dos personas se pisen.
