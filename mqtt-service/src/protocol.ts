/**
 * WebSocket protocol message types for the MQTT gateway.
 *
 * Server → Client:
 *   - init: full device cache on connect
 *   - update: single device state change
 *   - publish_result: acknowledgement of a publish command
 *
 * Client → Server:
 *   - publish: command to publish an MQTT message
 */

/** Full cache snapshot sent to client on WebSocket connect. */
export interface InitMessage {
  type: 'init';
  devices: Record<string, unknown>;
}

/** Single device state update broadcast to all clients. */
export interface UpdateMessage {
  type: 'update';
  topic: string;
  payload: unknown;
}

/** Client request to publish a message to an MQTT topic. */
export interface PublishMessage {
  type: 'publish';
  topic: string;
  payload: unknown;
}

/** Server response after processing a publish request. */
export interface PublishResultMessage {
  type: 'publish_result';
  success: boolean;
  topic: string;
  error?: string;
}

/** All possible messages sent from server to client. */
export type ServerMessage = InitMessage | UpdateMessage | PublishResultMessage;

/** All possible messages sent from client to server. */
export type ClientMessage = PublishMessage;
