import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

const EXPORT_COMMANDS = `export CLAUDE_CODE_ENABLE_TELEMETRY=1
export OTEL_METRICS_EXPORTER=otlp
export OTEL_LOGS_EXPORTER=otlp
export OTEL_EXPORTER_OTLP_PROTOCOL=http/json
export OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:1337
export OTEL_EXPORTER_OTLP_METRICS_TEMPORALITY_PREFERENCE=cumulative`

export function SetupGuide() {
  const [copied, setCopied] = useState(false)

  function copyToClipboard() {
    navigator.clipboard.writeText(EXPORT_COMMANDS).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }).catch(() => {})
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <div className="max-w-xl w-full space-y-6">
        {/* Logo y título */}
        <div className="text-center space-y-2">
          <div className="text-4xl font-mono font-bold">
            <span className="text-accent-green">&lt;/&gt;</span>
            <span className="text-text-primary"> tokendash</span>
          </div>
          <div className="flex items-center justify-center gap-2 text-text-secondary">
            <span className="inline-block w-2 h-2 rounded-full bg-accent-yellow animate-pulse" />
            <span>Esperando datos de Claude Code...</span>
          </div>
        </div>

        {/* Instrucciones */}
        <div>
          <p className="text-text-secondary text-sm mb-2">Pega esto en tu terminal:</p>
          <div className="relative bg-bg-subtle border border-bg-border rounded-lg p-4 font-mono text-sm">
            <pre className="text-text-secondary whitespace-pre overflow-x-auto">
              {EXPORT_COMMANDS}
            </pre>
            <button
              onClick={copyToClipboard}
              className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded text-xs bg-bg-card border border-bg-border text-text-secondary hover:text-text-primary transition-colors"
            >
              {copied ? (
                <><Check size={12} className="text-accent-green" /><span className="text-accent-green">Copiado</span></>
              ) : (
                <><Copy size={12} /><span>Copiar</span></>
              )}
            </button>
          </div>
        </div>

        {/* Etiquetado opcional */}
        <div>
          <p className="text-text-secondary text-sm mb-2">
            Etiqueta tu sesión <span className="text-text-muted">(opcional — puedes hacerlo desde la web)</span>:
          </p>
          <div className="bg-bg-subtle border border-bg-border rounded-lg p-4 font-mono text-sm text-text-secondary">
            export OTEL_RESOURCE_ATTRIBUTES=&quot;project=mi-proyecto&quot;
          </div>
        </div>

        {/* Siguiente paso */}
        <div className="text-center">
          <p className="text-text-secondary text-sm">Luego:</p>
          <code className="text-accent-green font-mono text-lg">claude</code>
        </div>
      </div>
    </div>
  )
}
