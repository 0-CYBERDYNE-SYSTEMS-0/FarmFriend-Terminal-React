import { parseCommand, parseFrontmatter } from '../../src/runtime/commands/parser.js'

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

console.log('\n=== Testing parseCommand ===\n')

// Test $ARGUMENTS substitution
let result = parseCommand('run $ARGUMENTS', ['test', 'a', 'b'])
assert(result.substituted === 'run test a b', 'substitutes $ARGUMENTS with all args')

// Test $n positional substitution
result = parseCommand('run $1 with $2', ['script.ts', 'arg'])
assert(result.substituted === 'run script.ts with arg', 'substitutes $n positional args')

// Test $ARGn format
result = parseCommand('build $ARG1 and $ARG2', ['debug', 'prod'])
assert(result.substituted === 'build debug and prod', 'substitutes $ARGn format')

// Test missing args default to empty string
result = parseCommand('cmd $1 $2 $3', ['only', 'two'])
assert(result.substituted === 'cmd only two ', 'defaults missing args to empty string')

// Test mixed substitution
result = parseCommand('$ARG1 does $2 on $ARGUMENTS', ['alice', 'push', 'alice', 'push', 'to', 'main'])
assert(result.substituted === 'alice does push on alice push to main', 'handles mixed $ARGn, $n, $ARGUMENTS')

// Test no substitution needed
result = parseCommand('static command', [])
assert(result.substituted === 'static command', 'leaves static commands unchanged')

// Test empty template
result = parseCommand('', [])
assert(result.substituted === '', 'handles empty template')

// Test args returned
result = parseCommand('any template', ['arg1', 'arg2'])
assert(result.args.length === 2, 'preserves args in result')
assert(result.args[0] === 'arg1', 'preserves first arg')

// Test template preserved
result = parseCommand('my $1 template', ['data'])
assert(result.template === 'my $1 template', 'preserves original template')

console.log('\n=== Testing parseFrontmatter ===\n')

// Test no frontmatter
let fmResult = parseFrontmatter('just body content')
assert(Object.keys(fmResult.frontmatter).length === 0, 'returns empty object for content without frontmatter')
assert(fmResult.body === 'just body content', 'returns full content as body when no frontmatter')

// Test with frontmatter
const yamlContent = `---
title: My Page
count: 5
---
Body content here`

fmResult = parseFrontmatter(yamlContent)
assert(fmResult.frontmatter.title === 'My Page', 'extracts string frontmatter')
assert(fmResult.frontmatter.count === 5, 'parses numeric values')
assert(fmResult.body === 'Body content here', 'extracts body after frontmatter')

// Test boolean parsing
const boolContent = `---
enabled: true
disabled: false
---
Content`

fmResult = parseFrontmatter(boolContent)
assert(fmResult.frontmatter.enabled === true, 'parses true boolean')
assert(fmResult.frontmatter.disabled === false, 'parses false boolean')

// Test array parsing
const arrContent = `---
tags: [javascript, typescript, testing]
---
Body`

fmResult = parseFrontmatter(arrContent)
assert(Array.isArray(fmResult.frontmatter.tags), 'parses arrays')
assert(fmResult.frontmatter.tags.length === 3, 'array has correct length')
assert(fmResult.frontmatter.tags[0] === 'javascript', 'array items parsed correctly')

// Test quoted values
const quotedContent = `---
name: "John Doe"
path: '/home/user'
---
Body`

fmResult = parseFrontmatter(quotedContent)
assert(fmResult.frontmatter.name === 'John Doe', 'strips double quotes')
assert(fmResult.frontmatter.path === '/home/user', 'strips single quotes')

// Test unclosed frontmatter
const unclosedContent = `---
key: value
No closing delimiter
Body content`

fmResult = parseFrontmatter(unclosedContent)
assert(Object.keys(fmResult.frontmatter).length === 0, 'treats unclosed frontmatter as no frontmatter')
assert(fmResult.body === unclosedContent, 'returns full content when frontmatter unclosed')

// Test empty frontmatter
const emptyFmContent = `---
---
Body`

fmResult = parseFrontmatter(emptyFmContent)
assert(Object.keys(fmResult.frontmatter).length === 0, 'handles empty frontmatter')
assert(fmResult.body === 'Body', 'extracts body from empty frontmatter')

// Test multiline body
const multilineContent = `---
title: Test
---
Line 1
Line 2
Line 3`

fmResult = parseFrontmatter(multilineContent)
assert(fmResult.body.includes('Line 1'), 'preserves line 1')
assert(fmResult.body.includes('Line 2'), 'preserves line 2')
assert(fmResult.body.includes('Line 3'), 'preserves line 3')

console.log('\n=== Summary ===\n')
console.log(`✓ Passed: ${passedTests}`)
console.log(`✗ Failed: ${failedTests}`)
console.log(`Total: ${passedTests + failedTests}\n`)

process.exit(failedTests > 0 ? 1 : 0)
