/**
 * Serializes async operations to prevent concurrent execution.
 * Used to prevent simultaneous VAD detection calls that cause native crashes.
 */
export class AsyncMutex {
  private queue: Array<() => Promise<void>> = [];
  private processing = false;

  async runExclusive<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });

      if (!this.processing) {
        this.processQueue();
      }
    });
  }

  private async processQueue() {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      const task = this.queue.shift();
      if (task) {
        try {
          await task();
        } catch (error) {
          console.error('[AsyncMutex] Task failed:', error);
        }
      }
    }

    this.processing = false;
  }

  clear() {
    this.queue = [];
  }
}
