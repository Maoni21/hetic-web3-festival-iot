import { AccessEvent } from '../entities/AccessEvent.js';

export interface IEventPublisher {
  publish(event: AccessEvent): Promise<void>;
  publishRaw(topic: string, payload: Record<string, unknown>): Promise<void>;
}
