import { Router } from 'express';
import * as schedulerController from '../controllers/scheduler';
import { validateBody } from '../middleware/validate';
import { saveScheduleSchema } from '../validators';

const router = Router();

router.get('/scheduler/status', schedulerController.getStatus);
router.get('/scheduler/next-task', schedulerController.getNextTask);
router.post('/scheduler/start', schedulerController.start);
router.post('/scheduler/stop', schedulerController.stop);
router.get('/schedule', schedulerController.getSchedule);
router.post('/schedule', validateBody(saveScheduleSchema), schedulerController.saveSchedule);

export default router;
