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

const MAX_CAPACITY = 500;
const WARNING_OCCUPANCY = Math.floor(MAX_CAPACITY * 0.95);
const STEP_DELAY_MS = 400;

export async function runVenueAtCapacityScenario(
  mqttClient: MqttClient,
  stateMachine: DeviceStateMachine,
  logger: IAccessLogger,
): Promise<ScenarioResult> {
  const scenarioName = 'VenueAtCapacity';
  const startTime = Date.now();
  let messagesPublished = 0;

  logger.info(scenarioName, 'Starting venue capacity scenario');
  stateMachine.forceReset();

  await mqttClient.publish(MqttTopics.venueCapacity(SIMULATION_VENUE_ID), {
    messageId: uuidv4(),
    deviceId: SIMULATION_DEVICE_ID,
    venueId: SIMULATION_VENUE_ID,
    exhibitionId: SIMULATION_EXHIBITION_ID,
    timestamp: new Date().toISOString(),
    eventType: 'CAPACITY_WARNING',
    ticketId: null,
    ticketStatus: null,
    currentOccupancy: WARNING_OCCUPANCY,
    maxCapacity: MAX_CAPACITY,
    occupancyRate: WARNING_OCCUPANCY / MAX_CAPACITY,
    state: 'IDLE',
    metadata: { ...SIMULATION_METADATA, retryCount: 0 },
  });
  messagesPublished++;
  logger.warn(scenarioName, 'CAPACITY_WARNING published', { occupancyRate: WARNING_OCCUPANCY / MAX_CAPACITY });

  await delay(STEP_DELAY_MS);

  await mqttClient.publish(MqttTopics.venueCapacity(SIMULATION_VENUE_ID), {
    messageId: uuidv4(),
    deviceId: SIMULATION_DEVICE_ID,
    venueId: SIMULATION_VENUE_ID,
    exhibitionId: SIMULATION_EXHIBITION_ID,
    timestamp: new Date().toISOString(),
    eventType: 'CAPACITY_EXCEEDED',
    ticketId: null,
    ticketStatus: null,
    currentOccupancy: MAX_CAPACITY,
    maxCapacity: MAX_CAPACITY,
    occupancyRate: 1.0,
    state: 'IDLE',
    metadata: { ...SIMULATION_METADATA, retryCount: 0 },
  });
  messagesPublished++;
  logger.warn(scenarioName, 'CAPACITY_EXCEEDED published', { occupancyRate: 1.0 });

  await delay(STEP_DELAY_MS);

  stateMachine.onTicketDetected();
  await delay(STEP_DELAY_MS);
  stateMachine.onReadSuccess();
  await delay(STEP_DELAY_MS);

  await mqttClient.publish(MqttTopics.venueAccess(SIMULATION_VENUE_ID), {
    messageId: uuidv4(),
    deviceId: SIMULATION_DEVICE_ID,
    venueId: SIMULATION_VENUE_ID,
    exhibitionId: SIMULATION_EXHIBITION_ID,
    timestamp: new Date().toISOString(),
    eventType: 'DENIED',
    ticketId: 'TKT-2026-VALID-099',
    ticketStatus: 'VALID',
    currentOccupancy: MAX_CAPACITY,
    maxCapacity: MAX_CAPACITY,
    occupancyRate: 1.0,
    state: 'DENIED',
    metadata: { ...SIMULATION_METADATA, retryCount: 0 },
  });
  messagesPublished++;

  stateMachine.onAccessDenied();
  logger.info(scenarioName, 'Access denied due to VENUE_FULL');

  return {
    scenarioName,
    success: true,
    messagesPublished,
    durationMs: Date.now() - startTime,
    details: `Capacity warning at 95% (${WARNING_OCCUPANCY}/${MAX_CAPACITY}), then exceeded at 100%. Next entry denied with VENUE_FULL.`,
  };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
