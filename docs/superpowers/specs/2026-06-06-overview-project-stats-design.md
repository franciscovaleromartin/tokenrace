# Overview: tarjetas de estadísticas filtradas por proyecto

## Objetivo

Modificar las tarjetas de la pestaña Overview para que "Tokens Input" y "Tokens Output" muestren datos del proyecto seleccionado, y añadir dos tarjetas nuevas: "Coste de proyecto" (proyecto seleccionado) y "Token total" (todos los proyectos).

## Cambios en `web/src/App.tsx`

- Añadir estado `projectsData: Project[]`.
- Actualizar el `useEffect` existente (que ya llama a `api.projects()`) para:
  - Pasar `timeRange` a la llamada.
  - Guardar los objetos `Project[]` completos en `projectsData`.
  - Mantener `knownProjects` (solo strings) para el selector.
- Calcular `effectiveProject = userSelectedProject ?? summary?.currentProject ?? null`.
- Derivar `selectedProjectData = projectsData.find(p => p.project === effectiveProject) ?? null`.
- Pasar `selectedProjectData` a `<StatsRow>`.

## Cambios en `web/src/components/stats/StatsRow.tsx`

- Añadir prop `selectedProjectData: Project | null`.
- Importar tipo `Project` desde `../../types`.
- Actualizar las 8 tarjetas (grid `grid-cols-2 md:grid-cols-4`):

| # | Label | Valor | Sublabel |
|---|-------|-------|----------|
| 1 | Tokens Input | `selectedProjectData?.tokensInput ?? summary.tokens.input` | `caché: X` |
| 2 | Tokens Output | `selectedProjectData?.tokensOutput ?? summary.tokens.output` | `eficiencia: X%` |
| 3 | Token total | `summary.tokens.input + summary.tokens.output` | `i: X / o: Y` |
| 4 | Coste de proyecto | `selectedProjectData?.cost ?? 0` | *(sin sublabel)* |
| 5 | Coste Total | `summary.cost` | *(sin cambios)* |
| 6 | Tiempo Activo | `summary.activeTimeMs` | *(sin cambios)* |
| 7 | Sesiones | `summary.sessions` | *(sin cambios)* |
| 8 | Commits | `summary.commits` | *(sin cambios)* |

## Comportamiento cuando no hay proyecto seleccionado

- "Tokens Input" y "Tokens Output": muestran datos globales como fallback.
- "Coste de proyecto": muestra `$0.00`.

## Sin cambios en backend

Toda la lógica es frontend. `api.projects(timeRange)` ya existe y devuelve `tokensInput`, `tokensOutput` y `cost` por proyecto.
