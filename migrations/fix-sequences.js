import db from "../configs/Database.js";

/**
 * Resets PostgreSQL auto-increment sequences to MAX(id) for all tables
 * that use BIGINT primary keys with autoIncrement.
 * Run this once whenever you get "duplicate key value violates unique constraint *_pkey".
 */
const tables = [
    "ir_comment_post_content_details",
    "ir_post_content_details",
    "ir_notifications",
    "ir_users",
    "ir_groups",
    "ir_group_members",
    "ir_following_users",
    "ir_like_post_content_details",
    "ir_file_post_content_details",
    "ir_impression_post_content_details",
    "ir_groups_posts",
    "ir_groups_posts_comments",
    "ir_groups_posts_likes",
];

async function fixSequences() {
    try {
        await db.authenticate();
        console.log("Connected to database.");

        for (const table of tables) {
            try {
                const seqName = `${table}_id_seq`;
                await db.query(
                    `SELECT setval('${seqName}', COALESCE((SELECT MAX(id) FROM "${table}"), 0) + 1, false);`
                );
                console.log(`✓ Reset sequence for ${table}`);
            } catch (err) {
                console.warn(`  Skipped ${table}: ${err.message}`);
            }
        }

        console.log("Done.");
        await db.close();
    } catch (err) {
        console.error("Failed:", err);
        process.exit(1);
    }
}

fixSequences();
