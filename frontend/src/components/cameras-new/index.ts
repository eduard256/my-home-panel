/**
 * Cameras New Module — Smart streaming camera system.
 *
 * Uses JPEG snapshots for grid view (minimal resource usage) and MSE live
 * streams from go2rtc when motion is detected or a camera is expanded.
 * Motion events are received via MQTT through the existing WebSocket proxy.
 */

export { CamerasNewSection } from './CamerasNewSection';
