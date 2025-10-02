import prisma from "../config/prismaClient.mjs";
import bcrypt from "bcryptjs";
import express from 'express';

export async function getUser(req, res) {

  try {

    const { companyId } = req.query;

    console.log(companyId, "companyId")
    const users = await prisma.users.findMany({
      where: {
        company_id: companyId,
      },

      include: {
        role: true
      }
    });
    // console.log(users, "users");

    // Convert BigInt to string
    const usersWithStringIds = users.map((user) => ({
      ...user,
      id: user.id.toString(),
      company_id: user.company_id?.toString() || null,
    }));

    console.log(usersWithStringIds, "ids");
    res.json(usersWithStringIds);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching users");
  }
}


// export async function getUserById(req, res) {
//   try {
//     const { id } = req.params;
//     console.log('Getting user by ID:', id);

//     const user = await prisma.users.findUnique({
//       where: { id: BigInt(id) },
//       include: {
//         role: {
//           select: {
//             id: true,
//             name: true,
//             description: true
//           }
//         },
//         companies: {
//           select: {
//             id: true,
//             name: true,
//             description: true
//           }
//         },
//         location_assignments: {
//           where: { is_active: true },
//           include: {
//             location: {
//               select: {
//                 id: true,
//                 name: true,
//                 latitude: true,
//                 longitude: true
//               }
//             }
//           }
//         },
//         // Include other relationships if needed
//         cleaner_assignments_as_cleaner: {
//           include: {
//             locations: {
//               select: { id: true, name: true }
//             }
//           }
//         },
//         cleaner_assignments_as_supervisor: {
//           include: {
//             locations: {
//               select: { id: true, name: true }
//             }
//           }
//         }
//       }
//     });

//     console.log(user, "user")
//     if (!user) {
//       return res.status(404).json({ message: "User not found" });
//     }

//     // Convert BigInt to string and format response
//     const safeUser = {
//       ...user,
//       id: user.id.toString(),
//       company_id: user.company_id?.toString() || null,
//       location_assignments: user.location_assignments?.map(assignment => ({
//         ...assignment,
//         id: assignment.id.toString(),
//         location_id: assignment.location_id.toString(),
//         user_id: assignment.user_id.toString(),
//         location: {
//           ...assignment.location,
//           id: assignment.location.id.toString()
//         }
//       })) || [],
//       cleaner_assignments_as_cleaner: user.cleaner_assignments_as_cleaner?.map(assignment => ({
//         ...assignment,
//         id: assignment.id.toString(),
//         cleaner_user_id: assignment.cleaner_user_id.toString(),
//         location_id: assignment.location_id?.toString() || null,
//         locations: assignment.locations ? {
//           ...assignment.locations,
//           id: assignment.locations.id.toString()
//         } : null
//       })) || [],
//       cleaner_assignments_as_supervisor: user.cleaner_assignments_as_supervisor?.map(assignment => ({
//         ...assignment,
//         id: assignment.id.toString(),
//         supervisor_id: assignment.supervisor_id?.toString() || null,
//         location_id: assignment.location_id?.toString() || null,
//         locations: assignment.locations ? {
//           ...assignment.locations,
//           id: assignment.locations.id.toString()
//         } : null
//       })) || []
//     };

//     console.log('User found:', safeUser.name);
//     res.json(safeUser);
//   } catch (err) {
//     console.error('Error in getUserById:', err);
//     res.status(500).json({ message: "Error fetching user", error: err.message });
//   }
// }



// ✅ ALTERNATIVE: Manual conversion for better control
export async function getUserById(req, res) {
  try {
    const { id } = req.params;
    console.log('Getting user by ID:', id);

    const user = await prisma.users.findUnique({
      where: { id: BigInt(id) },
      include: {
        role: true,
        companies: true,
        location_assignments: {
          where: { is_active: true },
          include: {
            location: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // ✅ Manual conversion with proper handling
    const safeUser = {
      id: user.id.toString(),
      name: user.name,
      email: user.email,
      phone: user.phone,
      company_id: user.company_id?.toString() || null,
      age: user.age,
      birthdate: user.birthdate,
      role_id: user.role_id,
      created_at: user.created_at,
      updated_at: user.updated_at,

      // Role data
      role: user.role ? {
        id: user.role.id,
        name: user.role.name,
        description: user.role.description
      } : null,

      // Company data  
      companies: user.companies ? {
        id: user.companies.id.toString(), // ✅ Convert company BigInt
        name: user.companies.name,
        description: user.companies.description
      } : null,

      // Location assignments
      location_assignments: user.location_assignments?.map(assignment => ({
        id: assignment.id.toString(),
        location_id: assignment.location_id.toString(),
        user_id: assignment.user_id.toString(),
        is_active: assignment.is_active,
        assigned_at: assignment.assigned_at,
        location: assignment.location ? {
          id: assignment.location.id.toString(),
          name: assignment.location.name,
          latitude: assignment.location.latitude,
          longitude: assignment.location.longitude
        } : null
      })) || []
    };

    console.log('User found:', safeUser.name);
    res.json(safeUser);
  } catch (err) {
    console.error('Error in getUserById:', err);
    res.status(500).json({ message: "Error fetching user", error: err.message });
  }
}


// Handles POST /api/users
export const createUser = async (req, res) => {
  console.log('in create user', req.body);
  try {
    console.log('one');
    const { password, location_ids = [], ...data } = req.body;
    if (!password) {
      return res.status(400).json({ message: "Password is required" });
    }

    console.log('two');
    const hashedPassword = await bcrypt.hash(password, 10);

    console.log('new user', hashedPassword);

    const newUser = await prisma.users.create({
      data: {
        ...data,
        password: hashedPassword,
        birthdate: (data?.birthdate) ? new Date(data?.birthdate) : null,
        ...(location_ids.length > 0 && {
          location_assignments: {
            create: location_ids.map((locId) => ({
              location_id: BigInt(locId),
            })),
          },
        }),
      },
    });

    console.log(newUser, "new user");

    const safeUser = JSON.parse(JSON.stringify(newUser, (key, value) =>
      typeof value === 'bigint' ? value.toString() : value
    ));

    console.log(safeUser, "safe user");
    res.status(201).json(safeUser);
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ message: `User with this ${error.meta.target.join(', ')} already exists.` });
    }
    console.log(error?.message, "msg")
    res.status(500).json({ message: "Error creating user", error: error.message });
  }
};



// --- UPDATE USER ---
// Handles PUT /api/users/:id
export const updateUser = async (req, res) => {

  const userId = BigInt(req.params.id);
  try {
    const { password, location_ids, ...data } = req.body;

    if (password) {
      data.password = await bcrypt.hash(password, 10);
    }
    if (data.birthdate) {
      data.birthdate = new Date(data.birthdate);
    }
    const updatedUser = await prisma.$transaction(async (tx) => {
      const user = await tx.users.update({ where: { id: userId }, data });

      if (location_ids) { // Only update locations if the array is provided
        await tx.locationAssignment.updateMany({
          where: { user_id: userId },
          data: { is_active: false },
        });

        if (location_ids.length > 0) {
          for (const locId of location_ids) {
            await tx.locationAssignment.upsert({
              where: { location_id_user_id: { user_id: userId, location_id: BigInt(locId) } },
              update: { is_active: true },
              create: { user_id: userId, location_id: BigInt(locId) },
            });
          }
        }
      }
      return user;
    });

    const safeUser = JSON.parse(JSON.stringify(updatedUser, (key, value) =>
      typeof value === 'bigint' ? value.toString() : value
    ));


    res.status(200).json({
      ...safeUser,
      birthdate: (safeUser?.birthdate) ? new Date(safeUser?.birthdate) : null
    });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ message: `User with this ${error.meta.target.join(', ')} already exists.` });
    }
    console.log(error, "error in update users");
    res.status(500).json({ message: "Error updating user", error: error.message });
  }
}
// --- DELETE USER ---
// Handles DELETE /api/users/:id

export const deleteUser = async (req, res) => {
  const userId = BigInt(req.params.id);
  try {
    await prisma.users.delete({ where: { id: userId } });
    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting user", error: error.message });
  }
}