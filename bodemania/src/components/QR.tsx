import qrcode from 'qrcode-generator'
import { useMemo } from 'react'

export default function QR({ value, size = 220 }: { value: string; size?: number }) {
  const { path, count } = useMemo(() => {
    const qr = qrcode(0, 'M')
    qr.addData(value)
    qr.make()
    const n = qr.getModuleCount()
    let d = ''
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) d += `M${c} ${r}h1v1h-1z`
    return { path: d, count: n }
  }, [value])
  return (
    <svg width={size} height={size} viewBox={`-2 -2 ${count + 4} ${count + 4}`} shapeRendering="crispEdges" role="img" aria-label="QR Code Pix">
      <rect x="-2" y="-2" width={count + 4} height={count + 4} fill="#fff" />
      <path d={path} fill="#0d1a2b" />
    </svg>
  )
}
