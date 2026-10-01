import { RARITIES } from './data'

// couleur utilisable dans un canvas : une variable CSS est résolue, un dégradé animé est remplacé par sa première teinte
function solid(color) {
  let c = color
  const m = /^var\((--[\w-]+)\)$/.exec(c)
  if (m) c = getComputedStyle(document.documentElement).getPropertyValue(m[1]).trim() || '#ffc94d'
  if (c.includes('gradient')) c = /#[0-9a-f]{3,8}/i.exec(c)?.[0] ?? '#ffc94d'
  return c
}

// dessine une carte image « j'ai obtenu X » et la partage (feuille de partage du téléphone) ou la télécharge
export async function shareItem({ item, shiny, isNew }, pseudo) {
  const W = 720
  const H = 420
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const g = canvas.getContext('2d')
  const r = RARITIES[item.rarity]
  const color = solid(r.color)
  g.fillStyle = '#15120f'
  g.fillRect(0, 0, W, H)
  const glow = g.createRadialGradient(W / 2, 170, 10, W / 2, 170, 280)
  glow.addColorStop(0, color + '66')
  glow.addColorStop(1, '#15120f00')
  g.fillStyle = glow
  g.fillRect(0, 0, W, H)
  g.strokeStyle = color
  g.lineWidth = 6
  g.strokeRect(12, 12, W - 24, H - 24)
  g.textAlign = 'center'
  g.font = '130px system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif'
  g.fillText(item.emoji, W / 2, 200)
  g.fillStyle = '#f2ebe0'
  g.font = '700 38px system-ui, sans-serif'
  g.fillText(item.name, W / 2, 262)
  g.fillStyle = color
  g.font = '700 26px system-ui, sans-serif'
  g.fillText(`${r.label.toUpperCase()}${shiny ? '  ✨ SHINY' : ''}${isNew ? '  · NOUVEAU' : ''}`, W / 2, 308)
  g.fillStyle = '#a0968a'
  g.font = '20px system-ui, sans-serif'
  g.fillText(pseudo ? `${pseudo} · Les Portes` : 'Les Portes', W / 2, 372)

  const blob = await new Promise((res) => canvas.toBlob(res, 'image/png'))
  if (!blob) return
  const file = new File([blob], `les-portes-${item.id}.png`, { type: 'image/png' })
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Les Portes', text: `J’ai obtenu ${item.name} (${r.label}) !` })
      return
    } catch {
      /* partage annulé : on ne télécharge pas en plus */
      return
    }
  }
  const url = URL.createObjectURL(file)
  const a = document.createElement('a')
  a.href = url
  a.download = file.name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
