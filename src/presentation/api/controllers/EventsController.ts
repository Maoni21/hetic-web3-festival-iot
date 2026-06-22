import { Request, Response } from 'express';
import { AccessControlService } from '../../../application/services/AccessControlService.js';
import { AttendanceTrackingService } from '../../../application/services/AttendanceTrackingService.js';
import { IAccessLogger } from '../../../domain/interfaces/IAccessLogger.js';

export class EventsController {
  constructor(
    private readonly accessControlService: AccessControlService,
    private readonly attendanceTrackingService: AttendanceTrackingService,
    private readonly logger: IAccessLogger,
  ) {}

  async processEntry(request: Request, response: Response): Promise<void> {
    const { ticketId, deviceId, venueId, exhibitionId } = request.body as {
      ticketId?: unknown;
      deviceId?: unknown;
      venueId?: unknown;
      exhibitionId?: unknown;
    };

    if (
      typeof ticketId !== 'string' ||
      typeof deviceId !== 'string' ||
      typeof venueId !== 'string' ||
      typeof exhibitionId !== 'string'
    ) {
      response.status(400).json({ error: 'Missing required fields: ticketId, deviceId, venueId, exhibitionId' });
      return;
    }

    const result = await this.accessControlService.processEntry({
      ticketId,
      deviceId,
      venueId,
      exhibitionId,
    });

    const statusCode = result.result === 'GRANTED' ? 200 : 403;
    response.status(statusCode).json(result);
  }

  async processExit(request: Request, response: Response): Promise<void> {
    const { venueId, deviceId, ticketId } = request.body as {
      venueId?: unknown;
      deviceId?: unknown;
      ticketId?: unknown;
    };

    if (typeof venueId !== 'string' || typeof deviceId !== 'string') {
      response.status(400).json({ error: 'Missing required fields: venueId, deviceId' });
      return;
    }

    const resolvedTicketId = typeof ticketId === 'string' ? ticketId : null;
    const event = await this.attendanceTrackingService.processExit(venueId, deviceId, resolvedTicketId);

    this.logger.info('EventsController', 'Exit processed via API', { venueId });
    response.status(200).json({ success: true, event: event.toJSON() });
  }
}
