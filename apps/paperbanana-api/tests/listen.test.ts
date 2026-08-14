import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import test from 'node:test'

import { listenWithCleanup } from '../src/listen.js'

test('listen failure closes initialized runtime resources before rejecting', async () => {
  const server = new EventEmitter() as EventEmitter & { listen(port: number, host: string, callback: () => void): void }
  server.listen = () => queueMicrotask(() => server.emit('error', new Error('address in use')))
  let closeCount = 0

  await assert.rejects(
    listenWithCleanup(server as any, 3000, '127.0.0.1', async () => { closeCount += 1 }),
    /address in use/,
  )
  assert.equal(closeCount, 1)
})
