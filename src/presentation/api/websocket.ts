import { WebSocketServer, WebSocket } from 'ws';
import { MqttClient } from '../../infrastructure/mqtt/MqttClient.js';
import { MqttTopics } from '../../infrastructure/mqtt/MqttTopics.js';
import { IAccessLogger } from '../../domain/interfaces/IAccessLogger.js';

export const WS_PORT = 3001;

const SUBSCRIBED_TOPICS = [
  MqttTopics.ALL_VENUE_EVENTS,
  MqttTopics.ALL_CAPACITY_EVENTS,
  MqttTopics.ALL_DEVICE_STATUS,
  MqttTopics.ALL_DEVICE_ERRORS,
] as const;

export async function startWebSocketRelay(
  subscriberClient: MqttClient,
  logger: IAccessLogger,
): Promise<WebSocketServer> {
  const wss = new WebSocketServer({ port: WS_PORT });
  const wsClients: Set<WebSocket> = new Set();

  wss.on('connection', (socket) => {
    wsClients.add(socket);
    logger.info('WebSocket', 'Dashboard client connected');
    socket.on('close', () => {
      wsClients.delete(socket);
      logger.info('WebSocket', 'Dashboard client disconnected');
    });
  });

  const broadcast = (payload: Record<string, unknown>): void => {
    const message = JSON.stringify(payload);
    wsClients.forEach((socket) => {
      if (socket.readyState === WebSocket.OPEN) socket.send(message);
    });
  };

  for (const topic of SUBSCRIBED_TOPICS) {
    await subscriberClient.subscribe(topic);
  }

  subscriberClient.onMessage((topic, mqttPayload) => {
    broadcast({ topic, payload: mqttPayload });
  });

  return wss;
}
