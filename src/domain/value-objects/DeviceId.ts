export class DeviceId {
  private readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  static create(value: string): DeviceId {
    if (!value || value.trim().length === 0) {
      throw new Error('DeviceId cannot be empty');
    }
    return new DeviceId(value.trim());
  }

  getValue(): string {
    return this.value;
  }

  equals(other: DeviceId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
