/**
 * HTTP client for mlx-audio-tts FastAPI service.
 */

const TTS_SERVICE_PORT = process.env.FF_TTS_SERVICE_PORT || '8000';
const TTS_BASE_URL = `http://localhost:${TTS_SERVICE_PORT}`;

interface GenerateRequest {
  text: string;
  mode: 'preset';
  voice: string;
  speed: number;
  temperature: number;
  audio_format: 'wav';
}

interface GenerateResponse {
  status: string;
  audio_url: string;
  filename: string;
  duration: number;
  processing_time: number;
}

interface TtsOptions {
  voice?: string;
  speed?: number;
  temperature?: number;
}

/**
 * Generate speech from text using TTS service.
 * Returns audio as a Buffer.
 */
export async function synthesize(
  text: string,
  options: TtsOptions = {}
): Promise<Buffer> {
  const voice = options.voice || 'af_heart';
  const speed = options.speed || 1.0;
  const temperature = options.temperature || 0.7;

  // Request TTS generation
  const generateUrl = `${TTS_BASE_URL}/api/generate`;
  const generateRequest: GenerateRequest = {
    text,
    mode: 'preset',
    voice,
    speed,
    temperature,
    audio_format: 'wav'
  };

  let generateResponse: GenerateResponse;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const res = await fetch(generateUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(generateRequest),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`TTS generation failed: ${res.status} ${res.statusText}`);
    }

    generateResponse = (await res.json()) as GenerateResponse;

    if (generateResponse.status !== 'success') {
      throw new Error(`TTS generation error: ${generateResponse.status}`);
    }
  } catch (err) {
    throw new Error(`Failed to synthesize speech: ${err instanceof Error ? err.message : String(err)}`);
  }

  // Download audio file
  const downloadUrl = `${TTS_BASE_URL}/api/download/${generateResponse.filename}`;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const audioRes = await fetch(downloadUrl, {
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!audioRes.ok) {
      throw new Error(`Audio download failed: ${audioRes.status}`);
    }

    const arrayBuffer = await audioRes.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (err) {
    throw new Error(`Failed to download audio: ${err instanceof Error ? err.message : String(err)}`);
  }
}

/**
 * Check if TTS service is reachable.
 */
export async function isTtsServiceAvailable(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(`${TTS_BASE_URL}/api/voices`, {
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Get available voice presets from service.
 */
export async function getAvailableVoices(): Promise<string[]> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(`${TTS_BASE_URL}/api/voices`, {
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      return ['af_heart']; // Default fallback
    }

    const data = (await res.json()) as { voices: Array<{ id: string }> };
    return data.voices.map(v => v.id);
  } catch {
    return ['af_heart']; // Default fallback
  }
}
