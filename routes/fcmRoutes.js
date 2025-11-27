import { Router } from "express";
import { deleteFcmToken, saveFCMToken } from "../controller/fcmController.js";

const fcmRoutes = Router();


fcmRoutes.post('/save-fcm-token', saveFCMToken)

fcmRoutes.delete('/delete-fcm-token', deleteFcmToken)

export default fcmRoutes;