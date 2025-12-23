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

  constructor(options: TextBufferOptions) {
    this.onSentence = options.onSentence;
  }

  /**
   * Add streaming delta to buffer and extract complete sentences.
   */
  add(delta: string): void {
    this.buffer += delta;

    // Track code block state (don't speak code)
    const backtickCount = (this.buffer.match(/```/g) || []).length;
    this.inCodeBlock = backtickCount % 2 === 1;

    if (this.inCodeBlock) {
      return; // Don't extract sentences from code blocks
    }

    // Extract complete sentences
    const sentences = this.extractCompleteSentences();
    sentences.forEach(sentence => {
      this.onSentence(sentence);
    });
  }

  /**
   * Extract sentences that end with . ! ? followed by space/newline or end of string.
   * Keep incomplete sentences in buffer for next delta.
   */
  private extractCompleteSentences(): string[] {
    // Match: any chars + sentence ending punctuation + (space/newline or end)
    // This regex ensures we get complete sentences
    const sentenceRegex = /([^.!?]*[.!?]+)(?:\s+|$)/g;
    const sentences: string[] = [];
    let lastIndex = 0;

    let match;
    while ((match = sentenceRegex.exec(this.buffer)) !== null) {
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
  flush(): void {
    const remaining = this.buffer.trim();
    if (remaining.length > 0 && !this.inCodeBlock) {
      this.onSentence(remaining);
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
  }

  /**
   * Get current buffer contents (for debugging).
   */
  getBuffer(): string {
    return this.buffer;
  }
}
