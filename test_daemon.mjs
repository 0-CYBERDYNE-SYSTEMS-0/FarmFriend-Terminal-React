import WebSocket from 'ws';

const ws = new WebSocket('ws://127.0.0.1:28888');

ws.on('open', () => {
  console.log('✓ Connected to daemon');

  // Send hello
  ws.send(JSON.stringify({
    type: 'hello',
    client: 'test',
    version: '1.0.0'
  }));

  // Send test message
  setTimeout(() => {
    console.log('→ Sending test message: "hi"');
    ws.send(JSON.stringify({
      type: 'start_turn',
      input: 'hi',
      sessionId: 'test-' + Date.now()
    }));
  }, 500);
});

let chunks = [];

ws.on('message', (data) => {
  const msg = JSON.parse(data.toString());

  if (msg.type === 'chunk') {
    chunks.push(msg.chunk);
    if (msg.chunk.includes('openrouter.ai') || msg.chunk.includes('Azure')) {
      console.log('⚠️  FOUND OPENROUTER/AZURE REFERENCE:');
      console.log(msg.chunk);
    }
  } else {
    console.log(`← ${msg.type}:`, JSON.stringify(msg).substring(0, 150));
  }

  if (msg.type === 'turn_finished') {
    console.log('\n=== TURN FINISHED ===');
    console.log('Success:', msg.ok);
    if (msg.error) {
      console.log('Error:', msg.error);
    }
    console.log('Total chunks:', chunks.length);
    ws.close();
    process.exit(msg.ok ? 0 : 1);
  }
});

ws.on('error', (err) => {
  console.error('✗ WebSocket error:', err.message);
  process.exit(1);
});

ws.on('close', () => {
  console.log('Connection closed');
});

setTimeout(() => {
  console.log('⏱ Timeout after 25s');
  ws.close();
  process.exit(1);
}, 25000);
