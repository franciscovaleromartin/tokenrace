# Spec: Novedades del dashboard — heatmap, Modelos, tendencias y velocímetro

**Fecha:** 2026-06-10
**Estado:** aprobado por el usuario (funcionalidades 1, 2, 3 y 5 del paquete propuesto)

## Objetivo

Hacer el dashboard de tokenrace más útil y vistoso para un público semi-profesional añadiendo cuatro funcionalidades, todas alimentadas por datos que el backend ya recoge. Sin cambios en el backend.

## Alcance

1. Cuadrícula de actividad (heatmap anual estilo GitHub)
2. Pestaña "Modelos"
3. Tarjetas con tendencia (delta vs período anterior)
4. Velocímetro en vivo en la cabecera

Quedan fuera: rachas/récords y exportación CSV (descartados por el usuario).

---

## 1. Cuadrícula de actividad

**Componente:** `web/src/components/charts/ActivityHeatmap.tsx`
**Ubicación:** pestaña Overview, a ancho completo, entre `StatsRow` y los gráficos de Tokens/Coste.

- **Rango:** últimos 12 meses fijo, independiente del selector Hoy/7d/30d/Todo.
- **Datos:** 3 fetches paralelos a `/api/timeseries` con `from=now-365d&bucket=1d`:
  `claude_code.tokens.input`, `claude_code.tokens.output`, `claude_code.cost`.
  Se combinan en un mapa `díaISO → { tokens, coste }` (tokens = input + output).
- **Cuadrícula:** CSS grid puro, 7 filas (lun–dom) × ~53 columnas (semanas), celdas ~11px
  redondeadas. Etiquetas de meses arriba; Lun/Mié/Vie a la izquierda.
- **Escala de color:** 5 niveles del naranja del tema (`#ff6b35`): celda apagada
  (`#2a1d15` aprox.) para 0 tokens y 4 intensidades por cuartiles relativos al máximo del año.
- **Tooltip:** al hacer hover — `"Viernes, 20 feb 2026 — 1.2M tokens · $4.80"`, con estilo
  oscuro coherente con los tooltips de recharts (fondo `#0d0d0d`, borde `#1a1a1a`).
- **Tiempo real:** se refresca con `sseVersion` como el resto de gráficos.
- **Sin datos:** si ningún día tiene actividad, mensaje "Sin datos de actividad" en tarjeta
  vacía como los otros charts.
- Sin dependencias nuevas.

## 2. Pestaña "Modelos"

**Componentes:** `web/src/components/tables/ModelsTable.tsx`
**Cambios:** añadir `'models'` a `TabId` (`types.ts`), entrada "Models" en `TabBar`, caso en `App.tsx`.

- **Datos:** `/api/models?from=<timeRange>` (ya existe; `api.models()` ya está en `api.ts`).
- **Contenido:** tabla con columnas Modelo, Requests, Tokens In, Tokens Out, Coste,
  ordenada por coste descendente (ya viene ordenada del backend).
- **Visual:** barra horizontal proporcional al coste dentro de la fila (CSS, sin recharts),
  con el color de acento por modelo, para comparación de un vistazo.
- **Sin datos:** mensaje "Sin datos de modelos".
- **Nota:** muestra totales acumulados (todo el histórico), igual que la pestaña Agentes —
  el agregado por modelo del backend no guarda timestamps, así que no es ventaneable.
  Se indica "acumulado total" en la cabecera de la tabla. Se refresca con `sseVersion`.

## 3. Tarjetas con tendencia

**Cambios:** `StatCard.tsx` acepta prop opcional `delta` (número, % de variación);
`StatsRow.tsx` calcula y pasa los deltas.

- **Tarjetas con delta:** Tokens Input, Tokens Output, Token total y Coste Total (las 4
  con timeseries disponible). El resto de tarjetas no cambian.
- **Cálculo (solo frontend):** para el rango activo `now-Xd/h` se hace un fetch de
  `/api/timeseries` con `from=now-2Xd` y bucket adecuado para cada métrica
  (`tokens.input`, `tokens.output`, `cost`); se suman los buckets de cada mitad
  (período anterior vs actual) y se calcula `(actual − anterior) / anterior`.
- **Visual:** `▲ +18%` en verde-teal (`accent-teal`) si sube, `▼ −7%` en naranja si baja,
  junto al sublabel. Si el período anterior es 0 o el rango es "Todo", no se muestra delta.
- Nota: las tarjetas basadas en sesiones (Sesiones, Tiempo Activo) no llevan delta porque
  las sesiones acumulan datos a lo largo de su vida y no son ventaneables con precisión.

## 4. Velocímetro en vivo

**Cambios:** `Header.tsx` muestra el ritmo actual; nuevo hook `useLiveRate.ts`.

- **Datos:** fetch de `/api/timeseries` con `from=now-5m&bucket=5m` para
  `tokens.input`, `tokens.output` y `cost` (3 peticiones paralelas).
- **Cálculo:** `tokens/min = (input+output últimos 5min) / 5`; `$/h = coste 5min × 12`.
- **Refresco:** al cambiar `sseVersion` (llegan datos nuevos) y un intervalo de respaldo
  de 30 s para que decaiga a 0 cuando para la actividad.
- **Visual:** junto al indicador LIVE: `⚡ 4.2K tok/min · $1.84/h` en fuente mono.
  Si el ritmo es 0, se oculta (solo queda LIVE/SIN DATOS como ahora).

---

## Arquitectura y flujo de datos

Todo es frontend (React 19 + Tailwind). Ningún cambio en `src/` (backend Express).
Todos los componentes nuevos siguen el patrón existente: reciben `timeRange` y/o
`sseVersion` como props, hacen fetch con el cliente `api` de `api.ts`, y manejan
estado local con `useState`/`useEffect`.

```
/api/timeseries (existente) ──► ActivityHeatmap (now-365d, 1d)
                            ──► StatsRow deltas (2× rango, suma por mitades)
                            ──► useLiveRate (now-5m, 5m) ──► Header
/api/models (existente)     ──► ModelsTable
```

## Gestión de errores

Como el resto del dashboard: los fetch fallidos se silencian (`catch(() => {})`)
y el componente muestra su estado vacío. Sin datos ≠ error.

## Testing

- `cd web && npx tsc --noEmit` sin errores.
- Tests del backend (`npm test`) siguen pasando (no se toca backend).
- Verificación visual en navegador con datos reales: heatmap pinta celdas, pestaña
  Modelos lista modelos, deltas aparecen al cambiar rango, velocímetro se mueve
  durante una sesión activa de Claude Code.

## Orden de implementación sugerido

1. Pestaña Modelos (más simple, valida el patrón)
2. Cuadrícula de actividad
3. Tarjetas con tendencia
4. Velocímetro en vivo
