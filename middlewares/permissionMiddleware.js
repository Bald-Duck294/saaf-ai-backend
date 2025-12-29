// middlewares/permissionMiddleware.js

import { VALID_PERMISSIONS } from "../constant/permissions.js";

export const checkPermission = (requiredPermission) => {
    return (req, res, next) => {
        try {
            const user = req.user;
            // console.log(user, "user in permission middleware");
            if (!user) {
                return res.status(401).json({
                    success: false,
                    error: 'Unauthorized',
                    message: 'User not authenticated',
                });
            }

            // Superadmin (role_id = 1) has all permissions
            if (user.role_id === 1) {
                return next();
            }

            // Get user's role permissions
            const userPermissions = user?.permissions || [];

            // console.log(userPermissions, "user permissions");
            // Check if user has the required permission
            if (!userPermissions.includes(requiredPermission)) {
                return res.status(403).json({
                    success: false,
                    error: 'Forbidden',
                    message: `You don't have permission to perform this action`,
                    required: requiredPermission,
                });
            }

            next();
        } catch (error) {
            console.error('Permission check error:', error);
            return res.status(500).json({
                success: false,
                error: 'Permission check failed',
                message: error.message,
            });
        }
    };
};

/**
 * Middleware to check if user has ANY of the required permissions
 */
export const checkAnyPermission = (requiredPermissions) => {
    return (req, res, next) => {
        try {
            const user = req.user;

            if (!user) {
                return res.status(401).json({
                    success: false,
                    error: 'Unauthorized',
                });
            }

            if (user.role_id === 1) {
                return next();
            }

            const userPermissions = user.role?.permissions || [];

            const hasPermission = requiredPermissions.some((perm) =>
                userPermissions.includes(perm)
            );

            if (!hasPermission) {
                return res.status(403).json({
                    success: false,
                    error: 'Forbidden',
                    message: 'Insufficient permissions',
                });
            }

            next();
        } catch (error) {
            console.error('Permission check error:', error);
            return res.status(500).json({
                success: false,
                error: 'Permission check failed',
            });
        }
    };
};

/**
 * Helper function to check permission programmatically
 */
export const hasPermission = (user, permission) => {
    if (!user || !user.role) return false;
    if (user.role_id === 1) return true;
    return user.role.permissions?.includes(permission) || false;
};
