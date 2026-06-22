import { ScenarioResult } from '../../../domain/interfaces/ISensorSimulator.js';
import { MqttClient } from '../../mqtt/MqttClient.js';
import { MqttTopics } from '../../mqtt/MqttTopics.js';
import { DeviceStateMachine } from '../DeviceStateMachine.js';
import { IAccessLogger } from '../../../domain/interfaces/IAccessLogger.js';
import {
  SIMULATION_VENUE_ID,
  SIMULATION_DEVICE_ID,
  SIMULATION_EXHIBITION_ID,
  SIMULATION_METADATA,
} from '../constants.js';
import { v4 as uuidv4 } from 'uuid';

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 600;
const RECONNECT_DELAY_MS = 1000;

export async function runMessageLossScenario(
  mqttClient: MqttClient,
  stateMachine: DeviceStateMachine,
  logger: IAccessLogger,
  currentOccupancy: number,
  maxCapacity: number,
): Promise<ScenarioResult> {
  const scenarioName = 'MessageLoss';
  const startTime = Date.now();
  let messagesPublished = 0;

  logger.info(scenarioName, 'Starting message loss scenario');

  stateMachine.forceReset();
  stateMachine.onConnectionLost();

  await mqttClient.publish(MqttTopics.deviceStatus(SIMULATION_DEVICE_ID), {
    messageId: uuidv4(),
    deviceId: SIMULATION_DEVICE_ID,
    venueId: SIMULATION_VENUE_ID,
    exhibitionId: SIMULATION_EXHIBITION_ID,
    timestamp: new Date().toISOString(),
    eventType: 'ERROR',
    ticketId: null,
    ticketStatus: null,
    currentOccupancy,
    maxCapacity,
    occupancyRate: currentOccupancy / maxCapacity,
    state: 'OFFLINE',
    metadata: { ...SIMULATION_METADATA, signalStrength: -80, retryCount: 0 },
  });
  messagesPublished++;

  logger.warn(scenarioName, 'Device OFFLINE — simulating message loss');

  const pendingMessages: Record<string, unknown>[] = [];

  for (let retryCount = 1; retryCount <= MAX_RETRIES; retryCount++) {
    logger.warn(scenarioName, `Message lost (retry ${retryCount}/${MAX_RETRIES})`, { retryCount });
    pendingMessages.push({
      messageId: uuidv4(),
      retryCount,
      originalTimestamp: new Date().toISOString(),
    });
    await delay(RETRY_DELAY_MS);
  }

  logger.info(scenarioName, 'Reconnecting to broker');
  await delay(RECONNECT_DELAY_MS);

  stateMachine.onReconnected();

  await mqttClient.publish(MqttTopics.deviceStatus(SIMULATION_DEVICE_ID), {
    messageId: uuidv4(),
    deviceId: SIMULATION_DEVICE_ID,
    venueId: SIMULATION_VENUE_ID,
    exhibitionId: SIMULATION_EXHIBITION_ID,
    timestamp: new Date().toISOString(),
    eventType: 'ERROR',
    ticketId: null,
    ticketStatus: null,
    currentOccupancy,
    maxCapacity,
    occupancyRate: currentOccupancy / maxCapacity,
    state: 'IDLE',
    metadata: { ...SIMULATION_METADATA, retryCount: MAX_RETRIES },
  });
  messagesPublished++;

  logger.info(scenarioName, 'Device back ONLINE — republishing pending messages', {
    pendingCount: pendingMessages.length,
  });

  for (const pendingMessage of pendingMessages) {
    await mqttClient.publish(MqttTopics.venueAccess(SIMULATION_VENUE_ID), {
      ...pendingMessage,
      deviceId: SIMULATION_DEVICE_ID,
      venueId: SIMULATION_VENUE_ID,
      exhibitionId: SIMULATION_EXHIBITION_ID,
      republishedAt: new Date().toISOString(),
      state: 'IDLE',
    });
    messagesPublished++;
    await delay(100);
  }

  logger.info(scenarioName, 'All pending messages republished successfully');

  return {
    scenarioName,
    success: true,
    messagesPublished,
    durationMs: Date.now() - startTime,
    details: `Simulated ${MAX_RETRIES} lost messages. Device went OFFLINE then ONLINE. ${pendingMessages.length} messages republished.`,
  };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
