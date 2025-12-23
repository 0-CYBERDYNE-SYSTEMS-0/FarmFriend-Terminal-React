// TTS module exports
export { startTtsService, stopTtsService } from './service.js';
export { TextBuffer } from './textBuffer.js';
export { synthesize, isTtsServiceAvailable, getAvailableVoices } from './client.js';
export { AudioPlaybackQueue } from './playback.js';
