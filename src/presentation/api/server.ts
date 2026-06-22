import express from 'express';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

import { MqttBroker } from '../../infrastructure/mqtt/MqttBroker.js';
import { MqttClient } from '../../infrastructure/mqtt/MqttClient.js';
import { MqttEventPublisher } from '../../infrastructure/mqtt/MqttEventPublisher.js';
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
import { startWebSocketRelay } from './websocket.js';
import { seedTickets, seedVenues } from '../../infrastructure/seed/SeedData.js';

const MQTT_PORT = 1883;
const HTTP_PORT = 3000;
const MQTT_BROKER_URL = `mqtt://localhost:${MQTT_PORT}`;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function createMqttClient(clientId: string, logger: ConsoleLogger): Promise<MqttClient> {
  const client = new MqttClient({ brokerUrl: MQTT_BROKER_URL, clientId }, logger);
  await client.connect();
  return client;
}

async function bootstrap(): Promise<void> {
  const logger = new ConsoleLogger();

  const mqttBroker = new MqttBroker({ port: MQTT_PORT }, logger);
  await mqttBroker.start();

  const [publisherClient, subscriberClient, simulatorClient] = await Promise.all([
    createMqttClient('festival-publisher', logger),
    createMqttClient('festival-subscriber', logger),
    createMqttClient('festival-simulator', logger),
  ]);

  const eventPublisher = new MqttEventPublisher(publisherClient, logger);
  const ticketRepository = new InMemoryTicketRepository();
  const venueRepository = new InMemoryVenueRepository();

  seedTickets(ticketRepository);
  seedVenues(venueRepository);

  const accessControlService = new AccessControlService(
    ticketRepository, venueRepository, eventPublisher, logger,
  );
  const attendanceTrackingService = new AttendanceTrackingService(
    venueRepository, eventPublisher, logger,
  );

  const eventsController = new EventsController(accessControlService, attendanceTrackingService, logger);
  const venueController = new VenueController(attendanceTrackingService, logger);
  const simulator = new SensorSimulator(simulatorClient, new DeviceStateMachine(logger), logger);

  const app = express();
  app.use(express.json());
  app.use(express.static(path.resolve(__dirname, '../dashboard')));
  app.use('/api/events', createEventsRouter(eventsController));
  app.use('/api/venues', createVenueRouter(venueController));

  app.post('/api/simulate/:scenario', (req, res) => {
    const { scenario } = req.params as { scenario: string };
    simulator.runScenario(scenario)
      .then((result) => res.json(result))
      .catch((error: unknown) => res.status(500).json({ error: String(error) }));
  });

  app.post('/api/simulate', (_req, res) => {
    simulator.runAllScenarios()
      .then((results) => res.json({ results }))
      .catch((error: unknown) => res.status(500).json({ error: String(error) }));
  });

  await startWebSocketRelay(subscriberClient, logger);

  createServer(app).listen(HTTP_PORT, () => {
    logger.info('Server', `HTTP API running on http://localhost:${HTTP_PORT}`);
    logger.info('Server', `Dashboard available at http://localhost:${HTTP_PORT}`);
    logger.info('Server', `WebSocket running on ws://localhost:3001`);
  });
}

bootstrap().catch((error: unknown) => {
  console.error(JSON.stringify({ level: 'ERROR', message: String(error) }));
  process.exit(1);
});
