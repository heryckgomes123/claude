'use client'

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="pt-BR">
      <body style={{ background: '#060606', color: '#f4f0e6', fontFamily: 'system-ui, sans-serif', display: 'grid', placeItems: 'center', minHeight: '100vh', margin: 0 }}>
        <div style={{ textAlign: 'center', padding: 24 }}>
          <p style={{ letterSpacing: '0.3em', color: '#f7c948', fontSize: 12 }}>INTELRA AI LAB</p>
          <h1 style={{ fontSize: 22 }}>O Lab está temporariamente indisponível</h1>
          <p style={{ color: '#a39e93' }}>Tente novamente em instantes.</p>
          <button onClick={reset} style={{ marginTop: 16, padding: '10px 20px', borderRadius: 999, border: 0, background: '#f7c948', color: '#060606', fontWeight: 600, cursor: 'pointer' }}>
            Tentar novamente
          </button>
        </div>
      </body>
    </html>
  )
}
