import { configure, run } from '@japa/runner'
import { assert } from '@japa/assert'

console.log('Running Japa setup...')

configure({
  files: ['tests/**/*.spec.ts'],
  plugins: [assert()],
})

run()
