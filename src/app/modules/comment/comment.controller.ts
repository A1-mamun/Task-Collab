import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { CommentService } from './comment.service';

const addComment = catchAsync(async (req, res) => {
  const { userId, role } = req.user;
  const { taskId } = req.params;

  const result = await CommentService.addComment(userId, role, taskId, req.body.content);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Comment added successfully!',
    data: result,
  });
});

const getCommentsByTask = catchAsync(async (req, res) => {
  const { userId, role } = req.user;
  const { taskId } = req.params;

  const result = await CommentService.getCommentsByTask(userId, role, taskId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Comments fetched successfully!',
    data: result,
  });
});

const deleteComment = catchAsync(async (req, res) => {
  const { userId, role } = req.user;
  const { commentId } = req.params;

  const result = await CommentService.deleteComment(userId, role, commentId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Comment deleted successfully!',
    data: result,
  });
});

export const CommentController = {
  addComment,
  getCommentsByTask,
  deleteComment,
};
