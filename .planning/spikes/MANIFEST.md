# Spike Manifest

## Idea

**Atomic** — un asistente de desarrollo spec-driven para Atom. Se da un ID de HU y el sistema sabe qué buscar: va a Jira, extrae criterios de aceptación, encuentra la página de spec en Confluence (muchas veces la HU ya la linkea), detecta si hay Figma involucrado, y arma un brief de implementación listo para ejecutar. El agente siempre verifica que lo construido cumple el spec — nunca asume, siempre pregunta cuando falta info. Inspirado en el proceso de GSD pero minimalista como los skills de mattpocock: pocas comandos, cada uno hace una cosa, hackeable.

## Requirements

Decisiones no negociables que emergen de las elecciones del usuario:

- **MCPs mínimos:** Jira + Confluence son obligatorios. Si hay Figma, GitHub, y otros MCPs disponibles, usarlos.
- **Entrada = task, no HU** — el punto de entrada es siempre la tarea específica (subtask), no la HU completa. La HU es contexto, no el scope.
- **Foco de tarea preservado siempre** — si la tarea es `[BACKEND]`, el brief entrega contexto de BE aunque el spec tenga secciones de FE. Si es `[FRONTEND]`, ídem. Nunca mezclar ni "por si acaso". Detectar el tipo desde el summary del subtask (`[FRONTEND]` / `[BACKEND]`). Si no hay prefijo claro, preguntar antes de continuar.
- **Nunca asumir, siempre preguntar** — si falta info, se pregunta. No se inventa contexto.
- **Modelo dual:** Sonnet orquesta, Haiku ejecuta subtareas delegadas. Sonnet siempre revisa el output de Haiku antes de aceptarlo.
- **Deliverables pequeños:** cada subtarea delegada produce un entregable acotado. Los prompts a Haiku deben ser hiper-específicos.
- **Criterios de aceptación son obligatorios:** si la HU no los tiene, se exigen. Sin criterios no hay implementación.
- **Spec-first:** la HU a menudo linkea al spec de Confluence — extraer desde ahí primero. Si no hay link, pedirlo (opcional pero mencionar que mejora mucho el contexto).
- **Verificación siempre:** al terminar, el agente confronta la implementación contra los criterios originales. No se "completa" sin evidencia.

## Spikes

| # | Name | Type | Validates | Verdict | Tags |
|---|------|------|-----------|---------|------|
| 001 | `hu-to-brief` | standard | Dado un HU ID real, cuando corre el pipeline (Jira → Confluence → Figma si aplica), entonces el brief resultante es suficiente para implementar sin inventar nada | VALIDATED ✅ | jira, confluence, figma, context |
| 002 | `spec-verification` | standard | Dado un task de Jira y su spec técnica, cuando el agente los compara en el context gathering, entonces detecta mismatches confiablemente antes de implementar | VALIDATED ✅ | verification, confluence, drift, cross-check |
| 003 | `rules-as-constraints` | comparison | Dado el mismo task, prosa → 1 query genérica → reuso perdido; checklist con queries pre-especificadas → 4 queries → infraestructura existente descubierta. Confirmado por el usuario: "hace cosas nuevas que ya existen" | VALIDATED ✅ | rules, format, compliance, codegraph |
