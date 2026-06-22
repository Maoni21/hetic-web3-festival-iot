import { MqttBroker } from '../src/infrastructure/mqtt/MqttBroker.js';
import { MqttClient } from '../src/infrastructure/mqtt/MqttClient.js';
import { ConsoleLogger } from '../src/infrastructure/logger/ConsoleLogger.js';
import { DeviceStateMachine } from '../src/infrastructure/simulation/DeviceStateMachine.js';
import { SensorSimulator } from '../src/infrastructure/simulation/SensorSimulator.js';

const MQTT_PORT = 1884;
const MQTT_BROKER_URL = `mqtt://localhost:${MQTT_PORT}`;

async function main(): Promise<void> {
  const logger = new ConsoleLogger();
  const scenarioArg = getScenarioArg();

  logger.info('run-simulation', 'Starting simulation', { scenario: scenarioArg ?? 'all' });

  const broker = new MqttBroker({ port: MQTT_PORT }, logger);
  await broker.start();

  const mqttClient = new MqttClient(
    { brokerUrl: MQTT_BROKER_URL, clientId: 'simulator-standalone' },
    logger,
  );
  await mqttClient.connect();

  const stateMachine = new DeviceStateMachine(logger);
  const simulator = new SensorSimulator(mqttClient, stateMachine, logger);

  if (scenarioArg !== null) {
    const result = await simulator.runScenario(scenarioArg);
    console.log(JSON.stringify({ level: 'INFO', context: 'run-simulation', result }));
  } else {
    const results = await simulator.runAllScenarios();
    const passed = results.filter((result) => result.success).length;
    console.log(JSON.stringify({
      level: 'INFO',
      context: 'run-simulation',
      summary: `${passed}/${results.length} scenarios passed`,
      results,
    }));
  }

  await mqttClient.disconnect();
  await broker.stop();
  process.exit(0);
}

function getScenarioArg(): string | null {
  const args = process.argv.slice(2);
  const scenarioIndex = args.indexOf('--scenario');
  if (scenarioIndex !== -1 && args[scenarioIndex + 1] !== undefined) {
    return args[scenarioIndex + 1];
  }
  return null;
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(JSON.stringify({ level: 'ERROR', message }));
  process.exit(1);
});
