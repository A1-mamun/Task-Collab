import { Router } from 'express';

const router = Router();

router.get('/', async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Route is working!',
    });
  } catch {
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
    });
  }
});

export const TestRoutes = router;
