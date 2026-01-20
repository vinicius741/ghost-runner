import { Router, Request, Response, NextFunction } from 'express';
import * as infoGatheringController from '../controllers/infoGathering';

const router = Router();

/**
 * Async handler wrapper to catch errors and pass to next().
 */
const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
};

/**
 * GET /api/info-gathering
 * Returns all task results, filtering out expired entries.
 */
router.get('/info-gathering', asyncHandler(async (req, res) => {
  await infoGatheringController.getInfoGatheringData(req, res);
}));

/**
 * DELETE /api/info-gathering/:taskName
 * Clears a specific task result.
 */
router.delete('/info-gathering/:taskName', asyncHandler(async (req, res) => {
  await infoGatheringController.clearTaskResult(req, res);
}));

/**
 * DELETE /api/info-gathering
 * Clears all task results.
 */
router.delete('/info-gathering', asyncHandler(async (req, res) => {
  await infoGatheringController.clearAllResults(req, res);
}));

export default router;
