/**
 * Connection Manager for WebRTC Cameras
 * Manages batched loading and retry logic to prevent browser overload
 */

interface ConnectionRequest {
  cameraId: string;
  priority: number;
  onConnect: () => void;
  onError: () => void;
}

class CameraConnectionManager {
  private queue: ConnectionRequest[] = [];
  private activeConnections = new Set<string>();
  private failedConnections = new Set<string>();
  private maxConcurrent: number;
  private connectDelay: number;
  private retryDelay: number;
  private processing = false;

  constructor(
    maxConcurrent = 3,
    connectDelay = 1000,
    retryDelay = 5000
  ) {
    this.maxConcurrent = maxConcurrent;
    this.connectDelay = connectDelay;
    this.retryDelay = retryDelay;
  }

  /**
   * Request connection for a camera
   */
  requestConnection(
    cameraId: string,
    priority: number,
    onConnect: () => void,
    onError: () => void
  ) {
    // Don't queue if already active or in queue
    if (this.activeConnections.has(cameraId)) return;
    if (this.queue.find(req => req.cameraId === cameraId)) return;

    this.queue.push({
      cameraId,
      priority,
      onConnect,
      onError,
    });

    // Sort by priority (higher first)
    this.queue.sort((a, b) => b.priority - a.priority);

    this.processQueue();
  }

  /**
   * Mark connection as established
   */
  markConnected(cameraId: string) {
    this.activeConnections.add(cameraId);
    this.failedConnections.delete(cameraId);
    this.processQueue();
  }

  /**
   * Mark connection as failed
   */
  markFailed(cameraId: string) {
    this.activeConnections.delete(cameraId);
    this.failedConnections.add(cameraId);
    this.processQueue();
  }

  /**
   * Mark connection as disconnected (for cleanup)
   */
  markDisconnected(cameraId: string) {
    this.activeConnections.delete(cameraId);
    this.processQueue();
  }

  /**
   * Retry all failed connections
   */
  retryFailed() {
    const failed = Array.from(this.failedConnections);
    this.failedConnections.clear();

    console.log(`Retrying ${failed.length} failed camera connections...`);

    // Failed connections will be re-added to queue by their components
    // This just clears the failed status
  }

  /**
   * Get list of failed camera IDs
   */
  getFailedCameras(): string[] {
    return Array.from(this.failedConnections);
  }

  /**
   * Process connection queue with concurrency limit
   */
  private async processQueue() {
    if (this.processing) return;
    this.processing = true;

    while (this.queue.length > 0 && this.activeConnections.size < this.maxConcurrent) {
      const request = this.queue.shift();
      if (!request) break;

      console.log(
        `Connecting camera ${request.cameraId} (${this.activeConnections.size + 1}/${this.maxConcurrent})...`
      );

      // Execute connection callback
      request.onConnect();

      // Add delay between connections to prevent overwhelming the browser
      if (this.queue.length > 0) {
        await this.delay(this.connectDelay);
      }
    }

    // Schedule retry for failed connections
    if (this.failedConnections.size > 0 && this.queue.length === 0) {
      setTimeout(() => {
        this.retryFailed();
      }, this.retryDelay);
    }

    this.processing = false;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get connection stats
   */
  getStats() {
    return {
      active: this.activeConnections.size,
      queued: this.queue.length,
      failed: this.failedConnections.size,
      maxConcurrent: this.maxConcurrent,
    };
  }
}

// Global singleton instance
export const connectionManager = new CameraConnectionManager(
  3,    // Max 3 concurrent connections
  1000, // 1 second delay between batches
  5000  // Retry failed after 5 seconds
);
