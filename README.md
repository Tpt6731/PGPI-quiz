# PGPI · Quiz

Cuestionario para preparar los tests de **Planificación y Gestión de Proyectos Informáticos** (PMBOK 8.ª ed.).
Es una web estática: HTML, CSS y JavaScript sin dependencias, con las preguntas en archivos JSON.

- **Simulacro:** eliges temas, fuentes (oficiales, práctica, banco de alumnos) y número de preguntas. Corrige al entregar, con nota sobre 10 penalizada (−1/3 por fallo). Con **Autocheck** corrige cada pregunta al momento.
- **Estudiar:** por tema, con la corrección, el «por qué no son las otras», la trampa y la fuente de cada pregunta.
- El progreso (mejores notas, fallos, última configuración) se guarda **solo en el navegador de cada uno**.

## Estructura

```
index.html            página
styles.css            estilos (responsive: móvil, tablet y escritorio; modo claro y oscuro)
app.js                lógica
data/index.json       lista de temas y el archivo de cada uno
data/S1.json … S6.json  preguntas de cada tema
tools/validar.js      comprueba las preguntas (lo ejecuta GitHub Actions)
.github/workflows/pages.yml  valida y publica en GitHub Pages
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
| `id` | sí | Único en todo el banco. Convenio: `S5-E60` práctica, `P04-6` batería de grupo, `S6-7` profesora, `B1-1` banco de alumnos |
| `tema` | sí | El id del tema, igual que en `data/index.json` y que el archivo donde está |
| `fuente` | sí | `oficial` (profesora o batería de un grupo), `practica` (no oficial) o `banco` (banco de alumnos) |
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

### Añadir un tema nuevo

1. Crea `data/S7.json` con una lista `[ … ]` de preguntas con `"tema": "S7"`.
2. Añádelo a `data/index.json`:
   ```json
   { "id": "S7", "nombre": "Riesgos", "archivo": "S7.json" }
   ```
La app lo carga sola: aparece en Estudiar y en el Simulacro con su color.

### Trabajar varios a la vez

Cada uno en su rama, con un pull request a `main`. El validador se ejecuta en el PR y avisa de errores antes de fusionar. Al tener un archivo por tema, es raro que dos personas se pisen.
