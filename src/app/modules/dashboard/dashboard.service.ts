import { Prisma } from '@prisma/client';
import prisma from '../../utils/prisma';

const projectVisibilityWhere = (userId: string, role: string): Prisma.ProjectWhereInput => {
  if (role === 'ADMIN') return {};
  return { OR: [{ createdById: userId }, { members: { some: { userId } } }] };
};

const getAccessibleProjectIds = async (userId: string, role: string) => {
  const projects = await prisma.project.findMany({
    where: projectVisibilityWhere(userId, role),
    select: { id: true },
  });
  return projects.map((p) => p.id);
};

const getKpis = async (userId: string, role: string) => {
  const projectIds = await getAccessibleProjectIds(userId, role);
  const taskWhere: Prisma.TaskWhereInput = { projectId: { in: projectIds } };

  const [totalProjects, totalTasks, completedTasks, pendingTasks, overdueTasks] =
    await Promise.all([
      projectIds.length,
      prisma.task.count({ where: taskWhere }),
      prisma.task.count({ where: { ...taskWhere, status: 'COMPLETED' } }),
      prisma.task.count({ where: { ...taskWhere, status: { not: 'COMPLETED' } } }),
      prisma.task.count({
        where: { ...taskWhere, status: { not: 'COMPLETED' }, dueDate: { lt: new Date() } },
      }),
    ]);

  return { totalProjects, totalTasks, completedTasks, pendingTasks, overdueTasks };
};

const getTasksByPriority = async (userId: string, role: string) => {
  const projectIds = await getAccessibleProjectIds(userId, role);

  const grouped = await prisma.task.groupBy({
    by: ['priority'],
    where: { projectId: { in: projectIds } },
    _count: true,
  });

  return grouped.map((g) => ({ priority: g.priority, count: g._count }));
};

const getTaskStatusDistribution = async (userId: string, role: string) => {
  const projectIds = await getAccessibleProjectIds(userId, role);

  const grouped = await prisma.task.groupBy({
    by: ['status'],
    where: { projectId: { in: projectIds } },
    _count: true,
  });

  return grouped.map((g) => ({ status: g.status, count: g._count }));
};

/**
 * Percentage of tasks completed per project — a lightweight "progress
 * trend" the frontend can chart (e.g. "Mobile App — 80% completed").
 */
const getProjectProgressTrend = async (userId: string, role: string) => {
  const projects = await prisma.project.findMany({
    where: projectVisibilityWhere(userId, role),
    select: { id: true, name: true, deadline: true, status: true },
  });

  return Promise.all(
    projects.map(async (project) => {
      const [total, completed] = await Promise.all([
        prisma.task.count({ where: { projectId: project.id } }),
        prisma.task.count({ where: { projectId: project.id, status: 'COMPLETED' } }),
      ]);

      const progress = total === 0 ? 0 : Math.round((completed / total) * 100);

      return { ...project, totalTasks: total, completedTasks: completed, progress };
    }),
  );
};

/**
 * Tasks completed per team member across all accessible projects — a
 * simple productivity signal for the dashboard.
 */
const getTeamProductivity = async (userId: string, role: string) => {
  const projectIds = await getAccessibleProjectIds(userId, role);

  const members = await prisma.user.findMany({
    where: { memberships: { some: { projectId: { in: projectIds } } } },
    select: { id: true, name: true, avatarUrl: true },
  });

  return Promise.all(
    members.map(async (member) => {
      const [total, completed, pending] = await Promise.all([
        prisma.task.count({
          where: { projectId: { in: projectIds }, assignedToId: member.id },
        }),
        prisma.task.count({
          where: { projectId: { in: projectIds }, assignedToId: member.id, status: 'COMPLETED' },
        }),
        prisma.task.count({
          where: {
            projectId: { in: projectIds },
            assignedToId: member.id,
            status: { not: 'COMPLETED' },
          },
        }),
      ]);

      return { member, totalTasks: total, completedTasks: completed, pendingTasks: pending };
    }),
  );
};

const getUpcomingDeadlines = async (userId: string, role: string, limit = 5) => {
  const projectIds = await getAccessibleProjectIds(userId, role);

  return prisma.task.findMany({
    where: {
      projectId: { in: projectIds },
      status: { not: 'COMPLETED' },
      dueDate: { gte: new Date() },
    },
    orderBy: { dueDate: 'asc' },
    take: limit,
    include: {
      project: { select: { id: true, name: true } },
      assignedTo: { select: { id: true, name: true } },
    },
  });
};

const getHighPriorityTasks = async (userId: string, role: string, limit = 5) => {
  const projectIds = await getAccessibleProjectIds(userId, role);

  return prisma.task.findMany({
    where: {
      projectId: { in: projectIds },
      priority: 'HIGH',
      status: { not: 'COMPLETED' },
    },
    orderBy: { dueDate: 'asc' },
    take: limit,
    include: {
      project: { select: { id: true, name: true } },
      assignedTo: { select: { id: true, name: true } },
    },
  });
};

const getOverview = async (userId: string, role: string) => {
  const [kpis, tasksByPriority, taskStatusDistribution, upcomingDeadlines, highPriorityTasks] =
    await Promise.all([
      getKpis(userId, role),
      getTasksByPriority(userId, role),
      getTaskStatusDistribution(userId, role),
      getUpcomingDeadlines(userId, role, 5),
      getHighPriorityTasks(userId, role, 5),
    ]);

  return {
    kpis,
    tasksByPriority,
    taskStatusDistribution,
    upcomingDeadlines,
    highPriorityTasks,
  };
};

export const DashboardService = {
  getKpis,
  getTasksByPriority,
  getTaskStatusDistribution,
  getProjectProgressTrend,
  getTeamProductivity,
  getUpcomingDeadlines,
  getHighPriorityTasks,
  getOverview,
};
