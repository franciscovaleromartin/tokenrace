# Rediseño visual de tokenrace — estilo "Dynatrace denso"

**Fecha:** 2026-06-11
**Estado:** aprobado por el usuario (brainstorming con companion visual)

## Objetivo

Rediseñar por completo el aspecto del frontend de tokenrace (`web/`) para acercarlo al estilo del dashboard de Dynatrace: fondo azul-marino muy oscuro, paneles con borde fino azulado, acento cian dominante, alta densidad de información, y un Overview que funciona como hub con paneles "Ver todo →".

**Estrategia:** retematización por capas. Se cambian los design tokens y se crean los componentes de navegación y hub nuevos; los componentes existentes (tablas, gráficas recharts, KPIs) se restylean sin reescribirlos. Sin dependencias nuevas (lucide-react ya está instalado).

## Decisiones validadas con el usuario

1. **Dirección visual:** "Dynatrace denso" — elegida frente a "Dynatrace completo" e "Híbrido con paleta actual".
2. **Navegación:** sidebar lateral de iconos (desktop) — elegida frente a mantener pestañas arriba.
3. **Overview:** hub con grid uniforme 3×2 — elegido frente a "gráfica protagonista".
4. **Móvil:** el sidebar se convierte en barra inferior de iconos — elegido frente a hamburguesa o sidebar fijo.
5. **Alcance:** rediseño completo — piel nueva + Overview hub + revisión del layout interno de todas las pestañas.

## 1. Design tokens

Sustituir las variables CSS de `web/src/index.css` y los colores de `web/tailwind.config.ts`:

| Token | Valor | Uso |
|---|---|---|
| `--bg-base` | `#0b1218` | Fondo general |
| `--bg-card` | `#141d26` | Fondo de paneles |
| `--bg-card-hover` | `#18222d` | Hover de paneles y filas |
| `--bg-border` | `#2a3947` | Borde de todos los paneles (1px) |
| `--accent-cyan` | `#00a8e8` | Color principal: input, links, navegación activa |
| `--accent-green` | `#6bcb77` | Output, valores positivos |
| `--accent-yellow` | `#f5d36b` | Coste, warnings |
| `--accent-purple` | `#c592f0` | Sesiones, gráfica de coste por día |
| `--accent-red` | `#ff5e5e` | Indicador LIVE, errores, deltas negativos |
| `--accent-blue-soft` | `#74cff7` | Tiempo activo, secundarios |
| `--accent-orange` | `#ff8266` | Commits |
| `--text-primary` | `#c8d6dd` | Texto principal |
| `--text-secondary` | `#8fa3b0` | Labels, cabeceras de tabla |
| `--text-muted` | `#5a6e7a` | Sublabels, texto terciario |
| `--link-subtle` | `#3b82a8` | Enlaces "Ver todo →" |

Notas:
- Los nombres antiguos (`accent-green` = naranja, etc.) se corrigen; actualizar todos los usos en componentes.
- Números grandes siguen en monospace.
- Las clases Tailwind existentes (`bg-bg-card`, `border-bg-border`, …) se conservan donde el nombre siga siendo válido para minimizar el diff.

## 2. Navegación

### `Sidebar` (componente nuevo, sustituye a `TabBar`)

- **Desktop (≥768px):** barra vertical fija a la izquierda, ~52px de ancho, fondo `#080d12`, borde derecho `--bg-border`. Logo `</>` arriba en cian. Un icono lucide-react por sección, en este orden: Overview (`LayoutDashboard`), Sessions (`List`), Projects (`FolderGit2`), Tools (`Wrench`), Agents (`Bot`), Models (`Cpu`), Events (`Zap`), Costs (`DollarSign`).
- Estado activo: fondo sutil + borde izquierdo cian de 2px + icono en cian. Inactivo: icono en `--text-secondary`, hover lo aclara.
- Tooltip nativo (`title`) o tooltip CSS con el nombre de la sección al hacer hover.
- **Móvil (<768px):** el mismo componente se renderiza como barra inferior fija (full-width, iconos repartidos, `position: fixed; bottom: 0`), el contenido principal recibe padding-bottom para no quedar tapado.
- API: mismas props que el `TabBar` actual (`activeTab`, `onTabChange`), de modo que `App.tsx` solo cambia el componente y el layout (flex row con sidebar + main).

### `Header` (simplificado)

- Ya no contiene pestañas. Contenido: título de la sección activa + indicador LIVE + selector de rango (Hoy/7d/30d/Todo) + botón Reset + selector de proyecto.
- Recibe la sección activa para mostrar el título.

## 3. Overview como hub

### Fila de KPIs (StatsRow/StatCard restyleados)

6 KPIs compactos, todos clicables con esta navegación: Input (cian) → Costs · Output (verde) → Costs · Coste (amarillo) → Costs · Sesiones (morado) → Sessions · Tiempo activo (azul claro) → Sessions · Commits (naranja) → Events. Cursor pointer + hover en todos.

### Grid 3×2 de paneles

Componente contenedor `HubPanel` (título pequeño arriba-izquierda, cuerpo, enlace opcional "Ver todo →" abajo que navega a la sección):

| Fila 1 | | |
|---|---|---|
| **Tokens por período** — área cian (input) + verde (output); versión compacta del TokensChart | **Coste por día** — barras moradas; versión compacta del CostChart | **Ahorro caché** — cifra grande verde + sublabel "est. período" (datos de `estimateCacheSavings`) |

| Fila 2 | | |
|---|---|---|
| **Sesiones recientes** — top 3 con proyecto, coste y tokens · Ver todo → Sessions | **Top proyectos** — top 3 por coste · Ver todo → Projects | **Eventos recientes** — últimos 3 con icono/color por tipo · Ver todo → Events |

- Los paneles de lista reutilizan los datos de los endpoints ya existentes (mismos hooks que las tablas), limitados a 3 ítems.
- Las gráficas del hub son los charts existentes con altura reducida y ejes simplificados (sin reescribir recharts).

### Responsive

- Grid de paneles: 3 columnas → 2 (tablet, <1024px) → 1 (móvil, <640px).
- KPIs: 6 en fila → 3×2 → 2×3.

## 4. Resto de pestañas

Patrón común para todas:

- Contenido dentro de paneles con fondo `--bg-card` y borde `--bg-border`.
- Tablas: cabeceras uppercase en `--text-secondary`, filas con hover `--bg-card-hover`, números en monospace con su color de acento.
- **Mini-fila de KPIs propios** arriba de cada pestaña (3-4 según datos disponibles en sus endpoints):
  - **Sessions:** nº sesiones · coste total · duración media
  - **Projects:** nº proyectos · coste total · proyecto más caro
  - **Tools:** nº herramientas usadas · invocaciones totales · más usada
  - **Agents:** nº agentes · tokens totales · agente más activo
  - **Models:** nº modelos · coste total · modelo dominante
  - **Events:** nº eventos · commits · último evento
  - **Costs:** mantiene sus 4 stats actuales (coste período, eficiencia, tokens caché, ahorro caché) restyleados
- Si algún KPI no es derivable de los datos que ya devuelve el endpoint de esa pestaña, se omite (no se tocan endpoints del servidor: el rediseño es solo frontend).
- Gráficas recharts (CacheChart, EfficiencyChart, ActivityHeatmap…): solo cambian colores, grid y tooltips a la paleta nueva.
- SetupGuide y SessionLabelNotification: restyle a la paleta nueva, sin cambios funcionales.

## 5. Fuera de alcance

- Cambios en el servidor/endpoints (`src/`).
- Nuevas dependencias.
- Cambios funcionales (filtros, ordenación, SSE, selector de proyecto se mantienen tal cual).

## 6. Verificación

1. `npm run build` en `web/` sin errores de TypeScript.
2. Servir el build local en el puerto **1338** (el 1337 lo ocupa la versión npm instalada).
3. Revisión visual de las 8 secciones en desktop y en viewport móvil (DevTools): sidebar/barra inferior, hub responsive, tablas, gráficas.
4. Verificar la navegación desde los KPIs y los "Ver todo →" del hub.
5. Captura actualizada para `screenshots/tokenrace-dashboard.png`.
6. Bump de versión + entrada en CHANGELOG.
