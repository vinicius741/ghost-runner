import { Router } from 'express';
import * as logsController from '../controllers/logs';

const router = Router();

router.get('/logs', logsController.getLogs);

export default router;
