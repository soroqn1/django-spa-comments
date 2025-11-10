const symbols = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

const randomText = (length: number) =>
  Array.from({ length }, () => symbols[Math.floor(Math.random() * symbols.length)]).join('')

const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min

export interface CaptchaPayload {
  value: string
  image: string
}

export const createCaptcha = (length = 6): CaptchaPayload => {
  const value = randomText(length)

  if (typeof window === 'undefined') {
    return { value, image: '' }
  }

  const canvas = document.createElement('canvas')
  canvas.width = 160
  canvas.height = 60
  const ctx = canvas.getContext('2d')
  if (!ctx) return { value, image: '' }

  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height)
  gradient.addColorStop(0, '#f5f7ff')
  gradient.addColorStop(1, '#e2e8f0')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  for (let i = 0; i < 3; i++) {
    ctx.strokeStyle = `rgba(100,116,139,${Math.random() * 0.4 + 0.2})`
    ctx.lineWidth = Math.random() * 1.5 + 0.5
    ctx.beginPath()
    ctx.moveTo(randomInt(0, canvas.width), randomInt(0, canvas.height))
    ctx.lineTo(randomInt(0, canvas.width), randomInt(0, canvas.height))
    ctx.stroke()
  }

  ctx.font = 'bold 28px "Inter", sans-serif'
  ctx.textBaseline = 'middle'
  const palette = ['#1e293b', '#0f172a', '#334155'] as const

  for (let i = 0; i < value.length; i++) {
  const char = value.charAt(i)
    const angle = (Math.random() - 0.5) * 0.6
    ctx.save()
    const x = 20 + i * 22
    ctx.translate(x, canvas.height / 2)
    ctx.rotate(angle)
  const color = palette[randomInt(0, palette.length - 1)] ?? palette[0]
  ctx.fillStyle = color
    ctx.fillText(char, -10, 0)
    ctx.restore()
  }

  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = `rgba(148,163,184,${Math.random() * 0.5 + 0.1})`
    ctx.beginPath()
    ctx.arc(randomInt(0, canvas.width), randomInt(0, canvas.height), Math.random() * 1.8 + 0.4, 0, Math.PI * 2)
    ctx.fill()
  }

  return { value, image: canvas.toDataURL('image/png') }
}
