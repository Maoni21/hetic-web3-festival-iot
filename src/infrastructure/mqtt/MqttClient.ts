import mqtt, { MqttClient as MqttClientType } from 'mqtt';
import { IAccessLogger } from '../../domain/interfaces/IAccessLogger.js';

export interface MqttClientConfig {
  brokerUrl: string;
  clientId: string;
}

type MessageHandler = (topic: string, payload: Record<string, unknown>) => void;

export class MqttClient {
  private client: MqttClientType | null = null;
  private readonly messageHandlers: MessageHandler[] = [];
  private isConnected: boolean = false;

  constructor(
    private readonly config: MqttClientConfig,
    private readonly logger: IAccessLogger,
  ) {}

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.client = mqtt.connect(this.config.brokerUrl, {
        clientId: this.config.clientId,
        clean: true,
        reconnectPeriod: 1000,
      });

      this.client.on('connect', () => {
        this.isConnected = true;
        this.logger.info('MqttClient', 'Connected to broker', {
          brokerUrl: this.config.brokerUrl,
          clientId: this.config.clientId,
        });
        resolve();
      });

      this.client.on('error', (error) => {
        this.logger.error('MqttClient', 'Connection error', { error: error.message });
        if (!this.isConnected) {
          reject(error);
        }
      });

      this.client.on('message', (topic: string, message: Buffer) => {
        try {
          const payload = JSON.parse(message.toString()) as Record<string, unknown>;
          this.messageHandlers.forEach((handler) => handler(topic, payload));
        } catch {
          this.logger.error('MqttClient', 'Failed to parse message', { topic });
        }
      });

      this.client.on('offline', () => {
        this.isConnected = false;
        this.logger.warn('MqttClient', 'Client went offline');
      });

      this.client.on('reconnect', () => {
        this.logger.info('MqttClient', 'Reconnecting to broker');
      });
    });
  }

  publish(topic: string, payload: Record<string, unknown>): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.client === null || !this.isConnected) {
        reject(new Error('MQTT client is not connected'));
        return;
      }

      const message = JSON.stringify(payload);
      this.client.publish(topic, message, { qos: 1 }, (error) => {
        if (error !== undefined && error !== null) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  subscribe(topic: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.client === null) {
        reject(new Error('MQTT client is not connected'));
        return;
      }

      this.client.subscribe(topic, { qos: 1 }, (error) => {
        if (error !== null && error !== undefined) {
          reject(error);
        } else {
          this.logger.debug('MqttClient', 'Subscribed to topic', { topic });
          resolve();
        }
      });
    });
  }

  onMessage(handler: MessageHandler): void {
    this.messageHandlers.push(handler);
  }

  disconnect(): Promise<void> {
    return new Promise((resolve) => {
      if (this.client === null) {
        resolve();
        return;
      }
      this.client.end(false, {}, () => {
        this.isConnected = false;
        resolve();
      });
    });
  }

  getIsConnected(): boolean {
    return this.isConnected;
  }
}
