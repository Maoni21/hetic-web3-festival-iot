import { ISensorSimulator, ScenarioResult } from '../../domain/interfaces/ISensorSimulator.js';
import { IAccessLogger } from '../../domain/interfaces/IAccessLogger.js';
import { MqttClient } from '../mqtt/MqttClient.js';
import { DeviceStateMachine } from './DeviceStateMachine.js';
import { runValidEntryScenario } from './scenarios/ValidEntryScenario.js';
import { runInvalidTicketScenario } from './scenarios/InvalidTicketScenario.js';
import { runAlreadyUsedTicketScenario } from './scenarios/AlreadyUsedTicketScenario.js';
import { runDeviceErrorScenario } from './scenarios/DeviceErrorScenario.js';
import { runVenueAtCapacityScenario } from './scenarios/VenueAtCapacityScenario.js';
import { runMessageLossScenario } from './scenarios/MessageLossScenario.js';

const DEFAULT_OCCUPANCY = 347;
const DEFAULT_MAX_CAPACITY = 500;

const SCENARIO_NAMES = [
  'ValidEntry',
  'InvalidTicket',
  'AlreadyUsedTicket',
  'DeviceError',
  'VenueAtCapacity',
  'MessageLoss',
] as const;

type ScenarioName = (typeof SCENARIO_NAMES)[number];

export class SensorSimulator implements ISensorSimulator {
  private currentOccupancy: number = DEFAULT_OCCUPANCY;
  private readonly maxCapacity: number = DEFAULT_MAX_CAPACITY;

  constructor(
    private readonly mqttClient: MqttClient,
    private readonly stateMachine: DeviceStateMachine,
    private readonly logger: IAccessLogger,
  ) {}

  async runScenario(scenarioName: string): Promise<ScenarioResult> {
    const validName = scenarioName as ScenarioName;

    if (!SCENARIO_NAMES.includes(validName)) {
      return {
        scenarioName,
        success: false,
        messagesPublished: 0,
        durationMs: 0,
        details: `Unknown scenario: ${scenarioName}. Valid: ${SCENARIO_NAMES.join(', ')}`,
      };
    }

    return this.dispatchScenario(validName);
  }

  async runAllScenarios(): Promise<ScenarioResult[]> {
    const results: ScenarioResult[] = [];

    for (const scenarioName of SCENARIO_NAMES) {
      this.logger.info('SensorSimulator', `Running scenario: ${scenarioName}`);
      const result = await this.dispatchScenario(scenarioName);
      results.push(result);
      await delay(1000);
    }

    this.logger.info('SensorSimulator', 'All scenarios completed', {
      total: results.length,
      succeeded: results.filter((result) => result.success).length,
    });

    return results;
  }

  private async dispatchScenario(scenarioName: ScenarioName): Promise<ScenarioResult> {
    switch (scenarioName) {
      case 'ValidEntry':
        return runValidEntryScenario(
          this.mqttClient,
          this.stateMachine,
          this.logger,
          this.currentOccupancy,
          this.maxCapacity,
        );

      case 'InvalidTicket':
        return runInvalidTicketScenario(
          this.mqttClient,
          this.stateMachine,
          this.logger,
          this.currentOccupancy,
          this.maxCapacity,
        );

      case 'AlreadyUsedTicket':
        return runAlreadyUsedTicketScenario(
          this.mqttClient,
          this.stateMachine,
          this.logger,
          this.currentOccupancy,
          this.maxCapacity,
        );

      case 'DeviceError':
        return runDeviceErrorScenario(
          this.mqttClient,
          this.stateMachine,
          this.logger,
          this.currentOccupancy,
          this.maxCapacity,
        );

      case 'VenueAtCapacity':
        return runVenueAtCapacityScenario(
          this.mqttClient,
          this.stateMachine,
          this.logger,
        );

      case 'MessageLoss':
        return runMessageLossScenario(
          this.mqttClient,
          this.stateMachine,
          this.logger,
          this.currentOccupancy,
          this.maxCapacity,
        );
    }
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
