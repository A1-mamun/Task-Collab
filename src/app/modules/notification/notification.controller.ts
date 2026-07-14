import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import pick from '../../utils/pick';
import { paginationFields } from '../../constant/pagination';
import { NotificationService } from './notification.service';

const getMyNotifications = catchAsync(async (req, res) => {
  const { userId } = req.user;
  const paginationOptions = pick(req.query, paginationFields);
  const unreadOnly = req.query.unreadOnly === 'true';

  const result = await NotificationService.getMyNotifications(
    userId,
    paginationOptions,
    unreadOnly,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Notifications fetched successfully!',
    meta: result.meta,
    data: result.data,
  });
});

const markAsRead = catchAsync(async (req, res) => {
  const { userId } = req.user;
  const { notificationId } = req.params;

  const result = await NotificationService.markAsRead(userId, notificationId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Notification marked as read',
    data: result,
  });
});

const markAllAsRead = catchAsync(async (req, res) => {
  const { userId } = req.user;

  const result = await NotificationService.markAllAsRead(userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'All notifications marked as read',
    data: result,
  });
});

export const NotificationController = {
  getMyNotifications,
  markAsRead,
  markAllAsRead,
};
