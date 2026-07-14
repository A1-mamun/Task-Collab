import httpStatus from 'http-status';
import { Prisma } from '@prisma/client';
import AppError from '../../errors/AppError';
import prisma from '../../utils/prisma';
import calculatePagination from '../../utils/calculatePagination';
import { TPaginationOptions } from '../../interface/pagination';
import { logActivity } from '../../utils/activityLogger';
import { sendEmail } from '../../utils/sendEmail';
import { generateSecureToken } from '../../utils/generateToken';
import config from '../../config';
import { projectSearchableFields } from './project.constant';
import { TProjectFilterableFields } from './project.interface';
import { TCreateProject, TUpdateProject } from './project.validation';

/**
 * Admins see every project. Everyone else only sees projects they created
 * (Project Managers) or projects they were added to as a member.
 */
const buildVisibilityWhere = (
  userId: string,
  role: string,
): Prisma.ProjectWhereInput => {
  if (role === 'ADMIN') return {};
  return {
    OR: [{ createdById: userId }, { members: { some: { userId } } }],
  };
};

const assertCanManageProject = async (
  userId: string,
  role: string,
  projectId: string,
) => {
  const project = await prisma.project.findUnique({ where: { id: projectId } });

  if (!project) {
    throw new AppError(httpStatus.NOT_FOUND, 'Project not found');
  }

  if (role !== 'ADMIN' && project.createdById !== userId) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'Only the project creator or an admin can manage this project',
    );
  }

  return project;
};

const createProject = async (
  userId: string,
  role: string,
  payload: TCreateProject,
) => {
  if (role === 'TEAM_MEMBER') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'Team members are not allowed to create projects',
    );
  }

  const project = await prisma.project.create({
    data: {
      name: payload.name,
      description: payload.description,
      deadline: payload.deadline,
      status: payload.status || 'ACTIVE',
      createdById: userId,
      members: {
        create: { userId }, // creator is automatically a member
      },
    },
    include: { members: { include: { user: true } } },
  });

  await logActivity({
    projectId: project.id,
    userId,
    action: 'PROJECT_CREATED',
    description: `Project "${project.name}" created`,
    metadata: { project },
  });

  return project;
};

const getAllProjects = async (
  userId: string,
  role: string,
  filters: TProjectFilterableFields,
  paginationOptions: TPaginationOptions,
) => {
  const { page, limit, skip, sortBy, sortOrder } =
    calculatePagination(paginationOptions);
  const { searchTerm, status, deadlineStatus } = filters;

  const andConditions: Prisma.ProjectWhereInput[] = [
    buildVisibilityWhere(userId, role),
  ];

  if (searchTerm) {
    andConditions.push({
      OR: projectSearchableFields.map((field) => ({
        [field]: { contains: searchTerm, mode: 'insensitive' },
      })),
    });
  }

  if (status) {
    andConditions.push({ status });
  }

  if (deadlineStatus === 'upcoming') {
    andConditions.push({
      deadline: { gte: new Date() },
      status: { not: 'COMPLETED' },
    });
  } else if (deadlineStatus === 'overdue') {
    andConditions.push({
      deadline: { lt: new Date() },
      status: { not: 'COMPLETED' },
    });
  }

  const whereCondition: Prisma.ProjectWhereInput = { AND: andConditions };

  const [projects, total] = await Promise.all([
    prisma.project.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        _count: { select: { tasks: true, members: true } },
      },
    }),
    prisma.project.count({ where: whereCondition }),
  ]);

  return { meta: { page, limit, total }, data: projects };
};

const getProjectById = async (
  userId: string,
  role: string,
  projectId: string,
) => {
  const project = await prisma.project.findFirst({
    where: { id: projectId, ...buildVisibilityWhere(userId, role) },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      members: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
              role: true,
            },
          },
        },
      },
      _count: { select: { tasks: true } },
    },
  });

  if (!project) {
    throw new AppError(httpStatus.NOT_FOUND, 'Project not found');
  }

  const taskStats = await prisma.task.groupBy({
    by: ['status'],
    where: { projectId },
    _count: true,
  });

  return { ...project, taskStats };
};

const updateProject = async (
  userId: string,
  role: string,
  projectId: string,
  payload: TUpdateProject,
) => {
  const existing = await assertCanManageProject(userId, role, projectId);

  if (
    payload.deadline &&
    new Date(payload.deadline).getTime() < Date.now() &&
    existing.status !== 'COMPLETED'
  ) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Please select a valid deadline.',
    );
  }

  const updated = await prisma.project.update({
    where: { id: projectId },
    data: payload,
  });

  await logActivity({
    projectId,
    userId,
    action: 'PROJECT_UPDATED',
    description: `Project "${updated.name}" updated`,
    metadata: { before: existing, after: updated },
  });

  return updated;
};

const deleteProject = async (
  userId: string,
  role: string,
  projectId: string,
) => {
  const existing = await assertCanManageProject(userId, role, projectId);

  await prisma.project.delete({ where: { id: projectId } });

  await logActivity({
    projectId: null,
    userId,
    action: 'PROJECT_DELETED',
    description: `Project "${existing.name}" deleted`,
  });

  return existing;
};

const inviteMember = async (
  userId: string,
  role: string,
  projectId: string,
  email: string,
) => {
  const project = await assertCanManageProject(userId, role, projectId);

  const token = generateSecureToken();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const invitation = await prisma.invitation.create({
    data: {
      projectId,
      email,
      token,
      invitedById: userId,
      expiresAt,
    },
  });

  // If the invited email already belongs to a registered user, the frontend
  // should route them to /login (they'll be redirected back to the project
  // after authenticating); otherwise it should route them to /signup.
  // Both flows land on the same accept-invite link:
  const inviteLink = `${config.invitationUILink}?token=${token}`;

  await sendEmail(
    email,
    `You've been invited to join "${project.name}"`,
    `You've been invited to join the project "${project.name}". Open this link to join: ${inviteLink}`,
    `<p>You've been invited to join the project <strong>${project.name}</strong>.</p>
     <p><a href="${inviteLink}">Click here to join the project</a></p>
     <p>If you already have an account, you'll be asked to log in first. This link expires in 7 days.</p>`,
  );

  await logActivity({
    projectId,
    userId,
    action: 'MEMBER_ADDED',
    description: `Invitation sent to ${email}`,
  });

  return invitation;
};

const acceptInvitation = async (
  userId: string,
  userEmail: string,
  token: string,
) => {
  const invitation = await prisma.invitation.findUnique({ where: { token } });

  if (!invitation) {
    throw new AppError(httpStatus.NOT_FOUND, 'Invitation not found');
  }

  if (invitation.status === 'ACCEPTED') {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'This invitation has already been used.',
    );
  }

  if (invitation.expiresAt.getTime() < Date.now()) {
    await prisma.invitation.update({
      where: { id: invitation.id },
      data: { status: 'EXPIRED' },
    });
    throw new AppError(httpStatus.BAD_REQUEST, 'This invitation has expired.');
  }

  if (invitation.email.toLowerCase() !== userEmail.toLowerCase()) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'This invitation was sent to a different email address.',
    );
  }

  const [, , updatedInvitation] = await prisma.$transaction([
    prisma.projectMember.upsert({
      where: { projectId_userId: { projectId: invitation.projectId, userId } },
      create: { projectId: invitation.projectId, userId },
      update: {},
    }),
    prisma.activityLog.create({
      data: {
        projectId: invitation.projectId,
        userId,
        action: 'MEMBER_ADDED',
        description: `${userEmail} joined the project`,
      },
    }),
    prisma.invitation.update({
      where: { id: invitation.id },
      data: { status: 'ACCEPTED' },
    }),
  ]);

  return { projectId: invitation.projectId, invitation: updatedInvitation };
};

const getProjectMembers = async (
  userId: string,
  role: string,
  projectId: string,
) => {
  const project = await prisma.project.findFirst({
    where: { id: projectId, ...buildVisibilityWhere(userId, role) },
  });

  if (!project) {
    throw new AppError(httpStatus.NOT_FOUND, 'Project not found');
  }

  const members = await prisma.projectMember.findMany({
    where: { projectId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
          role: true,
        },
      },
    },
  });

  const workload = await Promise.all(
    members.map(async (member) => {
      const [total, completed, pending] = await Promise.all([
        prisma.task.count({
          where: { projectId, assignedToId: member.userId },
        }),
        prisma.task.count({
          where: {
            projectId,
            assignedToId: member.userId,
            status: 'COMPLETED',
          },
        }),
        prisma.task.count({
          where: {
            projectId,
            assignedToId: member.userId,
            status: { not: 'COMPLETED' },
          },
        }),
      ]);

      return { ...member, workload: { total, completed, pending } };
    }),
  );

  return workload;
};

const removeMember = async (
  userId: string,
  role: string,
  projectId: string,
  memberUserId: string,
) => {
  const project = await assertCanManageProject(userId, role, projectId);

  if (memberUserId === project.createdById) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'The project creator cannot be removed.',
    );
  }

  await prisma.projectMember.delete({
    where: { projectId_userId: { projectId, userId: memberUserId } },
  });

  // Unassign this member's tasks in the project so nothing points to a
  // member who no longer has access.
  await prisma.task.updateMany({
    where: { projectId, assignedToId: memberUserId },
    data: { assignedToId: null },
  });

  await logActivity({
    projectId,
    userId,
    action: 'MEMBER_REMOVED',
    description: `Member removed from project "${project.name}"`,
  });

  return { removed: true };
};

export const ProjectService = {
  createProject,
  getAllProjects,
  getProjectById,
  updateProject,
  deleteProject,
  inviteMember,
  acceptInvitation,
  getProjectMembers,
  removeMember,
};
