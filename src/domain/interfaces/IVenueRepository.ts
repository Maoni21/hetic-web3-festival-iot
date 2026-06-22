import { Venue } from '../entities/Venue.js';
import { VenueId } from '../value-objects/VenueId.js';

export interface IVenueRepository {
  findById(venueId: VenueId): Promise<Venue | null>;
  save(venue: Venue): Promise<void>;
}
