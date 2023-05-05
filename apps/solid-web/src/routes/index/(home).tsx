import { Title } from 'solid-start'

const randomInt = (max: number) => Math.floor(Math.random() * max)

const DIRECTIONS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const

function* randomIterate<T>(arr: readonly T[]) {
  const copy = arr.slice()
  while (copy.length) {
    const index = randomInt(copy.length)
    yield copy.splice(index, 1)[0]
  }
}

function generateNoise(width: number, height: number) {
  const length = width * height
  const result = Array.from({ length }, () => false)

  const stack = Array.from({ length: length * 0.05 }, () => randomInt(length))

  while (stack.length > 0) {
    const i = stack.pop()!,
      x = i % width,
      y = Math.floor(i / width)

    result[i] = true

    // Skip spreading on the edges
    if (x === 0 || x === width - 1 || y === 0 || y === height - 1) continue

    for (const [dx, dy] of randomIterate(DIRECTIONS)) {
      const j = x + dx + (y + dy) * width

      if (j < 0 || j >= length || result[j]) continue

      stack.push(j)
      break
    }
  }

  return result
}

export default function Home() {
  const W = 20
  const H = 10
  return (
    <main>
      <Title>Hello World</Title>
      <h1>Hello World</h1>
      <div
        style={{
          display: 'grid',
          'grid-template-columns': `repeat(${W}, 1fr)`,
          'grid-template-rows': `repeat(${H}, 1fr)`,
          width: `${W * 2}rem`,
          height: `${H * 2}rem`,
        }}
      >
        {generateNoise(W, H).map((cell, i) => (
          <div
            style={{
              background: cell ? '#000' : 'gray',
              display: 'flex',
              'align-items': 'center',
              'justify-content': 'center',
            }}
          >
            {i}
          </div>
        ))}
      </div>
    </main>
  )
}
