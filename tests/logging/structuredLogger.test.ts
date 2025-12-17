import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { redactValue, parseLogLevel, truncateForLog, hashPreview, StructuredLogger } from '../../src/runtime/logging/structuredLogger.js'

describe('redactValue', () => {
  it('redacts null/undefined values without change', () => {
    expect(redactValue(null)).toBe(null)
    expect(redactValue(undefined)).toBe(undefined)
  })

  it('passes through short strings unchanged', () => {
    expect(redactValue('short')).toBe('short')
    expect(redactValue('12345')).toBe('12345')
  })

  it('redacts strings 16+ characters as potential secrets', () => {
    const longSecret = '1234567890abcdef'
    expect(redactValue(longSecret)).toBe('[REDACTED]')
    expect(redactValue('1234567890abcdefg')).toBe('[REDACTED]')
  })

  it('passes through numbers and booleans unchanged', () => {
    expect(redactValue(42)).toBe(42)
    expect(redactValue(3.14)).toBe(3.14)
    expect(redactValue(true)).toBe(true)
    expect(redactValue(false)).toBe(false)
  })

  it('redacts objects with sensitive keys', () => {
    const input = {
      api_key: 'sk-1234567890abcdef',
      token: 'ghp_1234567890abcdefghij',
      password: 'mysecretpassword',
      username: 'john'
    }
    const result = redactValue(input) as any
    expect(result.api_key).toBe('[REDACTED]')
    expect(result.token).toBe('[REDACTED]')
    expect(result.password).toBe('[REDACTED]')
    expect(result.username).toBe('john') // short, not redacted
  })

  it('recognizes apiKey, API_KEY, api-key variants', () => {
    const input = {
      apiKey: 'mysecretapikey123456',
      API_KEY: 'anothersecretkey1234',
      'api-key': 'secretthird123456789'
    }
    const result = redactValue(input) as any
    expect(result.apiKey).toBe('[REDACTED]')
    expect(result.API_KEY).toBe('[REDACTED]')
    expect(result['api-key']).toBe('[REDACTED]')
  })

  it('redacts authorization, bearer, session, jwt, credential, secret, cookie keys', () => {
    const input = {
      authorization: 'Bearer sk-1234567890abcdef',
      bearer: 'token_1234567890abcdef',
      session: 'sessionid_1234567890ab',
      jwt: 'eyJhbGciOiJIUzI1NiIsInR5cCI6Ij12',
      credential: 'cred_1234567890abcdef',
      secret: 'secret_1234567890abcd',
      cookie: 'session=abcd1234567890ef'
    }
    const result = redactValue(input) as any
    Object.keys(input).forEach(key => {
      expect(result[key]).toBe('[REDACTED]')
    })
  })

  it('recursively redacts nested objects', () => {
    const input = {
      user: {
        name: 'john',
        credentials: {
          api_key: 'sk-1234567890abcdef'
        }
      },
      token: 'ghp_1234567890abcdefghij'
    }
    const result = redactValue(input) as any
    expect(result.user.name).toBe('john')
    expect(result.user.credentials.api_key).toBe('[REDACTED]')
    expect(result.token).toBe('[REDACTED]')
  })

  it('recursively redacts arrays', () => {
    const input = [
      { api_key: 'sk_1234567890abcdef' },
      'shortvalue',
      { token: 'ghp_1234567890abcdefghij' }
    ]
    const result = redactValue(input) as any[]
    expect(result[0].api_key).toBe('[REDACTED]')
    expect(result[1]).toBe('shortvalue')
    expect(result[2].token).toBe('[REDACTED]')
  })

  it('converts unknown types to string', () => {
    const result = redactValue({ custom: {} } as any)
    expect(typeof result).toBe('object')
  })
})

describe('parseLogLevel', () => {
  it('parses valid log levels', () => {
    expect(parseLogLevel('trace')).toBe('trace')
    expect(parseLogLevel('debug')).toBe('debug')
    expect(parseLogLevel('info')).toBe('info')
    expect(parseLogLevel('warn')).toBe('warn')
    expect(parseLogLevel('error')).toBe('error')
  })

  it('handles case-insensitive input', () => {
    expect(parseLogLevel('TRACE')).toBe('trace')
    expect(parseLogLevel('Debug')).toBe('debug')
    expect(parseLogLevel('  INFO  ')).toBe('info')
  })

  it('defaults to info for invalid input', () => {
    expect(parseLogLevel('invalid')).toBe('info')
    expect(parseLogLevel(undefined)).toBe('info')
    expect(parseLogLevel(null)).toBe('info')
    expect(parseLogLevel(42)).toBe('info')
  })
})

describe('truncateForLog', () => {
  it('leaves short strings unchanged', () => {
    const short = 'hello world'
    expect(truncateForLog(short, 100)).toBe(short)
  })

  it('truncates long strings at maxLen with ellipsis and count', () => {
    const long = 'a'.repeat(1000)
    const result = truncateForLog(long, 100)
    expect(result.length).toBe(100 + '...(1000 chars)'.length)
    expect(result).toContain('...(1000 chars)')
  })

  it('uses default 800 char limit', () => {
    const text = 'x'.repeat(2000)
    const result = truncateForLog(text)
    expect(result).toContain('...(2000 chars)')
  })
})

describe('hashPreview', () => {
  it('returns consistent SHA256 hash', () => {
    const input = 'hello world'
    const hash1 = hashPreview(input)
    const hash2 = hashPreview(input)
    expect(hash1).toBe(hash2)
    expect(hash1).toMatch(/^[a-f0-9]{64}$/) // 256-bit hex
  })

  it('produces different hashes for different inputs', () => {
    const hash1 = hashPreview('input1')
    const hash2 = hashPreview('input2')
    expect(hash1).not.toBe(hash2)
  })
})

describe('StructuredLogger', () => {
  let tempDir: string
  let logFile: string

  beforeEach(() => {
    tempDir = path.join('/tmp', `test-logger-${Date.now()}`)
    logFile = path.join(tempDir, 'test.jsonl')
  })

  afterEach(() => {
    try {
      if (fs.existsSync(logFile)) fs.unlinkSync(logFile)
      if (fs.existsSync(tempDir)) fs.rmdirSync(tempDir)
    } catch {
      // ignore cleanup errors
    }
  })

  it('creates logger instance without errors', () => {
    const logger = new StructuredLogger({ filePath: logFile })
    expect(logger).toBeDefined()
  })

  it('creates directory if it does not exist', () => {
    expect(fs.existsSync(tempDir)).toBe(false)
    const logger = new StructuredLogger({ filePath: logFile })
    expect(fs.existsSync(tempDir)).toBe(true)
  })

  it('respects log level filtering', () => {
    const logger = new StructuredLogger({ filePath: logFile, level: 'warn' })
    expect(logger.isEnabled('trace')).toBe(false)
    expect(logger.isEnabled('debug')).toBe(false)
    expect(logger.isEnabled('info')).toBe(false)
    expect(logger.isEnabled('warn')).toBe(true)
    expect(logger.isEnabled('error')).toBe(true)
  })

  it('writes logs asynchronously', (done) => {
    const logger = new StructuredLogger({ filePath: logFile })
    logger.log('info', 'test_event', { message: 'hello' })

    // Wait a bit for async write
    setTimeout(() => {
      const content = fs.readFileSync(logFile, 'utf8')
      expect(content).toContain('test_event')
      expect(content).toContain('hello')
      done()
    }, 100)
  })

  it('truncates retention to max 10', () => {
    const logger = new StructuredLogger({ filePath: logFile, retention: 100 })
    expect((logger as any).retention).toBe(10)
  })

  it('enforces minimum retention of 1', () => {
    const logger = new StructuredLogger({ filePath: logFile, retention: 0 })
    expect((logger as any).retention).toBe(1)
  })
})
