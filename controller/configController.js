// import prisma from "../config/prismaClient.mjs";

// // '/api/configurations/:name'
// // controller/configController.js
// function convertBigInts(obj) {
//   if (Array.isArray(obj)) {
//     return obj.map(convertBigInts);
//   } else if (obj && typeof obj === "object") {
//     return Object.fromEntries(
//       Object.entries(obj).map(([key, value]) => [
//         key,
//         typeof value === "bigint" ? value.toString() : convertBigInts(value),
//       ])
//     );
//   } else {
//     return obj;
//   }
// }

// // Get configuration by Id
// export async function getConfigurationById(req, res) {
//   const { id } = req.params;
//   if (!id) {
//     return res.status(400).json({
//       status: "error",
//       message: "Missing 'id' in request parameters.",
//     });
//   }

//   try {
//     const config = await prisma.configurations.findUnique({
//       where: {
//         id: BigInt(id),
//       },
//     });

//     if (!config) {
//       return res.status(404).json({
//         status: "error",
//         message: `Configuration with id '${id}' not found.`,
//       });
//     }

//     const safeConfig = convertBigInts(config);

//     res.json({
//       status: "success",
//       data: safeConfig,
//       message: "Data retrived Sucessfully !",
//     });
//   } catch (error) {
//     console.error("Error fetching configuration:", error);
//     res
//       .status(500)
//       .json({ status: "error", message: "Internal server error." });
//   }
// }

// // get the cofiguration by name
// export async function getConfigurationByName(req, res) {
//   console.log('Get config by name')
//   const { name } = req.params;
//   console.log(name, "name from the request");

//   if (!name) {
//     return res.status(400).json({
//       status: "error",
//       message: "Missing 'name' in request parameters.",
//     });
//   }

//   try {
//     console.log(`Fetching configuration with name: ${name}`);

//     const config = await prisma.configurations.findMany({
//       where: {
//         name: name,
//       },
//     });

//     if (!config) {
//       return res.status(404).json({
//         status: "error",
//         message: `Configuration with name '${name}' not found.`,
//       });
//     }

//     const safeConfig = convertBigInts(config);

//     res.json({
//       status: "success",
//       data: safeConfig,
//       message: "Data retrived Sucessfully !",
//     });
//   } catch (error) {
//     console.error("Error fetching configuration:", error);
//     res
//       .status(500)
//       .json({ status: "error", message: "Internal server error." });
//   }
// }





import prisma from "../config/prismaClient.mjs";

// Helper function to convert BigInts
import { getAllTemplates, getTemplateByName } from "../constant/configurationTemplates.js";
function convertBigInts(obj) {
  if (Array.isArray(obj)) {
    return obj.map(convertBigInts);
  } else if (obj && typeof obj === "object") {
    return Object.fromEntries(
      Object.entries(obj).map(([key, value]) => [
        key,
        typeof value === "bigint" ? value.toString() : convertBigInts(value),
      ])
    );
  } else {
    return obj;
  }
}

// ✅ Get All Configurations
export async function getAllConfigurations(req, res) {
  const { company_id, is_active, name } = req.query;

  try {
    const whereClause = {};

    if (company_id) {
      whereClause.company_id = BigInt(company_id);
    }
    if (is_active !== undefined) {
      whereClause.is_active = is_active === 'true';
    }
    if (name) {
      whereClause.name = {
        contains: name,
        mode: 'insensitive'
      };
    }

    const configs = await prisma.configurations.findMany({
      where: whereClause,
      orderBy: { updated_at: 'desc' }
    });

    const safeConfigs = convertBigInts(configs);

    res.json({
      status: "success",
      data: safeConfigs,
      message: "Configurations retrieved successfully!"
    });
  } catch (error) {
    console.error("Error fetching configurations:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error."
    });
  }
}

// ✅ Get Configuration by ID (Your existing one - enhanced)
export async function getConfigurationById(req, res) {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({
      status: "error",
      message: "Missing 'id' in request parameters.",
    });
  }

  try {
    const config = await prisma.configurations.findUnique({
      where: {
        id: BigInt(id),
      },
    });

    if (!config) {
      return res.status(404).json({
        status: "error",
        message: `Configuration with id '${id}' not found.`,
      });
    }

    const safeConfig = convertBigInts(config);

    res.json({
      status: "success",
      data: safeConfig,
      message: "Data retrieved successfully!",
    });
  } catch (error) {
    console.error("Error fetching configuration:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error."
    });
  }
}



// ✅ Get available templates
export async function getConfigurationTemplates(req, res) {
  try {
    const templates = getAllTemplates();

    res.json({
      status: "success",
      data: templates,
      message: "Templates retrieved successfully!"
    });
  } catch (error) {
    console.error("Error fetching templates:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error."
    });
  }
}

// ✅ Enhanced getConfigurationByName with template fallback
export async function getConfigurationByName(req, res) {
  console.log('Get config by name');
  const { name } = req.params;
  const { company_id } = req.query;

  if (!name) {
    return res.status(400).json({
      status: "error",
      message: "Missing 'name' in request parameters.",
    });
  }

  try {
    let config = null;

    // Try to get company-specific config first
    if (company_id) {
      config = await prisma.configurations.findFirst({
        where: {
          name: name,
          company_id: BigInt(company_id)
        },
      });
    }

    // If no company-specific config, try global config
    if (!config) {
      config = await prisma.configurations.findFirst({
        where: {
          name: name,
          company_id: null
        },
      });
    }

    // If still no config, check if it's a valid template and return default
    if (!config) {
      const template = getTemplateByName(name);
      if (template) {
        return res.json({
          status: "success",
          data: [{
            name: template.name,
            description: template.defaultSchema,
            is_template_default: true,
            template_info: {
              displayName: template.displayName,
              description: template.description,
              category: template.category
            }
          }],
          message: "Template default retrieved successfully!"
        });
      } else {
        return res.status(404).json({
          status: "error",
          message: `Configuration with name '${name}' not found.`,
        });
      }
    }

    const safeConfig = convertBigInts([config]);

    res.json({
      status: "success",
      data: safeConfig,
      message: "Data retrieved successfully!",
    });
  } catch (error) {
    console.error("Error fetching configuration:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error."
    });
  }
}
// ✅ Get Configuration by Name (Your existing one - enhanced)
// export async function getConfigurationByName(req, res) {
//   console.log('Get config by name');
//   const { name } = req.params;
//   const { company_id } = req.query;
//   console.log(name, "name from the request");
//   console.log(company_id, "company_id from the request");

//   if (!name) {
//     return res.status(400).json({
//       status: "error",
//       message: "Missing 'name' in request parameters.",
//     });
//   }

//   try {
//     console.log(`Fetching configuration with name: ${name}`);

//     const whereClause = { name: name };

//     // If company_id is provided, prioritize company-specific config
//     if (company_id) {
//       whereClause.company_id = BigInt(company_id);
//     }

//     let config = await prisma.configurations.findMany({
//       where: whereClause,
//     });

//     // If no company-specific config found and company_id was provided,
//     // fallback to global config (company_id = null)
//     if ((!config || config.length === 0) && company_id) {
//       config = await prisma.configurations.findMany({
//         where: {
//           name: name,
//           company_id: null
//         },
//       });
//     }

//     if (!config || config.length === 0) {
//       return res.status(404).json({
//         status: "error",
//         message: `Configuration with name '${name}' not found.`,
//       });
//     }

//     const safeConfig = convertBigInts(config);

//     res.json({
//       status: "success",
//       data: safeConfig,
//       message: "Data retrieved successfully!",
//     });
//   } catch (error) {
//     console.error("Error fetching configuration:", error);
//     res.status(500).json({
//       status: "error",
//       message: "Internal server error."
//     });
//   }
// }

// ✅ Create Configuration
export async function createConfiguration(req, res) {
  const { name, description, company_id, is_active, notes } = req.body;

  if (!name) {
    return res.status(400).json({
      status: "error",
      message: "Name is required."
    });
  }

  try {
    // Check if configuration with same name already exists
    const existingConfig = await prisma.configurations.findFirst({
      where: {
        name: name,
        company_id: company_id ? BigInt(company_id) : null
      }
    });

    if (existingConfig) {
      return res.status(400).json({
        status: "error",
        message: "Configuration with this name already exists for this company."
      });
    }

    const config = await prisma.configurations.create({
      data: {
        name,
        description: description || null,
        company_id: company_id ? BigInt(company_id) : null,
        is_active: is_active !== undefined ? is_active : true,
        notes: notes || null,
      },
    });

    const safeConfig = convertBigInts(config);

    res.status(201).json({
      status: "success",
      data: safeConfig,
      message: "Configuration created successfully!"
    });
  } catch (error) {
    console.error("Error creating configuration:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error."
    });
  }
}

// ✅ Update Configuration
export async function updateConfiguration(req, res) {
  const { id } = req.params;
  const { name, description, company_id, is_active, notes } = req.body;

  if (!id) {
    return res.status(400).json({
      status: "error",
      message: "Missing 'id' in request parameters."
    });
  }

  try {
    // Check if configuration exists
    const existingConfig = await prisma.configurations.findUnique({
      where: { id: BigInt(id) }
    });

    if (!existingConfig) {
      return res.status(404).json({
        status: "error",
        message: "Configuration not found."
      });
    }

    const updateData = {
      updated_at: new Date()
    };

    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (company_id !== undefined) {
      updateData.company_id = company_id ? BigInt(company_id) : null;
    }
    if (is_active !== undefined) updateData.is_active = is_active;
    if (notes !== undefined) updateData.notes = notes;

    const config = await prisma.configurations.update({
      where: { id: BigInt(id) },
      data: updateData,
    });

    const safeConfig = convertBigInts(config);

    res.json({
      status: "success",
      data: safeConfig,
      message: "Configuration updated successfully!"
    });
  } catch (error) {
    console.error("Error updating configuration:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error."
    });
  }
}

// ✅ Delete Configuration
export async function deleteConfiguration(req, res) {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({
      status: "error",
      message: "Missing 'id' in request parameters."
    });
  }

  try {
    // Check if configuration exists
    const existingConfig = await prisma.configurations.findUnique({
      where: { id: BigInt(id) }
    });

    if (!existingConfig) {
      return res.status(404).json({
        status: "error",
        message: "Configuration not found."
      });
    }

    await prisma.configurations.delete({
      where: { id: BigInt(id) }
    });

    res.json({
      status: "success",
      message: "Configuration deleted successfully!"
    });
  } catch (error) {
    console.error("Error deleting configuration:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error."
    });
  }
}

// ✅ Toggle Configuration Status (Activate/Deactivate)
export async function toggleConfigurationStatus(req, res) {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({
      status: "error",
      message: "Missing 'id' in request parameters."
    });
  }

  try {
    const existingConfig = await prisma.configurations.findUnique({
      where: { id: BigInt(id) }
    });

    if (!existingConfig) {
      return res.status(404).json({
        status: "error",
        message: "Configuration not found."
      });
    }

    const config = await prisma.configurations.update({
      where: { id: BigInt(id) },
      data: {
        is_active: !existingConfig.is_active,
        updated_at: new Date()
      },
    });

    const safeConfig = convertBigInts(config);

    res.json({
      status: "success",
      data: safeConfig,
      message: `Configuration ${config.is_active ? 'activated' : 'deactivated'} successfully!`
    });
  } catch (error) {
    console.error("Error toggling configuration status:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error."
    });
  }
}

// ✅ Duplicate Configuration (Useful for creating company-specific versions)
export async function duplicateConfiguration(req, res) {
  const { id } = req.params;
  const { company_id, name } = req.body;

  if (!id) {
    return res.status(400).json({
      status: "error",
      message: "Missing 'id' in request parameters."
    });
  }

  try {
    // Get the original configuration
    const originalConfig = await prisma.configurations.findUnique({
      where: { id: BigInt(id) }
    });

    if (!originalConfig) {
      return res.status(404).json({
        status: "error",
        message: "Original configuration not found."
      });
    }

    // Create the duplicate
    const duplicateConfig = await prisma.configurations.create({
      data: {
        name: name || `${originalConfig.name}_copy`,
        description: originalConfig.description,
        company_id: company_id ? BigInt(company_id) : null,
        is_active: false, // Start as inactive
        notes: `Duplicated from ${originalConfig.name} (ID: ${originalConfig.id})`
      },
    });

    const safeDuplicate = convertBigInts(duplicateConfig);

    res.status(201).json({
      status: "success",
      data: safeDuplicate,
      message: "Configuration duplicated successfully!"
    });
  } catch (error) {
    console.error("Error duplicating configuration:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error."
    });
  }
}
