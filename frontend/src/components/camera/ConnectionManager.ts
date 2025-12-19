/**
 * Simple Connection Manager for WebRTC Cameras
 * Just connects all cameras immediately without any throttling
 */

class CameraConnectionManager {
  private activeConnections = new Set<string>();

  /**
   * Request connection for a camera - just connect immediately
   */
  requestConnection(
    cameraId: string,
    _priority: number,
    onConnect: () => void,
    _onError: () => void
  ) {
    // Don't connect if already active
    if (this.activeConnections.has(cameraId)) return;

    // Just connect immediately
    onConnect();
  }

  /**
   * Mark connection as established
   */
  markConnected(cameraId: string) {
    this.activeConnections.add(cameraId);
  }

  /**
   * Mark connection as failed
   */
  markFailed(cameraId: string) {
    this.activeConnections.delete(cameraId);
  }

  /**
   * Mark connection as disconnected (for cleanup)
   */
  markDisconnected(cameraId: string) {
    this.activeConnections.delete(cameraId);
  }

  /**
   * Get connection stats
   */
  getStats() {
    return {
      active: this.activeConnections.size,
    };
  }
}

// Global singleton instance
export const connectionManager = new CameraConnectionManager();
