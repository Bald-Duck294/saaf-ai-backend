// routes/roleRouter.js

import express from 'express';
// import { authenticate } from '../middlewares/authMiddleware.js';
import { checkPermission } from '../middlewares/permissionMiddleware.js';
import {
    getAllRoles,
    getRoleById,
    createRole,
    updateRole,
    deleteRole,
    getAvailablePermissions,
    getUsersByRole,
} from "../controller/roleController.js"
import { verify } from 'crypto';
import { verifyToken } from '../middlewares/authMiddleware.js';

const roleRouter = express.Router();

// Protect all role routes with authentication
// roleRouter.use(authenticate);

roleRouter.use(verifyToken);

// Get all available permissions (for building the UI)
roleRouter.get(
    '/permissions/available',
    checkPermission('role_management.view'),
    getAvailablePermissions
);

// Get all roles
roleRouter.get(
    '/',
    checkPermission('role_management.view'),
    getAllRoles
);

// Get single role
roleRouter.get(
    '/:id',
    checkPermission('role_management.view'),
    getRoleById
);

// Get users by role
roleRouter.get(
    '/:id/users',
    checkPermission('role_management.view'),
    getUsersByRole
);

// Create new role
roleRouter.post(
    '/',
    checkPermission('role_management.add'),
    createRole
);

// Update role
roleRouter.patch(
    '/:id',
    checkPermission('role_management.update'),
    updateRole
);

// Delete role
roleRouter.delete(
    '/:id',
    checkPermission('role_management.delete'),
    deleteRole
);

export default roleRouter;
