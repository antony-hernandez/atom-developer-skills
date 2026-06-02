---
spike: "003"
name: rules-as-constraints
type: comparison
validates: "Dado el mismo task, cuando las reglas están en prosa vs checklist con queries pre-especificadas, entonces el checklist produce más reuso real — el agente descubre infraestructura existente que la prosa no encuentra"
verdict: VALIDATED
related: ["001", "002"]
tags: [rules, format, compliance, codegraph, reuse]
---

# Spike 003: rules-as-constraints

## What This Validates

Dado un task FE real de Campañas, cuando el agente opera con reglas en prosa vs reglas en formato checklist con queries pre-especificadas por tipo de tarea, entonces el checklist produce comportamiento mediblemente diferente: más búsquedas, más específicas, e infraestructura existente que la prosa no detecta.

## Task de prueba

Task sintético representativo del dominio:

> `[FRONTEND] Agregar variable "Etapa de oportunidad" al builder de condiciones de Listas Dinámicas. Similar a "Etapa de cliente" (SERVICE_STAGE), pero para oportunidades. El usuario selecciona stages de oportunidad y aplica operadores de igualdad/desigualdad.`

Elegido porque: toca `condition-row`, requiere un `DynamicObjectTypes` nuevo, probablemente tiene un service existente, y el mapper de audiencias ya tiene lógica de stages. Es representativo de las tareas reales del equipo.

## Research

### Enfoques de constraint considerados

| Approach | Mecanismo | Pros | Contras |
|----------|-----------|------|---------|
| **Prosa** (actual) | "Reusar antes de crear" | Fácil de mantener | El agente la reconoce pero no hay momento de verificación forzado — query genérica o ninguna |
| **Checklist pre-código** | Gate con queries específicas antes de escribir | Crea momento de verificación obligatorio, queries pre-especificadas | Necesita actualizarse con el codebase |
| **Ejemplos negativos** | "No hagas X — usa Y" | Muy específico | Frágil, necesita cubrir todos los casos |
| **Stubs de patrón** | "Sigue `audience-condition.mapper.ts` L45" | Lleva al código correcto directamente | Muy frágil ante cambios |

**Elegido:** comparar prosa vs checklist. Es el contraste más claro y el más accionable.

## How to Run

1. Dar el task sintético con solo las reglas de CLAUDE.md (prosa)
2. Dar el mismo task con un gate de checklist que requiere queries específicas antes de proponer código
3. Comparar: número de queries CodeGraph, profundidad de descubrimiento, código propuesto

## Investigation Trail

### Run A — Formato prosa

**Reglas activas:** "Reusar componentes de condition-group, condition-row, logical-operator. Los mappers van en audience-condition.mapper.ts. Sin any."

**Comportamiento observado:**
- 1 query CodeGraph: `codegraph_search("DynamicObjectTypes")` — genérica, encontró el enum y su ubicación
- Propuesta inmediata de código: "Agregar `OPPORTUNITY_STAGE` al enum, crear `OpportunityStageService`, crear lógica de `stageTypeControl`"
- No verificó si `OpportunityStageService` existe
- No verificó si `stageTypeControl` ya existe en `condition-row`
- No verificó qué hay en `audience-condition.mapper.ts`

**Problema:** propone crear `stageTypeControl` que ya existe.

### Run B — Formato checklist

**Gate ejecutado antes de proponer código:**
```
[ ] ¿Existe OPPORTUNITY_STAGE en DynamicObjectTypes?
[ ] ¿Existe OpportunityStageService o getOpportunityStages()?
[ ] ¿Cómo maneja condition-row el stageTypeControl actual?
[ ] ¿audience-condition.mapper.ts ya tiene lógica de stages?
```

**4 queries ejecutadas en paralelo:**
1. `codegraph_search("OpportunityStage")` → **no existe** — necesita crearse
2. `codegraph_search("getOpportunityStages")` → **no existe** — necesita crearse
3. `codegraph_context("stage picker stageTypeControl condition-row")` → **¡YA EXISTE!**
   - `stageTypeControl` es `FormControl<ConditionStageType | null>` en `condition-row.component.ts:145`
   - `ConditionRowComponent` ya tiene `@Input() serviceStages: Pick<ServiceStage, "name" | "keyword">[] = []`
   - `Condition` interface ya tiene `stageType?: ConditionStageType`
4. `codegraph_search("audience-condition.mapper")` → **existe** en ruta conocida

**Propuesta resultante:** "Extender `ConditionStageType` con el tipo oportunidad — el `stageTypeControl` ya existe, no crear uno nuevo. Agregar `@Input() opportunityStages` siguiendo el patrón de `serviceStages`."

### Comparativa

| | Run A (prosa) | Run B (checklist) |
|--|--------------|-------------------|
| Queries CodeGraph | 1 genérica | 4 específicas |
| `stageTypeControl` descubierto | ❌ No | ✅ Sí |
| Código propuesto | Crear `stageTypeControl` (ya existe) | Extender `ConditionStageType` |
| Reuso real | Perdido | Capturado |

### Checkpoint humano

Pregunta: "¿Esto coincide con lo que ves en la práctica?"

Respuesta del usuario: **"sí, hace cosas nuevas que ya existen"**

→ Confirma que el problema es real y que el checklist lo resuelve.

## Results

**Veredicto: VALIDATED ✅**

### El problema confirmado

El agente con reglas en prosa hace 1 búsqueda genérica y propone código nuevo para cosas que ya existen. No es que ignore las reglas — las sigue superficialmente. Pero sin un gate explícito, el momento y la cobertura de las búsquedas son insuficientes.

### El mecanismo que funciona

Un checklist pre-código con queries **pre-especificadas por tipo de tarea** fuerza:
1. **Cobertura exhaustiva** — no 1 query sino N queries que cubren el espacio completo
2. **Momento forzado** — antes de proponer código, no durante o después
3. **Especificidad** — "busca `stageTypeControl` en `condition-row`" vs "busca componentes"

### Implicación para el skill `/task`

El Paso 6.5 actual (REUSO con CodeGraph) usa queries ad-hoc. Fix: convertirlo en un gate con queries derivadas de los archivos mencionados en la tabla "QUÉ CONSTRUIR" del brief. Para cada archivo/componente/enum listado → verificar si ya existe antes de proponer código nuevo.

### Regla emergente

> **Ningún archivo, clase, o función nueva debe proponerse hasta que CodeGraph confirme que no existe.**

La diferencia entre prosa y constraint real es exactamente esa: la prosa dice "busca", el constraint dice "no puedes escribir código hasta que hayas buscado esto, esto y esto."
