import { Router } from 'express';
import Auth from '../../middlewares/auth';
import { ActivityController } from './activity.controller';

const router = Router();

router.get('/', Auth(), ActivityController.getRecentActivities);

export const ActivityRoutes = router;
