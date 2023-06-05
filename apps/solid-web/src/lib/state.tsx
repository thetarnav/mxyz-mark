import * as t from './trig'
import * as s from './signal'
import * as solid from 'solid-js'

export const MatrixGrid = <T,>(props: {
  matrix: t.Matrix<T>
  children: (item: solid.Accessor<T>, index: number) => solid.JSX.Element
}) => {
  const reordered = solid.createMemo(() => {
    const { matrix } = props,
      { width, height } = matrix,
      arr: { index: number; item: T }[] = []
    // display items in reverse y order
    // [1,2,3,4,5,6,7,8,9] | 3 -> [7,8,9,4,5,6,1,2,3]
    for (const i of matrix) {
      const point = matrix.point(i)
      const reorderedI = (height - 1 - point.y) * width + point.x
      arr.push({ index: reorderedI, item: matrix.get(reorderedI)! })
    }
    return arr
  })

  return (
    <div
      class="wrapper grid"
      style={{
        'grid-template-columns': `repeat(${props.matrix.width + ''}, 2rem)`,
        'grid-template-rows': `repeat(${props.matrix.height + ''}, 2rem)`,
      }}
    >
      <solid.Index each={reordered()}>
        {item => props.children(() => item().item, item().index)}
      </solid.Index>
    </div>
  )
}
