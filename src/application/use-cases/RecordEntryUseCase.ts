import { ITicketRepository } from '../../domain/interfaces/ITicketRepository.js';
import { IVenueRepository } from '../../domain/interfaces/IVenueRepository.js';
import { IEventPublisher } from '../../domain/interfaces/IEventPublisher.js';
import { IAccessLogger } from '../../domain/interfaces/IAccessLogger.js';
import { Ticket } from '../../domain/entities/Ticket.js';
import { Venue } from '../../domain/entities/Venue.js';
import { AccessEvent } from '../../domain/entities/AccessEvent.js';
import { Timestamp } from '../../domain/value-objects/Timestamp.js';
import { AccessEventType } from '../../domain/enums/AccessEventType.js';
import { DeviceState } from '../../domain/enums/DeviceState.js';
import { TicketStatus } from '../../domain/enums/TicketStatus.js';
import { v4 as uuidv4 } from 'uuid';

export interface RecordEntryInput {
  ticket: Ticket;
  venue: Venue;
  deviceId: string;
  firmwareVersion: string;
  batteryLevel: number;
  signalStrength: number;
}

export class RecordEntryUseCase {
  constructor(
    private readonly ticketRepository: ITicketRepository,
    private readonly venueRepository: IVenueRepository,
    private readonly eventPublisher: IEventPublisher,
    private readonly logger: IAccessLogger,
  ) {}

  async execute(input: RecordEntryInput): Promise<AccessEvent> {
    const now = Timestamp.now();

    const usedTicket = input.ticket.markAsUsed(now);
    await this.ticketRepository.save(usedTicket);

    const updatedVenue = input.venue.incrementOccupancy();
    await this.venueRepository.save(updatedVenue);

    const accessEvent = AccessEvent.create({
      messageId: uuidv4(),
      deviceId: input.deviceId,
      venueId: input.venue.getId().getValue(),
      exhibitionId: input.venue.getExhibitionId(),
      timestamp: now,
      eventType: AccessEventType.ENTRY,
      ticketId: input.ticket.getId().getValue(),
      ticketStatus: TicketStatus.VALID,
      currentOccupancy: updatedVenue.getCurrentOccupancy(),
      maxCapacity: updatedVenue.getMaxCapacity(),
      state: DeviceState.GRANTED,
      metadata: {
        firmwareVersion: input.firmwareVersion,
        batteryLevel: input.batteryLevel,
        signalStrength: input.signalStrength,
        retryCount: 0,
      },
    });

    await this.eventPublisher.publish(accessEvent);

    this.logger.info('RecordEntryUseCase', 'Entry recorded', {
      ticketId: input.ticket.getId().getValue(),
      venueId: input.venue.getId().getValue(),
      currentOccupancy: updatedVenue.getCurrentOccupancy(),
    });

    if (updatedVenue.isNearCapacity()) {
      await this.publishCapacityWarning(updatedVenue, input, now);
    }

    return accessEvent;
  }

  private async publishCapacityWarning(
    venue: Venue,
    input: RecordEntryInput,
    now: Timestamp,
  ): Promise<void> {
    const eventType = venue.isAtCapacity()
      ? AccessEventType.CAPACITY_EXCEEDED
      : AccessEventType.CAPACITY_WARNING;

    const warningEvent = AccessEvent.create({
      messageId: uuidv4(),
      deviceId: input.deviceId,
      venueId: venue.getId().getValue(),
      exhibitionId: venue.getExhibitionId(),
      timestamp: now,
      eventType,
      ticketId: null,
      ticketStatus: null,
      currentOccupancy: venue.getCurrentOccupancy(),
      maxCapacity: venue.getMaxCapacity(),
      state: DeviceState.IDLE,
      metadata: {
        firmwareVersion: input.firmwareVersion,
        batteryLevel: input.batteryLevel,
        signalStrength: input.signalStrength,
        retryCount: 0,
      },
    });

    await this.eventPublisher.publish(warningEvent);
    this.logger.warn('RecordEntryUseCase', `Capacity warning: ${eventType}`, {
      occupancyRate: venue.getOccupancyRate(),
    });
  }
}
