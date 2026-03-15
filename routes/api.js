import express from "express";
import * as SettingControllers from "../apps/index.js";
import * as HomepageControllers from "../apps/index.js";
import * as GroupsControllers from "../apps/index.js";
import * as ChatGroupsControllers from "../apps/index.js";
import * as MomentControllers from "../apps/index.js";
import * as PostControllers from "../apps/index.js";
import * as UsersControllers from "../apps/index.js";
import * as SearchControllers from "../apps/index.js";
import * as EmailControllers from "../apps/index.js";
import * as ReportControllers from "../apps/index.js";
import * as UnderGroundControllers from "../apps/index.js";
import * as EventPostsControllers from "../apps/index.js";
import { verifyToken } from "../apps/middlewares/verifyToken.js";
// import { generateDinamicBodyEmail, generateWelcomeEmail, sendMail } from "../libs/Mailist.js";

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


api.post("/api/user/existing/:type", verifyToken, UsersControllers.checkExistingDataUser);
api.get("/api/user/detail/:username", verifyToken, UsersControllers.getDetailUser);
api.post("/api/user", verifyToken, UsersControllers.updateDataUser);
api.post("/api/follow/:username", verifyToken, UsersControllers.followUser);


api.post("/api/create/moment", verifyToken, MomentControllers.createMomentContentDetail);
api.post("/api/comment/moment/:slugPostContentDetail", verifyToken, MomentControllers.commentMomentPerContentDetail);
api.get("/api/comment/moment/:slugPostContentDetail", verifyToken, MomentControllers.commentGetPerContentDetail);
api.post("/api/like/moment/:slugPostContentDetail", verifyToken, MomentControllers.likeMomentPerContentDetail);
api.get("/api/moment", MomentControllers.getMoment);
api.get("/api/my/all/moment", MomentControllers.getMyAllMoment);
api.delete("/api/detail/moment/:slugPostContentDetail", verifyToken, MomentControllers.deleteDetailMomentPerContentDetail);
api.get("/api/detail/moment/:slugPostContentDetail", verifyToken, MomentControllers.getDetailMomentPerContentDetail);


api.get("/api/search/:type", verifyToken, SearchControllers.searchData);

api.get("/api/city", SearchControllers.getDataCity);

api.get("/api/like/reaction/profile/:username", verifyToken, MomentControllers.getLikeMomentContentDetail)
api.get("/api/comment/reaction/profile/:username", verifyToken, MomentControllers.getCommentMomentContentDetail)
api.get("/api/moment/profile/:username", verifyToken, MomentControllers.getMomentPerProfile)
api.get("/api/followers/profile/:username", MomentControllers.getFollowerOnProfile)
api.get("/api/following/profile/:username", MomentControllers.getFollowingOnProfile)
api.get("/api/following/event/moment/profile/:username", MomentControllers.getFollowingEventOnProfile)

api.get("/api/check/username/:username", verifyToken, UsersControllers.checkUsername)
api.post("/api/create/about", verifyToken, SettingControllers.createAbout)
api.get("/api/about", verifyToken, SettingControllers.getAbout)
api.get("/api/any/notif", verifyToken, SettingControllers.getAnyNotif)
api.get("/api/notification", verifyToken, SettingControllers.getNotification)
api.post("/api/notification/:id", verifyToken, SettingControllers.updateStatusNotification)
api.get("/api/change/status/moment/:slug_post", EmailControllers.changeMoment)


api.get("/api/post", PostControllers.getPost)
api.post("/api/create/post", verifyToken, PostControllers.createPostContentDetail)
api.post("/api/create/topic", verifyToken, PostControllers.createTopicPost)
api.get("/api/topic/post", verifyToken, PostControllers.getTopicPost)
api.post("/api/comment/post/:slugPost", verifyToken, PostControllers.commentPostPerContentDetail);
api.get("/api/comment/post/:slugPost", verifyToken, PostControllers.getCommentPostPerContentDetail);
api.post("/api/like/post/:slugPost", verifyToken, PostControllers.likePostPerContentDetail);
api.get("/api/detail/post/:slugPostContentDetail", verifyToken, PostControllers.getDetailPostPerContentDetail);
api.delete("/api/detail/post/:slugPostContentDetail", verifyToken, PostControllers.deletePostPerContentDetail);
api.get("/api/post/topic/:topicTitle", verifyToken, PostControllers.getDetailPostPerContentDetailPerTopic);
api.get("/api/post/profile/:username", verifyToken, PostControllers.getPostPerUsers)

api.get("/api/reminder/all/users", EmailControllers.reminderForUserManualSchedule)

api.post("/api/deactive/account/:usernameEncoding", SettingControllers.deactiveAccount)

api.get("/api/get/report", verifyToken, ReportControllers.getDataReport)
api.post("/api/reported/post", verifyToken, ReportControllers.saveReportedByUsers)
api.delete("/api/delete/comment/moment", verifyToken, MomentControllers.deleteCommentMoment);
api.delete("/api/delete/comment/post", verifyToken, PostControllers.deleteCommentPost);

api.get('/pink', async (req, res) => {
  res.send({ message: 'ponk' });
});

// TEMPORARY: Sync ALL tables - HAPUS SETELAH DIJALANKAN
api.get('/api/sync-all-tables', async (req, res) => {
  const results = [];
  const errors = [];

  const syncModel = async (name, importPath) => {
    try {
      const { default: Model } = await import(importPath);
      await Model.sync({ force: false });
      results.push(name);
    } catch (err) {
      errors.push({ table: name, error: err.message });
    }
  };

  // Urutan penting: tabel parent dulu, baru child (foreign key)
  // 1. Base/independent tables
  await syncModel('ir_users_access_apps', '../apps/models/UsersAccessAppsModels.js');
  await syncModel('ir_display_types', '../apps/models/DisplayTypesModels.js');
  await syncModel('ir_contents', '../apps/models/ContentModels.js');
  await syncModel('ir_regions', '../apps/models/RegionsModels.js');
  await syncModel('ir_subregions', '../apps/models/SubregionsModels.js');
  await syncModel('ir_countries', '../apps/models/CountriesModels.js');
  await syncModel('ir_provinces', '../apps/models/ProvincesModels.js');
  await syncModel('ir_citys', '../apps/models/CitysModels.js');
  await syncModel('ir_vanues', '../apps/models/VanuesModels.js');
  await syncModel('ir_event_organizers', '../apps/models/EventOrganizersModels.js');
  await syncModel('ir_type_content_details', '../apps/models/TypeContentDetailsModels.js');
  await syncModel('ir_tags', '../apps/models/TagsModels.js');
  await syncModel('ir_actress', '../apps/models/ActressModels.js');
  await syncModel('ir_users', '../apps/models/UsersModels.js');
  await syncModel('ir_base_name_anonymous_users', '../apps/models/BaseNameAnonymousUsersModels.js');
  await syncModel('ir_topic_posts', '../apps/models/TopicPostModels.js');
  await syncModel('ir_reports', '../apps/models/ReportsModels.js');
  await syncModel('ir_about', '../apps/models/AboutModels.js');

  // 2. Tables that depend on users, content, etc.
  await syncModel('ir_content_details', '../apps/models/ContentDetailsModels.js');
  await syncModel('ir_content_detail_tags', '../apps/models/ContentDetailTagsModels.js');
  await syncModel('ir_content_detail_actress', '../apps/models/ContentDetailActressModels.js');
  await syncModel('ir_content_detail_followers', '../apps/models/ContentDetailFollowersModels.js');
  await syncModel('ir_following_users', '../apps/models/FollowingUsersModels.js');
  await syncModel('ir_notifications', '../apps/models/NotificationModels.js');
  await syncModel('ir_base_name_anonymous_usages', '../apps/models/BaseNameAnonymousUsagesModels.js');
  await syncModel('ir_reported_users', '../apps/models/ReportedUsersModels.js');

  // 3. Groups
  await syncModel('ir_groups', '../apps/models/GroupsModels.js');
  await syncModel('ir_group_members', '../apps/models/GroupMembersModels.js');
  await syncModel('ir_groups_posts', '../apps/models/GroupsPostsModels.js');
  await syncModel('ir_groups_posts_comments', '../apps/models/GroupsPostsCommentsModels.js');
  await syncModel('ir_groups_posts_likes', '../apps/models/GroupsPostsLikesModels.js');
  await syncModel('ir_chat_groups', '../apps/models/ChatGroupsModels.js');
  await syncModel('ir_chat_status_groups', '../apps/models/ChatStatusGroupsModels.js');

  // 4. Posts
  await syncModel('ir_post_content_details', '../apps/models/PostContentDetailModels.js');
  await syncModel('ir_file_post_content_details', '../apps/models/FilePostContentDetailModels.js');
  await syncModel('ir_comment_post_content_details', '../apps/models/CommentPostContentDetailModels.js');
  await syncModel('ir_like_post_content_details', '../apps/models/LikePostContentDetailModels.js');
  await syncModel('ir_impression_post_content_details', '../apps/models/ImpressionPostContentDetailModels.js');
  await syncModel('ir_segmented_post_content_details', '../apps/models/SegmentedPostContentDetailModels.js');
  await syncModel('ir_topic_post_relations', '../apps/models/TopicPostRelationsModels.js');

  // 5. Event Posts (new)
  await syncModel('ir_event_posts', '../apps/models/EventPostsModels.js');
  await syncModel('ir_event_posts_comments', '../apps/models/EventPostsCommentsModels.js');
  await syncModel('ir_event_posts_likes', '../apps/models/EventPostsLikesModels.js');
  await syncModel('ir_event_posts_images', '../apps/models/EventPostsImagesModels.js');

  res.json({
    status: errors.length === 0 ? 'ok' : 'partial',
    tables_created: results,
    total_created: results.length,
    errors: errors,
  });
});

api.post("/api/underground/create/event", UnderGroundControllers.postContentDetailOnUnderGround)

// Event Posts (Community & Official)
api.get("/api/event/posts/:eventSlug", verifyToken, EventPostsControllers.getEventPosts);
api.get("/api/event/official-posts/:eventSlug", verifyToken, EventPostsControllers.getEventOfficialPosts);
api.post("/api/event/posts/:eventSlug", verifyToken, EventPostsControllers.createEventPost);
api.post("/api/event/official-posts/:eventSlug", verifyToken, EventPostsControllers.createEventOfficialPost);
api.get("/api/event/post/detail/:slug", verifyToken, EventPostsControllers.getEventPostDetail);
api.post("/api/event/post/like/:slug", verifyToken, EventPostsControllers.likeEventPost);
api.post("/api/event/post/comment/:slug", verifyToken, EventPostsControllers.commentEventPost);
api.get("/api/event/post/comments/:slug", verifyToken, EventPostsControllers.getEventPostComments);
api.delete("/api/event/post/:slug", verifyToken, EventPostsControllers.deleteEventPost);
api.delete("/api/event/post/comment", verifyToken, EventPostsControllers.deleteEventPostComment);

export default api;
