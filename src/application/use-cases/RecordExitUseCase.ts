import { IVenueRepository } from '../../domain/interfaces/IVenueRepository.js';
import { IEventPublisher } from '../../domain/interfaces/IEventPublisher.js';
import { IAccessLogger } from '../../domain/interfaces/IAccessLogger.js';
import { Venue } from '../../domain/entities/Venue.js';
import { AccessEvent } from '../../domain/entities/AccessEvent.js';
import { Timestamp } from '../../domain/value-objects/Timestamp.js';
import { AccessEventType } from '../../domain/enums/AccessEventType.js';
import { DeviceState } from '../../domain/enums/DeviceState.js';
import { v4 as uuidv4 } from 'uuid';

export interface RecordExitInput {
  venue: Venue;
  deviceId: string;
  ticketId: string | null;
  firmwareVersion: string;
  batteryLevel: number;
  signalStrength: number;
}

export class RecordExitUseCase {
  constructor(
    private readonly venueRepository: IVenueRepository,
    private readonly eventPublisher: IEventPublisher,
    private readonly logger: IAccessLogger,
  ) {}

  async execute(input: RecordExitInput): Promise<AccessEvent> {
    const now = Timestamp.now();

    const updatedVenue = input.venue.decrementOccupancy();
    await this.venueRepository.save(updatedVenue);

    const accessEvent = AccessEvent.create({
      messageId: uuidv4(),
      deviceId: input.deviceId,
      venueId: input.venue.getId().getValue(),
      exhibitionId: input.venue.getExhibitionId(),
      timestamp: now,
      eventType: AccessEventType.EXIT,
      ticketId: input.ticketId,
      ticketStatus: null,
      currentOccupancy: updatedVenue.getCurrentOccupancy(),
      maxCapacity: updatedVenue.getMaxCapacity(),
      state: DeviceState.IDLE,
      metadata: {
        firmwareVersion: input.firmwareVersion,
        batteryLevel: input.batteryLevel,
        signalStrength: input.signalStrength,
        retryCount: 0,
      },
    });

    await this.eventPublisher.publish(accessEvent);

    this.logger.info('RecordExitUseCase', 'Exit recorded', {
      venueId: input.venue.getId().getValue(),
      currentOccupancy: updatedVenue.getCurrentOccupancy(),
    });

    return accessEvent;
  }
}
