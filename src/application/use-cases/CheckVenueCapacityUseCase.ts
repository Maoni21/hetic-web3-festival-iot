import { IVenueRepository } from '../../domain/interfaces/IVenueRepository.js';
import { IAccessLogger } from '../../domain/interfaces/IAccessLogger.js';
import { VenueId } from '../../domain/value-objects/VenueId.js';
import { Venue } from '../../domain/entities/Venue.js';
import { VenueAtCapacityError } from '../../domain/errors/VenueAtCapacityError.js';

export type CapacityCheckResult =
  | { hasCapacity: true; venue: Venue }
  | { hasCapacity: false; venue: Venue; error: VenueAtCapacityError };

export class CheckVenueCapacityUseCase {
  constructor(
    private readonly venueRepository: IVenueRepository,
    private readonly logger: IAccessLogger,
  ) {}

  async execute(rawVenueId: string): Promise<CapacityCheckResult> {
    const venueId = VenueId.create(rawVenueId);
    const venue = await this.venueRepository.findById(venueId);

    if (venue === null) {
      throw new Error(`Venue ${rawVenueId} not found`);
    }

    if (venue.isAtCapacity()) {
      const capacityError = new VenueAtCapacityError(rawVenueId, venue.getMaxCapacity());
      this.logger.warn('CheckVenueCapacityUseCase', capacityError.message, {
        venueId: rawVenueId,
        currentOccupancy: venue.getCurrentOccupancy(),
        maxCapacity: venue.getMaxCapacity(),
      });
      return { hasCapacity: false, venue, error: capacityError };
    }

    this.logger.info('CheckVenueCapacityUseCase', 'Venue has capacity', {
      venueId: rawVenueId,
      occupancyRate: venue.getOccupancyRate(),
    });

    return { hasCapacity: true, venue };
  }
}
