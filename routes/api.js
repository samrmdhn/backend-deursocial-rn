import express from "express";
import * as SettingControllers from "../apps/index.js";
import { verifyToken } from "../apps/middlewares/verifyToken.js";

const api = express.Router();
api.get("/kadieu", verifyToken, SettingControllers.visitorToken);
api.get("/users", verifyToken, SettingControllers.getUsers);
export default api;
