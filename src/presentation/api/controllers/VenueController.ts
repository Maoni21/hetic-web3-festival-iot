import { Request, Response } from 'express';
import { AttendanceTrackingService } from '../../../application/services/AttendanceTrackingService.js';
import { IAccessLogger } from '../../../domain/interfaces/IAccessLogger.js';

export class VenueController {
  constructor(
    private readonly attendanceTrackingService: AttendanceTrackingService,
    private readonly logger: IAccessLogger,
  ) {}

  async getAttendanceStats(request: Request, response: Response): Promise<void> {
    const { venueId } = request.params as { venueId?: string };

    if (typeof venueId !== 'string' || venueId.trim().length === 0) {
      response.status(400).json({ error: 'Missing venueId parameter' });
      return;
    }

    const stats = await this.attendanceTrackingService.getAttendanceStats(venueId);

    this.logger.debug('VenueController', 'Attendance stats retrieved', { venueId });
    response.status(200).json(stats);
  }
}
