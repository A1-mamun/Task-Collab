import { NotificationType } from '@prisma/client';
import prisma from './prisma';

type TNotifyInput = {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  relatedProjectId?: string | null;
  relatedTaskId?: string | null;
};

export const notifyUser = async ({
  userId,
  type,
  title,
  message,
  relatedProjectId,
  relatedTaskId,
}: TNotifyInput) => {
  try {
    await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        relatedProjectId: relatedProjectId || null,
        relatedTaskId: relatedTaskId || null,
      },
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to create notification:', error);
  }
};
