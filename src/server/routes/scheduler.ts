import { Router } from 'express';
import * as schedulerController from '../controllers/scheduler';

const router = Router();

router.get('/scheduler/status', schedulerController.getStatus);
router.get('/scheduler/next-task', schedulerController.getNextTask);
router.post('/scheduler/start', schedulerController.start);
router.post('/scheduler/stop', schedulerController.stop);
router.get('/schedule', schedulerController.getSchedule);
router.post('/schedule', schedulerController.saveSchedule);

export default router;
