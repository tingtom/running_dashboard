import { Router } from 'express';
import { getDatabase } from '../services/database.service';

const router = Router();
const db = getDatabase();

// GET /api/custom-events?startDate=...&endDate=...&limit=...&offset=...
router.get('/', (req, res) => {
  try {
    const events = db.getCustomEvents({
      startDate: req.query.startDate as string | undefined,
      endDate: req.query.endDate as string | undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset as string) : undefined,
      sortBy: req.query.sortBy as string | undefined,
      sortOrder: req.query.sortOrder as 'asc' | 'desc' | undefined
    });
    res.json(events);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/custom-events/:id
router.get('/:id', (req, res) => {
  try {
    const event = db.getCustomEvent(parseInt(req.params.id));
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    res.json(event);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/custom-events
router.post('/', (req, res) => {
  try {
    const { date, title, description } = req.body;
    if (!date || !title) {
      return res.status(400).json({ error: 'Date and title are required' });
    }
    const id = db.insertCustomEvent({ date, title, description });
    const event = db.getCustomEvent(id);
    res.status(201).json(event);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/custom-events/:id
router.put('/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { date, title, description } = req.body;
    const success = db.updateCustomEvent(id, { date, title, description });
    if (!success) {
      return res.status(404).json({ error: 'Event not found or no changes provided' });
    }
    const event = db.getCustomEvent(id);
    res.json(event);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/custom-events/:id
router.delete('/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const success = db.deleteCustomEvent(id);
    if (!success) {
      return res.status(404).json({ error: 'Event not found' });
    }
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
