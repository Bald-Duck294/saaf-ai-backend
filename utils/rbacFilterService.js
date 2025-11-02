import prisma from "../config/prismaClient.mjs";

// services/rbacFilterService.js
const ROLES = {
  SUPER_ADMIN: 1,
  ADMIN: 2,
  SUPERVISOR: 3,
  FELLOW: 4,
  CLEANER: 5
};

class RBACFilterService {

  static async getLocationFilter(user, type) {
    // Null check
    console.log(user, "user from get loc filter")
    if (!user) {
      return { id: -1 };  // No access
    }


    const { role_id, company_id, id: user_id } = user;


    // Super Admin - see everything
    if (role_id === ROLES.SUPER_ADMIN) {
      return {};
    }

    // Admin - see own company only
    if (role_id === ROLES.ADMIN) {
      return { company_id };
    }


    // Supervisor/Fellow/Cleaner - only assigned locations
    try {
      const assignments = await prisma.cleaner_assignments.findMany({
        where: {
          cleaner_user_id: user_id,
          released_on: null
        },
        select: { location_id: true }
      });

      const locationIds = assignments.map(a => a.location_id).filter(Boolean);

      if (locationIds.length === 0) {
        return { id: -1 };  // No assignments
      }

      if (type === "cleaner_activity") {
        return { location_id: { in: locationIds } };  // ← IN operator
      }
      else if (type === "user_activity") {
        return { toilet_id: { in: locationIds } }
      }
      else {
        return { id: { in: locationIds } };  // ← IN operator

      }

    } catch (error) {
      console.error('Error in getLocationFilter:', error);
      return { id: -1 };  // Fail safe
    }
  }
}

export default RBACFilterService;
