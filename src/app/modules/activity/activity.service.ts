import { Prisma } from '@prisma/client';
import prisma from '../../utils/prisma';

const projectVisibilityWhere = (userId: string, role: string): Prisma.ProjectWhereInput => {
  if (role === 'ADMIN') return {};
  return { OR: [{ createdById: userId }, { members: { some: { userId } } }] };
};

/**
 * Returns the latest activities across every project the requesting user
 * can see, or scoped to a single project when projectId is supplied.
 */
const getRecentActivities = async (
  userId: string,
  role: string,
  projectId?: string,
  limit = 10,
) => {
  const where: Prisma.ActivityLogWhereInput = projectId
    ? { projectId }
    : { project: projectVisibilityWhere(userId, role) };

  return prisma.activityLog.findMany({
    where,
    take: Math.min(limit, 50),
    orderBy: { createdAt: 'desc' },
    include: {
      user: { select: { id: true, name: true, avatarUrl: true } },
      project: { select: { id: true, name: true } },
    },
  });
};

export const ActivityService = {
  getRecentActivities,
};
