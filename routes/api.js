import express from "express";
// import * as HomepageControllers from "../index.js";
import * as HomepageControllers from "../apps/index.js"

const api = express.Router();
api.get('/users', HomepageControllers.homepage);
export default api;
