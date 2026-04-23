/**
 * Supabase migration sync script.
 * Syncs all Sequelize models (CREATE TABLE IF NOT EXISTS) against Supabase PostgreSQL.
 *
 * Usage (from backend/):
 *   node migrations/supabase-sync.js
 */

import dotenv from "dotenv";
dotenv.config({ path: "./.env" });

// Redirect APP_DB_* to Supabase BEFORE Database.js is imported.
// Static imports are hoisted, so we use dynamic import() below for Database.js
// and all models, ensuring the env vars are already set when Sequelize initialises.
//
// Supabase direct host (db.<ref>.supabase.co) does not have a DNS record for
// this project — use the Session Pooler instead (port 5432, supports DDL).
// Session Pooler username format: postgres.<project-ref>
const SUPABASE_PROJECT_REF = (process.env.SUPABASE_URL || "")
    .replace("https://", "")
    .split(".")[0]; // e.g. "jbcdjttfaxwendlfpgjk"

process.env.APP_DB_CONNECTION = "postgres";
process.env.APP_DB_DATABASE   = process.env.SUPABASE_DB_DATABASE || "postgres";
process.env.APP_DB_HOST       = "aws-1-ap-southeast-1.pooler.supabase.com";
process.env.APP_DB_PORT       = "5432";
process.env.APP_DB_USERNAME   = `postgres.${SUPABASE_PROJECT_REF}`;
process.env.APP_DB_PASSWORD   = process.env.SUPABASE_DB_PASSWORD;

// Dynamic import so Database.js reads the patched env vars above.
// Database.js auto-detects the supabase.co host and enables SSL.
const { default: db } = await import("../configs/Database.js");

// Dynamically import all models (they import db at module evaluation time,
// but since this is the first import of Database.js in this process the
// patched env vars are already in place)
const [
    { default: UsersAccessAppsModels },
    { default: DisplayTypesModels },
    { default: ContentModels },
    { default: CountriesModels },
    { default: RegionsModels },
    { default: SubregionsModels },
    { default: ProvincesModels },
    { default: CitysModels },
    { default: VanuesModels },
    { default: EventOrganizersModels },
    { default: TypeContentDetailsModels },
    { default: TagsModels },
    { default: ActressModels },
    { default: AboutModels },
    { default: ReportsModels },
    { default: UsersModels },
    { default: BaseNameAnonymousUsersModels },
    { default: BaseNameAnonymousUsagesModels },
    { default: FollowingUsersModels },
    { default: ReportedUsersModels },
    { default: NotificationModels },
    { default: GroupsModels },
    { default: GroupMembersModels },
    { default: ChatGroupsModels },
    { default: ChatStatusGroupsModels },
    { default: ContentDetailsModels },
    { default: ContentDetailTagsModels },
    { default: ContentDetailActressModels },
    { default: ContentDetailFollowersModels },
    { default: GroupsPostsModels },
    { default: GroupsPostsCommentsModels },
    { default: GroupsPostsLikesModels },
    { default: PostContentDetailModels },
    { default: FilePostContentDetailModels },
    { default: CommentPostContentDetailModels },
    { default: LikePostContentDetailModels },
    { default: LikeCommentPostContentDetailModels },
    { default: ImpressionPostContentDetailModels },
    { default: SegmentedPostContentDetailModels },
    { default: TopicPostModels },
    { default: TopicPostRelationsModels },
] = await Promise.all([
    import("../apps/models/UsersAccessAppsModels.js"),
    import("../apps/models/DisplayTypesModels.js"),
    import("../apps/models/ContentModels.js"),
    import("../apps/models/CountriesModels.js"),
    import("../apps/models/RegionsModels.js"),
    import("../apps/models/SubregionsModels.js"),
    import("../apps/models/ProvincesModels.js"),
    import("../apps/models/CitysModels.js"),
    import("../apps/models/VanuesModels.js"),
    import("../apps/models/EventOrganizersModels.js"),
    import("../apps/models/TypeContentDetailsModels.js"),
    import("../apps/models/TagsModels.js"),
    import("../apps/models/ActressModels.js"),
    import("../apps/models/AboutModels.js"),
    import("../apps/models/ReportsModels.js"),
    import("../apps/models/UsersModels.js"),
    import("../apps/models/BaseNameAnonymousUsersModels.js"),
    import("../apps/models/BaseNameAnonymousUsagesModels.js"),
    import("../apps/models/FollowingUsersModels.js"),
    import("../apps/models/ReportedUsersModels.js"),
    import("../apps/models/NotificationModels.js"),
    import("../apps/models/GroupsModels.js"),
    import("../apps/models/GroupMembersModels.js"),
    import("../apps/models/ChatGroupsModels.js"),
    import("../apps/models/ChatStatusGroupsModels.js"),
    import("../apps/models/ContentDetailsModels.js"),
    import("../apps/models/ContentDetailTagsModels.js"),
    import("../apps/models/ContentDetailActressModels.js"),
    import("../apps/models/ContentDetailFollowersModels.js"),
    import("../apps/models/GroupsPostsModels.js"),
    import("../apps/models/GroupsPostsCommentsModels.js"),
    import("../apps/models/GroupsPostsLikesModels.js"),
    import("../apps/models/PostContentDetailModels.js"),
    import("../apps/models/FilePostContentDetailModels.js"),
    import("../apps/models/CommentPostContentDetailModels.js"),
    import("../apps/models/LikePostContentDetailModels.js"),
    import("../apps/models/LikeCommentPostContentDetailModels.js"),
    import("../apps/models/ImpressionPostContentDetailModels.js"),
    import("../apps/models/SegmentedPostContentDetailModels.js"),
    import("../apps/models/TopicPostModels.js"),
    import("../apps/models/TopicPostRelationsModels.js"),
]);

// Ordered by dependency: parent tables before child tables
const migrations = [
    // Reference / lookup tables (no FK deps)
    { model: UsersAccessAppsModels,              name: "ir_users_access_apps" },
    { model: DisplayTypesModels,                 name: "ir_display_types" },
    { model: ContentModels,                      name: "ir_content" },
    { model: CountriesModels,                    name: "ir_countries" },
    { model: RegionsModels,                      name: "ir_regions" },
    { model: SubregionsModels,                   name: "ir_subregions" },
    { model: ProvincesModels,                    name: "ir_provinces" },
    { model: CitysModels,                        name: "ir_citys" },
    { model: VanuesModels,                       name: "ir_vanues" },
    { model: EventOrganizersModels,              name: "ir_event_organizers" },
    { model: TypeContentDetailsModels,           name: "ir_type_content_details" },
    { model: TagsModels,                         name: "ir_tags" },
    { model: ActressModels,                      name: "ir_actress" },
    { model: AboutModels,                        name: "ir_about" },
    { model: ReportsModels,                      name: "ir_reports" },

    // Users
    { model: UsersModels,                        name: "ir_users" },
    { model: BaseNameAnonymousUsersModels,       name: "ir_base_name_anonymous_users" },
    { model: BaseNameAnonymousUsagesModels,      name: "ir_base_name_anonymous_usages" },
    { model: FollowingUsersModels,               name: "ir_following_users" },
    { model: ReportedUsersModels,                name: "ir_reported_users" },
    { model: NotificationModels,                 name: "ir_notifications" },

    // Groups & chat
    { model: GroupsModels,                       name: "ir_groups" },
    { model: GroupMembersModels,                 name: "ir_group_members" },
    { model: ChatGroupsModels,                   name: "ir_chat_groups" },
    { model: ChatStatusGroupsModels,             name: "ir_chat_status_groups" },

    // Content details
    { model: ContentDetailsModels,               name: "ir_content_details" },
    { model: ContentDetailTagsModels,            name: "ir_content_detail_tags" },
    { model: ContentDetailActressModels,         name: "ir_content_detail_actress" },
    { model: ContentDetailFollowersModels,       name: "ir_content_detail_followers" },

    // Group posts
    { model: GroupsPostsModels,                  name: "ir_groups_posts" },
    { model: GroupsPostsCommentsModels,          name: "ir_groups_posts_comments" },
    { model: GroupsPostsLikesModels,             name: "ir_groups_posts_likes" },

    // Post content details
    { model: PostContentDetailModels,            name: "ir_post_content_details" },
    { model: FilePostContentDetailModels,        name: "ir_file_post_content_details" },
    { model: CommentPostContentDetailModels,     name: "ir_comment_post_content_details" },
    { model: LikePostContentDetailModels,        name: "ir_like_post_content_details" },
    { model: LikeCommentPostContentDetailModels, name: "ir_like_comment_post_content_details" },
    { model: ImpressionPostContentDetailModels,  name: "ir_impression_post_content_details" },
    { model: SegmentedPostContentDetailModels,   name: "ir_segmented_post_content_details" },

    // Topic posts
    { model: TopicPostModels,                    name: "ir_topic_posts" },
    { model: TopicPostRelationsModels,           name: "ir_topic_post_relations" },
];

async function syncToSupabase() {
    try {
        await db.authenticate();
        console.log(`✅ Connected to Supabase at ${process.env.APP_DB_HOST}\n`);
    } catch (err) {
        console.error("❌ Could not connect to Supabase:");
        console.error("  code:", err.code);
        console.error("  message:", err.message);
        console.error("  host:", process.env.APP_DB_HOST);
        console.error("  port:", process.env.APP_DB_PORT);
        console.error("  user:", process.env.APP_DB_USERNAME);
        console.error("  db:", process.env.APP_DB_DATABASE);
        process.exit(1);
    }

    let success = 0;
    let failed = 0;

    for (const { model, name } of migrations) {
        try {
            await model.sync({ force: false, alter: false });
            console.log(`  ✅ ${name}`);
            success++;
        } catch (err) {
            console.error(`  ❌ ${name}: ${err.message}`);
            failed++;
        }
    }

    console.log(`\nDone — ${success} tables synced, ${failed} failed.`);
    await db.close();
}

syncToSupabase();
