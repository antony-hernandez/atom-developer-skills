# Atom Developer Skills (ADS) — Rediseño del proyecto

**Fecha:** 2026-06-10
**Estado:** Aprobado

## Contexto

El proyecto `atomic` es el CLI y conjunto de skills de Claude Code para el equipo de desarrollo de Atom. Actualmente los skills (`/task`, `/spec`) viven como archivos sueltos en `.claude/skills/` sin estructura de plugin formal. El nombre "atomic" no comunica qué es el proyecto.

## Objetivos

1. Renombrar el proyecto a **Atom Developer Skills** (`ads`)
2. Convertir los skills en un **plugin Claude Code formal** instalable vía `claude plugins install`
3. Eliminar duplicación de skills entre `.claude/skills/` y `packages/cli/templates/skills/`
4. Mejorar las descriptions de los skills para mejor discovery

## Diseño

### 1. Rename del proyecto

| Artefacto | Antes | Después |
|-----------|-------|---------|
| `package.json` name | `atomic` | `atom-developer-skills` |
| `package.json` bin | `atomic` | `ads` |
| `package.json` description | "Asistente de desarrollo spec-driven..." | "Atom Developer Skills — asistente de desarrollo spec-driven para el equipo de Atom" |
| `package.json` version | `0.25.0` | `1.0.0` |
| GitHub repo | `antony-hernandez/atomic` | `antony-hernandez/atom-developer-skills` |
| RAW_BASE en install.mjs | `.../antony-hernandez/atomic/...` | `.../antony-hernandez/atom-developer-skills/...` |
| Strings de UI en install.mjs | `⚡ Atomic`, `Atomic instalado` | `⚡ Atom Developer Skills`, `ADS instalado` |
| README, CONTRIBUTING, CHANGELOG | referencias a "Atomic" | referencias a "Atom Developer Skills" / "ads" |

El rename del repo en GitHub mantiene redirect automático — los instaladores existentes siguen funcionando.

### 2. Estructura de plugin

**Nueva estructura:**
```
atom-developer-skills/
├── .claude-plugin/
│   └── plugin.json              ← NUEVO
├── skills/                      ← MOVIDO desde packages/cli/templates/skills/
│   ├── task/
│   │   ├── SKILL.md
│   │   └── brief-template.md
│   └── spec/
│       └── SKILL.md
├── .claude/                     ← sin cambios (dev config del repo)
│   ├── hooks/
│   └── settings.json
├── packages/cli/
│   ├── src/install.mjs          ← actualizado
│   └── templates/
│       ├── CLAUDE-base.md
│       ├── CLAUDE.md
│       ├── hooks/
│       └── sections/
└── docs/
```

**`plugin.json`:**
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

**Cambios en `install.mjs`:**
- `RAW_BASE` apunta a `skills/` en el nuevo repo (en vez de `packages/cli/templates/skills/`)
- Detección de templates locales busca en `../../skills/` relativo al script
- Strings de UI actualizados
- Comentario de uso actualizado: `ads` en vez de `atomic`

**Eliminaciones:**
- `.claude/skills/task/` — reemplazado por el plugin instalado globalmente
- `.claude/skills/spec/` — ídem
- `packages/cli/templates/skills/` — movido a `skills/` en el root

**Instalación para developer nuevo:**
```bash
claude plugins install github:antony-hernandez/atom-developer-skills
```

Los skills quedan disponibles como `ads:task` y `ads:spec`.

**CLAUDE.md del proyecto y templates actualizados:**
- `/task` → `ads:task`
- `/spec` → `ads:spec`
- Referencias al nombre "Atomic" → "Atom Developer Skills"

### 3. Mejoras a los skills

**`skills/task/SKILL.md` frontmatter:**
```yaml
---
name: task
description: Use when starting work on any Jira task, ticket, story, historia, or US — before reading code, writing code, or asking the user for context.
---
```
Cambios: quitar `version: 3.3.0` (no estándar), agregar keywords "ticket, story, historia, US".

**`skills/spec/SKILL.md` frontmatter:**
```yaml
---
name: spec
description: Use when converting a Confluence FRD into a technical spec, spec técnica, o especificación técnica, and Jira backlog — before any implementation or planning begins.
---
```
Cambios: quitar `version: 1.3.1` (no estándar), agregar keywords "spec técnica, especificación técnica".

Los nombres cortos (`task`, `spec`) se mantienen — están namespaciados como `ads:task` y `ads:spec`, sin riesgo de colisión.

## Fuera de scope

- Baseline testing (ciclo RED→GREEN→REFACTOR) — queda para una segunda iteración
- Cambio de nombres a gerund form — los nombres cortos son preferibles para slash commands namespaciados
- Publicación en el marketplace de Claude Code

## Criterios de aceptación

- [ ] `claude plugins install github:antony-hernandez/atom-developer-skills` instala el plugin correctamente
- [ ] `ads:task` y `ads:spec` aparecen en el listado de skills disponibles
- [ ] El CLI (`ads`) sigue funcionando igual que antes (`atomic`)
- [ ] No hay referencias a "Atomic" en README, CONTRIBUTING, CLAUDE.md ni install.mjs
- [ ] `.claude/skills/` eliminado del repo
- [ ] `packages/cli/templates/skills/` eliminado (skills viven en `skills/`)
- [ ] Frontmatter sin campo `version` en ninguno de los dos skills
