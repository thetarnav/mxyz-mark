/**
 * Enumerate<N> creates a union of numbers from 0 to N-1
 *
 * @example
 * Enumerate<3> // 0 | 1 | 2
 */
export type Enumerate<N extends number, Acc extends number[] = []> = Acc['length'] extends N
    ? Acc[number]
    : Enumerate<N, [...Acc, Acc['length']]>
