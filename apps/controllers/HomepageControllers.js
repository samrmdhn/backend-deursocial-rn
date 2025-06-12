import {
    convertToSlug,
    createNameFile,
    dateToEpochTime,
    epochToDateJakarta,
    getDataUserUsingToken,
    getExtension,
    makeEpocTime,
    makeRandomString,
    withTransaction,
} from "../../helpers/customHelpers.js";
import { responseApi } from "../../libs/RestApiHandler.js";
import DisplayTypesModels from "../models/DisplayTypesModels.js";
import ContentModels from "../models/ContentModels.js";
import EventOrganizersModels from "../models/EventOrganizersModels.js";
import TypeContentDetailsModels from "../models/TypeContentDetailsModels.js";
import TagsModels from "../models/TagsModels.js";
import ActressModels from "../models/ActressModels.js";
import ContentDetailActressModels from "../models/ContentDetailActressModels.js";
import ContentDetailTagsModels from "../models/ContentDetailTagsModels.js";
import ContentDetailsModels from "../models/ContentDetailsModels.js";
import { buildWhereClause } from "../../helpers/queryBuilderHelpers.js";
import { getPagination } from "../../helpers/paginationHelpers.js";
import db from "../../configs/Database.js";
import { Sequelize } from "sequelize";
import { uploadFile } from "../../helpers/FileUpload.js";
import ContentDetailFollowersModels from "../models/ContentDetailFollowersModels.js";
import UsersModels from "../models/UsersModels.js";

const Op = Sequelize.Op;

export const homepage = async (req, res) => {
    return res.status(200).json({
        data: [],
        message: "Internal server error",
        status: 1,
    });
};

/**
 * function create new display types contents
 * @param {*} req
 * @param {*} res
 * @returns {Object}
 */
export const createDisplayTypes = async (req, res) => {
    try {
        const { title, status } = req.body;
        await DisplayTypesModels.create({
            title: title,
            status: status,
            created_at: makeEpocTime(),
        });
        return responseApi(res, [], null, "Data Success Saved", 0);
    } catch (error) {
        return responseApi(res, [], null, "Server error....", 1);
    }
};

/**
 * Fungsi untuk mengupdate data display type berdasarkan ID.
 * @param {*} req
 * @param {*} res
 * @returns {Promise} - Promise yang berisi hasil dari operasi update.
 */
export const updateDisplayTypes = async (req, res) => {
    try {
        const displayTypesId = req.params.id;
        const { title, status } = req.body;

        const displayTypesData = await DisplayTypesModels.findByPk(
            displayTypesId
        );

        if (!displayTypesData) {
            return responseApi(res, [], null, "Data Not Found", 2);
        }

        await displayTypesData.update(
            {
                title: title,
                status: status,
                updated_at: makeEpocTime(),
            },
            {
                fields: ["title", "status", "updated_at"],
                silent: true,
            }
        );
        return responseApi(res, [], null, "Data Success Saved", 0);
    } catch (error) {
        return responseApi(res, [], null, "Server error....", 1);
    }
};

/**
 * Fungsi untuk get data display.
 * @param {*} req
 * @param {*} res
 * @returns {Promise} - Promise yang berisi hasil dari operasi update.
 */
export const getDisplayTypes = async (req, res) => {
    try {
        const { page = 1, title = "" } = req.query;
        const where = {
            status: 1,
        };
        const { limitPerPage, offset, totalPages, currentPage } = getPagination(
            page,
            10,
            await DisplayTypesModels.count({
                where: buildWhereClause(where, "title", title),
            })
        );

        const contentData = await DisplayTypesModels.findAll({
            where: buildWhereClause(where, "title", title),
            limit: limitPerPage,
            offset,
            attributes: {
                exclude: ["created_at", "updated_at", "status"],
            },
        });

        const responseData = contentData.map((item) => ({
            id: item.id,
            title: item.title,
        }));

        return responseApi(res, responseData, {
            assets_image_url: process.env.APP_BUCKET_IMAGE,
            pagination: {
                current_page: currentPage,
                per_page: limitPerPage,
                total: contentData.length,
                total_page: totalPages,
            },
        });
    } catch (error) {
        console.log("errro", error);
        return responseApi(res, [], null, "Server error....", 1);
    }
};

/**
 * function create new contents contents
 * @param {*} req
 * @param {*} res
 * @returns {Object}
 */
export const createContents = async (req, res) => {
    try {
        const { title, status, display_types_id } = req.body;
        await ContentModels.create({
            title: title,
            status: status,
            slug: convertToSlug(title)+"_"+makeRandomString(3),
            display_types_id: display_types_id,
            created_at: makeEpocTime(),
        });
        return responseApi(res, [], null, "Data Success Saved", 0);
    } catch (error) {
        console.log("error create content", error)
        return responseApi(res, [], null, "Server Error....", 1);
    }
};

/**
 * Fungsi untuk mengupdate data display type berdasarkan ID.
 * @param {*} req
 * @param {*} res
 * @returns {Promise} - Promise yang berisi hasil dari operasi update.
 */
export const updateContents = async (req, res) => {
    try {
        const contentsId = req.params.id;
        const { title, status, display_types_id } = req.body;

        const contentsData = await ContentModels.findByPk(contentsId);

        if (!contentsData) {
            return responseApi(res, {
                data: [],
                message: "data not found",
                status: 2,
            });
        }

        await contentsData.update(
            {
                title: title,
                status: status,
                display_types_id: display_types_id,
                updated_at: makeEpocTime(),
            },
            {
                fields: ["title", "status", "updated_at"],
                silent: true,
            }
        );

        return responseApi(res, {
            data: [],
            status: {
                code: 0,
                message_client: "Data has been updated",
            },
        });
    } catch (error) {
        console.error("Error updating display type:", error);
        return responseApi(res, {
            data: [],
            message: "server error....",
            status: 1,
        });
    }
};

/**
 * Fungsi untuk get data display.
 * @param {*} req
 * @param {*} res
 * @returns {Promise} - Promise yang berisi hasil dari operasi update.
 */
export const getContents = async (req, res) => {
    try {
        const { page = 1, slug = "" } = req.query;
        const limit = 10;
        const offset = (page - 1) * limit;

        // Construct where clause with parameterized values
        let whereClause = ``;
        const replacements = {
            limit: parseInt(limit),
            offset: parseInt(offset),
        };

        if (slug) {
            whereClause += ` WHERE c.slug ILIKE :slug`;
            replacements.slug = `%${slug}%`;
        }

        const query = `
            SELECT 
                c.id, 
                c.title,
                c.slug,
                dt.title AS display_type,
                json_agg(
                    json_build_object(
                        'id', cd.id,
                        'title', cd.title,
                        'slug', cd.slug,
                        'schedule_start', TO_CHAR(TO_TIMESTAMP(cd.schedule_start), 'YYYY-MM-DD HH24:MI:SS'),
                        'schedule_end', TO_CHAR(TO_TIMESTAMP(cd.schedule_end), 'YYYY-MM-DD HH24:MI:SS'),
                        'date_start', TO_CHAR(TO_TIMESTAMP(cd.date_start), 'YYYY-MM-DD HH24:MI:SS'),
                        'date_end', TO_CHAR(TO_TIMESTAMP(cd.date_end), 'YYYY-MM-DD HH24:MI:SS'),
                        'description', cd.description,
                        'image', cd.image,
                        'is_trending', CASE WHEN cd.is_trending = 1 THEN true ELSE false END,
                        'status', CASE WHEN cd.status = 0 THEN 'ended' WHEN cd.status = 1 THEN 'ongoing' ELSE 'upcoming' END,
                        'type_content_details', json_build_object(
                            'id', tcd.id,
                            'name', tcd.name
                        ),
                        'event_organizers', json_build_object(
                            'id', eo.id,
                            'name', eo.name,
                            'image', eo.image
                        ),
                        'followers', (
                            SELECT json_build_object(
                                'total_followers', COUNT(*),
                                'users', (
                                    SELECT json_agg(
                                        json_build_object(
                                            'id', limited_users.id,
                                            'display_name', limited_users.display_name,
                                            'image', limited_users.photo
                                        )
                                    )
                                    FROM (
                                        SELECT u.id, u.display_name, u.photo
                                        FROM ir_content_detail_followers cdf
                                        JOIN ir_users u ON cdf.users_id = u.id
                                        WHERE cdf.content_details_id = cd.id
                                        ORDER BY cdf.id DESC
                                        LIMIT 5
                                    ) AS limited_users
                                )
                            )
                            FROM ir_content_detail_followers cdf
                            WHERE cdf.content_details_id = cd.id
                        ),

                        'total_posts',(
                            SELECT COUNT(*) AS total_posts
                            FROM ir_segmented_post_content_details gp WHERE gp.content_details_id = cd.id
                        ),
                        'total_groups',(
                            SELECT COUNT(*) AS total_groups
                            FROM ir_groups g WHERE g.content_details_id = cd.id
                        ),
                        'location', json_build_object(
                            'region', json_build_object(
                                'id', co.id,
                                'name', co.title
                            ),
                            'city', json_build_object(
                                'id', ci.id,
                                'name', ci.title
                            ),
                            'venue', json_build_object(
                                'id', v.id,
                                'name', v.title
                            )
                        )
                    )
                ) AS content_details
            FROM ir_contents c
            JOIN ir_display_types dt ON c.display_types_id = dt.id
            JOIN ir_content_details cd ON cd.contents_id = c.id
            JOIN ir_type_content_details tcd ON cd.type_content_details_id = tcd.id
            JOIN ir_event_organizers eo ON cd.event_organizers_id = eo.id
            JOIN ir_vanues v ON cd.vanues_id = v.id
            JOIN ir_citys ci ON v.citys_id = ci.id
            JOIN ir_provinces p ON v.provinces_id = p.id
            JOIN ir_countries co ON v.countries_id = co.id
            ${whereClause}
            GROUP BY c.id, dt.title
            ORDER BY c.id DESC
            LIMIT :limit OFFSET :offset;
        `;

        const contentData = await db.query(query, {
            replacements,
            type: db.QueryTypes.SELECT,
        });

        const countQuery = `
            SELECT COUNT(*) AS total_count
            FROM ir_contents c
            ${whereClause};
        `;
        const totalCountResult = await db.query(countQuery, {
            replacements,
            type: db.QueryTypes.SELECT,
        });
        const totalCount = totalCountResult[0].total_count;
        const totalPages = Math.ceil(totalCount / limit);

        const responseData = contentData.map((item) => ({
            id: item.id,
            title: item.title,
            content_slug: item.slug,
            display_types: item.display_type,
            content_details: item.content_details,
        }));

        return responseApi(
            res,
            responseData,
            {
                assets_image_url: process.env.APP_BUCKET_IMAGE, // Contoh URL gambar
                pagination: {
                    current_page: parseInt(page),
                    per_page: parseInt(limit),
                    total: totalCount,
                    total_page: totalPages,
                },
            },
            "Data Success Saved",
            0
        );
    } catch (error) {
        return responseApi(res, [], null, "Server error....", 1);
    }
};

/**
 * Fungsi untuk get data display.
 * @param {*} req
 * @param {*} res
 * @returns {Promise} - Promise yang berisi hasil dari operasi update.
 */
export const getContentsData = async (req, res) => {
    try {
        const contentsSlug = req.params.slug;

        const { page = 1 } = req.query;
        const limit = 10;
        const offset = (page - 1) * limit;

        let whereClause = ``;
        const replacements = {
            limit: parseInt(limit),
            offset: parseInt(offset),
        };

        if (contentsSlug) {
            whereClause += ` WHERE c.slug ILIKE :contentsSlug`;
            replacements.contentsSlug = `%${contentsSlug}%`;
        }

        const query = `
            SELECT 
                cd.id,
                cd.title,
                cd.slug,
                TO_CHAR(TO_TIMESTAMP(cd.schedule_start), 'YYYY-MM-DD HH24:MI:SS') AS schedule_start,
                TO_CHAR(TO_TIMESTAMP(cd.schedule_end), 'YYYY-MM-DD HH24:MI:SS') AS schedule_end,
                TO_CHAR(TO_TIMESTAMP(cd.date_start), 'YYYY-MM-DD HH24:MI:SS') AS date_start,
                TO_CHAR(TO_TIMESTAMP(cd.date_end), 'YYYY-MM-DD HH24:MI:SS') AS date_end,
                cd.description,
                cd.image,
                CASE WHEN cd.is_trending = 1 THEN true ELSE false END AS is_trending,
                CASE 
                    WHEN cd.is_trending = 0 THEN 'ended' 
                    WHEN cd.is_trending = 1 THEN 'ongoing' 
                    ELSE 'upcoming' 
                END AS status,
                json_build_object(
                    'id', tcd.id,
                    'name', tcd.name
                ) AS type_content_details,
                json_build_object(
                    'id', eo.id,
                    'name', eo.name,
                    'image', eo.image
                ) AS event_organizers,
                (
                    SELECT json_build_object(
                        'total_followers', COUNT(*),
                        'users', (
                            SELECT json_agg(
                                json_build_object(
                                    'id', u.id,
                                    'display_name', u.display_name,
                                    'image', u.photo
                                )
                            )
                            FROM ir_content_detail_followers cdf2
                            JOIN ir_users u ON cdf2.users_id = u.id
                            WHERE cdf2.content_details_id = cd.id
                            LIMIT 3
                        )
                    )
                    FROM ir_content_detail_followers cdf
                    WHERE cdf.content_details_id = cd.id
                ) AS followers,
                (
                    SELECT COUNT(*) FROM ir_segmented_post_content_details gp WHERE gp.content_details_id = cd.id
                ) AS total_posts,
                (
                    SELECT COUNT(*) FROM ir_groups g WHERE g.content_details_id = cd.id
                ) AS total_groups,
                json_build_object(
                    'region', json_build_object(
                        'id', co.id,
                        'name', co.title
                    ),
                    'city', json_build_object(
                        'id', ci.id,
                        'name', ci.title
                    ),
                    'venue', json_build_object(
                        'id', v.id,
                        'name', v.title
                    )
                ) AS location
            FROM ir_contents c
            LEFT JOIN ir_content_details cd ON cd.contents_id = c.id
            LEFT JOIN ir_type_content_details tcd ON cd.type_content_details_id = tcd.id
            LEFT JOIN ir_event_organizers eo ON cd.event_organizers_id = eo.id
            LEFT JOIN ir_vanues v ON cd.vanues_id = v.id
            LEFT JOIN ir_citys ci ON v.citys_id = ci.id
            LEFT JOIN ir_provinces p ON v.provinces_id = p.id
            LEFT JOIN ir_countries co ON v.countries_id = co.id
            ${whereClause}
            ORDER BY cd.id
            LIMIT :limit OFFSET :offset;
        `;

        const contentDetails = await db.query(query, {
            replacements,
            type: db.QueryTypes.SELECT,
        });

        return responseApi(
            res,
            contentDetails,
            {
                assets_image_url: process.env.APP_BUCKET_IMAGE,
                pagination: {
                    current_page: parseInt(page),
                    per_page: parseInt(limit),
                    total: contentDetails.length,
                    total_page: 1,
                },
            },
            "Data Success Retrieved",
            0
        );
    } catch (error) {
        console.error(error);
        return responseApi(res, [], null, "Server error....", 1);
    }
};

/**
 * function create new event organizers
 * @param {*} req
 * @param {*} res
 * @returns {Object}
 */
export const createEventOrganizers = async (req, res) => {
    try {
        const { name, detail } = req.body;
        await EventOrganizersModels.create({
            name: name,
            detail: detail,
            created_at: makeEpocTime(),
        });
        return responseApi(res, [], null, "Data has been saved", 0);
    } catch (error) {
        return responseApi(res, [], null, "Server error....", 1);
    }
};

/**
 * Fungsi untuk get data event organizers.
 * @param {*} req
 * @param {*} res
 * @returns {Promise} - Promise yang berisi hasil dari operasi update.
 */
export const getEventOrganizers = async (req, res) => {
    try {
        const { page = 1, name = "" } = req.query;
        const where = {};
        const { limitPerPage, offset, totalPages, currentPage } = getPagination(
            page,
            10,
            await EventOrganizersModels.count({
                where: buildWhereClause(where, "name", name),
            })
        );

        const eventOrganizersData = await EventOrganizersModels.findAll({
            where: buildWhereClause(where, "name", name),
            limit: limitPerPage,
            offset,
            attributes: {
                exclude: ["created_at", "updated_at"],
            },
        });

        const responseData = eventOrganizersData.map((item) => ({
            id: item.id,
            name: item.name,
        }));

        return responseApi(res, responseData, {
            assets_image_url: process.env.APP_BUCKET_IMAGE,
            pagination: {
                current_page: currentPage,
                per_page: limitPerPage,
                total: eventOrganizersData.length,
                total_page: totalPages,
            },
        });
    } catch (error) {
        console.log("errro", error);
        return responseApi(res, [], null, "Server error....", 1);
    }
};

/**
 * function create new types content details
 * @param {*} req
 * @param {*} res
 * @returns {Object}
 */
export const createTypeContentDetails = async (req, res) => {
    try {
        const { name } = req.body;
        await TypeContentDetailsModels.create({
            name: name,
            created_at: makeEpocTime(),
        });
        return responseApi(res, [], null, "Data has been saved", 0);
    } catch (error) {
        console.log(error);
        return responseApi(res, [], null, "Server error....", 1);
    }
};

/**
 * Fungsi untuk get data event organizers.
 * @param {*} req
 * @param {*} res
 * @returns {Promise} - Promise yang berisi hasil dari operasi update.
 */
export const getTypeContentDetails = async (req, res) => {
    try {
        const { page = 1, name = "" } = req.query;
        const where = {};
        const { limitPerPage, offset, totalPages, currentPage } = getPagination(
            page,
            10,
            await TypeContentDetailsModels.count({
                where: buildWhereClause(where, "name", name),
            })
        );

        const contentData = await TypeContentDetailsModels.findAll({
            where: buildWhereClause(where, "name", name),
            limit: limitPerPage,
            offset,
            attributes: {
                exclude: ["created_at", "updated_at", "id"],
            },
        });

        const responseData = contentData.map((item) => ({
            id: item.id,
            name: item.name,
        }));

        return responseApi(res, responseData, {
            assets_image_url: process.env.APP_BUCKET_IMAGE,
            pagination: {
                current_page: currentPage,
                per_page: limitPerPage,
                total: contentData.length,
                total_page: totalPages,
            },
        });
    } catch (error) {
        console.log("errro", error);
        return responseApi(res, [], null, "Server error....", 1);
    }
};

/**
 * function create new tags
 * @param {*} req
 * @param {*} res
 * @returns {Object}
 */
export const createTags = async (req, res) => {
    try {
        const { title } = req.body;
        await TagsModels.create({
            title: title,
            created_at: makeEpocTime(),
        });
        return responseApi(res, [], null, "Data has been saved", 0);
    } catch (error) {
        console.log(error);
        return responseApi(res, [], null, "Server error....", 1);
    }
};

/**
 * Fungsi untuk get data tags.
 * @param {*} req
 * @param {*} res
 * @returns {Promise} - Promise yang berisi hasil dari operasi update.
 */
export const getTags = async (req, res) => {
    try {
        const { page = 1, title = "" } = req.query;
        const where = {};
        const { limitPerPage, offset, totalPages, currentPage } = getPagination(
            page,
            10,
            await TagsModels.count({
                where: buildWhereClause(where, "title", title),
            })
        );

        const contentData = await TagsModels.findAll({
            where: buildWhereClause(where, "title", title),
            limit: limitPerPage,
            offset,
            attributes: {
                exclude: ["created_at", "updated_at", "id"],
            },
        });

        const responseData = contentData.map((item) => ({
            id: item.id,
            title: item.title,
        }));

        return responseApi(res, responseData, {
            assets_image_url: process.env.APP_BUCKET_IMAGE,
            pagination: {
                current_page: currentPage,
                per_page: limitPerPage,
                total: contentData.length,
                total_page: totalPages,
            },
        });
    } catch (error) {
        console.log("errro", error);
        return responseApi(res, [], null, "Server error....", 1);
    }
};

/**
 * function create new tags
 * @param {*} req
 * @param {*} res
 * @returns {Object}
 */
export const createActress = async (req, res) => {
    try {
        const file = req.files.image_file;
        const fileDate = new Date();
        const filesNamed = fileDate.getTime() + getExtension(file.name);
        const fileDestination =
            process.env.APP_LOCATION_FILE + createNameFile(filesNamed);
        await uploadFile(file, fileDestination);
        const { name, gender, detail } = req.body;
        await ActressModels.create({
            name: name,
            gender: gender,
            detail: detail,
            image: createNameFile(filesNamed),
            created_at: makeEpocTime(),
        });
        return responseApi(res, [], null, "Data Success Saved", 0);
    } catch (error) {
        console.log(error);
        return responseApi(res, [], null, "Server error....", 1);
    }
};

/**
 * Fungsi untuk get data tags.
 * @param {*} req
 * @param {*} res
 * @returns {Promise} - Promise yang berisi hasil dari operasi update.
 */
export const getActress = async (req, res) => {
    try {
        const { page = 1, name = "" } = req.query;
        const where = {};
        const { limitPerPage, offset, totalPages, currentPage } = getPagination(
            page,
            10,
            await ActressModels.count({
                where: buildWhereClause(where, "name", name),
            })
        );

        const contentData = await ActressModels.findAll({
            where: buildWhereClause(where, "name", name),
            limit: limitPerPage,
            offset,
            attributes: {
                exclude: ["created_at", "updated_at", "id"],
            },
        });

        const responseData = contentData.map((item) => ({
            id: item.id,
            name: item.name,
        }));

        return responseApi(res, responseData, {
            assets_image_url: process.env.APP_BUCKET_IMAGE,
            pagination: {
                current_page: currentPage,
                per_page: limitPerPage,
                total: contentData.length,
                total_page: totalPages,
            },
        });
    } catch (error) {
        console.log("errro", error);
        return responseApi(res, [], null, "Server error....", 1);
    }
};

/**
 * Function to create new content details
 * @param {*} req
 * @param {*} res
 * @returns {Object}
 */
export const createContentDetails = withTransaction(
    async (req, res, transaction) => {
        const {
            title,
            schedule_start,
            schedule_end,
            date_start,
            date_end,
            description,
            vanues_id,
            contents_id,
            event_organizers_id,
            is_trending,
            status,
            type_content_details_id,
            actress,
            tags,
        } = req.body;
        const actressArray = Array.isArray(JSON.parse(actress))
            ? JSON.parse(actress)
            : [];
        const tagsArray = Array.isArray(JSON.parse(tags))
            ? JSON.parse(tags)
            : [];

        try {
            const file = req.files.image;
            const fileDate = new Date();
            const filesNamed = fileDate.getTime() + getExtension(file.name);
            const fileDestination =
                process.env.APP_LOCATION_FILE + createNameFile(filesNamed);
            await uploadFile(file, fileDestination);
            const createdAt = makeEpocTime();

            let contentDetailData = await ContentDetailsModels.create(
                {
                    title: title,
                    slug: convertToSlug(title) + makeRandomString(3),
                    schedule_start: dateToEpochTime(schedule_start),
                    schedule_end: dateToEpochTime(schedule_end),
                    date_start: dateToEpochTime(date_start),
                    date_end: dateToEpochTime(date_end),
                    description: description,
                    image: createNameFile(filesNamed),
                    vanues_id: vanues_id,
                    contents_id: contents_id,
                    event_organizers_id: event_organizers_id,
                    is_trending: is_trending,
                    status: status,
                    type_content_details_id: type_content_details_id,
                    created_at: createdAt,
                },
                { transaction }
            );
            await Promise.all(
                actressArray.map(async (valActress) => {
                    await ContentDetailActressModels.create(
                        {
                            content_details_id: contentDetailData.id,
                            actress_id: valActress.id,
                        },
                        { transaction }
                    );
                }),
                tagsArray.map(async (valTags) => {
                    await ContentDetailTagsModels.create(
                        {
                            content_details_id: contentDetailData.id,
                            tags_id: valTags.id,
                        },
                        { transaction }
                    );
                })
            );
            return responseApi(res, [], null, "Data has been saved", 1);
        } catch (error) {
            console.error("Error in createContentDetails:", error);
            throw error;
        }
    }
);

/**
 * Function to get content details data
 * @param {*} req
 * @param {*} res
 * @returns {Promise} - Promise containing the result of the operation
 */
export const getContentDetails = async (req, res) => {
    try {
        const usersToken = getDataUserUsingToken(req, res);
        const contentDetailsSlug = req.params.slug;
        const users_id = usersToken.tod;

        const replacements = {};
        let whereClause = "WHERE cd.slug = :contentDetailsSlug";
        replacements.contentDetailsSlug = contentDetailsSlug;

        // Menyusun query utama
        const query = `
            SELECT 
                cd.title,
                cd.slug,
                cd.impression,
                TO_CHAR(TO_TIMESTAMP(cd.schedule_start), 'YYYY-MM-DD HH24:MI:SS') AS schedule_start,
                TO_CHAR(TO_TIMESTAMP(cd.schedule_end), 'YYYY-MM-DD HH24:MI:SS') AS schedule_end,
                TO_CHAR(TO_TIMESTAMP(cd.date_start), 'YYYY-MM-DD HH24:MI:SS') AS date_start,
                TO_CHAR(TO_TIMESTAMP(cd.date_end), 'YYYY-MM-DD HH24:MI:SS') AS date_end,
                cd.description,
                cd.image,
                CASE WHEN cd.is_trending = 1 THEN true ELSE false END AS is_trending,
                CASE WHEN cd.status = 0 THEN 'ended' 
                    WHEN cd.status = 1 THEN 'ongoing' 
                    ELSE 'upcoming' END AS status,
                CASE
                    WHEN EXISTS (
                        SELECT 1
                        FROM ir_content_detail_followers cdf
                        WHERE cdf.content_details_id = cd.id AND cdf.users_id = ${users_id}
                    ) THEN 'following'
                    ELSE 'not following'
                END AS is_follow,
                (
                SELECT json_build_object(
                    'total_followers', COUNT(*),
                    'users', (
                            SELECT json_agg(
                                json_build_object(
                                    'id', limited_users.id,
                                    'display_name', limited_users.display_name,
                                    'image', limited_users.photo
                                )
                            )
                            FROM (
                                SELECT u.id, u.display_name, u.photo
                                FROM ir_content_detail_followers cdf
                                JOIN ir_users u ON cdf.users_id = u.id
                                WHERE cdf.content_details_id = cd.id
                                ORDER BY cdf.id DESC
                                LIMIT 5
                            ) AS limited_users
                        )
                    )
                    FROM ir_content_detail_followers cdf
                    WHERE cdf.content_details_id = cd.id
                )AS followers,
                (
                    SELECT json_agg(
                        json_build_object(
                            'slug', pcds.slug,
                            'caption_post', pcds.caption_post,
                            'images', (
                                SELECT COALESCE(json_agg(
                                    json_build_object(
                                            'image', fpcds.file
                                    )
                                ), '[]') AS members
                                FROM ir_file_post_content_details fpcds
                                WHERE fpcds.post_content_details_id = pcds.id
                                
                            ),
                            'created_at', TO_CHAR(TO_TIMESTAMP(pcds.created_at) AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD HH24:MI:SS'),
                            'user', json_build_object(
                                'display_name', pcds.display_name,
                                'image', pcds.photo,
                                'username', pcds.username
                            ),
                            'total_likes', (
                                SELECT COUNT(*)
                                FROM ir_like_post_content_details lpcds
                                WHERE lpcds.post_content_details_id = pcds.id
                            ),
                            'total_comments', (
                                SELECT COUNT(*)
                                FROM ir_comment_post_content_details cpcds
                                WHERE cpcds.post_content_details_id = pcds.id
                            ), 
                            'total_impression', (
                                SELECT COUNT(*)
                                FROM ir_impression_post_content_details ipcds
                                WHERE ipcds.post_content_details_id = pcds.id
                            ), 
                            'post_liked', (
                                SELECT EXISTS (
                                    SELECT 1
                                    FROM ir_like_post_content_details l
                                    WHERE l.post_content_details_id = pcds.id
                                    AND l.users_id = ${users_id}
                                )
                            )
                        )
                    )
                    FROM (
                        SELECT pcds.slug, pcds.caption_post, pcds.id, pcds.created_at, u.display_name, u.photo, u.username,
						(SELECT COUNT(*)
                            FROM ir_comment_post_content_details cpcds
                            WHERE cpcds.post_content_details_id = pcds.id)
                             AS total_comments,
                             (SELECT COUNT(*)
                            FROM ir_impression_post_content_details ipcds
                            WHERE ipcds.post_content_details_id = pcds.id)
                             AS total_impression, 
                            (
                                SELECT COUNT(*)
                                FROM ir_like_post_content_details lpcds
                                WHERE lpcds.post_content_details_id = pcds.id
                            ) AS total_likes
                        FROM ir_post_content_details pcds
                        LEFT JOIN ir_users u ON pcds.users_id = u.id
                        LEFT JOIN ir_segmented_post_content_details spcds ON pcds.id = spcds.post_content_details_id
                        LEFT JOIN ir_file_post_content_details fpcds ON pcds.id = fpcds.post_content_details_id
                        WHERE spcds.content_details_id = cd.id
                        ORDER BY total_likes DESC, total_comments, total_impression DESC
                        LIMIT 3
                    ) AS pcds
                ) AS posts,
                (
                    SELECT COUNT(*) AS total_posts
                    FROM ir_post_content_details pcds
                    LEFT JOIN ir_segmented_post_content_details spcds ON pcds.id = spcds.post_content_details_id
                    WHERE spcds.content_details_id = cd.id
                ) AS total_posts,
                (
                    SELECT COUNT(*) AS total_groups
                    FROM ir_groups g WHERE g.content_details_id = cd.id
                ) AS total_groups,
                json_build_object(
                    'id', tcd.id,
                    'name', tcd.name
                ) AS type_content_details,
                json_build_object(
                    'id', eo.id,
                    'name', eo.name,
                    'image', eo.image
                ) AS event_organizers,
                (
                    SELECT json_agg(
                        json_build_object(
                            'id', t.id,
                            'title', t.title
                        )
                    )
                    FROM ir_content_detail_tags cdt
                    JOIN ir_tags t ON cdt.tags_id = t.id
                    WHERE cdt.content_details_id = cd.id
                ) AS tags,
                (
                    SELECT json_agg(
                        json_build_object(
                            'id', a.id,
                            'name', a.name
                        )
                    )
                    FROM ir_content_detail_actress cda
                    JOIN ir_actress a ON cda.actress_id = a.id
                    WHERE cda.content_details_id = cd.id
                ) AS actress,
                json_build_object(
                    'region', json_build_object(
                        'id', co.id,
                        'name', co.title
                    ),
                    'city', json_build_object(
                        'id', ci.id,
                        'name', ci.title
                    ),
                    'venue', json_build_object(
                        'id', v.id,
                        'name', v.title
                    )
                ) AS location
            FROM ir_content_details cd
            LEFT JOIN ir_type_content_details tcd ON cd.type_content_details_id = tcd.id
            LEFT JOIN ir_event_organizers eo ON cd.event_organizers_id = eo.id
            LEFT JOIN ir_vanues v ON cd.vanues_id = v.id
            LEFT JOIN ir_citys ci ON v.citys_id = ci.id
            LEFT JOIN ir_provinces p ON v.provinces_id = p.id
            LEFT JOIN ir_countries co ON v.countries_id = co.id
            ${whereClause}
            ORDER BY cd.id;
        `;

        const contentDetailsData = await db.query(query, {
            replacements,
            type: db.QueryTypes.SELECT,
        });

        let responseData = contentDetailsData;
        if (contentDetailsData.length > 0) {
            responseData = contentDetailsData[0];
            try {
                const updatedImpressions = Number(responseData.impression) + 1;
                const affectedRows = await ContentDetailsModels.update(
                    { impression: Number(updatedImpressions) },
                    { where: { slug: contentDetailsSlug } }
                );
            } catch (error) {
                console.error("Error updating impression:", error);
                throw error;
            }
        }
        return responseApi(
            res,
            responseData,
            {
                assets_image_url: process.env.APP_BUCKET_IMAGE,
            },
            "Data retrieved successfullysssss",
            0
        );
    } catch (error) {
        console.error("Error fetching content details:", error); // Penanganan error lebih spesifik
        return responseApi(res, [], null, "Server error....", 1);
    }
};

/**
 * function create new tags
 * @param {*} req
 * @param {*} res
 * @returns {Object}
 */
export const followEvent = async (req, res) => {
    try {
        const usersToken = getDataUserUsingToken(req, res);
        const users_id = usersToken.tod;
        const { slug } = req.query;
        const getContentDetail = await ContentDetailsModels.findOne({
            where: { slug: slug },
        });
        if (!getContentDetail) {
            return responseApi(
                res,
                [],
                null,
                "What event are you attending?",
                2
            );
        }
        const contentDetailsId = getContentDetail.id;
        const contentDetailFollowersData =
            await ContentDetailFollowersModels.findOne({
                where: {
                    [Op.and]: [
                        { content_details_id: contentDetailsId },
                        { users_id: users_id },
                    ],
                },
            });

        if (contentDetailFollowersData) {
            await ContentDetailFollowersModels.destroy({
                where: {
                    [Op.and]: [
                        { content_details_id: contentDetailsId },
                        { users_id: users_id },
                    ],
                },
            });
            return responseApi(
                res,
                [],
                null,
                "You are not taking part in this event",
                0
            );
        } else {
            await ContentDetailFollowersModels.create({
                content_details_id: contentDetailsId,
                users_id: users_id,
                created_at: makeEpocTime(),
            });
            return responseApi(
                res,
                [],
                null,
                "You have participated in this event",
                0
            );
        }
    } catch (error) {
        console.log(error);
        return responseApi(res, [], null, "Server error....", 1);
    }
};
