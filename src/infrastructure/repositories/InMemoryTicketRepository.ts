import { ITicketRepository } from '../../domain/interfaces/ITicketRepository.js';
import { Ticket } from '../../domain/entities/Ticket.js';
import { TicketId } from '../../domain/value-objects/TicketId.js';

export class InMemoryTicketRepository implements ITicketRepository {
  private readonly store: Map<string, Ticket> = new Map();

  async findById(ticketId: TicketId): Promise<Ticket | null> {
    return this.store.get(ticketId.getValue()) ?? null;
  }

  async save(ticket: Ticket): Promise<void> {
    this.store.set(ticket.getId().getValue(), ticket);
  }

  async exists(ticketId: TicketId): Promise<boolean> {
    return this.store.has(ticketId.getValue());
  }

  seedTickets(tickets: Ticket[]): void {
    tickets.forEach((ticket) => {
      this.store.set(ticket.getId().getValue(), ticket);
    });
  }

  count(): number {
    return this.store.size;
  }
}
