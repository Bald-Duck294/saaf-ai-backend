// prisma/softDeleteMiddleware.js
export const softDeleteMiddleware = async (params, next) => {
  const softDeleteModels = ['users', 'locations', 'companies', 'cleaner_review'];
  
  if (softDeleteModels.includes(params.model)) {
    if (params.action === 'delete') {
      params.action = 'update';
      params.args['data'] = { deletedAt: new Date() };
    }
    
    if (params.action === 'deleteMany') {
      params.action = 'updateMany';
      if (params.args.data !== undefined) {
        params.args.data['deletedAt'] = new Date();
      } else {
        params.args['data'] = { deletedAt: new Date() };
      }
    }
    
    if (params.action === 'findUnique' || params.action === 'findFirst') {
      params.action = 'findFirst';
      params.args.where['deletedAt'] = null;
    }
    
    if (params.action === 'findMany') {
      if (params.args.where) {
        if (params.args.where.deletedAt === undefined) {
          params.args.where['deletedAt'] = null;
        }
      } else {
        params.args['where'] = { deletedAt: null };
      }
    }
    
    if (params.action === 'update') {
      params.args.where['deletedAt'] = null;
    }
    
    if (params.action === 'updateMany') {
      if (params.args.where !== undefined) {
        params.args.where['deletedAt'] = null;
      } else {
        params.args['where'] = { deletedAt: null };
      }
    }
  }
  
  return next(params);
};
