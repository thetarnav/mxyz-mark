/*

Experiment with a reactive signal API for Solid.

*/

import * as solid from 'solid-js'

export class Reactive<T> {
  get: solid.Accessor<T>
  get value() {
    return this.get()
  }

  constructor(get: solid.Accessor<T>) {
    this.get = get
  }
}

export function reactive<T>(get: solid.Accessor<T>): Reactive<T> {
  return new Reactive(get)
}

export function peak<T>(reactive: Reactive<T>): T {
  return solid.untrack(() => reactive.value)
}

export function memo<T>(reactive: Reactive<T>): Reactive<T> {
  return new Reactive(solid.createMemo(() => reactive.value))
}

export function map<T, U>(source: Reactive<T>, fn: (value: T) => U): Reactive<U> {
  return new Reactive(() => fn(source.value))
}

export function join<T>(sources: Reactive<T>[], fn: (values: T[]) => T): Reactive<T> {
  return new Reactive(() => fn(sources.map(source => source.value)))
}

export function effect<T>(source: Reactive<T>, fn: (value: T) => void): void {
  solid.createEffect(() => {
    const value = source.value
    solid.untrack(() => fn(value))
  })
}

export class Signal<T> extends Reactive<T> {
  setter: solid.Setter<T>

  constructor(initialValue: T, options?: solid.SignalOptions<T>) {
    const [get, setter] = solid.createSignal(initialValue, options)
    super(get)
    this.setter = setter
  }
}

export function signal<T>(initialValue: T, options?: solid.SignalOptions<T>): Signal<T> {
  return new Signal(initialValue, options)
}

export function set<T>(signal: Signal<T>, value: T): void {
  signal.setter(() => value)
}

export function update<T>(signal: Signal<T>, fn: (value: T) => T): void {
  signal.setter(fn)
}

/**
 * For read-only access to a signal.
 */
export function readonly<T>(signal: Signal<T>): Reactive<T> {
  return new Reactive(() => signal.value)
}

if (import.meta.env.MODE === 'test') {
  const count = signal(0)
  const sum = memo(
    join([count, map(count, value => value * 2)], ([count, double]) => count + double),
  )

  effect(sum, value => console.log(value))

  const countReadonly = readonly(count)
  set(count, 1)
  update(count, value => value + 1)
  // @ts-expect-error
  countReadonly.set(2)

  solid.createEffect(() => {
    // tracked
    count.value
    // tracked
    count.get()
    // not tracked
    peak(count)
  })
}
