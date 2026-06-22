import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';

import { MqttBroker } from '../../infrastructure/mqtt/MqttBroker.js';
import { MqttClient } from '../../infrastructure/mqtt/MqttClient.js';
import { MqttEventPublisher } from '../../infrastructure/mqtt/MqttEventPublisher.js';
import { MqttTopics } from '../../infrastructure/mqtt/MqttTopics.js';
import { InMemoryTicketRepository } from '../../infrastructure/repositories/InMemoryTicketRepository.js';
import { InMemoryVenueRepository } from '../../infrastructure/repositories/InMemoryVenueRepository.js';
import { ConsoleLogger } from '../../infrastructure/logger/ConsoleLogger.js';
import { DeviceStateMachine } from '../../infrastructure/simulation/DeviceStateMachine.js';
import { SensorSimulator } from '../../infrastructure/simulation/SensorSimulator.js';
import { AccessControlService } from '../../application/services/AccessControlService.js';
import { AttendanceTrackingService } from '../../application/services/AttendanceTrackingService.js';
import { EventsController } from './controllers/EventsController.js';
import { VenueController } from './controllers/VenueController.js';
import { createEventsRouter } from './routes/eventsRoutes.js';
import { createVenueRouter } from './routes/venueRoutes.js';
import { seedTickets, seedVenues } from '../../infrastructure/seed/SeedData.js';

const MQTT_PORT = 1883;
const HTTP_PORT = 3000;
const WS_PORT = 3001;
const MQTT_BROKER_URL = `mqtt://localhost:${MQTT_PORT}`;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function bootstrap(): Promise<void> {
  const logger = new ConsoleLogger();

  const mqttBroker = new MqttBroker({ port: MQTT_PORT }, logger);
  await mqttBroker.start();

  const publisherClient = new MqttClient(
    { brokerUrl: MQTT_BROKER_URL, clientId: 'festival-publisher' },
    logger,
  );
  await publisherClient.connect();

  const subscriberClient = new MqttClient(
    { brokerUrl: MQTT_BROKER_URL, clientId: 'festival-subscriber' },
    logger,
  );
  await subscriberClient.connect();

  const simulatorMqttClient = new MqttClient(
    { brokerUrl: MQTT_BROKER_URL, clientId: 'festival-simulator' },
    logger,
  );
  await simulatorMqttClient.connect();

  const eventPublisher = new MqttEventPublisher(publisherClient, logger);
  const ticketRepository = new InMemoryTicketRepository();
  const venueRepository = new InMemoryVenueRepository();

  seedTickets(ticketRepository);
  seedVenues(venueRepository);

  const accessControlService = new AccessControlService(
    ticketRepository,
    venueRepository,
    eventPublisher,
    logger,
  );

  const attendanceTrackingService = new AttendanceTrackingService(
    venueRepository,
    eventPublisher,
    logger,
  );

  const eventsController = new EventsController(
    accessControlService,
    attendanceTrackingService,
    logger,
  );

  const venueController = new VenueController(attendanceTrackingService, logger);

  const stateMachine = new DeviceStateMachine(logger);
  const simulator = new SensorSimulator(simulatorMqttClient, stateMachine, logger);

  const app = express();
  app.use(express.json());

  const dashboardPath = path.resolve(__dirname, '../dashboard');
  app.use(express.static(dashboardPath));

  app.use('/api/events', createEventsRouter(eventsController));
  app.use('/api/venues', createVenueRouter(venueController));

  app.post('/api/simulate/:scenario', (req, res) => {
    const { scenario } = req.params as { scenario: string };
    simulator.runScenario(scenario).then((result) => {
      res.json(result);
    }).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : 'Simulation error';
      res.status(500).json({ error: message });
    });
  });

  app.post('/api/simulate', (_req, res) => {
    simulator.runAllScenarios().then((results) => {
      res.json({ results });
    }).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : 'Simulation error';
      res.status(500).json({ error: message });
    });
  });

  const httpServer = createServer(app);
  const wss = new WebSocketServer({ port: WS_PORT });

  const wsClients: Set<WebSocket> = new Set();

  wss.on('connection', (webSocket) => {
    wsClients.add(webSocket);
    logger.info('WebSocket', 'Dashboard client connected');

    webSocket.on('close', () => {
      wsClients.delete(webSocket);
      logger.info('WebSocket', 'Dashboard client disconnected');
    });
  });

  const broadcastToClients = (payload: Record<string, unknown>): void => {
    const message = JSON.stringify(payload);
    wsClients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  };

  const topics = [
    MqttTopics.ALL_VENUE_EVENTS,
    MqttTopics.ALL_CAPACITY_EVENTS,
    MqttTopics.ALL_DEVICE_STATUS,
    MqttTopics.ALL_DEVICE_ERRORS,
  ];

  for (const topic of topics) {
    await subscriberClient.subscribe(topic);
  }

  subscriberClient.onMessage((topic, mqttPayload) => {
    broadcastToClients({ topic, payload: mqttPayload });
  });

  httpServer.listen(HTTP_PORT, () => {
    logger.info('Server', `HTTP API running on http://localhost:${HTTP_PORT}`);
    logger.info('Server', `Dashboard available at http://localhost:${HTTP_PORT}`);
    logger.info('Server', `WebSocket running on ws://localhost:${WS_PORT}`);
  });
}

bootstrap().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(JSON.stringify({ level: 'ERROR', message: `Fatal error: ${message}` }));
  process.exit(1);
});
