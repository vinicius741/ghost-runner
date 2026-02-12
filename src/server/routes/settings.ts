import { Router } from 'express';
import * as settingsController from '../controllers/settings';
import { validateBody } from '../middleware/validate';
import { saveSettingsSchema } from '../validators';

const router = Router();

router.get('/settings', settingsController.getSettings);
router.post('/settings', validateBody(saveSettingsSchema), settingsController.saveSettings);

export default router;
