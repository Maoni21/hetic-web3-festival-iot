import { createRequire } from 'module';
import type { Client } from 'aedes';
import type { PublishPacket } from 'aedes';
import { createServer, Server } from 'net';
import { IAccessLogger } from '../../domain/interfaces/IAccessLogger.js';

// aedes is a CommonJS module; use createRequire for reliable ESM interop
const require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const aedesFactory: () => import('aedes').default = require('aedes');

export interface MqttBrokerConfig {
  port: number;
}

export class MqttBroker {
  private readonly broker: import('aedes').default;
  private readonly server: Server;

  constructor(
    private readonly config: MqttBrokerConfig,
    private readonly logger: IAccessLogger,
  ) {
    this.broker = aedesFactory();
    this.server = createServer(this.broker.handle.bind(this.broker));

    this.broker.on('client', (client: Client) => {
      this.logger.info('MqttBroker', 'Client connected', { clientId: client.id });
    });

    this.broker.on('clientDisconnect', (client: Client) => {
      this.logger.info('MqttBroker', 'Client disconnected', { clientId: client.id });
    });

    this.broker.on('publish', (packet: PublishPacket, client: Client | null) => {
      if (client !== null) {
        this.logger.debug('MqttBroker', 'Message published', {
          topic: packet.topic,
          clientId: client.id,
        });
      }
    });
  }

  start(): Promise<void> {
    return new Promise((resolve) => {
      this.server.listen(this.config.port, () => {
        this.logger.info('MqttBroker', `MQTT broker started on port ${this.config.port}`);
        resolve();
      });
    });
  }

  stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.broker.close(() => {
        this.server.close((error) => {
          if (error !== undefined) {
            reject(error);
          } else {
            this.logger.info('MqttBroker', 'MQTT broker stopped');
            resolve();
          }
        });
      });
    });
  }

  getPort(): number {
    return this.config.port;
  }
}
