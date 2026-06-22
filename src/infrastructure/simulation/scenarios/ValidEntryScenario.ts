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

const TICKET_ID = 'TKT-2026-VALID-001';
const PROCESSING_DELAY_MS = 500;

export async function runValidEntryScenario(
  mqttClient: MqttClient,
  stateMachine: DeviceStateMachine,
  logger: IAccessLogger,
  currentOccupancy: number,
  maxCapacity: number,
): Promise<ScenarioResult> {
  const scenarioName = 'ValidEntry';
  const startTime = Date.now();
  let messagesPublished = 0;

  logger.info(scenarioName, 'Starting valid entry scenario', { ticketId: TICKET_ID });

  stateMachine.forceReset();
  stateMachine.onTicketDetected();
  await delay(PROCESSING_DELAY_MS);

  stateMachine.onReadSuccess();
  await delay(PROCESSING_DELAY_MS);

  const newOccupancy = currentOccupancy + 1;

  await mqttClient.publish(MqttTopics.venueAccess(SIMULATION_VENUE_ID), {
    messageId: uuidv4(),
    deviceId: SIMULATION_DEVICE_ID,
    venueId: SIMULATION_VENUE_ID,
    exhibitionId: SIMULATION_EXHIBITION_ID,
    timestamp: new Date().toISOString(),
    eventType: 'ENTRY',
    ticketId: TICKET_ID,
    ticketStatus: 'VALID',
    currentOccupancy: newOccupancy,
    maxCapacity,
    occupancyRate: newOccupancy / maxCapacity,
    state: 'GRANTED',
    metadata: { ...SIMULATION_METADATA, retryCount: 0 },
  });
  messagesPublished++;

  stateMachine.onAccessGranted();

  logger.info(scenarioName, 'Valid entry scenario completed', { ticketId: TICKET_ID, newOccupancy });

  return {
    scenarioName,
    success: true,
    messagesPublished,
    durationMs: Date.now() - startTime,
    details: `Ticket ${TICKET_ID} successfully processed. Occupancy: ${newOccupancy}/${maxCapacity}`,
  };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
