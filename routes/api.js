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
import * as ChatControllers from "../apps/index.js";
import * as EventContentControllers from "../apps/index.js";
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

api.get("/api/groups/detail/:slugs", GroupsControllers.getGroupsDetail);
api.get("/api/groups/:contentDetailSlugs", GroupsControllers.getGroups);
api.post("/api/groups/:slug", verifyToken, GroupsControllers.createGroups);
// api.post("/api/join/groups", verifyToken, GroupsControllers.joinMemberToGroups);
api.post("/api/join/group/:slug", verifyToken, GroupsControllers.joinMemberToGroups);
api.post("/api/approve/member/:slug", verifyToken, GroupsControllers.approveMember);
api.post("/api/reject/member/:slug", verifyToken, GroupsControllers.rejectMember);
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
api.get("/api/follow/events", verifyToken, HomepageControllers.getFollowedEvents);
api.get("/api/actress", verifyToken, HomepageControllers.getActress);
api.post("/api/actress", verifyToken, HomepageControllers.createActress);
api.get("/api/content/details/:slug", HomepageControllers.getContentDetails);
api.post("/api/content/details", verifyToken, HomepageControllers.createContentDetails);
api.post("/api/check/auth", HomepageControllers.checkAuth);

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

// ═══════════════════════════════════════════════════════════════
// EVENT CONTENT API (posts, moments, comments, likes)
// ═══════════════════════════════════════════════════════════════

// Event community posts
api.get("/api/event/posts/:eventSlug", verifyToken, EventContentControllers.getEventPosts);
api.post("/api/event/posts/:eventSlug", verifyToken, EventContentControllers.createEventPost);

// Event official (EO) posts
api.get("/api/event/official-posts/:eventSlug", verifyToken, EventContentControllers.getEventOfficialPosts);
api.post("/api/event/official-posts/:eventSlug", verifyToken, EventContentControllers.createEventOfficialPost);

// Event moments
api.get("/api/event/moments/:eventSlug", verifyToken, EventContentControllers.getEventMoments);
api.post("/api/event/moments/:eventSlug", verifyToken, EventContentControllers.createEventMoment);

// Feeds (cross-event, homepage)
api.get("/api/posts/feed", verifyToken, EventContentControllers.getPostsFeed);
api.get("/api/moments/feed", verifyToken, EventContentControllers.getMomentsFeed);

// Homepage feed (followed events only)
api.get("/api/feed/home/new-count", verifyToken, EventContentControllers.getHomeFeedNewCount);
api.get("/api/feed/home", verifyToken, EventContentControllers.getHomeFeed);

// Event post/moment delete
api.delete("/api/event/post/:slug", verifyToken, EventContentControllers.deleteEventPost);

// Event post like toggle
api.post("/api/event/post/like/:slug", verifyToken, EventContentControllers.toggleEventPostLike);

// User profile posts & moments
api.get("/api/event/posts/user/:username", verifyToken, EventContentControllers.getPostsByUser);
api.get("/api/event/moments/user/:username", verifyToken, EventContentControllers.getMomentsByUser);

// Event post detail
api.get("/api/event/post/detail/:slug", verifyToken, EventContentControllers.getEventPostDetail);

// Batch endpoints
api.post("/api/batch/likes", verifyToken, EventContentControllers.batchGetLikes);
api.post("/api/batch/comments", verifyToken, EventContentControllers.batchGetComments);

// Comment replies
api.get("/api/comment/replies/:commentId", verifyToken, EventContentControllers.getCommentReplies);

// Comment likes
api.post("/api/like/comment/:commentId", verifyToken, EventContentControllers.toggleCommentLike);

api.get('/pink', async (req, res) => {
  res.send({ message: 'ponk' });
});

api.post("/api/underground/create/event", UnderGroundControllers.postContentDetailOnUnderGround)

// ═══════════════════════════════════════════════════════════════
// CHAT API (Supabase queries offloaded to backend)
// ═══════════════════════════════════════════════════════════════

// Link Preview
api.post("/api/chat/link-preview", verifyToken, ChatControllers.getLinkPreview);

// Messages List (group list screen — heavy queries)
api.post("/api/chat/messages/latest-per-group", verifyToken, ChatControllers.getLatestMessagePerGroup);
api.post("/api/chat/messages/unread-counts", verifyToken, ChatControllers.getUnreadCountsPerGroup);

// DM Conversations
api.post("/api/chat/conversations/get-or-create", verifyToken, ChatControllers.getOrCreateConversation);
api.get("/api/chat/conversations/:username/:userId", verifyToken, ChatControllers.getUserConversations);

// Meeting Points
api.get("/api/chat/meeting-point/:groupSlug", verifyToken, ChatControllers.getMeetingPoint);
api.post("/api/chat/meeting-point", verifyToken, ChatControllers.setMeetingPoint);

// Media Gallery
api.get("/api/chat/media/:groupSlug", verifyToken, ChatControllers.getGroupMedia);

// User Join Date
api.get("/api/chat/user-groups/:userId/:groupSlug/join-date", verifyToken, ChatControllers.getUserJoinDate);

export default api;
