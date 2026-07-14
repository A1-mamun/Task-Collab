import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import prisma from '../../utils/prisma';
import calculatePagination from '../../utils/calculatePagination';
import { TPaginationOptions } from '../../interface/pagination';

const getMyNotifications = async (
  userId: string,
  paginationOptions: TPaginationOptions,
  unreadOnly?: boolean,
) => {
  const { page, limit, skip, sortBy, sortOrder } = calculatePagination(paginationOptions);

  const where = { userId, ...(unreadOnly ? { isRead: false } : {}) };

  const [notifications, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { userId, isRead: false } }),
  ]);

  return { meta: { page, limit, total, unreadCount }, data: notifications };
};

const markAsRead = async (userId: string, notificationId: string) => {
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
  });

  if (!notification || notification.userId !== userId) {
    throw new AppError(httpStatus.NOT_FOUND, 'Notification not found');
  }

  return prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: true },
  });
};

const markAllAsRead = async (userId: string) => {
  return prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });
};

export const NotificationService = {
  getMyNotifications,
  markAsRead,
  markAllAsRead,
};
