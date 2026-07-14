import httpStatus from 'http-status';
import { Prisma } from '@prisma/client';
import AppError from '../../errors/AppError';
import prisma from '../../utils/prisma';
import { logActivity } from '../../utils/activityLogger';
import { notifyUser } from '../../utils/notify';

const projectVisibilityWhere = (userId: string, role: string): Prisma.ProjectWhereInput => {
  if (role === 'ADMIN') return {};
  return { OR: [{ createdById: userId }, { members: { some: { userId } } }] };
};

const getAccessibleTaskOrThrow = async (userId: string, role: string, taskId: string) => {
  const task = await prisma.task.findFirst({
    where: { id: taskId, project: projectVisibilityWhere(userId, role) },
    include: { project: true },
  });

  if (!task) {
    throw new AppError(httpStatus.NOT_FOUND, 'Task not found');
  }

  return task;
};

const addComment = async (
  userId: string,
  role: string,
  taskId: string,
  content: string,
) => {
  const task = await getAccessibleTaskOrThrow(userId, role, taskId);

  const comment = await prisma.comment.create({
    data: { taskId, userId, content },
    include: { user: { select: { id: true, name: true, avatarUrl: true } } },
  });

  await logActivity({
    projectId: task.projectId,
    userId,
    action: 'COMMENT_ADDED',
    description: `Comment added on task "${task.title}"`,
  });

  const notifyRecipients = new Set(
    [task.createdById, task.assignedToId].filter(
      (id): id is string => Boolean(id) && id !== userId,
    ),
  );

  await Promise.all(
    Array.from(notifyRecipients).map((recipientId) =>
      notifyUser({
        userId: recipientId,
        type: 'COMMENT_ADDED',
        title: 'New comment',
        message: `New comment on "${task.title}"`,
        relatedProjectId: task.projectId,
        relatedTaskId: task.id,
      }),
    ),
  );

  return comment;
};

const getCommentsByTask = async (userId: string, role: string, taskId: string) => {
  await getAccessibleTaskOrThrow(userId, role, taskId);

  return prisma.comment.findMany({
    where: { taskId },
    include: { user: { select: { id: true, name: true, avatarUrl: true } } },
    orderBy: { createdAt: 'asc' },
  });
};

const deleteComment = async (userId: string, role: string, commentId: string) => {
  const comment = await prisma.comment.findUnique({ where: { id: commentId } });

  if (!comment) {
    throw new AppError(httpStatus.NOT_FOUND, 'Comment not found');
  }

  if (comment.userId !== userId && role !== 'ADMIN') {
    throw new AppError(httpStatus.FORBIDDEN, 'You can only delete your own comments.');
  }

  await prisma.comment.delete({ where: { id: commentId } });

  return comment;
};

export const CommentService = {
  addComment,
  getCommentsByTask,
  deleteComment,
};
