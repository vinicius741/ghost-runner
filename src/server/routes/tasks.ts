import { Router } from 'express';
import * as tasksController from '../controllers/tasks';
import { validateBody } from '../middleware/validate';
import { runTaskSchema, recordTaskSchema, uploadTaskSchema } from '../validators';

const router = Router();

router.get('/tasks', tasksController.getTasks);
router.get('/tasks/:taskName/source', tasksController.getTaskSource);
router.post('/run-task', validateBody(runTaskSchema), tasksController.runTask);
router.post('/record', validateBody(recordTaskSchema), tasksController.recordTask);
router.post('/setup-login', tasksController.setupLogin);
router.post('/upload-task', validateBody(uploadTaskSchema), tasksController.uploadTask);

export const tasksRoutes = router;
export default router;
