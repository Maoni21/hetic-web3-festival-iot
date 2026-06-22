import { DomainError } from './DomainError.js';

export class TicketAlreadyUsedError extends DomainError {
  readonly code = 'TICKET_ALREADY_USED';

  constructor(ticketId: string) {
    super(`Ticket ${ticketId} has already been used`);
  }
}
