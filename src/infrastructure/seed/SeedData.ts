import { Ticket } from '../../domain/entities/Ticket.js';
import { Venue } from '../../domain/entities/Venue.js';
import { TicketId } from '../../domain/value-objects/TicketId.js';
import { VenueId } from '../../domain/value-objects/VenueId.js';
import { TicketStatus } from '../../domain/enums/TicketStatus.js';
import { Timestamp } from '../../domain/value-objects/Timestamp.js';
import { InMemoryTicketRepository } from '../repositories/InMemoryTicketRepository.js';
import { InMemoryVenueRepository } from '../repositories/InMemoryVenueRepository.js';

const EXHIBITION_ID = 'expo-cartier-bresson-2026';
const EXPIRY_DATE = new Date('2026-12-31T23:59:59Z');

export function seedTickets(repository: InMemoryTicketRepository): void {
  const tickets: Ticket[] = [
    Ticket.create(
      TicketId.create('TKT-2026-VALID-001'),
      EXHIBITION_ID,
      Timestamp.fromDate(EXPIRY_DATE),
    ),
    Ticket.create(
      TicketId.create('TKT-2026-VALID-002'),
      EXHIBITION_ID,
      Timestamp.fromDate(EXPIRY_DATE),
    ),
    Ticket.create(
      TicketId.create('TKT-2026-VALID-003'),
      EXHIBITION_ID,
      Timestamp.fromDate(EXPIRY_DATE),
    ),
    Ticket.create(
      TicketId.create('TKT-2026-VALID-099'),
      EXHIBITION_ID,
      Timestamp.fromDate(EXPIRY_DATE),
    ),
    Ticket.reconstitute({
      id: TicketId.create('TKT-2026-USED-042'),
      status: TicketStatus.USED,
      exhibitionId: EXHIBITION_ID,
      expiresAt: Timestamp.fromDate(EXPIRY_DATE),
      usedAt: Timestamp.fromISO('2026-07-04T10:00:00Z'),
    }),
    Ticket.reconstitute({
      id: TicketId.create('TKT-2026-EXPIRED-010'),
      status: TicketStatus.EXPIRED,
      exhibitionId: EXHIBITION_ID,
      expiresAt: Timestamp.fromISO('2025-01-01T00:00:00Z'),
      usedAt: null,
    }),
  ];

  repository.seedTickets(tickets);
}

export function seedVenues(repository: InMemoryVenueRepository): void {
  const venues: Venue[] = [
    Venue.create(
      VenueId.create('venue-grand-palais'),
      'Grand Palais — Salle principale',
      EXHIBITION_ID,
      500,
    ),
    Venue.create(
      VenueId.create('venue-galerie-nord'),
      'Galerie Nord',
      EXHIBITION_ID,
      150,
    ),
  ];

  repository.seedVenues(venues);
}
