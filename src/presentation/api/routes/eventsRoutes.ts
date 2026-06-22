import { Router } from 'express';
import { EventsController } from '../controllers/EventsController.js';

export function createEventsRouter(eventsController: EventsController): Router {
  const router = Router();

  router.post('/entry', (req, res) => {
    eventsController.processEntry(req, res).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : 'Internal server error';
      res.status(500).json({ error: message });
    });
  });

  router.post('/exit', (req, res) => {
    eventsController.processExit(req, res).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : 'Internal server error';
      res.status(500).json({ error: message });
    });
  });

  return router;
}
