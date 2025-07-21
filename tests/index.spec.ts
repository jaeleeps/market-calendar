console.log('Test file loaded')

import { test } from '@japa/runner'
import { add } from '../src'

test('add returns correct result', ({ assert }) => {
  assert.equal(add(2, 3), 5)
})

test('add fails intentionally', ({ assert }) => {
  assert.equal(add(2, 3), 99)
})
