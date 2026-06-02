# Diseño: Actualizaciones en tiempo real + Auto-configuración OTLP

**Fecha:** 2026-06-03  
**Alcance:** Frontend tokenrace + CLI bin/cli.js

---

## Problema

1. Las tablas (Sessions, Projects, Tools, Events, Agents) solo cargan datos al montar el componente — no se actualizan al llegar nueva telemetría OTLP.
2. El CLI imprime las variables OTLP pero el usuario las tiene que exportar manualmente cada sesión.

## Fix 1 — Tablas con actualización en tiempo real

### Causa raíz
`SessionsTable`, `ProjectsTable`, `ToolsTable`, `EventsFeed` y `AgentsTree` tienen un `useEffect` con dependencias fijas (`timeRange`). Cuando llegan eventos SSE al servidor, las tablas no se enteran.

### Solución
Añadir un contador entero `sseVersion` en `App.tsx` que se incrementa en cada evento SSE recibido. Se pasa como prop a cada tabla/feed. Las tablas añaden `sseVersion` a las dependencias de su `useEffect` → fetch automático al llegar nueva telemetría.

### Cambios de archivos
- `web/src/App.tsx` — añadir `sseVersion: number` state; pasar a tablas; incrementar en callback SSE
- `web/src/hooks/useMetrics.ts` — exponer `onSSEEvent` callback para que App.tsx lo enganche
- `web/src/components/tables/SessionsTable.tsx` — añadir prop `sseVersion`, incluir en deps
- `web/src/components/tables/ProjectsTable.tsx` — ídem
- `web/src/components/tables/ToolsTable.tsx` — ídem
- `web/src/components/events/EventsFeed.tsx` — ídem
- `web/src/components/agents/AgentsTree.tsx` — ídem

### Lo que NO cambia
- La conexión SSE sigue siendo única (en `useMetrics` / `useSSE`)
- El throttle de 30s en `useMetrics.handleSSE` para el resumen/charts se mantiene

---

## Fix 2 — Auto-configurar vars OTLP en `~/.zshrc`

### Causa raíz
Las variables de entorno OTLP deben estar en la sesión de shell donde corre `claude`. Un proceso hijo no puede modificar el entorno del padre, pero sí puede escribir en `~/.zshrc` para que las próximas sesiones las tengan.

### Solución
En `bin/cli.js`, antes de arrancar el servidor:
1. Leer `~/.zshrc` y detectar si `CLAUDE_CODE_ENABLE_TELEMETRY` ya está definida
2. Si **no está** → añadir el bloque de exports al final de `~/.zshrc`
3. Imprimir en consola si se añadieron o ya estaban
4. Siempre imprimir aviso: las vars actúan en terminales **nuevas** (no en la actual)

### Vars que se añaden
```bash
# tokenrace — telemetría Claude Code
export CLAUDE_CODE_ENABLE_TELEMETRY=1
export OTEL_METRICS_EXPORTER=otlp
export OTEL_LOGS_EXPORTER=otlp
export OTEL_EXPORTER_OTLP_PROTOCOL=http/json
export OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:1337
export OTEL_EXPORTER_OTLP_METRICS_TEMPORALITY_PREFERENCE=cumulative
```

### Cambios de archivos
- `bin/cli.js` — añadir función `ensureEnvVars(port)` que lee/escribe `~/.zshrc`

### Limitaciones conocidas
- Solo funciona con zsh (`~/.zshrc`). Bash usaría `~/.bashrc`. Se detecta la shell via `process.env.SHELL`.
- Tras la primera ejecución, el usuario necesita abrir una nueva terminal o hacer `source ~/.zshrc` para activarlas en la sesión actual.

---

## Tests afectados
- Los tests de tablas existentes no necesitan cambios (no testean SSE)
- Añadir test unitario para `ensureEnvVars`: verifica que añade el bloque si no está y no duplica si ya está
