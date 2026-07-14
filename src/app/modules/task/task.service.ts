import httpStatus from 'http-status';
import { Prisma } from '@prisma/client';
import AppError from '../../errors/AppError';
import prisma from '../../utils/prisma';
import calculatePagination from '../../utils/calculatePagination';
import { TPaginationOptions } from '../../interface/pagination';
import { logActivity } from '../../utils/activityLogger';
import { notifyUser } from '../../utils/notify';
import { taskSearchableFields } from './task.constant';
import { TTaskFilterableFields } from './task.interface';
import { TCreateTask, TUpdateTask } from './task.validation';

const projectVisibilityWhere = (userId: string, role: string): Prisma.ProjectWhereInput => {
  if (role === 'ADMIN') return {};
  return { OR: [{ createdById: userId }, { members: { some: { userId } } }] };
};

const getAccessibleProjectOrThrow = async (
  userId: string,
  role: string,
  projectId: string,
) => {
  const project = await prisma.project.findFirst({
    where: { id: projectId, ...projectVisibilityWhere(userId, role) },
  });

  if (!project) {
    throw new AppError(httpStatus.NOT_FOUND, 'Project not found');
  }

  return project;
};

const assertCanManageProjectTasks = (
  role: string,
  project: { createdById: string },
  userId: string,
) => {
  if (role !== 'ADMIN' && project.createdById !== userId) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'Only the project creator or an admin can manage tasks in this project',
    );
  }
};

const assertTitleIsUnique = async (
  projectId: string,
  title: string,
  excludeTaskId?: string,
) => {
  const duplicate = await prisma.task.findFirst({
    where: {
      projectId,
      title: { equals: title, mode: 'insensitive' },
      ...(excludeTaskId ? { id: { not: excludeTaskId } } : {}),
    },
  });

  if (duplicate) {
    throw new AppError(httpStatus.CONFLICT, 'This task already exists in the project.');
  }
};

const assertAssigneeIsProjectMember = async (projectId: string, assignedToId: string) => {
  const isMember = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: assignedToId } },
  });

  if (!isMember) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'The assignee must be a member of this project.',
    );
  }
};

const createTask = async (userId: string, role: string, payload: TCreateTask) => {
  const project = await getAccessibleProjectOrThrow(userId, role, payload.projectId);
  assertCanManageProjectTasks(role, project, userId);

  await assertTitleIsUnique(payload.projectId, payload.title);

  if (payload.assignedToId) {
    await assertAssigneeIsProjectMember(payload.projectId, payload.assignedToId);
  }

  const task = await prisma.task.create({
    data: {
      title: payload.title,
      description: payload.description,
      projectId: payload.projectId,
      assignedToId: payload.assignedToId,
      createdById: userId,
      dueDate: payload.dueDate,
      priority: payload.priority || 'MEDIUM',
      status: payload.status || 'TODO',
    },
    include: { assignedTo: { select: { id: true, name: true, email: true } } },
  });

  await logActivity({
    projectId: payload.projectId,
    userId,
    action: 'TASK_CREATED',
    description: `Task "${task.title}" created`,
  });

  if (task.assignedToId) {
    await notifyUser({
      userId: task.assignedToId,
      type: 'TASK_ASSIGNED',
      title: 'New task assigned',
      message: `You were assigned the task "${task.title}"`,
      relatedProjectId: task.projectId,
      relatedTaskId: task.id,
    });

    await logActivity({
      projectId: payload.projectId,
      userId,
      action: 'TASK_ASSIGNED',
      description: `Task "${task.title}" assigned`,
    });
  }

  return task;
};

const getAllTasks = async (
  userId: string,
  role: string,
  filters: TTaskFilterableFields,
  paginationOptions: TPaginationOptions,
) => {
  const { page, limit, skip, sortBy, sortOrder } = calculatePagination(paginationOptions);
  const { searchTerm, projectId, status, priority, assignedToId, deadlineStatus } = filters;

  const andConditions: Prisma.TaskWhereInput[] = [
    { project: projectVisibilityWhere(userId, role) },
  ];

  if (searchTerm) {
    andConditions.push({
      OR: taskSearchableFields.map((field) => ({
        [field]: { contains: searchTerm, mode: 'insensitive' },
      })),
    });
  }

  if (projectId) andConditions.push({ projectId });
  if (status) andConditions.push({ status });
  if (priority) andConditions.push({ priority });
  if (assignedToId) andConditions.push({ assignedToId });

  if (deadlineStatus === 'upcoming') {
    andConditions.push({ dueDate: { gte: new Date() }, status: { not: 'COMPLETED' } });
  } else if (deadlineStatus === 'overdue') {
    andConditions.push({ dueDate: { lt: new Date() }, status: { not: 'COMPLETED' } });
  }

  const whereCondition: Prisma.TaskWhereInput = { AND: andConditions };

  const sortableFieldMap: Record<string, string> = {
    latest: 'createdAt',
    deadline: 'dueDate',
    priority: 'priority',
    updated: 'updatedAt',
  };
  const resolvedSortBy = sortableFieldMap[sortBy] || sortBy;

  const [tasks, total] = await Promise.all([
    prisma.task.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy: { [resolvedSortBy]: sortOrder },
      include: {
        project: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true, email: true, avatarUrl: true } },
        createdBy: { select: { id: true, name: true } },
      },
    }),
    prisma.task.count({ where: whereCondition }),
  ]);

  return { meta: { page, limit, total }, data: tasks };
};

const getTaskById = async (userId: string, role: string, taskId: string) => {
  const task = await prisma.task.findFirst({
    where: { id: taskId, project: projectVisibilityWhere(userId, role) },
    include: {
      project: { select: { id: true, name: true, status: true } },
      assignedTo: { select: { id: true, name: true, email: true, avatarUrl: true } },
      createdBy: { select: { id: true, name: true } },
      comments: {
        include: { user: { select: { id: true, name: true, avatarUrl: true } } },
        orderBy: { createdAt: 'asc' },
      },
      attachments: true,
    },
  });

  if (!task) {
    throw new AppError(httpStatus.NOT_FOUND, 'Task not found');
  }

  return task;
};

const updateTask = async (
  userId: string,
  role: string,
  taskId: string,
  payload: TUpdateTask,
) => {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { project: true },
  });

  if (!task) {
    throw new AppError(httpStatus.NOT_FOUND, 'Task not found');
  }

  assertCanManageProjectTasks(role, task.project, userId);

  if (payload.title && payload.title.toLowerCase() !== task.title.toLowerCase()) {
    await assertTitleIsUnique(task.projectId, payload.title, taskId);
  }

  if ('assignedToId' in payload && payload.assignedToId !== task.assignedToId) {
    if (task.status === 'COMPLETED') {
      throw new AppError(httpStatus.BAD_REQUEST, 'Completed tasks cannot be reassigned.');
    }

    if (payload.assignedToId) {
      await assertAssigneeIsProjectMember(task.projectId, payload.assignedToId);
    }
  }

  const updated = await prisma.task.update({
    where: { id: taskId },
    data: {
      title: payload.title,
      description: payload.description,
      assignedToId: payload.assignedToId,
      dueDate: payload.dueDate,
      priority: payload.priority,
    },
    include: { assignedTo: { select: { id: true, name: true, email: true } } },
  });

  await logActivity({
    projectId: task.projectId,
    userId,
    action: 'TASK_UPDATED',
    description: `Task "${updated.title}" updated`,
  });

  if (payload.assignedToId && payload.assignedToId !== task.assignedToId) {
    await notifyUser({
      userId: payload.assignedToId,
      type: 'TASK_ASSIGNED',
      title: 'New task assigned',
      message: `You were assigned the task "${updated.title}"`,
      relatedProjectId: task.projectId,
      relatedTaskId: task.id,
    });
  }

  return updated;
};

/**
 * Any project member can move their own assigned task forward. Project
 * managers/admins can change the status of any task in their project.
 */
const changeTaskStatus = async (
  userId: string,
  role: string,
  taskId: string,
  status: 'TODO' | 'IN_PROGRESS' | 'COMPLETED',
) => {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { project: true },
  });

  if (!task) {
    throw new AppError(httpStatus.NOT_FOUND, 'Task not found');
  }

  const isManager = role === 'ADMIN' || task.project.createdById === userId;
  const isAssignee = task.assignedToId === userId;

  if (!isManager && !isAssignee) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'You can only update the status of tasks assigned to you.',
    );
  }

  const updated = await prisma.task.update({
    where: { id: taskId },
    data: { status },
  });

  await logActivity({
    projectId: task.projectId,
    userId,
    action: 'TASK_STATUS_CHANGED',
    description: `Task "${task.title}" marked as ${status.replace('_', ' ')}`,
  });

  if (task.createdById !== userId) {
    await notifyUser({
      userId: task.createdById,
      type: 'TASK_STATUS_CHANGED',
      title: 'Task status updated',
      message: `"${task.title}" was moved to ${status.replace('_', ' ')}`,
      relatedProjectId: task.projectId,
      relatedTaskId: task.id,
    });
  }

  return updated;
};

const bulkUpdateStatus = async (
  userId: string,
  role: string,
  taskIds: string[],
  status: 'TODO' | 'IN_PROGRESS' | 'COMPLETED',
) => {
  const tasks = await prisma.task.findMany({
    where: { id: { in: taskIds } },
    include: { project: true },
  });

  if (tasks.length !== taskIds.length) {
    throw new AppError(httpStatus.NOT_FOUND, 'One or more tasks were not found.');
  }

  for (const task of tasks) {
    const isManager = role === 'ADMIN' || task.project.createdById === userId;
    const isAssignee = task.assignedToId === userId;
    if (!isManager && !isAssignee) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        `You are not allowed to update task "${task.title}".`,
      );
    }
  }

  const result = await prisma.task.updateMany({
    where: { id: { in: taskIds } },
    data: { status },
  });

  await Promise.all(
    tasks.map((task) =>
      logActivity({
        projectId: task.projectId,
        userId,
        action: 'TASK_STATUS_CHANGED',
        description: `Task "${task.title}" marked as ${status.replace('_', ' ')} (bulk update)`,
      }),
    ),
  );

  return result;
};

const deleteTask = async (userId: string, role: string, taskId: string) => {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { project: true },
  });

  if (!task) {
    throw new AppError(httpStatus.NOT_FOUND, 'Task not found');
  }

  assertCanManageProjectTasks(role, task.project, userId);

  await prisma.task.delete({ where: { id: taskId } });

  await logActivity({
    projectId: task.projectId,
    userId,
    action: 'TASK_DELETED',
    description: `Task "${task.title}" deleted`,
  });

  return task;
};

export const TaskService = {
  createTask,
  getAllTasks,
  getTaskById,
  updateTask,
  changeTaskStatus,
  bulkUpdateStatus,
  deleteTask,
};
