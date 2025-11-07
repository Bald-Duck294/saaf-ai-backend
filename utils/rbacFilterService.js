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

  static async getLocationFilter(user, type,) {
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
          released_on: null,
          // NOT: {
          //   role_id: role_id
          // }
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

  static async getUserFilter(currentUser) {
    // Null check
    if (!currentUser) {
      return { id: -1 };  // No access
    }

    const { role_id, id: user_id } = currentUser;

    // Super Admin - see everything
    if (role_id === ROLES.SUPER_ADMIN) {
      return {};
    }


    if (role_id === ROLES.ADMIN) {
      return {};
    }

    if (role_id === ROLES.SUPERVISOR) {
      try {
        const supervisorAssignments = await prisma.cleaner_assignments.findMany({
          where: {
            cleaner_user_id: user_id,
            released_on: null
          },
          select: { location_id: true }
        });

        const supervisorLocationIds = supervisorAssignments
          .map(a => a.location_id)
          .filter(Boolean);

        if (supervisorLocationIds.length === 0) {
          return { id: -1 };  // No locations assigned to supervisor
        }

        const cleanerAssignments = await prisma.cleaner_assignments.findMany({
          where: {
            location_id: { in: supervisorLocationIds },
            released_on: null
          },
          select: { cleaner_user_id: true }
        });

        const cleanerUserIds = [...new Set(
          cleanerAssignments.map(a => a.cleaner_user_id).filter(Boolean)
        )];

        if (cleanerUserIds.length === 0) {
          return { id: -1 };  // No cleaners in supervisor's locations
        }

        // Step 3: Return filter for user IDs
        return { id: { in: cleanerUserIds } };

      } catch (error) {
        console.error('Error in getUserFilter:', error);
        return { id: -1 };
      }
    }

    return {};
  }

  // static async getUserFilter(currentUser, type) {

  //   if (currentUser) {
  //     return { id: -1 }
  //   }

  //   if (currentUser.role_id = ROLES.SUPER_ADMIN) {
  //     return {};
  //   }

  //   if (currentUser.role_id === ROLES.ADMIN) {
  //     return {}
  //   }

  //   if (currentUser.role_id === ROLES.SUPERVISOR) {

  //     const supervisorData = await prisma.cleaner_assignments.findMany({
  //       where: {
  //         cleaner_user_id: currentUser?.id,
  //         company_id: currentUser?.company_id,
  //         role_id: currentUser?.role_id
  //       }
  //     })
  //   }

  //   supervisorLocationId = supervisorData.map((item) => item.location_id);

  //   if (supervisorLocationId) {
  //     return {
  //       success: false,
  //       message: 'No assignment found'
  //     }
  //   }

  //   const cleanerData = await prisma.cleaner_assignments.findMany({
  //     where: {
  //       location_id: { in: supervisorLocationId }
  //     }
  //   })

  //   const cleaner_user_id = cleanerData.map((item) => item.cleaner_user_id);


  //   if (type == 'getUser') {
  //     return { id: { in: cleaner_user_id } }
  //   }
  //   else {
  //     return { id: { in: cleaner_user_id } }
  //   }



  // }


}

export default RBACFilterService;
