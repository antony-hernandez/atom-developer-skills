---
spike: "001"
name: hu-to-brief
type: standard
validates: "Dado un HU ID real (o task ID), cuando se corre el pipeline automático (Jira → parent HU → Documento fuente → Confluence), entonces el brief resultante es suficiente para implementar sin inventar nada"
verdict: VALIDATED
related: []
tags: [jira, confluence, context, pipeline, atlassian-mcp]
---

# Spike 001: hu-to-brief

## What This Validates

Dado un task ID real de Jira (`CV-599`), cuando se corre el pipeline de context gathering, entonces se produce un brief de implementación suficiente para empezar sin asumir nada.

## Research

### Enfoque

Usar el Atlassian MCP directamente — ya instalado, no requiere setup adicional. El pipeline:

1. Fetch el ticket dado (puede ser subtask o HU directa)
2. Si es subtask → ir al padre (HU)
3. Parsear descripción de la HU buscando "Documento fuente" (patrón `wiki/x/` tiny links)
4. Fetch Confluence page
5. Buscar Figma links en Jira + Confluence

### Hallazgo clave sobre el "Documento fuente"

El link al spec de Confluence **NO está en los remote links de Jira** (API devolvió `[]`). Está **embebido en el texto de la descripción** de la HU, con el patrón:

```
Documento fuente: https://atomchat.atlassian.net/wiki/x/BADEBgE
```

Implicación: el sistema debe parsear el campo `description` de la HU buscando:
- `https://atomchat.atlassian.net/wiki/x/<tinyId>` → tiny link (usar tinyId como pageId)
- `https://atomchat.atlassian.net/wiki/spaces/.../pages/<pageId>/` → link directo

## How to Run

Este spike no genera código ejecutable — es validación del pipeline de context gathering usando el Atlassian MCP en vivo.

## What to Expect

Brief completo con: contexto, criterios de aceptación, spec técnico, contrato de tipos, checklist de verificación.

## Investigation Trail

### Iteración 1 — Fetch CV-599

`CV-599` es un Development subtask (hierarchyLevel: -1). El padre es `CV-598`.

Datos relevantes de CV-599:
- Summary: `[FRONTEND] Tipificación anidada: validar contrato y límite máximo en dateValue`
- Tiene criterios de aceptación propios (3 criterios)
- Tiene tareas técnicas detalladas (4 checkboxes)

### Iteración 2 — Fetch CV-598 (parent HU)

`CV-598` es una Historia (hierarchyLevel: 0).
- Summary: `Spec Técnica - HU-06 | Tipificación con período de tiempo anidado`
- **Documento fuente encontrado en el body de la descripción**: `https://atomchat.atlassian.net/wiki/x/BADEBgE`
- Remote links API: vacío (el link no está registrado formalmente)

### Iteración 3 — Fetch Confluence (BADEBgE)

Página: `Spec Técnica - HU-06 | Tipificación con período de tiempo anidado`
Espacio: `AD` (Atom Documentation)

Contenido encontrado:
- ✅ Historia de usuario (Como / Quiero / Para)
- ✅ Criterios de aceptación funcionales
- ✅ Tabla de cambios técnicos FE (archivos específicos, qué hacer, tipo: Validar/Implementar)
- ✅ Tabla de cambios técnicos BE (archivos específicos, qué hacer, tipo)
- ✅ Criterios de aceptación técnicos (5 criterios)
- ✅ Checklist E2E de verificación (10 casos)
- ✅ Contrato TypeScript del modelo de datos
- ✅ Diagrama Mermaid de arquitectura
- ✅ Mapeo de errores esperados
- ❌ Sin Figma link (esta HU es de validación/implementación, no diseño nuevo de UI)

### Sobre Figma — CV-599

No hay link de Figma en este ticket. Es una HU de validación/implementación técnica. Correcto que no tenga.

---

### Ejemplo 2 — Pipeline con Figma: CV-610

Para validar el path completo con Figma, se analizó `CV-610`.

**Iteración 1 — CV-610** (subtask) → parent `CV-608`

**Iteración 2 — CV-608** (Historia): `Spec Técnica - HU-01 | Reestructuración UI de creación de listas estáticas`
- Documento fuente: `https://atomchat.atlassian.net/wiki/x/AgDEBgE`

**Iteración 3 — Confluence `AgDEBgE`** (Spec Técnica):
- Tiene link explícito al FRD: `[FRD Mejorar Listas Estáticas — HU-01](https://atomchat.atlassian.net/wiki/spaces/AD/pages/4385603585)`

**Iteración 4 — Confluence `4385603585`** (FRD completo):
- ✅ Figma general en header: `figma.com/design/RUyMHW5l6OUcF5lhtrV6d2/...?node-id=15001-19460`
- ✅ Figma específico de HU-01: `?node-id=15001-42674`
- ✅ Figma específico por cada HU (HU-03 a HU-19 tienen su propio node-id)

**Hallazgo crítico — el punto exacto donde las IAs se pierden:**

El FRD tiene UN archivo de Figma con MÚLTIPLES node-ids, uno por HU. El sistema NO debe tomar el primer link de Figma que encuentre (el del header del FRD). Debe:
1. Identificar a qué HU corresponde el trabajo (e.g. "HU-01")
2. Buscar la sección `### HU-01 |...` en el FRD
3. Extraer el Figma link de ESA sección específica

```
CV-610 (subtask) → CV-608 (HU) → Spec Técnica → FRD → Figma node-id específico de HU-01
```

Si el sistema toma el Figma genérico del header, le da al dev el diseño general, no el frame exacto para su HU. Eso es exactamente lo que se quería evitar.

## Results

**Veredicto: VALIDATED ✅**

### Pipeline completo — dos patrones probados

**Patrón A (sin Figma): CV-599**
```
Task (subtask) → Parent HU → Documento fuente (wiki/x/) → Spec Técnica
  → HU + criterios + cambios técnicos FE/BE + contratos TypeScript + checklist E2E
```

**Patrón B (con Figma, 4 niveles): CV-610**
```
Task (subtask) → Parent HU → Documento fuente (wiki/x/) → Spec Técnica
  → Link "FRD" en body → FRD completo → Figma node-id específico de la HU
```

### El brief resultante es suficiente

Con el pipeline completo un dev tiene:
- QUÉ archivos tocar (tabla de cambios técnicos)
- QUÉ tipo de cambio (Validar / Implementar / Analizar)
- Contrato TypeScript exacto
- Criterios de verificación funcionales y técnicos
- Figma frame correcto (no el genérico — el específico de su HU)
- Checklist E2E de QA

### Lecciones para la implementación real

1. **Parsing de "Documento fuente"**: buscar en el body de la HU `wiki/x/<tinyId>` o `wiki/spaces/.*/pages/(\d+)` — los remote links de Jira no son confiables (devuelven `[]`)
2. **Subtask → Parent siempre**: si el ticket es subtask, subir al parent antes de buscar el spec
3. **Spec Técnica puede linkar a FRD**: si el body de la Spec contiene un link a otro Confluence con "FRD" en el título o texto, seguirlo
4. **Figma: HU-específico, no genérico**: matchear el número de HU (`HU-01`, `HU-06`) en el FRD y extraer el link de Figma de esa sección, no del header
5. **Preferir `responseContentFormat: markdown`** para el parsing de links — el modo ADF es verboso y más difícil de parsear
6. **El FRD es la fuente de verdad funcional** (criterios de producto, diseñador, PM, PO, Figma). La Spec Técnica es la fuente de verdad de implementación (archivos, contratos, BE/FE split)
