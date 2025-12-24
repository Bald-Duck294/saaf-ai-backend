// controllers/roleController.js

import prisma from "../config/prismaClient.mjs";
import { VALID_PERMISSIONS, SYSTEM_ROLE_IDS, MODULE_CONFIG } from "../constant/permissions.js";

export const getAllRoles = async (req, res) => {
    console.log('in get all roles');
    try {
        const roles = await prisma.role.findMany({
            where: { is_active: true },
            orderBy: { id: 'asc' },
            select: {
                id: true,
                name: true,
                description: true,
                permissions: true,
                is_active: true,
                created_at: true,
                updated_at: true,
            },
        });

        // ✅ Manually count non-deleted users for each role
        const rolesWithCount = await Promise.all(
            roles.map(async (role) => {
                const userCount = await prisma.users.count({
                    where: {
                        role_id: role.id,
                        deletedAt: null, // ✅ Exclude soft-deleted users
                    },
                });

                return {
                    ...role,
                    _count: {
                        users: userCount,
                    },
                };
            })
        );

        return res.status(200).json({
            success: true,
            roles: rolesWithCount,
        });
    } catch (error) {
        console.error('Error fetching roles:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to fetch roles',
            message: error.message,
        });
    }
};

export const getRoleById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id || isNaN(id)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid role ID',
            });
        }

        const role = await prisma.role.findUnique({
            where: { id: parseInt(id) },
        });

        if (!role) {
            return res.status(404).json({
                success: false,
                error: 'Role not found',
            });
        }

        // ✅ Manually count non-deleted related records
        const usersCount = await prisma.users.count({
            where: {
                role_id: role.id,
                deletedAt: null,
            },
        });

        const registeredUsersCount = await prisma.registered_users.count({
            where: {
                role_id: role.id,
                // registered_users doesn't have deletedAt in your schema
            },
        });

        const cleanerAssignmentsCount = await prisma.cleaner_assignments.count({
            where: {
                role_id: role.id,
                deletedAt: null,
            },
        });

        return res.status(200).json({
            success: true,
            role: {
                ...role,
                _count: {
                    users: usersCount,
                    registered_users: registeredUsersCount,
                    cleaner_assignments: cleanerAssignmentsCount,
                },
            },
        });
    } catch (error) {
        console.error('Error fetching role:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to fetch role',
            message: error.message,
        });
    }
};

export const createRole = async (req, res) => {
    try {
        const { name, description, permissions } = req.body;

        // Validation
        if (!name || !name.trim()) {
            return res.status(400).json({
                success: false,
                error: 'Role name is required',
            });
        }

        // Validate permissions array
        if (!Array.isArray(permissions)) {
            return res.status(400).json({
                success: false,
                error: 'Permissions must be an array',
            });
        }

        // Check for invalid permissions
        const invalidPermissions = permissions.filter(
            (perm) => !VALID_PERMISSIONS.includes(perm)
        );

        if (invalidPermissions.length > 0) {
            return res.status(400).json({
                success: false,
                error: 'Invalid permissions detected',
                invalid: invalidPermissions,
            });
        }

        // Check if role name already exists
        const existingRole = await prisma.role.findUnique({
            where: { name: name.toLowerCase().trim() },
        });

        if (existingRole) {
            return res.status(409).json({
                success: false,
                error: 'Role with this name already exists',
            });
        }

        // Create role
        const role = await prisma.role.create({
            data: {
                name: name.toLowerCase().trim(),
                description: description?.trim() || null,
                permissions: permissions,
                is_active: true,
            },
        });

        return res.status(201).json({
            success: true,
            message: 'Role created successfully',
            role,
        });
    } catch (error) {
        console.error('Error creating role:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to create role',
            message: error.message,
        });
    }
};

export const updateRole = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, permissions } = req.body;

        if (!id || isNaN(id)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid role ID',
            });
        }

        const roleId = parseInt(id);

        // Check if role exists
        const existingRole = await prisma.role.findUnique({
            where: { id: roleId },
        });

        if (!existingRole) {
            return res.status(404).json({
                success: false,
                error: 'Role not found',
            });
        }

        // Warning for system roles (but allow updates)
        if (SYSTEM_ROLE_IDS.includes(roleId)) {
            console.warn(`⚠️  Updating system role: ${existingRole.name}`);
        }

        // Validate permissions if provided
        if (permissions !== undefined) {
            if (!Array.isArray(permissions)) {
                return res.status(400).json({
                    success: false,
                    error: 'Permissions must be an array',
                });
            }

            const invalidPermissions = permissions.filter(
                (perm) => !VALID_PERMISSIONS.includes(perm)
            );

            if (invalidPermissions.length > 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid permissions detected',
                    invalid: invalidPermissions,
                });
            }
        }

        // Check for name conflicts if name is being changed
        if (name && name.toLowerCase().trim() !== existingRole.name) {
            const nameConflict = await prisma.role.findUnique({
                where: { name: name.toLowerCase().trim() },
            });

            if (nameConflict) {
                return res.status(409).json({
                    success: false,
                    error: 'Role with this name already exists',
                });
            }
        }

        // Build update data
        const updateData = {};
        if (name !== undefined) updateData.name = name.toLowerCase().trim();
        if (description !== undefined) updateData.description = description?.trim() || null;
        if (permissions !== undefined) updateData.permissions = permissions;

        // Update role
        const updatedRole = await prisma.role.update({
            where: { id: roleId },
            data: updateData,
        });

        return res.status(200).json({
            success: true,
            message: 'Role updated successfully',
            role: updatedRole,
        });
    } catch (error) {
        console.error('Error updating role:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to update role',
            message: error.message,
        });
    }
};

export const deleteRole = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id || isNaN(id)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid role ID',
            });
        }

        const roleId = parseInt(id);

        // Check if role exists
        const role = await prisma.role.findUnique({
            where: { id: roleId },
        });

        if (!role) {
            return res.status(404).json({
                success: false,
                error: 'Role not found',
            });
        }

        // Prevent deleting system roles
        if (SYSTEM_ROLE_IDS.includes(roleId)) {
            return res.status(403).json({
                success: false,
                error: 'Cannot delete system roles',
                message: 'System roles (superadmin, admin, supervisor, cleaner) cannot be deleted',
            });
        }

        // ✅ Check only non-deleted users
        const usersCount = await prisma.users.count({
            where: {
                role_id: roleId,
                deletedAt: null,
            },
        });

        const registeredUsersCount = await prisma.registered_users.count({
            where: {
                role_id: roleId,
            },
        });

        const totalUsers = usersCount + registeredUsersCount;

        if (totalUsers > 0) {
            return res.status(400).json({
                success: false,
                error: 'Cannot delete role with assigned users',
                message: `This role is assigned to ${totalUsers} user(s). Please reassign them before deleting.`,
                count: totalUsers,
            });
        }

        // Delete role (hard delete for Role table as it doesn't have deletedAt)
        await prisma.role.delete({
            where: { id: roleId },
        });

        return res.status(200).json({
            success: true,
            message: 'Role deleted successfully',
        });
    } catch (error) {
        console.error('Error deleting role:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to delete role',
            message: error.message,
        });
    }
};

export const getAvailablePermissions = async (req, res) => {
    try {
        return res.status(200).json({
            success: true,
            permissions: VALID_PERMISSIONS,
            modules: MODULE_CONFIG,
        });
    } catch (error) {
        console.error('Error fetching permissions:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to fetch permissions',
            message: error.message,
        });
    }
};

export const getUsersByRole = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id || isNaN(id)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid role ID',
            });
        }

        const roleId = parseInt(id);

        // ✅ Fetch only non-deleted users
        const users = await prisma.users.findMany({
            where: {
                role_id: roleId,
                deletedAt: null, // ✅ Explicit filter
            },
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                created_at: true,
            },
        });

        return res.status(200).json({
            success: true,
            count: users.length,
            users,
        });
    } catch (error) {
        console.error('Error fetching users by role:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to fetch users',
            message: error.message,
        });
    }
};
