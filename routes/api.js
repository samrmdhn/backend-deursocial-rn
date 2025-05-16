import express from "express";
import * as SettingControllers from "../apps/index.js";
import * as HomepageControllers from "../apps/index.js";
import * as GroupsControllers from "../apps/index.js";
import * as ChatGroupsControllers from "../apps/index.js";
import * as PostControllers from "../apps/index.js";
import * as UsersControllers from "../apps/index.js";
import * as SearchControllers from "../apps/index.js";
import { verifyToken } from "../apps/middlewares/verifyToken.js";

const api = express.Router();
api.get("/api/kadieu", verifyToken, SettingControllers.visitorToken);
api.get("/api/citys", verifyToken, SettingControllers.getCitys);
api.post("/api/citys", verifyToken, SettingControllers.createCitys);
api.get("/api/vanues", verifyToken, SettingControllers.getVanues);
api.post("/api/vanues", verifyToken, SettingControllers.createVanues);
api.post("/api/register", SettingControllers.createUsers);
api.post("/api/login", SettingControllers.loginUsers);

api.get("/api/groups/:contentDetailSlugs", GroupsControllers.getGroups);
api.get("/api/groups/detail/:slugs", GroupsControllers.getGroupsDetail);
api.post("/api/groups/:slug", verifyToken, GroupsControllers.createGroups);
// api.post("/api/join/groups", verifyToken, GroupsControllers.joinMemberToGroups);
api.post("/api/join/group/:slug", verifyToken, GroupsControllers.joinMemberToGroups);
api.post("/api/approve/member/:slug", verifyToken, GroupsControllers.approveMember);
api.get("/api/get/member/group/:slugGroup", GroupsControllers.getMemberNeedApprovalGroup);
api.delete("/api/removed/group/:slugGroup", verifyToken, GroupsControllers.deleteGroup);
api.delete("/api/leave/group/:slugGroup", verifyToken, GroupsControllers.leaveGroup);


api.get("/api/homepages", HomepageControllers.homepage);
api.post("/api/display/types", verifyToken, HomepageControllers.createDisplayTypes);
api.post("/api/display/types/:id", verifyToken, HomepageControllers.updateDisplayTypes);
api.get("/api/display/types", verifyToken, HomepageControllers.getDisplayTypes);
api.post("/api/contents", verifyToken, HomepageControllers.createContents);
api.post("/api/contents/:id", verifyToken, HomepageControllers.updateContents);
api.get("/api/contents", verifyToken, HomepageControllers.getContents);
api.get("/api/contents/:slug", verifyToken, HomepageControllers.getContentsData);
api.get("/api/event/organizers", verifyToken, HomepageControllers.getEventOrganizers);
api.post("/api/event/organizers", verifyToken, HomepageControllers.createEventOrganizers);
api.get("/api/type/content/detail", verifyToken, HomepageControllers.getTypeContentDetails);
api.post("/api/type/content/detail", verifyToken, HomepageControllers.createTypeContentDetails);
api.get("/api/tags", verifyToken, HomepageControllers.getTags);
api.post("/api/tags", verifyToken, HomepageControllers.createTags);
api.post("/api/follow/event", verifyToken, HomepageControllers.followEvent);
api.get("/api/actress", verifyToken, HomepageControllers.getActress);
api.post("/api/actress", verifyToken, HomepageControllers.createActress);
api.get("/api/content/details/:slug", HomepageControllers.getContentDetails);
api.post("/api/content/details", verifyToken, HomepageControllers.createContentDetails);
api.post("/api/check/auth", HomepageControllers.checkAuth);

api.post("/api/sendMessage/:groupSlugs", ChatGroupsControllers.sendMessageToGroup);
api.get("/api/group/messages", verifyToken, ChatGroupsControllers.getGroupsMessages);


api.post("/api/user/existing/:type", verifyToken,UsersControllers.checkExistingDataUser);
api.get("/api/user/detail/:username", verifyToken, UsersControllers.getDetailUser);
api.post("/api/user", verifyToken, UsersControllers.updateDataUser);
api.post("/api/follow/:username", verifyToken, UsersControllers.followUser);


api.post("/api/create/post", verifyToken, PostControllers.createPostContentDetail);
api.post("/api/comment/post/:slugPostContentDetail", verifyToken, PostControllers.commentPostPerContentDetail);
api.get("/api/comment/post/:slugPostContentDetail", verifyToken, PostControllers.commentGetPerContentDetail);
api.post("/api/like/post/:slugPostContentDetail", verifyToken, PostControllers.likePostPerContentDetail);
api.get("/api/post", PostControllers.getPost);
api.delete("/api/detail/post/:slugPostContentDetail", verifyToken, PostControllers.deleteDetailPostPerContentDetail);
api.get("/api/detail/post/:slugPostContentDetail", verifyToken, PostControllers.getDetailPostPerContentDetail);


api.get("/api/search/:type", verifyToken, SearchControllers.searchData);

api.get("/api/city", SearchControllers.getDataCity);

api.get("/api/like/post/profile/:username", verifyToken, PostControllers.getLikePostContentDetail)
api.get("/api/comment/post/profile/:username", verifyToken, PostControllers.getCommentPostContentDetail)
api.get("/api/moment/post/profile/:username", verifyToken, PostControllers.getMomentPostContentDetail)
api.get("/api/followers/post/profile/:username", PostControllers.getFollowerOnProfile)

api.get("/api/check/username/:username", verifyToken, UsersControllers.checkUsername)
app.get('/pink', (req, res) => {
  res.send({ message: 'ponk' });
});
export default api;
