import test from 'node:test'
import assert from 'node:assert/strict'
import { decode, encode } from '@msgpack/msgpack'
import { mergeTargets, targetSizes, TARGET_FORMAT } from '../src/ar/targets.js'

const pack = (n, v = TARGET_FORMAT) => encode({
  v,
  dataList: Array.from({ length: n }, (_, i) => ({ targetImage: { width: 100 + i, height: 200 }, trackingData: [i], matchingData: [i] }))
})

test('merges one pack per work, in order', () => {
  const a = encode({ v: TARGET_FORMAT, dataList: [{ targetImage: { width: 10, height: 20 }, trackingData: ['a'], matchingData: [] }] })
  const b = encode({ v: TARGET_FORMAT, dataList: [{ targetImage: { width: 30, height: 40 }, trackingData: ['b'], matchingData: [] }] })
  const merged = mergeTargets([a, b])
  assert.deepEqual(decode(merged).dataList.map(e => e.trackingData[0]), ['a', 'b'])
  assert.deepEqual(targetSizes(merged), [{ width: 10, height: 20 }, { width: 30, height: 40 }])
})

test('rejects a pack from another format version', () => {
  assert.throws(() => mergeTargets([pack(1, 1)]), { code: 'bad-target' })
})

test('rejects a pack with more than one entry, and an empty list', () => {
  assert.throws(() => mergeTargets([pack(2)]), { code: 'bad-target' })
  assert.throws(() => mergeTargets([]), { code: 'bad-target' })
})
