import { z } from 'zod';

const notPastDate = z.coerce
  .date()
  .refine((date) => date.getTime() >= new Date().setHours(0, 0, 0, 0), {
    message: 'Please select a valid deadline.',
  });

const CreateTaskSchema = z.object({
  body: z.object({
    title: z
      .string()
      .nonempty('Task title is required')
      .min(2, 'Task title must be at least 2 characters')
      .max(150, 'Task title must not exceed 150 characters'),
    description: z.string().max(3000).optional(),
    projectId: z.string().uuid('Invalid project id'),
    assignedToId: z.string().uuid('Invalid assignee id').optional(),
    dueDate: notPastDate,
    priority: z.enum(['HIGH', 'MEDIUM', 'LOW']).optional(),
    status: z.enum(['TODO', 'IN_PROGRESS', 'COMPLETED']).optional(),
  }),
});

const UpdateTaskSchema = z.object({
  params: z.object({
    taskId: z.string().uuid('Invalid task id'),
  }),
  body: z.object({
    title: z.string().min(2).max(150).optional(),
    description: z.string().max(3000).optional(),
    assignedToId: z.string().uuid('Invalid assignee id').nullable().optional(),
    dueDate: notPastDate.optional(),
    priority: z.enum(['HIGH', 'MEDIUM', 'LOW']).optional(),
  }),
});

const ChangeTaskStatusSchema = z.object({
  params: z.object({
    taskId: z.string().uuid('Invalid task id'),
  }),
  body: z.object({
    status: z.enum(['TODO', 'IN_PROGRESS', 'COMPLETED']),
  }),
});

const BulkUpdateStatusSchema = z.object({
  body: z.object({
    taskIds: z.array(z.string().uuid()).nonempty('At least one task id is required'),
    status: z.enum(['TODO', 'IN_PROGRESS', 'COMPLETED']),
  }),
});

const TaskIdParamSchema = z.object({
  params: z.object({
    taskId: z.string().uuid('Invalid task id'),
  }),
});

export type TCreateTask = z.infer<typeof CreateTaskSchema>['body'];
export type TUpdateTask = z.infer<typeof UpdateTaskSchema>['body'];

export const TaskValidation = {
  CreateTaskSchema,
  UpdateTaskSchema,
  ChangeTaskStatusSchema,
  BulkUpdateStatusSchema,
  TaskIdParamSchema,
};
