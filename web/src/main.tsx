import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)

// Workaround: en macOS, al volver de otra Space/ventana en pantalla completa
// (p.ej. compartiendo pantalla), Chrome/Safari pueden dejar la capa GPU de la
// página en negro hasta el siguiente repintado. Forzamos un reflow al recuperar
// visibilidad para que el navegador recomponga la capa.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return
  const root = document.getElementById('root')
  if (!root) return
  root.style.display = 'none'
  void root.offsetHeight
  root.style.display = ''
})
