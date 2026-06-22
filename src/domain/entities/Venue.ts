import { VenueId } from '../value-objects/VenueId.js';

export interface VenueProps {
  id: VenueId;
  name: string;
  exhibitionId: string;
  maxCapacity: number;
  currentOccupancy: number;
}

export class Venue {
  private readonly props: VenueProps;

  private constructor(props: VenueProps) {
    this.props = props;
  }

  static create(
    id: VenueId,
    name: string,
    exhibitionId: string,
    maxCapacity: number,
  ): Venue {
    if (maxCapacity <= 0) {
      throw new Error('Venue maxCapacity must be greater than 0');
    }
    return new Venue({ id, name, exhibitionId, maxCapacity, currentOccupancy: 0 });
  }

  static reconstitute(props: VenueProps): Venue {
    return new Venue(props);
  }

  getId(): VenueId {
    return this.props.id;
  }

  getName(): string {
    return this.props.name;
  }

  getExhibitionId(): string {
    return this.props.exhibitionId;
  }

  getMaxCapacity(): number {
    return this.props.maxCapacity;
  }

  getCurrentOccupancy(): number {
    return this.props.currentOccupancy;
  }

  getOccupancyRate(): number {
    return this.props.currentOccupancy / this.props.maxCapacity;
  }

  isAtCapacity(): boolean {
    return this.props.currentOccupancy >= this.props.maxCapacity;
  }

  isNearCapacity(threshold: number = 0.95): boolean {
    return this.getOccupancyRate() >= threshold;
  }

  incrementOccupancy(): Venue {
    if (this.isAtCapacity()) {
      throw new Error('Cannot increment occupancy: venue is at full capacity');
    }
    return new Venue({
      ...this.props,
      currentOccupancy: this.props.currentOccupancy + 1,
    });
  }

  decrementOccupancy(): Venue {
    if (this.props.currentOccupancy <= 0) {
      throw new Error('Cannot decrement occupancy: venue is already empty');
    }
    return new Venue({
      ...this.props,
      currentOccupancy: this.props.currentOccupancy - 1,
    });
  }

  setOccupancy(count: number): Venue {
    if (count < 0 || count > this.props.maxCapacity) {
      throw new Error(`Invalid occupancy count: ${count}`);
    }
    return new Venue({ ...this.props, currentOccupancy: count });
  }
}
