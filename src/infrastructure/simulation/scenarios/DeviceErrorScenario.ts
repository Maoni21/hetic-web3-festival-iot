import { ScenarioResult } from '../../../domain/interfaces/ISensorSimulator.js';
import { MqttClient } from '../../mqtt/MqttClient.js';
import { MqttTopics } from '../../mqtt/MqttTopics.js';
import { DeviceStateMachine } from '../DeviceStateMachine.js';
import { IAccessLogger } from '../../../domain/interfaces/IAccessLogger.js';
import { v4 as uuidv4 } from 'uuid';

const VENUE_ID = 'venue-grand-palais';
const DEVICE_ID = 'GATE-EXPO-A1-001';
const EXHIBITION_ID = 'expo-cartier-bresson-2026';
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 300;
const ERROR_RECOVERY_DELAY_MS = 5000;

export async function runDeviceErrorScenario(
  mqttClient: MqttClient,
  stateMachine: DeviceStateMachine,
  logger: IAccessLogger,
  currentOccupancy: number,
  maxCapacity: number,
): Promise<ScenarioResult> {
  const scenarioName = 'DeviceError';
  const startTime = Date.now();
  let messagesPublished = 0;

  logger.info(scenarioName, 'Starting device error scenario');

  stateMachine.forceReset();
  stateMachine.onTicketDetected();

  for (let retryCount = 1; retryCount <= MAX_RETRIES; retryCount++) {
    logger.warn(scenarioName, `Read attempt ${retryCount} failed`, { retryCount });
    await delay(RETRY_DELAY_MS);
  }

  stateMachine.onReadFailure();

  await mqttClient.publish(MqttTopics.deviceError(DEVICE_ID), {
    messageId: uuidv4(),
    deviceId: DEVICE_ID,
    venueId: VENUE_ID,
    exhibitionId: EXHIBITION_ID,
    timestamp: new Date().toISOString(),
    eventType: 'ERROR',
    ticketId: null,
    ticketStatus: null,
    currentOccupancy,
    maxCapacity,
    occupancyRate: currentOccupancy / maxCapacity,
    state: 'ERROR',
    metadata: {
      firmwareVersion: '1.4.2',
      batteryLevel: 0.87,
      signalStrength: -65,
      retryCount: MAX_RETRIES,
    },
  });
  messagesPublished++;

  logger.info(scenarioName, `Device in ERROR state, recovering in ${ERROR_RECOVERY_DELAY_MS}ms`);
  await delay(ERROR_RECOVERY_DELAY_MS);

  stateMachine.onRecovery();

  await mqttClient.publish(MqttTopics.deviceStatus(DEVICE_ID), {
    messageId: uuidv4(),
    deviceId: DEVICE_ID,
    venueId: VENUE_ID,
    exhibitionId: EXHIBITION_ID,
    timestamp: new Date().toISOString(),
    eventType: 'ERROR',
    ticketId: null,
    ticketStatus: null,
    currentOccupancy,
    maxCapacity,
    occupancyRate: currentOccupancy / maxCapacity,
    state: 'IDLE',
    metadata: {
      firmwareVersion: '1.4.2',
      batteryLevel: 0.87,
      signalStrength: -65,
      retryCount: 0,
    },
  });
  messagesPublished++;

  return {
    scenarioName,
    success: true,
    messagesPublished,
    durationMs: Date.now() - startTime,
    details: `Device error after ${MAX_RETRIES} read attempts. Recovered to IDLE after ${ERROR_RECOVERY_DELAY_MS}ms.`,
  };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
