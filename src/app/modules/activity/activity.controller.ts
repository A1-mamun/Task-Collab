import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { ActivityService } from './activity.service';

const getRecentActivities = catchAsync(async (req, res) => {
  const { userId, role } = req.user;
  const { projectId, limit } = req.query;

  const result = await ActivityService.getRecentActivities(
    userId,
    role,
    projectId as string | undefined,
    limit ? Number(limit) : 10,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Recent activities fetched successfully!',
    data: result,
  });
});

export const ActivityController = {
  getRecentActivities,
};
