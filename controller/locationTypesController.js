import prisma from "../config/prismaClient.mjs";

// GET /api/location-types
export const getAllLocationTypes = async (req, res) => {
  const { companyId } = req.query;
  // console.log(companyId, "companyId")
  let whereClause = {};

  //  here i am Checking for both undefined and "undefined" string as in 
  // query parameter it comes as url where undefined is  the actula valude but present in string 
  //  hence checking for both 
  if (companyId && companyId !== 'undefined' && companyId !== 'null') {
    // console.log('here in company_id')
    whereClause.company_id = BigInt(companyId); // ✅ Correct field name
  }


  try {
    const types = await prisma.location_types.findMany({
      where: whereClause,
      orderBy: { id: "asc" },
    });

    // console.log(types, "types");
    const updatedTypes = types.map((item) => ({
      ...item,
      id: item.id.toString(),
      parent_id: item.parent_id?.toString() || null,
      company_id: item.company_id.toString(),
      //   company_id: BigInt(),
    }));

    res.json(updatedTypes);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch location types" });
  }
};

// POST /api/location-types
export const createLocationType = async (req, res) => {
  console.log("in create location type");
  const { companyId } = req.query;

  console.log('companyId:', companyId, 'type:', typeof companyId);

  // Validate companyId
  const isValidCompanyId = (id) => {
    return id &&
      id !== 'undefined' &&
      id !== 'null' &&
      !isNaN(Number(id)) &&
      Number(id) > 0;
  };

  // Company ID is required for creating location types
  if (!isValidCompanyId(companyId)) {
    return res.status(400).json({
      message: "Valid company ID is required to create location type"
    });
  }

  try {
    const { name, parent_id, is_toilet } = req.body;

    // Validate required fields
    if (!name || name.trim() === '') {
      return res.status(400).json({
        message: "Location type name is required"
      });
    }

    // Create the location type with company_id from query parameter
    const newType = await prisma.location_types.create({
      data: {
        name: name.trim(),
        parent_id: parent_id ? BigInt(parent_id) : null,
        is_toilet: Boolean(is_toilet), // Ensure it's a boolean
        company_id: BigInt(companyId), // ✅ Use companyId from query parameter
      },
    });

    // Serialize BigInt values to strings
    const serialized = {
      ...newType,
      id: newType.id.toString(),
      parent_id: newType.parent_id?.toString() || null,
      company_id: newType.company_id.toString(),
    };

    console.log('Created location type:', serialized);

    res.status(201).json({
      success: true,
      message: "Location type created successfully",
      data: serialized
    });

  } catch (err) {
    console.error('Error creating location type:', err);

    // Handle specific Prisma errors
    if (err.code === 'P2002') {
      return res.status(400).json({
        message: "A location type with this name already exists for this company"
      });
    }

    if (err.code === 'P2003') {
      return res.status(400).json({
        message: "Invalid parent location type or company reference"
      });
    }

    res.status(500).json({
      message: "Failed to create location type",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};


// PATCH /api/location-types/:id
// PATCH /api/location-types/:id


export const updateLocationType = async (req, res) => {
  console.log("update location types");
  const { id } = req.params;
  const { name, parent_id } = req.body;

  console.log(id, name, parent_id, "parent id");

  try {
    const data = {};

    if (name !== undefined) data.name = name;
    if (parent_id !== undefined)
      data.parent_id = parent_id ? BigInt(parent_id) : null;

    const updated = await prisma.location_types.update({
      where: { id: BigInt(id) },
      data,
    });

    res.json({
      ...updated,
      id: updated.id.toString(),
      parent_id: updated.parent_id?.toString() || null,
      company_id: updated.company_id.toString(),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update location type" });
  }
};

// PATCH /api/location-types/:id/mark-toilet
export const markAsToilet = async (req, res) => {
  const { id } = req.params;

  try {
    const updated = await prisma.location_types.update({
      where: { id: BigInt(id) },
      data: {
        is_toilet: true,
      },
    });

    res.json({
      ...updated,
      id: updated.id.toString(),
      parent_id: updated.parent_id?.toString() || null,
      company_id: updated.company_id.toString(),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to mark as toilet" });
  }
};

// GET /api/location-types/tree
export const getLocationTypeTree = async (req, res) => {

  const { companyId } = req.body;

  console.log(companyId, "get companyId from location type")
  try {
    const all = await prisma.location_types.findMany({
      where: { company_id: BigInt(1) },
      orderBy: { id: "asc" },
    });

    const map = {};
    const roots = [];

    all.forEach((t) => {
      const tId = t.id.toString();
      map[tId] = {
        ...t,
        id: tId,
        parent_id: t.parent_id?.toString() || null,
        company_id: t.company_id.toString(),
        children: [],
      };
    });

    all.forEach((t) => {
      const tId = t.id.toString();
      const parentId = t.parent_id?.toString();

      if (parentId && map[parentId]) {
        map[parentId].children.push(map[tId]);
      } else {
        roots.push(map[tId]);
      }
    });

    res.json(roots);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch location type tree" });
  }
};


// DELETE /api/location-types/:id
export const deleteLocationType = async (req, res) => {
  const { id } = req.params;
  const { companyId } = req.query;

  try {
    // Check if location type exists
    const existingType = await prisma.location_types.findUnique({
      where: { id: BigInt(id) },
      include: {
        other_location_types: true, // Check for children
        locations: true, // Check for locations using this type
      }
    });

    if (!existingType) {
      return res.status(404).json({
        success: false,
        message: "Location type not found"
      });
    }

    // Check for children
    if (existingType.other_location_types.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete location type with child types. Delete children first."
      });
    }

    // Check for locations using this type
    if (existingType.locations.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete location type. ${existingType.locations.length} location(s) are using this type.`
      });
    }

    // Delete the location type (soft delete via middleware)
    await prisma.location_types.delete({
      where: { id: BigInt(id) }
    });

    res.json({
      success: true,
      message: "Location type deleted successfully"
    });

  } catch (err) {
    console.error("Error deleting location type:", err);
    res.status(500).json({
      success: false,
      message: "Failed to delete location type",
      error: err.message
    });
  }
};
