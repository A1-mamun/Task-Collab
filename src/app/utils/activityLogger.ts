import { ActivityAction, Prisma } from '@prisma/client';
import prisma from './prisma';

type TLogActivityInput = {
  projectId?: string | null;
  userId: string;
  action: ActivityAction;
  description: string;
  metadata?: Record<string, unknown> | null;
};

export const logActivity = async ({
  projectId,
  userId,
  action,
  description,
  metadata,
}: TLogActivityInput) => {
  try {
    await prisma.activityLog.create({
      data: {
        projectId: projectId || null,
        userId,
        action,
        description,
        metadata: (metadata as Prisma.InputJsonValue) || undefined,
      },
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to write activity log:', error);
  }
};
