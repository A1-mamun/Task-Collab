import { Router } from 'express';
import Auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { USER_ROLE } from '../../constant/userConstant';
import { ProjectValidation } from './project.validation';
import { ProjectController } from './project.controller';

const router = Router();

router.post(
  '/',
  Auth(USER_ROLE.ADMIN, USER_ROLE.PROJECT_MANAGER),
  validateRequest(ProjectValidation.CreateProjectSchema),
  ProjectController.createProject,
);

router.get('/', Auth(), ProjectController.getAllProjects);

router.post(
  '/accept-invitation',
  Auth(),
  validateRequest(ProjectValidation.AcceptInvitationSchema),
  ProjectController.acceptInvitation,
);

router.get(
  '/:projectId',
  Auth(),
  validateRequest(ProjectValidation.ProjectIdParamSchema),
  ProjectController.getProjectById,
);

router.patch(
  '/:projectId',
  Auth(USER_ROLE.ADMIN, USER_ROLE.PROJECT_MANAGER),
  validateRequest(ProjectValidation.UpdateProjectSchema),
  ProjectController.updateProject,
);

router.delete(
  '/:projectId',
  Auth(USER_ROLE.ADMIN, USER_ROLE.PROJECT_MANAGER),
  validateRequest(ProjectValidation.ProjectIdParamSchema),
  ProjectController.deleteProject,
);

router.post(
  '/:projectId/invite',
  Auth(USER_ROLE.ADMIN, USER_ROLE.PROJECT_MANAGER),
  validateRequest(ProjectValidation.InviteMemberSchema),
  ProjectController.inviteMember,
);

router.get(
  '/:projectId/members',
  Auth(),
  validateRequest(ProjectValidation.ProjectIdParamSchema),
  ProjectController.getProjectMembers,
);

router.delete(
  '/:projectId/members/:memberUserId',
  Auth(USER_ROLE.ADMIN, USER_ROLE.PROJECT_MANAGER),
  validateRequest(ProjectValidation.RemoveMemberSchema),
  ProjectController.removeMember,
);

export const ProjectRoutes = router;
