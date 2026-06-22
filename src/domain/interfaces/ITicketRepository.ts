import { Ticket } from '../entities/Ticket.js';
import { TicketId } from '../value-objects/TicketId.js';

export interface ITicketRepository {
  findById(ticketId: TicketId): Promise<Ticket | null>;
  save(ticket: Ticket): Promise<void>;
  exists(ticketId: TicketId): Promise<boolean>;
}
