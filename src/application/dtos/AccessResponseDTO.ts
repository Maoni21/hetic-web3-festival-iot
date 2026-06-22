import { AccessEventType } from '../../domain/enums/AccessEventType.js';
import { TicketStatus } from '../../domain/enums/TicketStatus.js';
import { DeviceState } from '../../domain/enums/DeviceState.js';

export type AccessResult = 'GRANTED' | 'DENIED' | 'ERROR';

export interface AccessResponseDTO {
  result: AccessResult;
  eventType: AccessEventType;
  ticketStatus: TicketStatus | null;
  deviceState: DeviceState;
  currentOccupancy: number;
  maxCapacity: number;
  occupancyRate: number;
  reason: string | null;
  messageId: string;
  timestamp: string;
}
