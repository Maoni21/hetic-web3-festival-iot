export class TicketId {
  private readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  static create(value: string): TicketId {
    if (!value || value.trim().length === 0) {
      throw new Error('TicketId cannot be empty');
    }
    return new TicketId(value.trim());
  }

  getValue(): string {
    return this.value;
  }

  equals(other: TicketId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
