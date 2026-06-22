import { AccessEventType } from '../enums/AccessEventType.js';
import { TicketStatus } from '../enums/TicketStatus.js';
import { DeviceState } from '../enums/DeviceState.js';
import { Timestamp } from '../value-objects/Timestamp.js';

export interface DeviceMetadata {
  firmwareVersion: string;
  batteryLevel: number;
  signalStrength: number;
  retryCount: number;
}

export interface AccessEventProps {
  messageId: string;
  deviceId: string;
  venueId: string;
  exhibitionId: string;
  timestamp: Timestamp;
  eventType: AccessEventType;
  ticketId: string | null;
  ticketStatus: TicketStatus | null;
  currentOccupancy: number;
  maxCapacity: number;
  state: DeviceState;
  metadata: DeviceMetadata;
}

export class AccessEvent {
  private readonly props: AccessEventProps;

  private constructor(props: AccessEventProps) {
    this.props = props;
  }

  static create(props: AccessEventProps): AccessEvent {
    return new AccessEvent(props);
  }

  getMessageId(): string {
    return this.props.messageId;
  }

  getDeviceId(): string {
    return this.props.deviceId;
  }

  getVenueId(): string {
    return this.props.venueId;
  }

  getExhibitionId(): string {
    return this.props.exhibitionId;
  }

  getTimestamp(): Timestamp {
    return this.props.timestamp;
  }

  getEventType(): AccessEventType {
    return this.props.eventType;
  }

  getTicketId(): string | null {
    return this.props.ticketId;
  }

  getTicketStatus(): TicketStatus | null {
    return this.props.ticketStatus;
  }

  getCurrentOccupancy(): number {
    return this.props.currentOccupancy;
  }

  getMaxCapacity(): number {
    return this.props.maxCapacity;
  }

  getOccupancyRate(): number {
    return this.props.currentOccupancy / this.props.maxCapacity;
  }

  getState(): DeviceState {
    return this.props.state;
  }

  getMetadata(): DeviceMetadata {
    return { ...this.props.metadata };
  }

  toJSON(): Record<string, unknown> {
    return {
      messageId: this.props.messageId,
      deviceId: this.props.deviceId,
      venueId: this.props.venueId,
      exhibitionId: this.props.exhibitionId,
      timestamp: this.props.timestamp.toISO(),
      eventType: this.props.eventType,
      ticketId: this.props.ticketId,
      ticketStatus: this.props.ticketStatus,
      currentOccupancy: this.props.currentOccupancy,
      maxCapacity: this.props.maxCapacity,
      occupancyRate: this.getOccupancyRate(),
      state: this.props.state,
      metadata: this.props.metadata,
    };
  }
}
