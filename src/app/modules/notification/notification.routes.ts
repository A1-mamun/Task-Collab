import { Router } from 'express';
import Auth from '../../middlewares/auth';
import { NotificationController } from './notification.controller';

const router = Router();

router.get('/', Auth(), NotificationController.getMyNotifications);
router.patch('/read-all', Auth(), NotificationController.markAllAsRead);
router.patch('/:notificationId/read', Auth(), NotificationController.markAsRead);

export const NotificationRoutes = router;
