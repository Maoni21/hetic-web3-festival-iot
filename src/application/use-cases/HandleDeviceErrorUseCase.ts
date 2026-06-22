import { IEventPublisher } from '../../domain/interfaces/IEventPublisher.js';
import { IAccessLogger } from '../../domain/interfaces/IAccessLogger.js';
import { Venue } from '../../domain/entities/Venue.js';
import { AccessEvent } from '../../domain/entities/AccessEvent.js';
import { Timestamp } from '../../domain/value-objects/Timestamp.js';
import { AccessEventType } from '../../domain/enums/AccessEventType.js';
import { DeviceState } from '../../domain/enums/DeviceState.js';
import { v4 as uuidv4 } from 'uuid';

export interface HandleDeviceErrorInput {
  deviceId: string;
  venue: Venue;
  retryCount: number;
  firmwareVersion: string;
  batteryLevel: number;
  signalStrength: number;
}

export class HandleDeviceErrorUseCase {
  constructor(
    private readonly eventPublisher: IEventPublisher,
    private readonly logger: IAccessLogger,
  ) {}

  async execute(input: HandleDeviceErrorInput): Promise<AccessEvent> {
    const now = Timestamp.now();

    const errorEvent = AccessEvent.create({
      messageId: uuidv4(),
      deviceId: input.deviceId,
      venueId: input.venue.getId().getValue(),
      exhibitionId: input.venue.getExhibitionId(),
      timestamp: now,
      eventType: AccessEventType.ERROR,
      ticketId: null,
      ticketStatus: null,
      currentOccupancy: input.venue.getCurrentOccupancy(),
      maxCapacity: input.venue.getMaxCapacity(),
      state: DeviceState.ERROR,
      metadata: {
        firmwareVersion: input.firmwareVersion,
        batteryLevel: input.batteryLevel,
        signalStrength: input.signalStrength,
        retryCount: input.retryCount,
      },
    });

    await this.eventPublisher.publish(errorEvent);

    this.logger.error('HandleDeviceErrorUseCase', 'Device error recorded', {
      deviceId: input.deviceId,
      retryCount: input.retryCount,
    });

    return errorEvent;
  }
}
