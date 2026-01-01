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

  // static async getUserFilter(currentUser) {
  //   // Null check
  //   if (!currentUser) {
  //     return { id: -1 };  // No access
  //   }

  //   const { role_id, id: user_id } = currentUser;

  //   // Super Admin - see everything
  //   if (role_id === ROLES.SUPER_ADMIN) {
  //     return {};
  //   }


  //   if (role_id === ROLES.ADMIN) {
  //     return {};
  //   }

  //   if (role_id === ROLES.SUPERVISOR) {
  //     try {
  //       const supervisorAssignments = await prisma.cleaner_assignments.findMany({
  //         where: {
  //           cleaner_user_id: user_id,
  //           released_on: null
  //         },
  //         select: { location_id: true }
  //       });

  //       const supervisorLocationIds = supervisorAssignments
  //         .map(a => a.location_id)
  //         .filter(Boolean);

  //       if (supervisorLocationIds.length === 0) {
  //         return { id: -1 };  // No locations assigned to supervisor
  //       }

  //       const cleanerAssignments = await prisma.cleaner_assignments.findMany({
  //         where: {
  //           location_id: { in: supervisorLocationIds },
  //           released_on: null
  //         },
  //         select: { cleaner_user_id: true }
  //       });

  //       const cleanerUserIds = [...new Set(
  //         cleanerAssignments.map(a => a.cleaner_user_id).filter(Boolean)
  //       )];

  //       if (cleanerUserIds.length === 0) {
  //         return { id: -1 };  // No cleaners in supervisor's locations
  //       }

  //       // Step 3: Return filter for user IDs
  //       return { id: { in: cleanerUserIds } };

  //     } catch (error) {
  //       console.error('Error in getUserFilter:', error);
  //       return { id: -1 };
  //     }
  //   }

  //   return {};
  // }

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

  // static async getUserFilter(currentUser) {
  //   // Null check
  //   if (!currentUser) {
  //     return { id: -1 };  // No access
  //   }

  //   const { role_id, company_id, id: user_id } = currentUser;

  //   // Super Admin - see all users
  //   if (role_id === ROLES.SUPER_ADMIN) {
  //     return {};
  //   }

  //   // Admin - see all users in their company
  //   if (role_id === ROLES.ADMIN) {
  //     return { company_id };  // Filter by company
  //   }

  //   // Supervisor - see only cleaners assigned to their locations
  //   if (role_id === ROLES.SUPERVISOR) {
  //     try {
  //       // Step 1: Get supervisor's assigned locations
  //       const supervisorAssignments = await prisma.cleaner_assignments.findMany({
  //         where: {
  //           cleaner_user_id: user_id,
  //           released_on: null,
  //           deleted_at: null  // Respect soft delete
  //         },
  //         select: { location_id: true }
  //       });

  //       const supervisorLocationIds = supervisorAssignments
  //         .map(a => a.location_id)
  //         .filter(Boolean);

  //       if (supervisorLocationIds.length === 0) {
  //         return { id: -1 };  // No locations assigned
  //       }

  //       // Step 2: Find all users assigned to those same locations
  //       const usersInSameLocations = await prisma.cleaner_assignments.findMany({
  //         where: {
  //           location_id: { in: supervisorLocationIds },
  //           released_on: null,
  //           deleted_at: null
  //         },
  //         select: { cleaner_user_id: true }
  //       });

  //       const userIds = [...new Set(
  //         usersInSameLocations.map(a => a.cleaner_user_id).filter(Boolean)
  //       )];

  //       if (userIds.length === 0) {
  //         return { id: -1 };
  //       }

  //       // Return filter: show users in supervisor's locations + supervisor themselves
  //       return {
  //         id: {
  //           in: [...userIds, user_id]  // Include supervisor in results
  //         }
  //       };

  //     } catch (error) {
  //       console.error('Error in getUserFilter:', error);
  //       return { id: -1 };
  //     }
  //   }

  //   // Other roles (Facility Admin, Facility Supervisor, etc.)
  //   // They see only users in their assigned locations
  //   try {
  //     // Get their assigned locations
  //     const assignments = await prisma.cleaner_assignments.findMany({
  //       where: {
  //         cleaner_user_id: user_id,
  //         released_on: null,
  //         deleted_at: null
  //       },
  //       select: { location_id: true }
  //     });

  //     const locationIds = assignments.map(a => a.location_id).filter(Boolean);

  //     if (locationIds.length === 0) {
  //       return { id: user_id };  // Only see themselves
  //     }

  //     // Find all users in the same locations
  //     const usersInLocations = await prisma.cleaner_assignments.findMany({
  //       where: {
  //         location_id: { in: locationIds },
  //         released_on: null,
  //         deleted_at: null
  //       },
  //       select: { cleaner_user_id: true }
  //     });

  //     const userIds = [...new Set(
  //       usersInLocations.map(a => a.cleaner_user_id).filter(Boolean)
  //     )];

  //     return {
  //       id: {
  //         in: userIds.length > 0 ? userIds : [user_id]
  //       }
  //     };

  //   } catch (error) {
  //     console.error('Error in getUserFilter:', error);
  //     return { id: user_id };  // Fail-safe: only see themselves
  //   }
  // }

  static async getUserFilter(currentUser) {
    // Null check
    if (!currentUser) return { id: -1 };

    const { role_id, company_id, id: userId } = currentUser;

    // ✅ Role 1: Super Admin - see all users
    if (role_id === 1) {
      return {}; // No filter
    }

    // ✅ Role 2: Admin - see all users in their company
    if (role_id === 2) {
      return { company_id };
    }

    // ✅ Role 6: Zonal Admin - Get type_id, find locations, find users
    if (role_id === 6) {
      try {
        // Get type_id (zone) assigned to this Zonal Admin
        const assignments = await prisma.cleaner_assignments.findMany({
          where: {
            cleaner_user_id: userId,
            released_on: null,
            deleted_at: null
          },
          select: { type_id: true }
        });

        const typeIds = [...new Set(assignments.map(a => a.type_id).filter(Boolean))];

        if (typeIds.length === 0) {
          return { id: userId };
        }

        // Get all locations with these type_ids
        const locationsInZone = await prisma.locations.findMany({
          where: {
            type_id: { in: typeIds },
            company_id,
            deleted_at: null
          },
          select: { id: true }
        });

        const locationIds = locationsInZone.map(loc => loc.id);

        if (locationIds.length === 0) {
          return { id: userId };
        }

        // Get all users assigned to those locations
        const usersInLocations = await prisma.cleaner_assignments.findMany({
          where: {
            location_id: { in: locationIds },
            released_on: null,
            deleted_at: null
          },
          select: { cleaner_user_id: true }
        });

        const userIds = [...new Set(usersInLocations.map(a => a.cleaner_user_id))];

        return {
          id: { in: userIds.length > 0 ? [...userIds, userId] : [userId] }
        };
      } catch (error) {
        console.error('Error in getUserFilter for Zonal Admin:', error);
        return { id: userId };
      }
    }

    // ✅ Role 3, 7, 8: Supervisor, Facility Supervisor, Facility Admin
    // ALL use the same logic - get assigned locations, find users

    if (role_id === 3 || role_id === 7 || role_id === 8) {
      try {
        // Get locations assigned to this user
        const whereClause = {
          released_on: null,
          deleted_at: null
        }

        if (role_id === 8) {
          whereClause.role_id = { in: [5, 7] }
        }
        else {
          whereClause.role_id = { in: [5] }
        }

        console.log("finalwhereClause", whereClause);
        const assignments = await prisma.cleaner_assignments.findMany({
          where: {
            cleaner_user_id: userId,
            released_on: null,
            deleted_at: null
          },
          select: { location_id: true }
        });

        const locationIds = assignments.map(a => a.location_id).filter(Boolean);

        if (locationIds.length === 0) {
          return { id: userId }; // No locations assigned yet
        }
        else {
          whereClause.location_id = { in: locationIds }
        }

        // Get all users assigned to those SAME locations
        const usersInLocations = await prisma.cleaner_assignments.findMany({
          where: whereClause,
          select: { cleaner_user_id: true }
        });

        const userIds = [...new Set(usersInLocations.map(a => a.cleaner_user_id))];

        return {
          id: { in: userIds.length > 0 ? [...userIds, userId] : [userId] }
        };
      } catch (error) {
        console.error('Error in getUserFilter:', error);
        return { id: userId };
      }
    }

    // ✅ Role 5: Cleaner - only see themselves
    if (role_id === 5) {
      return { id: userId };
    }

    // ✅ Default: Only see themselves
    return { id: userId };
  }


}

export default RBACFilterService;
