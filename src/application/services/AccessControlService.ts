import { ITicketRepository } from '../../domain/interfaces/ITicketRepository.js';
import { IVenueRepository } from '../../domain/interfaces/IVenueRepository.js';
import { IEventPublisher } from '../../domain/interfaces/IEventPublisher.js';
import { IAccessLogger } from '../../domain/interfaces/IAccessLogger.js';
import { ValidateTicketUseCase } from '../use-cases/ValidateTicketUseCase.js';
import { CheckVenueCapacityUseCase } from '../use-cases/CheckVenueCapacityUseCase.js';
import { RecordEntryUseCase } from '../use-cases/RecordEntryUseCase.js';
import { AccessRequestDTO } from '../dtos/AccessRequestDTO.js';
import { AccessResponseDTO } from '../dtos/AccessResponseDTO.js';
import { AccessEvent } from '../../domain/entities/AccessEvent.js';
import { Timestamp } from '../../domain/value-objects/Timestamp.js';
import { VenueId } from '../../domain/value-objects/VenueId.js';
import { AccessEventType } from '../../domain/enums/AccessEventType.js';
import { DeviceState } from '../../domain/enums/DeviceState.js';
import { v4 as uuidv4 } from 'uuid';

const FIRMWARE_VERSION = '1.4.2';
const DEFAULT_BATTERY_LEVEL = 0.87;
const DEFAULT_SIGNAL_STRENGTH = -65;

export class AccessControlService {
  private readonly validateTicketUseCase: ValidateTicketUseCase;
  private readonly checkVenueCapacityUseCase: CheckVenueCapacityUseCase;
  private readonly recordEntryUseCase: RecordEntryUseCase;

  constructor(
    ticketRepository: ITicketRepository,
    private readonly venueRepository: IVenueRepository,
    private readonly eventPublisher: IEventPublisher,
    private readonly logger: IAccessLogger,
  ) {
    this.validateTicketUseCase = new ValidateTicketUseCase(ticketRepository, logger);
    this.checkVenueCapacityUseCase = new CheckVenueCapacityUseCase(venueRepository, logger);
    this.recordEntryUseCase = new RecordEntryUseCase(
      ticketRepository,
      venueRepository,
      eventPublisher,
      logger,
    );
  }

  async processEntry(request: AccessRequestDTO): Promise<AccessResponseDTO> {
    this.logger.info('AccessControlService', 'Processing entry request', {
      ticketId: request.ticketId,
      venueId: request.venueId,
    });

    const ticketValidation = await this.validateTicketUseCase.execute(request.ticketId);

    if (!ticketValidation.isValid) {
      const denialEvent = await this.publishDenial(request, ticketValidation.reason, null);
      return this.buildDenialResponse(denialEvent, ticketValidation.reason, ticketValidation.error.message);
    }

    const capacityCheck = await this.checkVenueCapacityUseCase.execute(request.venueId);

    if (!capacityCheck.hasCapacity) {
      const denialEvent = await this.publishDenial(request, null, capacityCheck.venue.getCurrentOccupancy());
      return this.buildDenialResponse(denialEvent, null, 'VENUE_FULL');
    }

    const entryEvent = await this.recordEntryUseCase.execute({
      ticket: ticketValidation.ticket,
      venue: capacityCheck.venue,
      deviceId: request.deviceId,
      firmwareVersion: FIRMWARE_VERSION,
      batteryLevel: DEFAULT_BATTERY_LEVEL,
      signalStrength: DEFAULT_SIGNAL_STRENGTH,
    });

    return {
      result: 'GRANTED',
      eventType: AccessEventType.ENTRY,
      ticketStatus: entryEvent.getTicketStatus(),
      deviceState: DeviceState.GRANTED,
      currentOccupancy: entryEvent.getCurrentOccupancy(),
      maxCapacity: entryEvent.getMaxCapacity(),
      occupancyRate: entryEvent.getOccupancyRate(),
      reason: null,
      messageId: entryEvent.getMessageId(),
      timestamp: entryEvent.getTimestamp().toISO(),
    };
  }

  private async publishDenial(
    request: AccessRequestDTO,
    ticketStatus: import('../../domain/enums/TicketStatus.js').TicketStatus | null,
    currentOccupancy: number | null,
  ): Promise<AccessEvent> {
    const venueId = VenueId.create(request.venueId);
    const venue = await this.venueRepository.findById(venueId);
    const occupancy = currentOccupancy ?? venue?.getCurrentOccupancy() ?? 0;
    const maxCapacity = venue?.getMaxCapacity() ?? 0;
    const now = Timestamp.now();

    const denialEvent = AccessEvent.create({
      messageId: uuidv4(),
      deviceId: request.deviceId,
      venueId: request.venueId,
      exhibitionId: request.exhibitionId,
      timestamp: now,
      eventType: AccessEventType.DENIED,
      ticketId: request.ticketId,
      ticketStatus,
      currentOccupancy: occupancy,
      maxCapacity,
      state: DeviceState.DENIED,
      metadata: {
        firmwareVersion: FIRMWARE_VERSION,
        batteryLevel: DEFAULT_BATTERY_LEVEL,
        signalStrength: DEFAULT_SIGNAL_STRENGTH,
        retryCount: 0,
      },
    });

    await this.eventPublisher.publish(denialEvent);
    return denialEvent;
  }

  private buildDenialResponse(
    event: AccessEvent,
    ticketStatus: import('../../domain/enums/TicketStatus.js').TicketStatus | null,
    reason: string,
  ): AccessResponseDTO {
    return {
      result: 'DENIED',
      eventType: AccessEventType.DENIED,
      ticketStatus,
      deviceState: DeviceState.DENIED,
      currentOccupancy: event.getCurrentOccupancy(),
      maxCapacity: event.getMaxCapacity(),
      occupancyRate: event.getOccupancyRate(),
      reason,
      messageId: event.getMessageId(),
      timestamp: event.getTimestamp().toISO(),
    };
  }
}
