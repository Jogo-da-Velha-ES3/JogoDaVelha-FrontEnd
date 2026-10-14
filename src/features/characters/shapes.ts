// Geradores de path SVG dos personagens (Estilo A — letreiro neon). Funções puras.

type Point = readonly [number, number]

const n = (v: number) => Number(v.toFixed(2))

/**
 * X de braços arredondados centrado em (cx, cy), girado `deg` graus: `a` = meia espessura,
 * `L` = comprimento do braço. Já sai na posição final, sem `transform`, para o brilho
 * (filtro em coordenadas do desenho) não ser cortado.
 */
export function xRoundPath(a: number, L: number, cx = 0, cy = 0, deg = 0): string {
  const rad = (deg * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  const p = (x: number, y: number) => `${n(cx + x * cos - y * sin)} ${n(cy + x * sin + y * cos)}`
  const arc = (x: number, y: number) => `A${a} ${a} 0 0 0 ${p(x, y)}`
  return `M${p(a, L)} L${p(a, a)} L${p(L, a)} ${arc(L, -a)} L${p(a, -a)} L${p(a, -L)} ${arc(-a, -L)} L${p(-a, -a)} L${p(-L, -a)} ${arc(-L, a)} L${p(-a, a)} L${p(-a, L)} ${arc(a, L)} Z`
}

export function circlePath(cx: number, cy: number, r: number): string {
  return `M${cx - r} ${cy} a${r} ${r} 0 1 0 ${2 * r} 0 a${r} ${r} 0 1 0 ${-2 * r} 0`
}

/** Coração de 88×78 (x 36–124, y 38–116), com a ponta em (80, 116) */
export const HEART_PATH =
  'M80 116 C80 116 36 90 36 62 C36 46 48 38 60 38 C70 38 77 44 80 52 C83 44 90 38 100 38 C112 38 124 46 124 62 C124 90 80 116 80 116 Z'

/** O coração em outra escala e posição: (x, y) → (x·scale + dx, y·scale + dy) */
export function heartPath(scale: number, dx: number, dy: number): string {
  return HEART_PATH.replace(
    /(-?[\d.]+) (-?[\d.]+)/g,
    (_, x: string, y: string) => `${n(Number(x) * scale + dx)} ${n(Number(y) * scale + dy)}`,
  )
}

/** Brilho de 4 pontas centrado em (x, y) */
export function sparklePath(x: number, y: number, s: number): string {
  const k = s * 0.25
  return `M${x} ${y - s} L${x + k} ${y - k} L${x + s} ${y} L${x + k} ${y + k} L${x} ${y + s} L${x - k} ${y + k} L${x - s} ${y} L${x - k} ${y - k} Z`
}

/** Polígono fechado com cantos arredondados (raio `r` medido ao longo das arestas) */
export function roundedPolygonPath(points: readonly Point[], r: number): string {
  const count = points.length
  const toward = ([x0, y0]: Point, [x1, y1]: Point, dist: number): Point => {
    const len = Math.hypot(x1 - x0, y1 - y0)
    const t = Math.min(dist / len, 0.5)
    return [x0 + (x1 - x0) * t, y0 + (y1 - y0) * t]
  }

  const corners = points.map((p, i) => {
    const prev = points[(i - 1 + count) % count]
    const next = points[(i + 1) % count]
    return { p, from: toward(p, prev, r), to: toward(p, next, r) }
  })

  const [sx, sy] = corners[0].to
  let d = `M${n(sx)} ${n(sy)}`
  for (let i = 1; i <= count; i++) {
    const { p, from, to } = corners[i % count]
    d += ` L${n(from[0])} ${n(from[1])} Q${n(p[0])} ${n(p[1])} ${n(to[0])} ${n(to[1])}`
  }
  return `${d} Z`
}

/** Vértices de uma estrela de `tips` pontas, com a primeira ponta para cima */
export function starPoints(
  cx: number,
  cy: number,
  outer: number,
  inner: number,
  tips = 5,
): Point[] {
  return Array.from({ length: tips * 2 }, (_, i) => {
    const angle = (Math.PI * i) / tips - Math.PI / 2
    const radius = i % 2 === 0 ? outer : inner
    return [cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)] as const
  })
}

/** Mistura a cor com branco: t=0 → a cor, t=1 → branco. Usada nos traços do rosto. */
export function tint(hex: string, t: number): string {
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
  return `#${channels
    .map((c) =>
      Math.round(c + (255 - c) * t)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`
}
