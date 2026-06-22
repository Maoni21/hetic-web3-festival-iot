import { TicketId } from '../value-objects/TicketId.js';
import { Timestamp } from '../value-objects/Timestamp.js';
import { TicketStatus } from '../enums/TicketStatus.js';

export interface TicketProps {
  id: TicketId;
  status: TicketStatus;
  exhibitionId: string;
  expiresAt: Timestamp;
  usedAt: Timestamp | null;
}

export class Ticket {
  private readonly props: TicketProps;

  private constructor(props: TicketProps) {
    this.props = props;
  }

  static create(
    id: TicketId,
    exhibitionId: string,
    expiresAt: Timestamp,
  ): Ticket {
    return new Ticket({
      id,
      status: TicketStatus.VALID,
      exhibitionId,
      expiresAt,
      usedAt: null,
    });
  }

  static reconstitute(props: TicketProps): Ticket {
    return new Ticket(props);
  }

  getId(): TicketId {
    return this.props.id;
  }

  getStatus(): TicketStatus {
    return this.props.status;
  }

  getExhibitionId(): string {
    return this.props.exhibitionId;
  }

  getExpiresAt(): Timestamp {
    return this.props.expiresAt;
  }

  getUsedAt(): Timestamp | null {
    return this.props.usedAt;
  }

  isValid(): boolean {
    return this.props.status === TicketStatus.VALID;
  }

  isExpired(now: Timestamp): boolean {
    return now.isAfter(this.props.expiresAt);
  }

  isAlreadyUsed(): boolean {
    return this.props.status === TicketStatus.USED;
  }

  markAsUsed(timestamp: Timestamp): Ticket {
    return new Ticket({
      ...this.props,
      status: TicketStatus.USED,
      usedAt: timestamp,
    });
  }

  markAsExpired(): Ticket {
    return new Ticket({ ...this.props, status: TicketStatus.EXPIRED });
  }

  markAsInvalid(): Ticket {
    return new Ticket({ ...this.props, status: TicketStatus.INVALID });
  }
}
