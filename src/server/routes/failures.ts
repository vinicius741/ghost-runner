import { Router, Request, Response } from 'express';
import * as failuresController from '../controllers/failures';

const router = Router();

/**
 * GET /api/failures
 * Returns all failure records.
 */
router.get('/failures', async (req: Request, res: Response) => {
  try {
    const result = await failuresController.getFailuresHandler();
    res.json(result);
  } catch (error) {
    console.error('Error getting failures:', error);
    res.status(500).json({ error: 'Failed to get failures.' });
  }
});

/**
 * DELETE /api/failures
 * Clears all failure records.
 */
router.delete('/failures', async (req: Request, res: Response) => {
  try {
    const io = req.app.get('io');
    const result = await failuresController.clearFailuresHandler(io);
    res.json(result);
  } catch (error) {
    console.error('Error clearing failures:', error);
    res.status(500).json({ error: 'Failed to clear failures.' });
  }
});

/**
 * POST /api/failures/:id/dismiss
 * Dismisses a specific failure by ID.
 */
router.post('/failures/:id/dismiss', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const io = req.app.get('io');
    const result = await failuresController.dismissFailureHandler(id, io);
    if (!result.success) {
      res.status(404).json(result);
    } else {
      res.json(result);
    }
  } catch (error) {
    console.error('Error dismissing failure:', error);
    res.status(500).json({ error: 'Failed to dismiss failure.' });
  }
});

export default router;
