import { Router } from 'express';
import { TestRoutes } from '../modules/test/test';

const router = Router();

const moduleRoutes = [
  {
    path: '/test',
    route: TestRoutes,
  },
];

moduleRoutes.forEach((route) => {
  router.use(route.path, route.route);
});

export default router;
