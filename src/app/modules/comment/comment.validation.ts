import { z } from 'zod';

const AddCommentSchema = z.object({
  params: z.object({
    taskId: z.string().uuid('Invalid task id'),
  }),
  body: z.object({
    content: z
      .string()
      .nonempty('Comment cannot be empty')
      .max(2000, 'Comment must not exceed 2000 characters'),
  }),
});

const CommentIdParamSchema = z.object({
  params: z.object({
    commentId: z.string().uuid('Invalid comment id'),
  }),
});

const GetCommentsSchema = z.object({
  params: z.object({
    taskId: z.string().uuid('Invalid task id'),
  }),
});

export const CommentValidation = {
  AddCommentSchema,
  CommentIdParamSchema,
  GetCommentsSchema,
};
