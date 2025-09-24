import { Router } from 'express';

const router = Router();

// GET /rooms - List all rooms
router.get('/', (req, res) => {
  res.json({
    success: true,
    data: {
      rooms: [],
      total: 0,
    },
  });
});

// POST /rooms - Create a new room
router.post('/', (req, res) => {
  res.json({
    success: true,
    data: {
      id: 'room_' + Date.now(),
      name: req.body.name || 'New Room',
      type: req.body.type || 'planning-poker',
      createdAt: new Date().toISOString(),
    },
  });
});

// GET /rooms/:id - Get room by ID
router.get('/:id', (req, res) => {
  res.json({
    success: true,
    data: {
      id: req.params.id,
      name: 'Room ' + req.params.id,
      type: 'planning-poker',
      participants: [],
    },
  });
});

export default router;