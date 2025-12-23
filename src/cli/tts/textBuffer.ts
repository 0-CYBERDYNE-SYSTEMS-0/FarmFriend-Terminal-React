/**
 * Text buffer for accumulating streaming deltas and detecting sentence boundaries.
 * Emits complete sentences for TTS synthesis.
 */

interface TextBufferOptions {
  onSentence: (text: string) => void | Promise<void>;
}

export class TextBuffer {
  private buffer: string = '';
  private inCodeBlock: boolean = false;
  private onSentence: (text: string) => void | Promise<void>;
  private processingSentence: boolean = false; // Track if we're processing a sentence
  private pendingSentences: string[] = []; // Queue of sentences waiting to be processed
  // Pre-buffering state for aggressive early emit
  private lastEmitTime: number = 0;
  private lastEmitLength: number = 0;
  // Cached regex for performance (avoid recompiling on every call)
  private static readonly SENTENCE_REGEX = /([^.!?]*[.!?]+)(?:\s+|$)/g;
  private static readonly WORD_BOUNDARY_REGEX = /\s/;

  constructor(options: TextBufferOptions) {
    this.onSentence = options.onSentence;
  }

  /**
   * Check if we should emit early (before sentence boundary).
   * This helps reduce time-to-first-audio for long first sentences.
   */
  private shouldEmitEarly(): boolean {
    const now = Date.now();
    const timeSinceLastEmit = now - this.lastEmitTime;
    const bufferGrowth = this.buffer.length - this.lastEmitLength;

    // Emit if: buffer has grown significantly AND time has passed
    // This prevents chopping mid-word while still being aggressive
    const THRESHOLD_CHARS = 40;      // Minimum characters to consider
    const THRESHOLD_TIME = 150;      // Minimum ms between emits

    return this.buffer.length > THRESHOLD_CHARS &&
           timeSinceLastEmit > THRESHOLD_TIME &&
           bufferGrowth > 0;
  }

  /**
   * Find a safe point to emit text (prioritizes sentence end > word boundary).
   */
  private findSafeEmitPoint(): number {
    // Prioritize: sentence end > word boundary
    const sentenceEnd = this.buffer.search(/[.!?]\s/);
    if (sentenceEnd > 0) return sentenceEnd + 2;

    const wordBoundary = this.buffer.search(TextBuffer.WORD_BOUNDARY_REGEX);
    if (wordBoundary > 0) return wordBoundary + 1;

    return 0; // No safe point found
  }

  /**
   * Add streaming delta to buffer and extract complete sentences.
   */
  add(delta: string): void {
    this.buffer += delta;

    // Track code block state (don't speak code)
    const backtickCount = (this.buffer.match(/```/g) || []).length;
    this.inCodeBlock = backtickCount % 2 === 1;

    console.log('[TTS DEBUG] TextBuffer.add() delta:', delta, 'inCodeBlock:', this.inCodeBlock, 'buffer:', this.buffer);

    if (this.inCodeBlock) {
      return; // Don't extract sentences from code blocks
    }

    // Check for early emit BEFORE sentence detection (aggressive optimization)
    if (this.shouldEmitEarly()) {
      const emitPoint = this.findSafeEmitPoint();
      if (emitPoint > 0) {
        const toEmit = this.buffer.slice(0, emitPoint).trim();
        if (toEmit.length > 5) {  // Minimum meaningful chunk
          console.log('[TTS DEBUG] Early emit:', toEmit);
          this.pendingSentences.push(toEmit);
          this.buffer = this.buffer.slice(emitPoint);
          this.lastEmitTime = Date.now();
          this.lastEmitLength = 0;
          this.processQueue();
          return;
        }
      }
    }

    // Extract complete sentences (normal path)
    const sentences = this.extractCompleteSentences();
    console.log('[TTS DEBUG] Sentences detected:', sentences);
    if (sentences.length > 0) {
      // Add to pending queue
      this.pendingSentences.push(...sentences);
      this.lastEmitTime = Date.now();
      this.lastEmitLength = this.buffer.length;
      // Process queue if not already processing
      this.processQueue();
    }
  }

  /**
   * Process pending sentences one at a time (sequentially).
   */
  private async processQueue(): Promise<void> {
    if (this.processingSentence || this.pendingSentences.length === 0) {
      return;
    }

    this.processingSentence = true;
    while (this.pendingSentences.length > 0) {
      const sentence = this.pendingSentences.shift()!;
      console.log('[TTS DEBUG] Processing sentence:', sentence);
      try {
        await this.onSentence(sentence);
      } catch (err) {
        console.error('[TTS DEBUG] Error processing sentence:', err);
      }
    }
    this.processingSentence = false;
  }

  /**
   * Extract sentences that end with . ! ? followed by space/newline or end of string.
   * Keep incomplete sentences in buffer for next delta.
   */
  private extractCompleteSentences(): string[] {
    const sentences: string[] = [];
    let lastIndex = 0;

    let match;
    // Use cached regex (static readonly) to avoid recompilation
    while ((match = TextBuffer.SENTENCE_REGEX.exec(this.buffer)) !== null) {
      const sentence = match[1].trim();
      if (sentence.length > 0) {
        sentences.push(sentence);
      }
      lastIndex = match.index + match[0].length;
    }

    // Keep unmatched content in buffer for next iteration
    if (lastIndex > 0) {
      this.buffer = this.buffer.slice(lastIndex);
    }

    return sentences;
  }

  /**
   * Flush any remaining text in buffer (e.g., incomplete sentence at end of response).
   */
  async flush(): Promise<void> {
    const remaining = this.buffer.trim();
    console.log('[TTS DEBUG] TextBuffer.flush() remaining:', remaining, 'inCodeBlock:', this.inCodeBlock);
    if (remaining.length > 0 && !this.inCodeBlock) {
      console.log('[TTS DEBUG] TextBuffer.flush() adding remaining to queue:', remaining);
      this.pendingSentences.push(remaining);
      await this.processQueue();
    } else {
      console.log('[TTS DEBUG] TextBuffer.flush() skipped - no remaining text or in code block');
    }
    this.buffer = '';
    this.inCodeBlock = false;
  }

  /**
   * Reset buffer state.
   */
  reset(): void {
    this.buffer = '';
    this.inCodeBlock = false;
    this.pendingSentences = [];
    this.processingSentence = false;
    this.lastEmitTime = 0;
    this.lastEmitLength = 0;
  }

  /**
   * Get current buffer contents (for debugging).
   */
  getBuffer(): string {
    return this.buffer;
  }
}
