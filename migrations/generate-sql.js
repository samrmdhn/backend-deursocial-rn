/**
 * Generates a Supabase-compatible SQL migration file from all Sequelize models.
 * No database connection required — uses Sequelize's query generator directly.
 *
 * Usage (from backend/):
 *   node migrations/generate-sql.js
 * Output: migrations/supabase-migration.sql
 */

import dotenv from "dotenv";
import { writeFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

dotenv.config({ path: "./.env" });

// Force postgres dialect so DataTypesCustom maps types correctly
process.env.APP_DB_CONNECTION = "postgres";
process.env.APP_DB_DATABASE   = "postgres";
process.env.APP_DB_HOST       = "localhost"; // not used — no connection made
process.env.APP_DB_PORT       = "5432";
process.env.APP_DB_USERNAME   = "postgres";
process.env.APP_DB_PASSWORD   = "postgres";

const { default: db } = await import("../configs/Database.js");

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

// Ordered by FK dependency: every referenced table appears before its dependents
const models = [
    // ── Leaf tables (no FKs) ──────────────────────────────────────
    UsersAccessAppsModels,         // ir_user_access_apps
    DisplayTypesModels,            // ir_display_types
    RegionsModels,                 // ir_regions
    EventOrganizersModels,         // ir_event_organizers
    TypeContentDetailsModels,      // ir_type_content_details
    TagsModels,                    // ir_tags
    ActressModels,                 // ir_actress
    AboutModels,                   // ir_abouts
    ReportsModels,                 // ir_reports
    UsersModels,                   // ir_users
    BaseNameAnonymousUsersModels,  // ir_base_name_anonymous_users
    BaseNameAnonymousUsagesModels, // ir_base_name_anonymous_user_usages
    TopicPostModels,               // ir_topic_posts

    // ── Level 1: depends on leaf tables ──────────────────────────
    SubregionsModels,              // ir_subregions → ir_regions
    ContentModels,                 // ir_contents   → ir_display_types
    FollowingUsersModels,          // ir_following_users → ir_users
    ReportedUsersModels,           // ir_reported_users  → ir_reports, ir_users
    NotificationModels,            // ir_notifications   → ir_users

    // ── Level 2 ──────────────────────────────────────────────────
    CountriesModels,               // ir_countries → ir_subregions

    // ── Level 3 ──────────────────────────────────────────────────
    ProvincesModels,               // ir_provinces → ir_countries

    // ── Level 4 ──────────────────────────────────────────────────
    CitysModels,                   // ir_citys → ir_provinces

    // ── Level 5 ──────────────────────────────────────────────────
    VanuesModels,                  // ir_vanues → ir_citys, ir_provinces, ir_countries

    // ── Level 6 ──────────────────────────────────────────────────
    ContentDetailsModels,          // ir_content_details → ir_vanues, ir_contents, ir_event_organizers, ir_type_content_details

    // ── Level 7 ──────────────────────────────────────────────────
    GroupsModels,                  // ir_groups → ir_users, ir_citys, ir_content_details
    ContentDetailTagsModels,       // ir_content_detail_tags → ir_tags, ir_content_details
    ContentDetailActressModels,    // ir_content_detail_actress → ir_actress, ir_content_details
    ContentDetailFollowersModels,  // ir_content_detail_followers → ir_content_details, ir_users

    // ── Level 8 ──────────────────────────────────────────────────
    GroupMembersModels,            // ir_group_members → ir_groups, ir_users
    ChatGroupsModels,              // ir_chat_groups → ir_groups, ir_users
    GroupsPostsModels,             // ir_groups_posts → ir_content_details, ir_groups, ir_users
    PostContentDetailModels,       // ir_post_content_details → ir_users, ir_groups

    // ── Level 9 ──────────────────────────────────────────────────
    ChatStatusGroupsModels,        // ir_chat_groups_status → ir_groups, ir_users, ir_chat_groups
    GroupsPostsCommentsModels,     // ir_groups_posts_comments → ir_groups_posts, ir_users
    GroupsPostsLikesModels,        // ir_groups_posts_likes → ir_groups_posts, ir_users
    FilePostContentDetailModels,   // ir_file_post_content_details → ir_post_content_details
    CommentPostContentDetailModels,// ir_comment_post_content_details → self-ref, ir_post_content_details, ir_users
    LikePostContentDetailModels,   // ir_like_post_content_details → ir_post_content_details, ir_users
    ImpressionPostContentDetailModels, // → ir_post_content_details, ir_users
    SegmentedPostContentDetailModels,  // → ir_post_content_details, ir_users, ir_content_details

    // ── Level 10 ─────────────────────────────────────────────────
    LikeCommentPostContentDetailModels, // → ir_comment_post_content_details, ir_users
    TopicPostRelationsModels,           // → ir_post_content_details, ir_users, ir_topic_posts
];

// Intercept db.query to capture SQL strings without executing them
const capturedSql = new Map(); // tableName -> sql string
const originalQuery = db.query.bind(db);

db.query = async (sql, options) => {
    const sqlStr = typeof sql === "string" ? sql : (sql?.sql || "");
    // Only capture CREATE TABLE statements
    if (sqlStr.toUpperCase().includes("CREATE TABLE")) {
        // Extract table name from the SQL to key the map
        const match = sqlStr.match(/CREATE TABLE IF NOT EXISTS "?([^" (]+)"?/i);
        if (match) capturedSql.set(match[1], sqlStr);
    }
    // Return a fake result so sync() thinks it succeeded
    return [[], {}];
};

// Also stub authenticate so no real connection is attempted
db.authenticate = async () => {};

for (const model of models) {
    try {
        await model.sync({ force: false });
    } catch {
        // ignore — sync may fail on non-CREATE queries (indexes etc.)
    }
}

// Restore
db.query = originalQuery;

const lines = [
    "-- Supabase migration — generated by generate-sql.js",
    `-- Generated: ${new Date().toISOString()}`,
    "-- Paste into: https://supabase.com/dashboard/project/jbcdjttfaxwendlfpgjk/sql/new",
    "",
];

let count = 0;
for (const model of models) {
    const tableName = model.getTableName();
    const sql = capturedSql.get(tableName);
    if (sql) {
        lines.push(`-- ${tableName}`);
        lines.push(sql.trim());
        lines.push("");
        count++;
        console.log(`  ✅ ${tableName}`);
    } else {
        console.error(`  ❌ ${tableName}: no CREATE TABLE captured`);
        lines.push(`-- ❌ SKIPPED ${tableName}: no SQL captured`);
        lines.push("");
    }
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outPath = path.join(__dirname, "supabase-migration.sql");
writeFileSync(outPath, lines.join("\n"), "utf8");

console.log(`\n✅ Generated ${count} tables → migrations/supabase-migration.sql`);
console.log("   Paste into: https://supabase.com/dashboard/project/jbcdjttfaxwendlfpgjk/sql/new");
