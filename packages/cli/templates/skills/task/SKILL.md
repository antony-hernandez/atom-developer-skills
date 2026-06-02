---
name: task
description: Dado un ID de tarea de Jira (subtask), arma el contexto completo de implementación — lee Jira, sube a la HU padre, va a Confluence, encuentra el FRD, extrae Figma si aplica, y entrega un brief enfocado en el tipo de tarea (FE o BE). Nunca asume. Siempre pregunta lo que falta.
---

# Atomic — Task Discovery

<rules>
- NUNCA inventar información que no está en los documentos leídos
- NUNCA mezclar contexto FE y BE en el brief — el dev trabaja una sola cosa
- NUNCA asumir el tipo de tarea si no hay prefijo claro — preguntar
- SIEMPRE leer comentarios: Jira (task + HU) y Confluence (Spec + FRD)
- SIEMPRE seguir la cadena completa antes de entregar el brief
- Si faltan criterios de aceptación en la tarea → exigirlos antes de continuar
- Usar `responseContentFormat: markdown` en todos los calls a Jira
- Cloud ID de Atom: `atomchat.atlassian.net`
</rules>

## Paso 1 — Fetch del task dado

```
getJiraIssue(
  cloudId: "atomchat.atlassian.net",
  issueIdOrKey: <ID>,
  responseContentFormat: "markdown",
  fields: ["summary", "description", "parent", "comment", "status", "assignee", "issuetype"]
)
```

**Detectar tipo de tarea** desde el `summary`:
- Contiene `[FRONTEND]` → `TASK_TYPE = FE`
- Contiene `[BACKEND]` → `TASK_TYPE = BE`
- Ninguno → **preguntar al usuario antes de continuar**: "¿Esta tarea es de frontend o backend?"

**Verificar criterios de aceptación** en la descripción del task:
- Si no hay criterios de aceptación → **detener y exigir**: "Esta tarea no tiene criterios de aceptación definidos. Sin ellos no puedo asegurar que la implementación cumpla lo pedido. ¿Puedes agregarlos o indicarme dónde encontrarlos?"

**Guardar** si hay comentarios en el task (`comment.total > 0`): se incluirán en el brief.

## Paso 2 — Subir a la HU padre

Si `fields.issuetype.hierarchyLevel === -1` (subtask), usar `fields.parent.key` como HU.

```
getJiraIssue(
  cloudId: "atomchat.atlassian.net",
  issueIdOrKey: <parentKey>,
  responseContentFormat: "markdown",
  fields: ["summary", "description", "comment"]
)
```

**Extraer de la descripción de la HU** el "Documento fuente":
- Buscar patrón `wiki/x/<tinyId>` → usar `tinyId` como `pageId`
- Buscar patrón `wiki/spaces/.*/pages/(\d+)` → usar el número como `pageId`
- Si no hay link → buscar el spec en Confluence por título usando el nombre de la HU. Si tampoco → **preguntar**: "No encontré el documento fuente. ¿Tienes el link al spec de Confluence?"

**Guardar** comentarios del padre si los hay.

## Paso 3 — Leer la Spec Técnica en Confluence

```
getConfluencePage(cloudId: "atomchat.atlassian.net", pageId: <id>, contentFormat: "markdown")
getConfluencePageFooterComments(cloudId: "atomchat.atlassian.net", pageId: <id>)
getConfluencePageInlineComments(cloudId: "atomchat.atlassian.net", pageId: <id>)
```

**Extraer según `TASK_TYPE`:**

Si `TASK_TYPE = FE`:
- Tabla de cambios técnicos de Frontend (archivos, métodos, tipo: Validar/Implementar/Analizar)
- Criterios de aceptación técnicos relevantes a FE
- Checklist de verificación E2E de FE

Si `TASK_TYPE = BE`:
- Tabla de cambios técnicos de Backend (archivos, métodos, tipo)
- Criterios de aceptación técnicos relevantes a BE
- Checklist de verificación E2E de BE

**Buscar en el body de la Spec** un link a FRD:
- Patrón: `[FRD...](https://...pages/<id>)` o cualquier link con "FRD" en el texto
- Si existe → ir al Paso 4. Si no → saltar al Paso 5.

## Paso 4 — Leer el FRD (si existe)

```
getConfluencePage(cloudId: "atomchat.atlassian.net", pageId: <frdId>, contentFormat: "markdown")
getConfluencePageFooterComments(cloudId: "atomchat.atlassian.net", pageId: <frdId>)
getConfluencePageInlineComments(cloudId: "atomchat.atlassian.net", pageId: <frdId>)
```

**Identificar la HU en el FRD**: el summary de la HU padre contiene algo como `HU-06` o `HU-01`. Buscar la sección `### HU-XX |` correspondiente en el FRD.

**Si `TASK_TYPE = FE`**: extraer de esa sección específica:
- El link de **Figma** (no el del header general — el del bloque de la HU específica)
- Los criterios de aceptación funcionales de esa HU
- Cualquier nota de diseño relevante

**Guardar** comentarios del FRD (footer + inline) — frecuentemente contienen decisiones de PM/diseño post-spec.

## Paso 5 — Compilar el brief

Presentar en este formato:

```
═══════════════════════════════════════════════════════════════
 ATOMIC ► BRIEF DE TAREA
═══════════════════════════════════════════════════════════════

Task  : <KEY> — <summary>
Tipo  : FRONTEND | BACKEND
Estado: <status>
HU    : <parentKey> — <parentSummary>

───────────────────────────────────────────────────────────────
 CONTEXTO
───────────────────────────────────────────────────────────────
<Historia de usuario: Como / Quiero / Para>
<Objetivo de la HU en 2-3 líneas>

───────────────────────────────────────────────────────────────
 FIGMA                          (solo si TASK_TYPE = FE y existe)
───────────────────────────────────────────────────────────────
<Link Figma específico de la HU — node-id exacto>
Nota: este es el frame específico de <HU-XX>, no el archivo general.

───────────────────────────────────────────────────────────────
 QUÉ CONSTRUIR
───────────────────────────────────────────────────────────────
<Tabla de cambios técnicos filtrada por TASK_TYPE>
| # | Qué | Archivo / Método | Detalle | Tipo |
|---|-----|-----------------|---------|------|

───────────────────────────────────────────────────────────────
 CRITERIOS DE ACEPTACIÓN
───────────────────────────────────────────────────────────────
Funcionales (del FRD / HU):
- [ ] ...

Técnicos (de la Spec):
- [ ] ...

Del task (los que ya estaban en Jira):
- [ ] ...

───────────────────────────────────────────────────────────────
 DECISIONES Y CONTEXTO (de comentarios)
───────────────────────────────────────────────────────────────
<Solo si hay comentarios relevantes en Jira o Confluence>
[<Autor> — <fecha>]: <contenido relevante>

───────────────────────────────────────────────────────────────
 VERIFICACIÓN — antes de dar por terminado
───────────────────────────────────────────────────────────────
<Checklist E2E específico del tipo de tarea>
- [ ] ...

───────────────────────────────────────────────────────────────
 PREGUNTAS / INFO FALTANTE
───────────────────────────────────────────────────────────────
<Listar explícitamente cualquier ambigüedad o información que
 no se encontró en los documentos. Si no hay → "Ninguna — el
 spec es suficiente para comenzar.">
```

## Paso 6 — Alineación antes de implementar

Después de entregar el brief, preguntar:

> ¿Tienes alguna duda o hay algo que ajustar antes de empezar?

Si el usuario dice que sí → resolver antes de tocar código.
Si el usuario dice que no → comenzar la implementación siguiendo estrictamente los criterios del brief.

## Paso 6.5 — Verificación de reuso con CodeGraph (ANTES de escribir código)

Antes de implementar cualquier cosa, verificar qué ya existe en el codebase.
CodeGraph tiene el codebase de Atom indexado — úsalo. No leas archivos para buscar.

Si `TASK_TYPE = FE`, buscar componentes y utilities relacionados:
```
codegraph_context(task: "descripción de lo que se va a construir")
codegraph_search(query: "<ComponenteName>", kind: "component")
codegraph_search(query: "<utilityName>", kind: "function")
```

Si `TASK_TYPE = BE`, buscar servicios, validators y utils:
```
codegraph_context(task: "descripción del cambio BE")
codegraph_search(query: "<ServiceName>", kind: "class")
codegraph_search(query: "<validatorName>", kind: "function")
```

Agregar al brief una sección **REUSO**:
```
───────────────────────────────────────────────────────────────
 REUSO — lo que ya existe y debes usar
───────────────────────────────────────────────────────────────
✅ <NombreComponente> — ya existe en <ruta>
✅ <NombreUtility> — ya existe en <ruta>, úsalo en lugar de crear uno nuevo
⚠️  <NombreCosa> — no existe, tendrás que crearlo
```

Esto previene que el dev cree código que ya existe. Es la regla más importante.

## Durante la implementación

- **No agregar nada que no esté en el brief** — si surge algo que parece necesario pero no está en el spec, pausar y preguntar
- **Reusar lo que CodeGraph encontró** — si existe, úsalo. Nunca reinventar.
- **Mantener tipado** — no usar `any`, no romper tipos existentes
- **Deliverables pequeños** — implementar por chunks verificables, no todo de una vez
- **Navegar el código con CodeGraph, no leyendo archivos** — `codegraph_context` antes de `Read`
- **Al terminar**: confrontar la implementación contra los criterios del brief ítem por ítem antes de reportar como completo
