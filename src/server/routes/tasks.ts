import { Router } from 'express';
import * as tasksController from '../controllers/tasks';
import { validateBody } from '../middleware/validate';
import { runTaskSchema, recordTaskSchema } from '../validators';

const router = Router();

router.get('/tasks', tasksController.getTasks);
router.post('/run-task', validateBody(runTaskSchema), tasksController.runTask);
router.post('/record', validateBody(recordTaskSchema), tasksController.recordTask);
router.post('/setup-login', tasksController.setupLogin);

export default router;
