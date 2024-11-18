import express from "express";
import * as SettingControllers from "../apps/index.js";
import * as HomepageControllers from "../apps/index.js";
import * as GroupsControllers from "../apps/index.js";
import { verifyToken } from "../apps/middlewares/verifyToken.js";

const api = express.Router();
api.get("/api/kadieu", verifyToken, SettingControllers.visitorToken);
api.get("/api/citys", verifyToken, SettingControllers.getCitys);
api.post("/api/citys", verifyToken, SettingControllers.createCitys);
api.get("/api/vanues", verifyToken, SettingControllers.getVanues);
api.post("/api/vanues", verifyToken, SettingControllers.createVanues);
api.post("/api/registers", verifyToken, SettingControllers.createUsers);

api.get("/api/groups/:contentDetailSlugs", verifyToken, GroupsControllers.getGroups);
api.get("/api/groups/detail/:slugs", verifyToken, GroupsControllers.getGroupsDetail);
api.post("/api/groups", verifyToken, GroupsControllers.createGroups);
api.post("/api/join/groups", verifyToken, GroupsControllers.joinMemberToGroups);

api.get("/api/homepages", HomepageControllers.homepage);
api.post("/api/display/types", verifyToken, HomepageControllers.createDisplayTypes);
api.post("/api/display/types/:id", verifyToken, HomepageControllers.updateDisplayTypes);
api.get("/api/display/types", verifyToken, HomepageControllers.getDisplayTypes);
api.post("/api/contents", verifyToken, HomepageControllers.createContents);
api.post("/api/contents/:id", verifyToken, HomepageControllers.updateContents);
api.get("/api/contents", verifyToken, HomepageControllers.getContents);
api.get("/api/event/organizers", verifyToken, HomepageControllers.getEventOrganizers);
api.post("/api/event/organizers", verifyToken, HomepageControllers.createEventOrganizers);
api.get("/api/type/content/detail", verifyToken, HomepageControllers.getTypeContentDetails);
api.post("/api/type/content/detail", verifyToken, HomepageControllers.createTypeContentDetails);
api.get("/api/tags", verifyToken, HomepageControllers.getTags);
api.post("/api/tags", verifyToken, HomepageControllers.createTags);
api.post("/api/follow/event", verifyToken, HomepageControllers.followEvent);

api.get("/api/actress", verifyToken, HomepageControllers.getActress);
api.post("/api/actress", verifyToken, HomepageControllers.createActress);
api.get("/api/content/details/:slug", verifyToken, HomepageControllers.getContentDetails);
api.post("/api/content/details", verifyToken, HomepageControllers.createContentDetails);
export default api;
