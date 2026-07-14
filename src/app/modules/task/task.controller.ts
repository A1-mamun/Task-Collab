import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import pick from '../../utils/pick';
import { paginationFields } from '../../constant/pagination';
import { taskFilterableFields } from './task.constant';
import { TaskService } from './task.service';

const createTask = catchAsync(async (req, res) => {
  const { userId, role } = req.user;
  const result = await TaskService.createTask(userId, role, req.body);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Task created successfully!',
    data: result,
  });
});

const getAllTasks = catchAsync(async (req, res) => {
  const { userId, role } = req.user;
  const filters = pick(req.query, taskFilterableFields);
  const paginationOptions = pick(req.query, paginationFields);

  const result = await TaskService.getAllTasks(userId, role, filters, paginationOptions);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Tasks fetched successfully!',
    meta: result.meta,
    data: result.data,
  });
});

const getTaskById = catchAsync(async (req, res) => {
  const { userId, role } = req.user;
  const { taskId } = req.params;

  const result = await TaskService.getTaskById(userId, role, taskId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Task fetched successfully!',
    data: result,
  });
});

const updateTask = catchAsync(async (req, res) => {
  const { userId, role } = req.user;
  const { taskId } = req.params;

  const result = await TaskService.updateTask(userId, role, taskId, req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Task updated successfully!',
    data: result,
  });
});

const changeTaskStatus = catchAsync(async (req, res) => {
  const { userId, role } = req.user;
  const { taskId } = req.params;
  const { status } = req.body;

  const result = await TaskService.changeTaskStatus(userId, role, taskId, status);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `Task marked as ${status.replace('_', ' ')}`,
    data: result,
  });
});

const bulkUpdateStatus = catchAsync(async (req, res) => {
  const { userId, role } = req.user;
  const { taskIds, status } = req.body;

  const result = await TaskService.bulkUpdateStatus(userId, role, taskIds, status);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `${result.count} task(s) updated successfully!`,
    data: result,
  });
});

const deleteTask = catchAsync(async (req, res) => {
  const { userId, role } = req.user;
  const { taskId } = req.params;

  const result = await TaskService.deleteTask(userId, role, taskId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Task deleted successfully!',
    data: result,
  });
});

export const TaskController = {
  createTask,
  getAllTasks,
  getTaskById,
  updateTask,
  changeTaskStatus,
  bulkUpdateStatus,
  deleteTask,
};
