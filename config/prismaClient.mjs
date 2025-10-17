// // ES Module-compatible import for CommonJS modules
// import pkg from '@prisma/client';
// const { PrismaClient } = pkg;
// import { softDeleteMiddleware } from '../prisma/softDeleteMiddleware.js';
// const prisma = new PrismaClient();
// // softDeleteMiddleware(prisma);
// prisma.$use(softDeleteMiddleware);

// export default prisma;


// config/prismaClient.mjs
import { PrismaClient } from '@prisma/client';

const basePrisma = new PrismaClient();

const prisma = basePrisma.$extends({
  name: 'softDelete',
  query: {
    // Soft delete for users
    users: {
      async delete({ args, query }) {
        return basePrisma.users.update({
          ...args,
          data: { deletedAt: new Date() }
        });
      },
      async deleteMany({ args, query }) {
        return basePrisma.users.updateMany({
          ...args,
          data: { deletedAt: new Date() }
        });
      },
      async findMany({ args, query }) {
        args.where = { ...args.where, deletedAt: null };
        return query(args);
      },
      async findFirst({ args, query }) {
        args.where = { ...args.where, deletedAt: null };
        return query(args);
      },
      async findUnique({ args, query }) {
        return basePrisma.users.findFirst({
          ...args,
          where: { ...args.where, deletedAt: null }
        });
      },
      async update({ args, query }) {
        args.where = { ...args.where, deletedAt: null };
        return query(args);
      },
      async updateMany({ args, query }) {
        args.where = { ...args.where, deletedAt: null };
        return query(args);
      }
    },

    // Soft delete for locations
    locations: {
      async delete({ args, query }) {
        return basePrisma.locations.update({
          ...args,
          data: { deletedAt: new Date() }
        });
      },
      async deleteMany({ args, query }) {
        return basePrisma.locations.updateMany({
          ...args,
          data: { deletedAt: new Date() }
        });
      },
      async findMany({ args, query }) {
        args.where = { ...args.where, deletedAt: null };
        return query(args);
      },
      async findFirst({ args, query }) {
        args.where = { ...args.where, deletedAt: null };
        return query(args);
      },
      async findUnique({ args, query }) {
        return basePrisma.locations.findFirst({
          ...args,
          where: { ...args.where, deletedAt: null }
        });
      },
      async update({ args, query }) {
        args.where = { ...args.where, deletedAt: null };
        return query(args);
      },
      async updateMany({ args, query }) {
        args.where = { ...args.where, deletedAt: null };
        return query(args);
      }
    },

    // Soft delete for companies
    companies: {
      async delete({ args, query }) {
        return basePrisma.companies.update({
          ...args,
          data: { deletedAt: new Date() }
        });
      },
      async deleteMany({ args, query }) {
        return basePrisma.companies.updateMany({
          ...args,
          data: { deletedAt: new Date() }
        });
      },
      async findMany({ args, query }) {
        args.where = { ...args.where, deletedAt: null };
        return query(args);
      },
      async findFirst({ args, query }) {
        args.where = { ...args.where, deletedAt: null };
        return query(args);
      },
      async findUnique({ args, query }) {
        return basePrisma.companies.findFirst({
          ...args,
          where: { ...args.where, deletedAt: null }
        });
      },
      async update({ args, query }) {
        args.where = { ...args.where, deletedAt: null };
        return query(args);
      },
      async updateMany({ args, query }) {
        args.where = { ...args.where, deletedAt: null };
        return query(args);
      }
    },
    // Soft delete for companies
    location_types: {
      async delete({ args, query }) {
        return basePrisma.location_types.update({
          ...args,
          data: { deletedAt: new Date() }
        });
      },
      async deleteMany({ args, query }) {
        return basePrisma.location_types.updateMany({
          ...args,
          data: { deletedAt: new Date() }
        });
      },
      async findMany({ args, query }) {
        args.where = { ...args.where, deletedAt: null };
        return query(args);
      },
      async findFirst({ args, query }) {
        args.where = { ...args.where, deletedAt: null };
        return query(args);
      },
      async findUnique({ args, query }) {
        return basePrisma.location_types.findFirst({
          ...args,
          where: { ...args.where, deletedAt: null }
        });
      },
      async update({ args, query }) {
        args.where = { ...args.where, deletedAt: null };
        return query(args);
      },
      async updateMany({ args, query }) {
        args.where = { ...args.where, deletedAt: null };
        return query(args);
      }
    }
  }
});

export default prisma;
