import { ITicketRepository } from '../../domain/interfaces/ITicketRepository.js';
import { IAccessLogger } from '../../domain/interfaces/IAccessLogger.js';
import { TicketId } from '../../domain/value-objects/TicketId.js';
import { Timestamp } from '../../domain/value-objects/Timestamp.js';
import { Ticket } from '../../domain/entities/Ticket.js';
import { TicketStatus } from '../../domain/enums/TicketStatus.js';
import { TicketAlreadyUsedError } from '../../domain/errors/TicketAlreadyUsedError.js';
import { TicketExpiredError } from '../../domain/errors/TicketExpiredError.js';

export type TicketValidationResult =
  | { isValid: true; ticket: Ticket }
  | { isValid: false; reason: TicketStatus; error: Error };

export class ValidateTicketUseCase {
  constructor(
    private readonly ticketRepository: ITicketRepository,
    private readonly logger: IAccessLogger,
  ) {}

  async execute(rawTicketId: string): Promise<TicketValidationResult> {
    const ticketId = TicketId.create(rawTicketId);

    const ticket = await this.ticketRepository.findById(ticketId);

    if (ticket === null) {
      this.logger.warn('ValidateTicketUseCase', 'Ticket not found', { ticketId: rawTicketId });
      return {
        isValid: false,
        reason: TicketStatus.INVALID,
        error: new Error(`Ticket ${rawTicketId} not found`),
      };
    }

    const now = Timestamp.now();

    if (ticket.isAlreadyUsed()) {
      const usedError = new TicketAlreadyUsedError(rawTicketId);
      this.logger.warn('ValidateTicketUseCase', usedError.message, { ticketId: rawTicketId });
      return { isValid: false, reason: TicketStatus.USED, error: usedError };
    }

    if (ticket.isExpired(now)) {
      const expiredError = new TicketExpiredError(rawTicketId);
      this.logger.warn('ValidateTicketUseCase', expiredError.message, { ticketId: rawTicketId });
      const expiredTicket = ticket.markAsExpired();
      await this.ticketRepository.save(expiredTicket);
      return { isValid: false, reason: TicketStatus.EXPIRED, error: expiredError };
    }

    this.logger.info('ValidateTicketUseCase', 'Ticket is valid', { ticketId: rawTicketId });
    return { isValid: true, ticket };
  }
}
