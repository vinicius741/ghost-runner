import { Router } from 'express';
import * as settingsController from '../controllers/settings';

const router = Router();

router.get('/settings', settingsController.getSettings);
router.post('/settings', settingsController.saveSettings);

export default router;
