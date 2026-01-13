import { Router } from 'express';
import * as tasksController from '../controllers/tasks';

const router = Router();

router.get('/tasks', tasksController.getTasks);
router.post('/run-task', tasksController.runTask);
router.post('/record', tasksController.recordTask);
router.post('/setup-login', tasksController.setupLogin);

export default router;
