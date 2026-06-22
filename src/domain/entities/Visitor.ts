import { TicketId } from '../value-objects/TicketId.js';
import { Timestamp } from '../value-objects/Timestamp.js';

export interface VisitorProps {
  id: string;
  ticketId: TicketId;
  enteredAt: Timestamp | null;
  exitedAt: Timestamp | null;
}

export class Visitor {
  private readonly props: VisitorProps;

  private constructor(props: VisitorProps) {
    this.props = props;
  }

  static create(id: string, ticketId: TicketId): Visitor {
    return new Visitor({ id, ticketId, enteredAt: null, exitedAt: null });
  }

  getId(): string {
    return this.props.id;
  }

  getTicketId(): TicketId {
    return this.props.ticketId;
  }

  getEnteredAt(): Timestamp | null {
    return this.props.enteredAt;
  }

  getExitedAt(): Timestamp | null {
    return this.props.exitedAt;
  }

  isInsideVenue(): boolean {
    return this.props.enteredAt !== null && this.props.exitedAt === null;
  }

  recordEntry(timestamp: Timestamp): Visitor {
    return new Visitor({ ...this.props, enteredAt: timestamp });
  }

  recordExit(timestamp: Timestamp): Visitor {
    return new Visitor({ ...this.props, exitedAt: timestamp });
  }
}
