/**
 * Text buffer for accumulating streaming deltas and detecting sentence boundaries.
 * Emits complete sentences for TTS synthesis.
 */

interface TextBufferOptions {
  onSentence: (text: string) => void | Promise<void>;
  isPlaying?: () => boolean;
}

export class TextBuffer {
  private buffer: string = '';
  private inCodeBlock: boolean = false;
  private onSentence: (text: string) => void | Promise<void>;
  private isPlaying?: () => boolean;
  private processingSentence: boolean = false;
  private pendingSentences: string[] = [];
  private lastEmitTime: number = 0;
  private lastEmitLength: number = 0;
  private static readonly SENTENCE_REGEX = /([^.!?]*[.!?]+)(?:\s+|$)/g;
  private static readonly WORD_BOUNDARY_REGEX = /\s/;

  constructor(options: TextBufferOptions) {
    this.onSentence = options.onSentence;
    this.isPlaying = options.isPlaying;
  }

  private shouldEmitEarly(): boolean {
    const now = Date.now();
    const timeSinceLastEmit = now - this.lastEmitTime;
    const bufferGrowth = this.buffer.length - this.lastEmitLength;
    const THRESHOLD_CHARS = 40;
    const THRESHOLD_TIME = 150;
    return this.buffer.length > THRESHOLD_CHARS &&
           timeSinceLastEmit > THRESHOLD_TIME &&
           bufferGrowth > 0;
  }

  private findSafeEmitPoint(): number {
    const sentenceEnd = this.buffer.search(/[.!?]\s/);
    if (sentenceEnd > 0) return sentenceEnd + 2;
    const wordBoundary = this.buffer.search(TextBuffer.WORD_BOUNDARY_REGEX);
    if (wordBoundary > 0) return wordBoundary + 1;
    return 0;
  }

  add(delta: string): void {
    this.buffer += delta;
    const backtickCount = (this.buffer.match(/```/g) || []).length;
    this.inCodeBlock = backtickCount % 2 === 1;

    if (this.inCodeBlock) {
      return;
    }

    if (this.shouldEmitEarly()) {
      const emitPoint = this.findSafeEmitPoint();
      if (emitPoint > 0) {
        const toEmit = this.buffer.slice(0, emitPoint).trim();
        if (toEmit.length > 5) {
          this.pendingSentences.push(toEmit);
          this.buffer = this.buffer.slice(emitPoint);
          this.lastEmitTime = Date.now();
          this.lastEmitLength = 0;
          this.processQueue();
          return;
        }
      }
    }

    const sentences = this.extractCompleteSentences();
    if (sentences.length > 0) {
      this.pendingSentences.push(...sentences);
      this.lastEmitTime = Date.now();
      this.lastEmitLength = this.buffer.length;
      this.processQueue();
    }
  }

  private async processQueue(): Promise<void> {
    if (this.pendingSentences.length === 0) {
      return;
    }

    if (this.processingSentence) {
      while (this.processingSentence) {
        await new Promise(r => setTimeout(r, 50));
      }
      if (this.pendingSentences.length === 0) {
        return;
      }
    }

    this.processingSentence = true;

    while (this.pendingSentences.length > 0) {
      const sentence = this.pendingSentences.shift()!;
      try {
        const audio = await this.onSentence(sentence);
        const morePending = this.pendingSentences.length > 0;
        const currentlyPlaying = this.isPlaying?.() ?? false;
        if (morePending && currentlyPlaying) {
          continue;
        }
        if (!currentlyPlaying && audio) {
          await new Promise(r => setTimeout(r, 100));
        }
      } catch (err) {
        console.error('[TTS] Error processing sentence:', err);
      }
    }

    this.processingSentence = false;
  }

  private extractCompleteSentences(): string[] {
    const sentences: string[] = [];
    let lastIndex = 0;
    let match;
    while ((match = TextBuffer.SENTENCE_REGEX.exec(this.buffer)) !== null) {
      const sentence = match[1].trim();
      if (sentence.length > 0) {
        sentences.push(sentence);
      }
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex > 0) {
      this.buffer = this.buffer.slice(lastIndex);
    }
    return sentences;
  }

  async flush(): Promise<void> {
    const remaining = this.buffer.trim();
    if (remaining.length > 0 && !this.inCodeBlock) {
      this.pendingSentences.push(remaining);
      await this.processQueue();
    }
    this.buffer = '';
    this.inCodeBlock = false;
  }

  reset(): void {
    this.buffer = '';
    this.inCodeBlock = false;
    this.pendingSentences = [];
    this.processingSentence = false;
    this.lastEmitTime = 0;
    this.lastEmitLength = 0;
  }

  getBuffer(): string {
    return this.buffer;
  }
}
