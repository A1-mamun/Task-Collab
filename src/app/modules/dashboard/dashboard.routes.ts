import { Router } from 'express';
import Auth from '../../middlewares/auth';
import { DashboardController } from './dashboard.controller';

const router = Router();

router.get('/overview', Auth(), DashboardController.getOverview);
router.get('/kpis', Auth(), DashboardController.getKpis);
router.get('/tasks-by-priority', Auth(), DashboardController.getTasksByPriority);
router.get('/task-status-distribution', Auth(), DashboardController.getTaskStatusDistribution);
router.get('/project-progress-trend', Auth(), DashboardController.getProjectProgressTrend);
router.get('/team-productivity', Auth(), DashboardController.getTeamProductivity);
router.get('/upcoming-deadlines', Auth(), DashboardController.getUpcomingDeadlines);
router.get('/high-priority-tasks', Auth(), DashboardController.getHighPriorityTasks);

export const DashboardRoutes = router;
