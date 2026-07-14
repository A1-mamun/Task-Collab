import { Router } from 'express';
import Auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { CommentValidation } from './comment.validation';
import { CommentController } from './comment.controller';

const router = Router();

router.post(
  '/task/:taskId',
  Auth(),
  validateRequest(CommentValidation.AddCommentSchema),
  CommentController.addComment,
);

router.get(
  '/task/:taskId',
  Auth(),
  validateRequest(CommentValidation.GetCommentsSchema),
  CommentController.getCommentsByTask,
);

router.delete(
  '/:commentId',
  Auth(),
  validateRequest(CommentValidation.CommentIdParamSchema),
  CommentController.deleteComment,
);

export const CommentRoutes = router;
