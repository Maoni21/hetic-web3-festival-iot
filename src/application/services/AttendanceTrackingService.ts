import { IVenueRepository } from '../../domain/interfaces/IVenueRepository.js';
import { IEventPublisher } from '../../domain/interfaces/IEventPublisher.js';
import { IAccessLogger } from '../../domain/interfaces/IAccessLogger.js';
import { RecordExitUseCase } from '../use-cases/RecordExitUseCase.js';
import { VenueId } from '../../domain/value-objects/VenueId.js';
import { AccessEvent } from '../../domain/entities/AccessEvent.js';

export interface AttendanceStats {
  venueId: string;
  currentOccupancy: number;
  maxCapacity: number;
  occupancyRate: number;
  isNearCapacity: boolean;
  isAtCapacity: boolean;
}

export class AttendanceTrackingService {
  private readonly recordExitUseCase: RecordExitUseCase;

  constructor(
    private readonly venueRepository: IVenueRepository,
    eventPublisher: IEventPublisher,
    private readonly logger: IAccessLogger,
  ) {
    this.recordExitUseCase = new RecordExitUseCase(venueRepository, eventPublisher, logger);
  }

  async processExit(
    venueId: string,
    deviceId: string,
    ticketId: string | null,
  ): Promise<AccessEvent> {
    const venueIdObject = VenueId.create(venueId);
    const venue = await this.venueRepository.findById(venueIdObject);

    if (venue === null) {
      throw new Error(`Venue ${venueId} not found`);
    }

    return this.recordExitUseCase.execute({
      venue,
      deviceId,
      ticketId,
      firmwareVersion: '1.4.2',
      batteryLevel: 0.87,
      signalStrength: -65,
    });
  }

  async getAttendanceStats(venueId: string): Promise<AttendanceStats> {
    const venueIdObject = VenueId.create(venueId);
    const venue = await this.venueRepository.findById(venueIdObject);

    if (venue === null) {
      throw new Error(`Venue ${venueId} not found`);
    }

    this.logger.debug('AttendanceTrackingService', 'Attendance stats requested', {
      venueId,
      occupancyRate: venue.getOccupancyRate(),
    });

    return {
      venueId: venue.getId().getValue(),
      currentOccupancy: venue.getCurrentOccupancy(),
      maxCapacity: venue.getMaxCapacity(),
      occupancyRate: venue.getOccupancyRate(),
      isNearCapacity: venue.isNearCapacity(),
      isAtCapacity: venue.isAtCapacity(),
    };
  }
}
