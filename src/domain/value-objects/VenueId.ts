export class VenueId {
  private readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  static create(value: string): VenueId {
    if (!value || value.trim().length === 0) {
      throw new Error('VenueId cannot be empty');
    }
    return new VenueId(value.trim());
  }

  getValue(): string {
    return this.value;
  }

  equals(other: VenueId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
