import { DomainError } from './DomainError.js';

export class VenueAtCapacityError extends DomainError {
  readonly code = 'VENUE_AT_CAPACITY';

  constructor(venueId: string, maxCapacity: number) {
    super(`Venue ${venueId} has reached its maximum capacity of ${maxCapacity} visitors`);
  }
}
