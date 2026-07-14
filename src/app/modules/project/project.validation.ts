import { z } from 'zod';

const futureDate = (message: string) =>
  z.coerce.date().refine((date) => date.getTime() > Date.now(), { message });

const CreateProjectSchema = z.object({
  body: z.object({
    name: z
      .string()
      .nonempty('Project name is required')
      .min(2, 'Project name must be at least 2 characters')
      .max(120, 'Project name must not exceed 120 characters'),
    description: z.string().max(2000).optional(),
    deadline: futureDate('Please select a valid deadline.'),
    status: z.enum(['ACTIVE', 'COMPLETED', 'ON_HOLD']).optional(),
  }),
});

const UpdateProjectSchema = z.object({
  params: z.object({
    projectId: z.string().uuid('Invalid project id'),
  }),
  body: z.object({
    name: z.string().min(2).max(120).optional(),
    description: z.string().max(2000).optional(),
    deadline: z.coerce.date().optional(),
    status: z.enum(['ACTIVE', 'COMPLETED', 'ON_HOLD']).optional(),
  }),
});

const ProjectIdParamSchema = z.object({
  params: z.object({
    projectId: z.string().uuid('Invalid project id'),
  }),
});

const InviteMemberSchema = z.object({
  params: z.object({
    projectId: z.string().uuid('Invalid project id'),
  }),
  body: z.object({
    email: z.string().nonempty('Email is required').email('Invalid email address'),
  }),
});

const AcceptInvitationSchema = z.object({
  body: z.object({
    token: z.string().nonempty('Invitation token is required'),
  }),
});

const RemoveMemberSchema = z.object({
  params: z.object({
    projectId: z.string().uuid('Invalid project id'),
    memberUserId: z.string().uuid('Invalid user id'),
  }),
});

export type TCreateProject = z.infer<typeof CreateProjectSchema>['body'];
export type TUpdateProject = z.infer<typeof UpdateProjectSchema>['body'];

export const ProjectValidation = {
  CreateProjectSchema,
  UpdateProjectSchema,
  ProjectIdParamSchema,
  InviteMemberSchema,
  AcceptInvitationSchema,
  RemoveMemberSchema,
};
