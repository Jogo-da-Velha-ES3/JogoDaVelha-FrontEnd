import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SERVER_SLOW_SECONDS } from '../constants/game'
import { useServerWakeStore, watchServerCall } from './serverWakeStore'

const LIMIT = SERVER_SLOW_SECONDS * 1000
const slowCalls = () => useServerWakeStore.getState().slowCalls

/** Chamada que só responde quando o teste mandar */
function pendingCall<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: Error) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

beforeEach(() => {
  vi.useFakeTimers()
  useServerWakeStore.setState({ slowCalls: 0 })
})

afterEach(() => {
  vi.useRealTimers()
})

describe('servidor acordando (FE-51)', () => {
  it('chamada rápida não conta como lenta', async () => {
    await expect(watchServerCall(Promise.resolve('ok'))).resolves.toBe('ok')
    await vi.advanceTimersByTimeAsync(LIMIT * 2)
    expect(slowCalls()).toBe(0)
  })

  it('passou do limite sem resposta: conta como lenta até responder', async () => {
    const call = pendingCall<string>()
    const watched = watchServerCall(call.promise)

    await vi.advanceTimersByTimeAsync(LIMIT - 1)
    expect(slowCalls()).toBe(0)
    await vi.advanceTimersByTimeAsync(1)
    expect(slowCalls()).toBe(1)

    call.resolve('acordou')
    await expect(watched).resolves.toBe('acordou')
    expect(slowCalls()).toBe(0)
  })

  it('erro também encerra a espera, e o erro chega igual a quem chamou', async () => {
    const call = pendingCall<string>()
    const watched = watchServerCall(call.promise)
    await vi.advanceTimersByTimeAsync(LIMIT)
    expect(slowCalls()).toBe(1)

    call.reject(new Error('caiu'))
    await expect(watched).rejects.toThrow('caiu')
    expect(slowCalls()).toBe(0)
  })

  it('várias chamadas lentas: o aviso só sai quando todas respondem', async () => {
    const first = pendingCall<void>()
    const second = pendingCall<void>()
    const watchedFirst = watchServerCall(first.promise)
    const watchedSecond = watchServerCall(second.promise)
    await vi.advanceTimersByTimeAsync(LIMIT)
    expect(slowCalls()).toBe(2)

    first.resolve()
    await watchedFirst
    expect(slowCalls()).toBe(1)

    second.resolve()
    await watchedSecond
    expect(slowCalls()).toBe(0)
  })
})
