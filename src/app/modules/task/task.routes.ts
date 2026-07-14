import { Router } from 'express';
import Auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { USER_ROLE } from '../../constant/userConstant';
import { TaskValidation } from './task.validation';
import { TaskController } from './task.controller';

const router = Router();

router.post(
  '/',
  Auth(USER_ROLE.ADMIN, USER_ROLE.PROJECT_MANAGER),
  validateRequest(TaskValidation.CreateTaskSchema),
  TaskController.createTask,
);

router.get('/', Auth(), TaskController.getAllTasks);

router.patch(
  '/bulk-status',
  Auth(),
  validateRequest(TaskValidation.BulkUpdateStatusSchema),
  TaskController.bulkUpdateStatus,
);

router.get(
  '/:taskId',
  Auth(),
  validateRequest(TaskValidation.TaskIdParamSchema),
  TaskController.getTaskById,
);

router.patch(
  '/:taskId',
  Auth(USER_ROLE.ADMIN, USER_ROLE.PROJECT_MANAGER),
  validateRequest(TaskValidation.UpdateTaskSchema),
  TaskController.updateTask,
);

// Any project member can move their own assigned task's status.
router.patch(
  '/:taskId/status',
  Auth(),
  validateRequest(TaskValidation.ChangeTaskStatusSchema),
  TaskController.changeTaskStatus,
);

router.delete(
  '/:taskId',
  Auth(USER_ROLE.ADMIN, USER_ROLE.PROJECT_MANAGER),
  validateRequest(TaskValidation.TaskIdParamSchema),
  TaskController.deleteTask,
);

export const TaskRoutes = router;
