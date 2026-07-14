import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import pick from '../../utils/pick';
import { paginationFields } from '../../constant/pagination';
import { projectFilterableFields } from './project.constant';
import { ProjectService } from './project.service';

const createProject = catchAsync(async (req, res) => {
  const { userId, role } = req.user;
  const result = await ProjectService.createProject(userId, role, req.body);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Project created successfully!',
    data: result,
  });
});

const getAllProjects = catchAsync(async (req, res) => {
  const { userId, role } = req.user;
  const filters = pick(req.query, projectFilterableFields);
  const paginationOptions = pick(req.query, paginationFields);

  const result = await ProjectService.getAllProjects(userId, role, filters, paginationOptions);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Projects fetched successfully!',
    meta: result.meta,
    data: result.data,
  });
});

const getProjectById = catchAsync(async (req, res) => {
  const { userId, role } = req.user;
  const { projectId } = req.params;

  const result = await ProjectService.getProjectById(userId, role, projectId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Project fetched successfully!',
    data: result,
  });
});

const updateProject = catchAsync(async (req, res) => {
  const { userId, role } = req.user;
  const { projectId } = req.params;

  const result = await ProjectService.updateProject(userId, role, projectId, req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Project updated successfully!',
    data: result,
  });
});

const deleteProject = catchAsync(async (req, res) => {
  const { userId, role } = req.user;
  const { projectId } = req.params;

  const result = await ProjectService.deleteProject(userId, role, projectId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Project deleted successfully!',
    data: result,
  });
});

const inviteMember = catchAsync(async (req, res) => {
  const { userId, role } = req.user;
  const { projectId } = req.params;
  const { email } = req.body;

  const result = await ProjectService.inviteMember(userId, role, projectId, email);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `Invitation sent to ${email}`,
    data: result,
  });
});

const acceptInvitation = catchAsync(async (req, res) => {
  const { userId, email } = req.user;
  const { token } = req.body;

  const result = await ProjectService.acceptInvitation(userId, email, token);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'You have joined the project!',
    data: result,
  });
});

const getProjectMembers = catchAsync(async (req, res) => {
  const { userId, role } = req.user;
  const { projectId } = req.params;

  const result = await ProjectService.getProjectMembers(userId, role, projectId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Project members fetched successfully!',
    data: result,
  });
});

const removeMember = catchAsync(async (req, res) => {
  const { userId, role } = req.user;
  const { projectId, memberUserId } = req.params;

  const result = await ProjectService.removeMember(userId, role, projectId, memberUserId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Member removed from project!',
    data: result,
  });
});

export const ProjectController = {
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
