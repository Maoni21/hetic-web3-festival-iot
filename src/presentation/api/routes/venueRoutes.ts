import { Router } from 'express';
import { VenueController } from '../controllers/VenueController.js';

export function createVenueRouter(venueController: VenueController): Router {
  const router = Router();

  router.get('/:venueId/stats', (req, res) => {
    venueController.getAttendanceStats(req, res).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : 'Internal server error';
      res.status(500).json({ error: message });
    });
  });

  return router;
}
