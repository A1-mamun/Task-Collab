import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { DashboardService } from './dashboard.service';

const wrap = (fn: (userId: string, role: string, limit?: number) => Promise<unknown>, message: string) =>
  catchAsync(async (req, res) => {
    const { userId, role } = req.user;
    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    const result = await fn(userId, role, limit);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message,
      data: result,
    });
  });

const getOverview = wrap(
  (userId, role) => DashboardService.getOverview(userId, role),
  'Dashboard overview fetched successfully!',
);
const getKpis = wrap(
  (userId, role) => DashboardService.getKpis(userId, role),
  'KPIs fetched successfully!',
);
const getTasksByPriority = wrap(
  (userId, role) => DashboardService.getTasksByPriority(userId, role),
  'Tasks by priority fetched successfully!',
);
const getTaskStatusDistribution = wrap(
  (userId, role) => DashboardService.getTaskStatusDistribution(userId, role),
  'Task status distribution fetched successfully!',
);
const getProjectProgressTrend = wrap(
  (userId, role) => DashboardService.getProjectProgressTrend(userId, role),
  'Project progress trend fetched successfully!',
);
const getTeamProductivity = wrap(
  (userId, role) => DashboardService.getTeamProductivity(userId, role),
  'Team productivity fetched successfully!',
);
const getUpcomingDeadlines = wrap(
  (userId, role, limit) => DashboardService.getUpcomingDeadlines(userId, role, limit),
  'Upcoming deadlines fetched successfully!',
);
const getHighPriorityTasks = wrap(
  (userId, role, limit) => DashboardService.getHighPriorityTasks(userId, role, limit),
  'High priority tasks fetched successfully!',
);

export const DashboardController = {
  getOverview,
  getKpis,
  getTasksByPriority,
  getTaskStatusDistribution,
  getProjectProgressTrend,
  getTeamProductivity,
  getUpcomingDeadlines,
  getHighPriorityTasks,
};
