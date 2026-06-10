# Atom Developer Skills (ADS) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename `atomic` → `atom-developer-skills`, convertir los skills en un plugin Claude Code formal (`ads:task`, `ads:spec`), y eliminar la duplicación de skills entre `.claude/skills/` y `packages/cli/templates/skills/`.

**Architecture:** Se crea `.claude-plugin/plugin.json` con name `ads`. Los skills se mueven de `packages/cli/templates/skills/` a `skills/` en el root del repo (única fuente de verdad). El install.mjs se actualiza para leer desde la nueva ubicación. El auto-update hook basado en `version:` se elimina (reemplazado por `claude plugins update`). Las referencias a "Atomic" en templates, docs y strings de UI se reemplazan por "Atom Developer Skills" / `ads`.

**Tech Stack:** Node.js (install.mjs), Bash, JSON, Markdown

---

### Task 1: Crear `.claude-plugin/plugin.json`

**Files:**
- Create: `.claude-plugin/plugin.json`

- [ ] **Step 1: Crear el directorio y archivo**

```bash
mkdir -p .claude-plugin
```

Contenido de `.claude-plugin/plugin.json`:
```json
{
  "name": "ads",
  "description": "Atom Developer Skills — spec-driven development assistant for the Atom team",
  "author": {
    "name": "Atom Team",
    "email": "antony.hernandez@atomchat.io"
  }
}
```

- [ ] **Step 2: Verificar que el JSON es válido**

```bash
node -e "JSON.parse(require('fs').readFileSync('.claude-plugin/plugin.json','utf8')); console.log('✓ valid')"
```
Expected: `✓ valid`

- [ ] **Step 3: Commit**

```bash
git add .claude-plugin/plugin.json
git commit -m "feat: add Claude Code plugin manifest (ads)"
```

---

### Task 2: Mover y actualizar skills al root

**Files:**
- Create: `skills/task/SKILL.md`
- Create: `skills/task/brief-template.md`
- Create: `skills/spec/SKILL.md`

- [ ] **Step 1: Crear directorio y mover archivos**

```bash
mkdir -p skills/task skills/spec
cp packages/cli/templates/skills/task/SKILL.md skills/task/SKILL.md
cp packages/cli/templates/skills/task/brief-template.md skills/task/brief-template.md
cp packages/cli/templates/skills/spec/SKILL.md skills/spec/SKILL.md
```

- [ ] **Step 2: Actualizar frontmatter de `skills/task/SKILL.md`**

Reemplazar las líneas del frontmatter:
```
---
name: task
version: 3.3.0
description: Use when starting work on any Jira task — before reading code, writing code, or asking the user for context.
---
```
Por:
```
---
name: task
description: Use when starting work on any Jira task, ticket, story, historia, or US — before reading code, writing code, or asking the user for context.
---
```

- [ ] **Step 3: Actualizar frontmatter de `skills/spec/SKILL.md`**

Reemplazar:
```
---
name: spec
version: 1.3.1
description: Use when converting a Confluence FRD into a technical spec and Jira backlog — before any implementation begins.
---
```
Por:
```
---
name: spec
description: Use when converting a Confluence FRD into a technical spec, spec técnica, o especificación técnica, and Jira backlog — before any implementation or planning begins.
---
```

- [ ] **Step 4: Verificar que no queda `version:` en ningún skill**

```bash
grep -n "^version:" skills/task/SKILL.md skills/spec/SKILL.md
```
Expected: sin output (no matches)

- [ ] **Step 5: Commit**

```bash
git add skills/
git commit -m "feat: move skills to root, update frontmatter (ads)"
```

---

### Task 3: Actualizar `install.mjs`

**Files:**
- Modify: `packages/cli/src/install.mjs`

- [ ] **Step 1: Actualizar constantes de URLs y strings de UI**

Reemplazar el bloque de constantes al principio del archivo:

```javascript
// Antes
const ATOMIC_START = "<!-- ATOMIC:START — no editar esta sección manualmente -->";
const ATOMIC_END = "<!-- ATOMIC:END -->";
const TECH_PLACEHOLDER = "<!-- ATOMIC:TECH_SECTIONS -->";
// ...
const RAW_BASE = "https://raw.githubusercontent.com/antony-hernandez/atomic/main/packages/cli/templates";
```

Por:
```javascript
const ADS_START = "<!-- ADS:START — no editar esta sección manualmente -->";
const ADS_END = "<!-- ADS:END -->";
// Backward compat: detectar marcadores viejos también
const LEGACY_START = "<!-- ATOMIC:START — no editar esta sección manualmente -->";
const LEGACY_END = "<!-- ATOMIC:END -->";
const TECH_PLACEHOLDER = "<!-- ATOMIC:TECH_SECTIONS -->";

const SKILLS_RAW_BASE = "https://raw.githubusercontent.com/antony-hernandez/atom-developer-skills/main/skills";
const TEMPLATES_RAW_BASE = "https://raw.githubusercontent.com/antony-hernandez/atom-developer-skills/main/packages/cli/templates";
```

- [ ] **Step 2: Actualizar detección de templates locales**

Reemplazar el bloque de detección local:

```javascript
// Antes
let TEMPLATES = null;
try {
  const __dir = dirname(fileURLToPath(import.meta.url));
  const candidate = resolve(__dir, "../templates");
  if (existsSync(join(candidate, "skills/task/SKILL.md"))) {
    TEMPLATES = candidate;
  }
} catch {
  // import.meta.url no resuelve desde stdin — modo remoto
}

if (!TEMPLATES) {
  console.log("  (descargando templates desde GitHub)\n");
}
```

Por:
```javascript
let SKILLS_DIR = null;
let TEMPLATES_DIR = null;
try {
  const __dir = dirname(fileURLToPath(import.meta.url));
  const skillsCandidate = resolve(__dir, "../../skills");
  if (existsSync(join(skillsCandidate, "task/SKILL.md"))) {
    SKILLS_DIR = skillsCandidate;
  }
  const templatesCandidate = resolve(__dir, "../templates");
  if (existsSync(join(templatesCandidate, "CLAUDE-base.md"))) {
    TEMPLATES_DIR = templatesCandidate;
  }
} catch {
  // import.meta.url no resuelve desde stdin — modo remoto
}

if (!SKILLS_DIR || !TEMPLATES_DIR) {
  console.log("  (descargando assets desde GitHub)\n");
}
```

- [ ] **Step 3: Reemplazar `readTemplate` por dos funciones**

Reemplazar la función `readTemplate` existente por:

```javascript
async function readSkill(relativePath) {
  if (SKILLS_DIR) {
    return readFileSync(join(SKILLS_DIR, relativePath), "utf8");
  }
  const url = `${SKILLS_RAW_BASE}/${relativePath}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Error al descargar ${url}: HTTP ${res.status}`);
  return res.text();
}

async function readTemplate(relativePath) {
  if (TEMPLATES_DIR) {
    return readFileSync(join(TEMPLATES_DIR, relativePath), "utf8");
  }
  const url = `${TEMPLATES_RAW_BASE}/${relativePath}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Error al descargar ${url}: HTTP ${res.status}`);
  return res.text();
}
```

- [ ] **Step 4: Actualizar llamadas a readTemplate para skills**

En la función `install()`, reemplazar:
```javascript
// Antes
const skillContent = await readTemplate("skills/task/SKILL.md");
// ...
const specContent = await readTemplate("skills/spec/SKILL.md");
// ...
const skills = [
  ["skills/task/SKILL.md",          ".claude/skills/task/SKILL.md",          skillContent],
  ["skills/task/brief-template.md", ".claude/skills/task/brief-template.md", null],
  ["skills/spec/SKILL.md",          ".claude/skills/spec/SKILL.md",          specContent],
];
```

Por:
```javascript
const skillContent = await readSkill("task/SKILL.md");
// ...
const specContent = await readSkill("spec/SKILL.md");
// ...
const skills = [
  ["task/SKILL.md",         ".claude/skills/task/SKILL.md",         skillContent],
  ["task/brief-template.md",".claude/skills/task/brief-template.md", null],
  ["spec/SKILL.md",         ".claude/skills/spec/SKILL.md",         specContent],
];
```

Y actualizar el readSkill sin preloaded:
```javascript
for (const [src, dest, preloaded] of skills) {
  const content = preloaded ?? await readSkill(src);
  writeFileSync(join(ROOT, dest), content);
}
```

- [ ] **Step 5: Actualizar CLAUDE.md markers con backward compat**

Reemplazar la función `buildClaudeMd` y la lógica de escritura de CLAUDE.md para manejar ambos marcadores:

En la sección que escribe CLAUDE.md dentro de `install()`, reemplazar:
```javascript
const wrappedSection = `${ATOMIC_START}\n${atomicContent}\n${ATOMIC_END}`;

if (!existsSync(claudeMdPath)) {
  writeFileSync(claudeMdPath, wrappedSection + "\n");
  console.log(green("  ✓ CLAUDE.md creado"));
} else {
  const existing = readFileSync(claudeMdPath, "utf8");
  if (existing.includes(ATOMIC_START)) {
    const updated = existing.replace(
      new RegExp(`${escapeRegex(ATOMIC_START)}[\\s\\S]*?${escapeRegex(ATOMIC_END)}`),
      wrappedSection
    );
    writeFileSync(claudeMdPath, updated);
    console.log(green("  ✓ sección Atomic actualizada en CLAUDE.md"));
  } else {
    writeFileSync(claudeMdPath, existing.trimEnd() + "\n\n" + wrappedSection + "\n");
    console.log(green("  ✓ sección Atomic agregada a CLAUDE.md existente"));
  }
}
```

Por:
```javascript
const wrappedSection = `${ADS_START}\n${atomicContent}\n${ADS_END}`;

if (!existsSync(claudeMdPath)) {
  writeFileSync(claudeMdPath, wrappedSection + "\n");
  console.log(green("  ✓ CLAUDE.md creado"));
} else {
  const existing = readFileSync(claudeMdPath, "utf8");
  // Detectar marcador nuevo o legado
  const hasAds    = existing.includes(ADS_START);
  const hasLegacy = existing.includes(LEGACY_START);
  if (hasAds) {
    const updated = existing.replace(
      new RegExp(`${escapeRegex(ADS_START)}[\\s\\S]*?${escapeRegex(ADS_END)}`),
      wrappedSection
    );
    writeFileSync(claudeMdPath, updated);
    console.log(green("  ✓ sección ADS actualizada en CLAUDE.md"));
  } else if (hasLegacy) {
    const updated = existing.replace(
      new RegExp(`${escapeRegex(LEGACY_START)}[\\s\\S]*?${escapeRegex(LEGACY_END)}`),
      wrappedSection
    );
    writeFileSync(claudeMdPath, updated);
    console.log(green("  ✓ sección Atomic migrada a ADS en CLAUDE.md"));
  } else {
    writeFileSync(claudeMdPath, existing.trimEnd() + "\n\n" + wrappedSection + "\n");
    console.log(green("  ✓ sección ADS agregada a CLAUDE.md existente"));
  }
}
```

- [ ] **Step 6: Actualizar strings de UI y comentario de uso**

Reemplazar:
```javascript
console.log(bold("\n⚡ Atomic — Asistente de desarrollo de Atom\n"));
```
Por:
```javascript
console.log(bold("\n⚡ Atom Developer Skills — Asistente de desarrollo de Atom\n"));
```

Reemplazar:
```javascript
console.log(bold("\n¡Listo! Atomic instalado.\n"));
```
Por:
```javascript
console.log(bold("\n¡Listo! Atom Developer Skills instalado.\n"));
```

Reemplazar en los mensajes de uso:
```javascript
console.log("    /task CV-123          ← carga el brief completo de una tarea");
console.log("    /spec <URL_FRD>       ← convierte un FRD en spec técnica + backlog\n");
```
Por:
```javascript
console.log("    ads:task CV-123          ← carga el brief completo de una tarea");
console.log("    ads:spec <URL_FRD>       ← convierte un FRD en spec técnica + backlog\n");
```

Actualizar el comentario de uso al inicio del archivo:
```javascript
// Antes
 * Uso: curl -fsSL https://raw.githubusercontent.com/antony-hernandez/atomic/main/packages/cli/src/install.mjs | node
 * o:  npx github:antony-hernandez/atomic

// Después
 * Uso: curl -fsSL https://raw.githubusercontent.com/antony-hernandez/atom-developer-skills/main/packages/cli/src/install.mjs | node
 * o:  npx github:antony-hernandez/atom-developer-skills
```

- [ ] **Step 7: Eliminar setup del hook de auto-update en settings**

En la sección que configura `settings.hooks.SessionStart` dentro de `install()`, eliminar por completo el bloque:
```javascript
settings.hooks = settings.hooks ?? {};
settings.hooks.SessionStart = settings.hooks.SessionStart ?? [];
const hasUpdateHook = settings.hooks.SessionStart.some(h =>
  h.hooks?.some(c => c.command?.includes("check-atomic-updates"))
);
if (!hasUpdateHook) {
  settings.hooks.SessionStart.push({
    hooks: [{ type: "command", command: "bash .claude/hooks/check-atomic-updates.sh", timeout: 5 }]
  });
  console.log(green("  ✓ SessionStart hook configurado (update check)"));
}
```

El plugin model usa `claude plugins update ads` — no hay hook de auto-update.

- [ ] **Step 8: Verificar que el archivo parsea sin errores**

```bash
node --input-type=module < packages/cli/src/install.mjs --help 2>&1 | head -5
```
Expected: no syntax errors (puede mostrar "Error: Cannot read" al no tener argumentos — eso es normal)

Alternativa más confiable:
```bash
node -e "import('./packages/cli/src/install.mjs').catch(e => { if (!e.message.includes('install')) throw e })"
```

- [ ] **Step 9: Commit**

```bash
git add packages/cli/src/install.mjs
git commit -m "refactor(install): rename Atomic → ADS, split readSkill/readTemplate, remove auto-update hook"
```

---

### Task 4: Actualizar templates de CLAUDE.md

**Files:**
- Modify: `packages/cli/templates/CLAUDE-base.md`
- Modify: `packages/cli/templates/CLAUDE.md`

- [ ] **Step 1: Actualizar `CLAUDE-base.md`**

Reemplazar todas las referencias en el archivo:

| Buscar | Reemplazar |
|--------|-----------|
| `# Atomic — Asistente de desarrollo de Atom` | `# Atom Developer Skills — Asistente de desarrollo de Atom` |
| `` `/task <ID>` `` | `` `ads:task <ID>` `` |
| `` `/task CV-599` `` | `` `ads:task CV-599` `` |
| `` `/spec <URL_FRD>` `` | `` `ads:spec <URL_FRD>` `` |

```bash
sed -i \
  's|# Atomic — Asistente de desarrollo de Atom|# Atom Developer Skills — Asistente de desarrollo de Atom|g' \
  packages/cli/templates/CLAUDE-base.md

sed -i \
  's|`/task|`ads:task|g; s|`/spec|`ads:spec|g' \
  packages/cli/templates/CLAUDE-base.md
```

- [ ] **Step 2: Aplicar mismo reemplazo a `CLAUDE.md` (archivo de referencia)**

```bash
sed -i \
  's|# Atomic — Asistente de desarrollo de Atom|# Atom Developer Skills — Asistente de desarrollo de Atom|g' \
  packages/cli/templates/CLAUDE.md

sed -i \
  's|`/task|`ads:task|g; s|`/spec|`ads:spec|g' \
  packages/cli/templates/CLAUDE.md
```

- [ ] **Step 3: Verificar que no quedan referencias a `/task` o `/spec` sin namespace**

```bash
grep -n '`/task\|`/spec' packages/cli/templates/CLAUDE-base.md packages/cli/templates/CLAUDE.md
```
Expected: sin output

- [ ] **Step 4: Commit**

```bash
git add packages/cli/templates/CLAUDE-base.md packages/cli/templates/CLAUDE.md
git commit -m "docs(templates): update skill invocations to ads:task, ads:spec"
```

---

### Task 5: Actualizar `package.json` y root `CLAUDE.md`

**Files:**
- Modify: `package.json`
- Modify: `CLAUDE.md`

- [ ] **Step 1: Actualizar `package.json`**

Reemplazar el contenido completo:
```json
{
  "name": "atom-developer-skills",
  "version": "1.0.0",
  "description": "Atom Developer Skills — asistente de desarrollo spec-driven para el equipo de Atom",
  "bin": {
    "ads": "./packages/cli/src/install.mjs"
  },
  "type": "module",
  "scripts": {
    "setup-dev": "cp packages/cli/hooks/pre-push .git/hooks/pre-push && chmod +x .git/hooks/pre-push && echo '✓ git hooks instalados'"
  },
  "engines": {
    "node": ">=18"
  }
}
```

- [ ] **Step 2: Actualizar referencias en root `CLAUDE.md`**

```bash
sed -i \
  's|/task |ads:task |g; s|/spec |ads:spec |g' \
  CLAUDE.md

sed -i \
  's|`/task`|`ads:task`|g; s|`/spec`|`ads:spec`|g' \
  CLAUDE.md
```

Verificar manualmente que el heading principal dice "Atomic" y actualizarlo si corresponde:
```bash
grep -n "Atomic\|atomic" CLAUDE.md | head -10
```
Si hay referencias a "Atomic" en el heading, reemplazar manualmente con "Atom Developer Skills".

- [ ] **Step 3: Verificar**

```bash
node -e "const p = JSON.parse(require('fs').readFileSync('package.json','utf8')); console.log(p.name, p.version, Object.keys(p.bin))"
```
Expected: `atom-developer-skills 1.0.0 [ 'ads' ]`

- [ ] **Step 4: Commit**

```bash
git add package.json CLAUDE.md
git commit -m "chore: rename package atomic → atom-developer-skills, bin atomic → ads"
```

---

### Task 6: Limpiar estructura antigua y actualizar docs

**Files:**
- Delete: `.claude/skills/task/` (directory)
- Delete: `.claude/skills/spec/` (directory)
- Delete: `packages/cli/templates/skills/` (directory)
- Delete: `.claude/hooks/check-atomic-updates.py`
- Modify: `.claude/settings.json`
- Rename: `packages/cli/templates/hooks/check-atomic-updates.sh` → `check-ads-updates.sh`
- Rename: `packages/cli/hooks/check-atomic-updates.py` → `check-ads-updates.py`
- Modify: `README.md`
- Modify: `CONTRIBUTING.md`
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Eliminar `.claude/skills/` (reemplazado por plugin)**

```bash
rm -rf .claude/skills/task .claude/skills/spec
```

Verificar que no queda nada en `.claude/skills/`:
```bash
ls .claude/skills/ 2>/dev/null && echo "WARN: directorio no vacío" || echo "✓ eliminado"
```

- [ ] **Step 2: Eliminar `packages/cli/templates/skills/` (movido a root `skills/`)**

```bash
rm -rf packages/cli/templates/skills
```

Verificar:
```bash
ls packages/cli/templates/
```
Expected: `CLAUDE-base.md  CLAUDE.md  hooks  sections` — sin directorio `skills/`

- [ ] **Step 3: Eliminar hook de auto-update del repo de desarrollo**

```bash
rm .claude/hooks/check-atomic-updates.py
```

Actualizar `.claude/settings.json` — eliminar el bloque SessionStart hook:
```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "python3 packages/cli/hooks/check-template-bump.py",
            "timeout": 10
          }
        ]
      }
    ]
  }
}
```
(Eliminar el bloque `SessionStart` completo — solo queda `PostToolUse`)

- [ ] **Step 4: Renombrar y actualizar hook de templates**

```bash
mv packages/cli/templates/hooks/check-atomic-updates.sh \
   packages/cli/templates/hooks/check-ads-updates.sh
```

Actualizar el contenido de `check-ads-updates.sh`:
- `RAW_BASE` → `https://raw.githubusercontent.com/antony-hernandez/atom-developer-skills/main/skills`
- `atomic-updater` → `ads-updater`  
- Comentario inicial: `# SessionStart hook — sincroniza skills ADS contra GitHub automáticamente.`
- `local_path=".claude/skills/${skill}/SKILL.md"` — sin cambios (sigue instalando en `.claude/skills/` del proyecto target)

```bash
sed -i \
  's|antony-hernandez/atomic/main/packages/cli/templates/skills|antony-hernandez/atom-developer-skills/main/skills|g' \
  packages/cli/templates/hooks/check-ads-updates.sh

sed -i 's/atomic-updater/ads-updater/g' packages/cli/templates/hooks/check-ads-updates.sh
sed -i 's/sincroniza skills Atomic/sincroniza skills ADS/g' packages/cli/templates/hooks/check-ads-updates.sh
```

- [ ] **Step 5: Renombrar hook en `packages/cli/hooks/`**

```bash
mv packages/cli/hooks/check-atomic-updates.py packages/cli/hooks/check-ads-updates.py
```

Actualizar su contenido:
```bash
sed -i \
  's|antony-hernandez/atomic/main/packages/cli/templates/skills|antony-hernandez/atom-developer-skills/main/skills|g' \
  packages/cli/hooks/check-ads-updates.py

sed -i 's/atomic-updater/ads-updater/g' packages/cli/hooks/check-ads-updates.py
sed -i 's/Atomic —/ADS —/g; s/sincroniza skills Atomic/sincroniza skills ADS/g' \
  packages/cli/hooks/check-ads-updates.py
```

- [ ] **Step 6: Actualizar referencias al hook en `install.mjs`**

El install.mjs copia el hook de update a los proyectos target. Actualizar:
```javascript
// Buscar y reemplazar en packages/cli/src/install.mjs:
// "hooks/check-atomic-updates.sh" → "hooks/check-ads-updates.sh"
// ".claude/hooks/check-atomic-updates.sh" → ".claude/hooks/check-ads-updates.sh"
// "check-atomic-updates" → "check-ads-updates"
```

```bash
sed -i \
  's|check-atomic-updates|check-ads-updates|g' \
  packages/cli/src/install.mjs
```

- [ ] **Step 7: Actualizar README.md**

Reemplazar referencias textuales:
```bash
sed -i \
  's|# Atomic|# Atom Developer Skills|g; s|**Atomic**|**Atom Developer Skills**|g' \
  README.md

sed -i \
  's|antony-hernandez/atomic|antony-hernandez/atom-developer-skills|g' \
  README.md

sed -i 's|`atomic`|`ads`|g; s|npx atomic|npx ads|g' README.md
```

Verificar manualmente que el resultado tiene sentido:
```bash
head -30 README.md
```

- [ ] **Step 8: Actualizar CONTRIBUTING.md**

```bash
sed -i \
  's|Atomic|Atom Developer Skills|g; s|atomic|atom-developer-skills|g' \
  CONTRIBUTING.md
```

- [ ] **Step 9: Agregar entrada al CHANGELOG.md**

Agregar al inicio del cuerpo del CHANGELOG (después del heading principal):
```markdown
## [1.0.0] — 2026-06-10

### Breaking Changes
- Proyecto renombrado de `atomic` a `atom-developer-skills`. CLI: `atomic` → `ads`.
- Skills ahora namespaciados: `/task` → `ads:task`, `/spec` → `ads:spec`.
- Marcadores en CLAUDE.md: `ATOMIC:START/END` → `ADS:START/END` (install.mjs migra automáticamente).
- Auto-update hook eliminado — usar `claude plugins update ads` para actualizar.

### Added
- Plugin Claude Code formal: `claude plugins install github:antony-hernandez/atom-developer-skills`.
- Skills disponibles como `ads:task` y `ads:spec` en proyectos con el plugin instalado.

### Changed
- `skills/` movido de `packages/cli/templates/skills/` al root del repositorio.
- `check-atomic-updates` renombrado a `check-ads-updates`.
- `version:` eliminado del frontmatter de ambos skills (campo no estándar).
- Keywords de discovery mejorados en descriptions de `task` y `spec`.
```

- [ ] **Step 10: Verificar que no quedan referencias a "atomic" en archivos críticos**

```bash
grep -rn "\batomic\b" --include="*.md" --include="*.json" --include="*.mjs" --include="*.py" --include="*.sh" \
  --exclude-dir=".git" --exclude-dir="docs" \
  . 2>/dev/null | grep -v "atom-developer-skills\|node_modules"
```
Expected: sin matches (o solo matches esperados como comentarios históricos)

- [ ] **Step 11: Commit final de limpieza y docs**

```bash
git add -A
git commit -m "chore: cleanup old skills structure, rename hooks, update docs for ADS 1.0.0"
```

---

### Task 7: Verificación final

- [ ] **Step 1: Verificar estructura final del repo**

```bash
find . -not -path './.git/*' -not -path './node_modules/*' | sort | grep -E "skills|plugin|hook|CLAUDE"
```

Expected structure:
```
./.claude-plugin/plugin.json
./packages/cli/hooks/check-ads-updates.py
./packages/cli/hooks/check-template-bump.py
./packages/cli/hooks/pre-push
./packages/cli/templates/hooks/check-ads-updates.sh
./skills/spec/SKILL.md
./skills/task/brief-template.md
./skills/task/SKILL.md
./CLAUDE.md
./packages/cli/templates/CLAUDE-base.md
./packages/cli/templates/CLAUDE.md
```

No debe aparecer: `check-atomic-updates`, `.claude/skills/`, `packages/cli/templates/skills/`

- [ ] **Step 2: Verificar plugin.json final**

```bash
node -e "const p = JSON.parse(require('fs').readFileSync('.claude-plugin/plugin.json','utf8')); console.log('name:', p.name, '| description:', p.description.slice(0,40))"
```
Expected: `name: ads | description: Atom Developer Skills — spec-driven`

- [ ] **Step 3: Verificar frontmatter de skills**

```bash
head -5 skills/task/SKILL.md && echo "---" && head -5 skills/spec/SKILL.md
```
Expected: sin línea `version:`, con `description:` que incluye keywords en español.

- [ ] **Step 4: Smoke test del installer**

```bash
mkdir -p /tmp/ads-test && cd /tmp/ads-test && node /home/ksante/dev/ATOM/atomic/packages/cli/src/install.mjs
```
Expected:
- `⚡ Atom Developer Skills` en el output (no "Atomic")
- Skills copiados a `/tmp/ads-test/.claude/skills/`
- `ads:task` y `ads:spec` en el output final

Limpiar:
```bash
rm -rf /tmp/ads-test
```

- [ ] **Step 5: Commit final si hay cambios pendientes**

```bash
git status
# Si hay algo sin commitear:
git add -A
git commit -m "chore: final verification fixes"
```

- [ ] **Step 6: Notar para hacer en GitHub (fuera del scope de código)**

```
Renombrar el repo en GitHub:
  Settings → General → Repository name → "atom-developer-skills" → Rename
  (GitHub mantiene redirect automático desde antony-hernandez/atomic)
```
