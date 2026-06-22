import { IEventPublisher } from '../../domain/interfaces/IEventPublisher.js';
import { AccessEvent } from '../../domain/entities/AccessEvent.js';
import { IAccessLogger } from '../../domain/interfaces/IAccessLogger.js';
import { MqttClient } from './MqttClient.js';
import { MqttTopics } from './MqttTopics.js';
import { AccessEventType } from '../../domain/enums/AccessEventType.js';

export class MqttEventPublisher implements IEventPublisher {
  constructor(
    private readonly mqttClient: MqttClient,
    private readonly logger: IAccessLogger,
  ) {}

  async publish(event: AccessEvent): Promise<void> {
    const topic = this.resolveTopic(event);
    const payload = event.toJSON();

    await this.mqttClient.publish(topic, payload);

    this.logger.info('MqttEventPublisher', 'Event published', {
      topic,
      messageId: event.getMessageId(),
      eventType: event.getEventType(),
    });
  }

  async publishRaw(topic: string, payload: Record<string, unknown>): Promise<void> {
    await this.mqttClient.publish(topic, payload);
    this.logger.debug('MqttEventPublisher', 'Raw message published', { topic });
  }

  private resolveTopic(event: AccessEvent): string {
    const eventType = event.getEventType();

    if (
      eventType === AccessEventType.CAPACITY_WARNING ||
      eventType === AccessEventType.CAPACITY_EXCEEDED
    ) {
      return MqttTopics.venueCapacity(event.getVenueId());
    }

    if (eventType === AccessEventType.ERROR) {
      return MqttTopics.deviceError(event.getDeviceId());
    }

    return MqttTopics.venueAccess(event.getVenueId());
  }
}
