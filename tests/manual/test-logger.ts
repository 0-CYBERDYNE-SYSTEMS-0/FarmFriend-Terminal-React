import { redactValue, parseLogLevel, truncateForLog } from '../../src/runtime/logging/structuredLogger.js'

let passedTests = 0
let failedTests = 0

function assert(condition: boolean, message: string) {
  if (condition) {
    passedTests++
    console.log(`✓ ${message}`)
  } else {
    failedTests++
    console.error(`✗ ${message}`)
  }
}

function deepEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

console.log('\n=== Testing redactValue ===\n')

// Test null/undefined
assert(redactValue(null) === null, 'redacts null values')
assert(redactValue(undefined) === undefined, 'redacts undefined values')

// Test short strings
assert(redactValue('short') === 'short', 'passes through short strings')
assert(redactValue('12345') === '12345', 'passes through short numbers')

// Test long strings
assert(redactValue('1234567890abcdef') === '[REDACTED]', 'redacts 16-char strings')
assert(redactValue('1234567890abcdefg') === '[REDACTED]', 'redacts 17+ char strings')

// Test numbers and booleans
assert(redactValue(42) === 42, 'passes through numbers')
assert(redactValue(3.14) === 3.14, 'passes through floats')
assert(redactValue(true) === true, 'passes through true')
assert(redactValue(false) === false, 'passes through false')

// Test object redaction
const objResult = redactValue({
  api_key: 'sk-1234567890abcdef',
  token: 'ghp_1234567890abcdefg',
  username: 'john'
}) as any
assert(objResult.api_key === '[REDACTED]', 'redacts api_key in objects')
assert(objResult.token === '[REDACTED]', 'redacts token in objects')
assert(objResult.username === 'john', 'keeps short values in objects')

// Test case-insensitive key matching
const caseResult = redactValue({
  API_KEY: 'sk_1234567890abcdef',
  apiKey: 'sk_1234567890abcdef',
  'api-key': 'sk_1234567890abcdef'
}) as any
assert(caseResult.API_KEY === '[REDACTED]', 'redacts API_KEY variant')
assert(caseResult.apiKey === '[REDACTED]', 'redacts apiKey variant')
assert(caseResult['api-key'] === '[REDACTED]', 'redacts api-key variant')

// Test nested objects
const nestedResult = redactValue({
  user: {
    name: 'john',
    credentials: {
      api_key: 'sk_1234567890abcdef'
    }
  }
}) as any
assert(nestedResult.user.name === 'john', 'preserves non-sensitive nested values')
assert(nestedResult.user.credentials.api_key === '[REDACTED]', 'redacts nested sensitive values')

// Test arrays
const arrResult = redactValue([
  { api_key: 'sk_1234567890abcdef' },
  'shortvalue',
  { token: 'ghp_1234567890abcdefgh' }
]) as any[]
assert(arrResult[0].api_key === '[REDACTED]', 'redacts in array objects')
assert(arrResult[1] === 'shortvalue', 'preserves short array values')
assert(arrResult[2].token === '[REDACTED]', 'redacts token in array')

console.log('\n=== Testing parseLogLevel ===\n')

assert(parseLogLevel('trace') === 'trace', 'parses trace level')
assert(parseLogLevel('debug') === 'debug', 'parses debug level')
assert(parseLogLevel('info') === 'info', 'parses info level')
assert(parseLogLevel('warn') === 'warn', 'parses warn level')
assert(parseLogLevel('error') === 'error', 'parses error level')

assert(parseLogLevel('TRACE') === 'trace', 'handles uppercase input')
assert(parseLogLevel('Debug') === 'debug', 'handles mixed case')
assert(parseLogLevel('  INFO  ') === 'info', 'trims whitespace')

assert(parseLogLevel('invalid') === 'info', 'defaults to info for invalid')
assert(parseLogLevel(undefined) === 'info', 'defaults to info for undefined')
assert(parseLogLevel(null) === 'info', 'defaults to info for null')
assert(parseLogLevel(42 as any) === 'info', 'defaults to info for numbers')

console.log('\n=== Testing truncateForLog ===\n')

const shortText = 'hello world'
assert(truncateForLog(shortText, 100) === shortText, 'leaves short strings unchanged')

const longText = 'a'.repeat(1000)
const truncated = truncateForLog(longText, 100)
assert(truncated.includes('...'), 'adds ellipsis for long strings')
assert(truncated.includes('1000 chars'), 'shows original length')
assert(truncated.length === 100 + '...(1000 chars)'.length, 'correct truncated length')

const defaultTrunc = truncateForLog('x'.repeat(2000))
assert(defaultTrunc.includes('...(2000 chars)'), 'uses 800 char default limit')

console.log('\n=== Summary ===\n')
console.log(`✓ Passed: ${passedTests}`)
console.log(`✗ Failed: ${failedTests}`)
console.log(`Total: ${passedTests + failedTests}\n`)

process.exit(failedTests > 0 ? 1 : 0)
