import { DomainError } from './DomainError.js';

export class TicketExpiredError extends DomainError {
  readonly code = 'TICKET_EXPIRED';

  constructor(ticketId: string) {
    super(`Ticket ${ticketId} has expired`);
  }
}
