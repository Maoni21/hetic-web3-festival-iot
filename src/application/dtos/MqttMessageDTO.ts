import { AccessEventType } from '../../domain/enums/AccessEventType.js';
import { TicketStatus } from '../../domain/enums/TicketStatus.js';
import { DeviceState } from '../../domain/enums/DeviceState.js';

export interface MqttDeviceMetadataDTO {
  firmwareVersion: string;
  batteryLevel: number;
  signalStrength: number;
  retryCount: number;
}

export interface MqttMessageDTO {
  messageId: string;
  deviceId: string;
  venueId: string;
  exhibitionId: string;
  timestamp: string;
  eventType: AccessEventType;
  ticketId: string | null;
  ticketStatus: TicketStatus | null;
  currentOccupancy: number;
  maxCapacity: number;
  occupancyRate: number;
  state: DeviceState;
  metadata: MqttDeviceMetadataDTO;
}
