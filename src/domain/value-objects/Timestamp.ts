export class Timestamp {
  private readonly value: Date;

  private constructor(value: Date) {
    this.value = value;
  }

  static now(): Timestamp {
    return new Timestamp(new Date());
  }

  static fromDate(date: Date): Timestamp {
    return new Timestamp(new Date(date));
  }

  static fromISO(iso: string): Timestamp {
    const date = new Date(iso);
    if (isNaN(date.getTime())) {
      throw new Error(`Invalid ISO date string: ${iso}`);
    }
    return new Timestamp(date);
  }

  getValue(): Date {
    return new Date(this.value);
  }

  toISO(): string {
    return this.value.toISOString();
  }

  isBefore(other: Timestamp): boolean {
    return this.value < other.value;
  }

  isAfter(other: Timestamp): boolean {
    return this.value > other.value;
  }
}
