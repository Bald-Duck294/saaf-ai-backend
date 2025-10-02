import express from 'express';
// import { getUser } from '../controller/getDataController.js';
import { createUser, deleteUser, getUser, updateUser, getUserById } from '../controller/userController.js';

const userRouter = express.Router();


userRouter.get('/users', getUser);
userRouter.get('/users/:id', getUserById);
userRouter.post('/users', createUser);
userRouter.post('/users/:id', updateUser)
userRouter.delete('/users/:id', deleteUser)

export default userRouter;