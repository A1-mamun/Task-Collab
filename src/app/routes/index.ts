import { Router } from 'express';
import { TestRoutes } from '../modules/test/test';
import { AuthRoutes } from '../modules/auth/auth.routes';
import { ProjectRoutes } from '../modules/project/project.routes';
import { TaskRoutes } from '../modules/task/task.routes';
import { CommentRoutes } from '../modules/comment/comment.routes';
import { DashboardRoutes } from '../modules/dashboard/dashboard.routes';
import { ActivityRoutes } from '../modules/activity/activity.routes';
import { NotificationRoutes } from '../modules/notification/notification.routes';

const router = Router();

const moduleRoutes = [
  {
    path: '/test',
    route: TestRoutes,
  },
  { path: '/auth', route: AuthRoutes },
  { path: '/projects', route: ProjectRoutes },
  { path: '/tasks', route: TaskRoutes },
  { path: '/comments', route: CommentRoutes },
  { path: '/dashboard', route: DashboardRoutes },
  { path: '/activities', route: ActivityRoutes },
  { path: '/notifications', route: NotificationRoutes },
];

moduleRoutes.forEach((route) => {
  router.use(route.path, route.route);
});

export default router;
