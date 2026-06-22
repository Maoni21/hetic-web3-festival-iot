import { IVenueRepository } from '../../domain/interfaces/IVenueRepository.js';
import { Venue } from '../../domain/entities/Venue.js';
import { VenueId } from '../../domain/value-objects/VenueId.js';

export class InMemoryVenueRepository implements IVenueRepository {
  private readonly store: Map<string, Venue> = new Map();

  async findById(venueId: VenueId): Promise<Venue | null> {
    return this.store.get(venueId.getValue()) ?? null;
  }

  async save(venue: Venue): Promise<void> {
    this.store.set(venue.getId().getValue(), venue);
  }

  seedVenues(venues: Venue[]): void {
    venues.forEach((venue) => {
      this.store.set(venue.getId().getValue(), venue);
    });
  }

  getAll(): Venue[] {
    return Array.from(this.store.values());
  }
}
