import {
    convertToSlug,
    dateToEpochTime,
    epochToDateJakarta,
    makeEpocTime,
} from "../../helpers/customHelpers.js";
import { responseApi } from "../../libs/RestApiHandler.js";
import DisplayTypesModels from "../models/DisplayTypesModels.js";
import ContentModels from "../models/ContentModels.js";
import { Sequelize } from "sequelize";
import runnerForJsonRegions from "../../databases/json/scripts/regionsCreates.js";
import runnerForJsonSubRegions from "../../databases/json/scripts/subRegionsCreates.js";
import runnerForJsonCountries from "../../databases/json/scripts/countriesCreates.js";
import runnerForJsonProvinces from "../../databases/json/scripts/provincesCreates.js";
import runnerForJsonCitys from "../../databases/json/scripts/citysCreates.js";
import EventOrganizersModels from "../models/EventOrganizersModels.js";
import TypeContentDetailsModels from "../models/TypeContentDetailsModels.js";
import TagsModels from "../models/TagsModels.js";
import ActressModels from "../models/ActressModels.js";
import ContentDetailsModels from "../models/ContentDetailsModels.js";
import ContentDetailTagsModels from "../models/ContentDetailTagsModels.js";
import ContentDetailActressModels from "../models/ContentDetailActressModels.js";
import VanuesModels from "../models/VanuesModels.js";
import CitysModels from "../models/CitysModels.js";
import ProvincesModels from "../models/ProvincesModels.js";
import CountriesModels from "../models/CountriesModels.js";
import db from "../../configs/Database.js";

const Op = db.Op;

export const homepage = async (req, res) => {
    runnerForJsonRegions();
    runnerForJsonSubRegions();
    runnerForJsonCountries();
    runnerForJsonProvinces();
    runnerForJsonCitys();
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
        return responseApi(res, {
            data: [],
            status: {
                code: 0,
                message_client: "Data has been saved",
            },
        });
    } catch (error) {
        console.log(error);
        return responseApi(res, {
            data: [],
            message: "server error....",
            status: 1,
        });
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
            return responseApi(res, {
                data: [],
                message: "data not found",
                status: 2,
            });
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
export const getDisplayTypes = async (req, res) => {
    try {
        const { page = 1, limit = 10, title = "", status = 1 } = req.query;
        const offset = (page - 1) * limit;
        const where = {
            status: status ? status : 1,
        };

        if (title) {
            where.title = {
                [Op.iLike]: `%${title}%`,
            };
        }
        const displayTypesData = await DisplayTypesModels.findAll({
            where,
            limit: parseInt(limit),
            offset: parseInt(offset),
            attributes: {
                exclude: ["created_at", "updated_at", "status"],
            },
        });

        // Hitung total record untuk pagination
        const totalCount = await DisplayTypesModels.count({
            where,
        });

        // Menghitung jumlah halaman
        const totalPages = Math.ceil(totalCount / limit);

        return responseApi(res, {
            data: displayTypesData,
            meta: {
                assets_image_url: "https://google.com", // Contoh URL gambar
                pagination: {
                    current_page: parseInt(page),
                    per_page: parseInt(limit),
                    total: totalCount,
                    total_page: totalPages,
                },
            },
            status: {
                code: 0,
                message_client: "Data retrieved successfully",
            },
        });
    } catch (error) {
        console.error("Error fetching display types:", error);
        return responseApi(res, {
            data: [],
            message: "Server error....",
            status: 1,
        });
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
            display_types_id: display_types_id,
            created_at: makeEpocTime(),
        });
        return responseApi(res, {
            data: [],
            status: {
                code: 0,
                message_client: "Data has been saved",
            },
        });
    } catch (error) {
        console.log(error);
        return responseApi(res, {
            data: [],
            message: "server error....",
            status: 1,
        });
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
        const { page = 1, limit = 10, title = "", status = 1 } = req.query;
        const offset = (page - 1) * limit;

        // Construct where clause with parameterized values
        let whereClause = `WHERE c.status = :status`;
        const replacements = {
            status,
            limit: parseInt(limit),
            offset: parseInt(offset),
        };

        if (title) {
            whereClause += ` AND c.title ILIKE :title`;
            replacements.title = `%${title}%`;
        }

        const query = `
            SELECT 
                c.id, 
                c.title,
                dt.title AS display_type,
                json_agg(
                    json_build_object(
                        'title', cd.title,
                        'slug', cd.slug,
                        'schedule_start', TO_CHAR(TO_TIMESTAMP(cd.schedule_start), 'YYYY-MM-DD HH24:MI:SS'),
                        'schedule_end', TO_CHAR(TO_TIMESTAMP(cd.schedule_end), 'YYYY-MM-DD HH24:MI:SS'),
                        'date_start', TO_CHAR(TO_TIMESTAMP(cd.date_start), 'YYYY-MM-DD HH24:MI:SS'),
                        'date_end', TO_CHAR(TO_TIMESTAMP(cd.date_end), 'YYYY-MM-DD HH24:MI:SS'),
                        'description', cd.description,
                        'image', cd.image,
                        'is_trending', CASE WHEN cd.is_trending = 1 THEN true ELSE false END,
                        'status', CASE WHEN cd.is_trending = 0 THEN 'ended' WHEN cd.is_trending = 1 THEN 'ongoing' ELSE 'upcoming' END,
                        'type_content_details', json_build_object(
                            'id', tcd.id,
                            'name', tcd.name
                        ),
                        'event_organizers', json_build_object(
                            'id', eo.id,
                            'name', eo.name,
                            'image', eo.image
                        ),
                        'tags', (
                            SELECT json_agg(
                                json_build_object(
                                    'id', t.id,
                                    'title', t.title
                                )
                            )
                            FROM ir_content_detail_tags cdt
                            JOIN ir_tags t ON cdt.tags_id = t.id
                            WHERE cdt.content_details_id = cd.id
                        ),
                        'actress', (
                            SELECT json_agg(
                                json_build_object(
                                    'id', a.id,
                                    'name', a.name
                                )
                            )
                            FROM ir_content_detail_actress cda
                            JOIN ir_actress a ON cda.actress_id = a.id
                            WHERE cda.content_details_id = cd.id
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
            LEFT JOIN ir_display_types dt ON c.display_types_id = dt.id
            LEFT JOIN ir_content_details cd ON cd.contents_id = c.id
            LEFT JOIN ir_type_content_details tcd ON cd.type_content_details_id = tcd.id
            LEFT JOIN ir_event_organizers eo ON cd.event_organizers_id = eo.id
            LEFT JOIN ir_vanues v ON cd.vanues_id = v.id
            LEFT JOIN ir_citys ci ON v.citys_id = ci.id
            LEFT JOIN ir_provinces p ON v.provinces_id = p.id
            LEFT JOIN ir_countries co ON v.countries_id = co.id
            ${whereClause}
            GROUP BY c.id, dt.title
            ORDER BY c.id
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
            display_types: item.display_type,
            content_details: item.content_details,
        }));

        return responseApi(res, {
            data: responseData,
            meta: {
                assets_image_url: "https://google.com", // Contoh URL gambar
                pagination: {
                    current_page: parseInt(page),
                    per_page: parseInt(limit),
                    total: totalCount,
                    total_page: totalPages,
                },
            },
            status: {
                code: 0,
                message_client: "Data retrieved successfully",
            },
        });
    } catch (error) {
        console.error("Error fetching display types:", error);
        return responseApi(res, {
            data: [],
            message: "Server error....",
            status: 1,
        });
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
        return responseApi(res, {
            data: [],
            status: {
                code: 0,
                message_client: "Data has been saved",
            },
        });
    } catch (error) {
        console.log(error);
        return responseApi(res, {
            data: [],
            message: "server error....",
            status: 1,
        });
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
        const { page = 1, limit = 10, name = "" } = req.query;
        const offset = (page - 1) * limit;
        const where = {};
        if (name) {
            where.name = {
                [Op.iLike]: `%${name}%`,
            };
        }
        const eventOrganizersData = await EventOrganizersModels.findAll({
            where,
            limit: parseInt(limit),
            offset: parseInt(offset),
            attributes: {
                exclude: ["created_at", "updated_at", "id"],
            },
        });
        const totalCount = await EventOrganizersModels.count({
            where,
        });
        const totalPages = Math.ceil(totalCount / limit);
        const responseData = eventOrganizersData.map((item) => ({
            id: item.id,
            name: item.name,
        }));
        return responseApi(res, {
            data: responseData,
            meta: {
                assets_image_url: "https://google.com", // Contoh URL gambar
                pagination: {
                    current_page: parseInt(page),
                    per_page: parseInt(limit),
                    total: totalCount,
                    total_page: totalPages,
                },
            },
            status: {
                code: 0,
                message_client: "Data retrieved successfully",
            },
        });
    } catch (error) {
        console.error("Error fetching display types:", error);
        return responseApi(res, {
            data: [],
            message: "Server error....",
            status: 1,
        });
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
        return responseApi(res, {
            data: [],
            status: {
                code: 0,
                message_client: "Data has been saved",
            },
        });
    } catch (error) {
        console.log(error);
        return responseApi(res, {
            data: [],
            message: "server error....",
            status: 1,
        });
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
        const { page = 1, limit = 10, name = "" } = req.query;
        const offset = (page - 1) * limit;
        const where = {};
        if (name) {
            where.name = {
                [Op.iLike]: `%${name}%`,
            };
        }
        const typeContentDetailsData = await TypeContentDetailsModels.findAll({
            where,
            limit: parseInt(limit),
            offset: parseInt(offset),
            attributes: {
                exclude: ["created_at", "updated_at", "id"],
            },
        });
        const totalCount = await TypeContentDetailsModels.count({
            where,
        });
        const totalPages = Math.ceil(totalCount / limit);
        const responseData = typeContentDetailsData.map((item) => ({
            id: item.id,
            name: item.name,
        }));
        return responseApi(res, {
            data: responseData,
            meta: {
                assets_image_url: "https://google.com", // Contoh URL gambar
                pagination: {
                    current_page: parseInt(page),
                    per_page: parseInt(limit),
                    total: totalCount,
                    total_page: totalPages,
                },
            },
            status: {
                code: 0,
                message_client: "Data retrieved successfully",
            },
        });
    } catch (error) {
        console.error("Error fetching display types:", error);
        return responseApi(res, {
            data: [],
            message: "Server error....",
            status: 1,
        });
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
        return responseApi(res, {
            data: [],
            status: {
                code: 0,
                message_client: "Data has been saved",
            },
        });
    } catch (error) {
        console.log(error);
        return responseApi(res, {
            data: [],
            message: "server error....",
            status: 1,
        });
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
        const { page = 1, limit = 10, title = "" } = req.query;
        const offset = (page - 1) * limit;
        const where = {};
        if (title) {
            where.title = {
                [Op.iLike]: `%${title}%`,
            };
        }
        const tagsData = await TagsModels.findAll({
            where,
            limit: parseInt(limit),
            offset: parseInt(offset),
            attributes: {
                exclude: ["created_at", "updated_at", "id"],
            },
        });
        const totalCount = await TagsModels.count({
            where,
        });
        const totalPages = Math.ceil(totalCount / limit);
        const responseData = tagsData.map((item) => ({
            id: item.id,
            title: item.title,
        }));
        return responseApi(res, {
            data: responseData,
            meta: {
                assets_image_url: "https://google.com", // Contoh URL gambar
                pagination: {
                    current_page: parseInt(page),
                    per_page: parseInt(limit),
                    total: totalCount,
                    total_page: totalPages,
                },
            },
            status: {
                code: 0,
                message_client: "Data retrieved successfully",
            },
        });
    } catch (error) {
        console.error("Error fetching display types:", error);
        return responseApi(res, {
            data: [],
            message: "Server error....",
            status: 1,
        });
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
        const { name, gender, detail, image } = req.body;
        await ActressModels.create({
            name: name,
            gender: gender,
            detail: detail,
            image: image,
            created_at: makeEpocTime(),
        });
        return responseApi(res, {
            data: [],
            status: {
                code: 0,
                message_client: "Data has been saved",
            },
        });
    } catch (error) {
        console.log(error);
        return responseApi(res, {
            data: [],
            message: "server error....",
            status: 1,
        });
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
        const { page = 1, limit = 10, name = "" } = req.query;
        const offset = (page - 1) * limit;
        const where = {};
        if (name) {
            where.name = {
                [Op.iLike]: `%${name}%`,
            };
        }
        const actressData = await ActressModels.findAll({
            where,
            limit: parseInt(limit),
            offset: parseInt(offset),
            attributes: {
                exclude: ["created_at", "updated_at", "id"],
            },
        });
        const totalCount = await ActressModels.count({
            where,
        });
        const totalPages = Math.ceil(totalCount / limit);
        const responseData = actressData.map((item) => ({
            id: item.id,
            name: item.name,
        }));
        return responseApi(res, {
            data: responseData,
            meta: {
                assets_image_url: "https://google.com", // Contoh URL gambar
                pagination: {
                    current_page: parseInt(page),
                    per_page: parseInt(limit),
                    total: totalCount,
                    total_page: totalPages,
                },
            },
            status: {
                code: 0,
                message_client: "Data retrieved successfully",
            },
        });
    } catch (error) {
        console.error("Error fetching display types:", error);
        return responseApi(res, {
            data: [],
            message: "Server error....",
            status: 1,
        });
    }
};

/**
 * Function to create new content details
 * @param {*} req
 * @param {*} res
 * @returns {Object}
 */
export const createContentDetails = async (req, res) => {
    try {
        const {
            title,
            schedule_start,
            schedule_end,
            date_start,
            date_end,
            description,
            image,
            vanues_id,
            contents_id,
            event_organizers_id,
            is_trending,
            status,
            type_content_details_id,
        } = req.body;

        await ContentDetailsModels.create({
            title,
            slug: convertToSlug(title),
            schedule_start: dateToEpochTime(schedule_start),
            schedule_end: dateToEpochTime(schedule_end),
            date_start: dateToEpochTime(date_start),
            date_end: dateToEpochTime(date_end),
            description,
            image,
            vanues_id,
            contents_id,
            event_organizers_id,
            is_trending,
            status,
            type_content_details_id,
            created_at: makeEpocTime(),
        });

        return responseApi(res, {
            data: [],
            status: {
                code: 0,
                message_client: "Data has been saved",
            },
        });
    } catch (error) {
        console.log(error);
        return responseApi(res, {
            data: [],
            message: "Server error....",
            status: 1,
        });
    }
};

/**
 * Function to get content details data
 * @param {*} req
 * @param {*} res
 * @returns {Promise} - Promise containing the result of the operation
 */
export const getContentDetails = async (req, res) => {
    try {
        const { page = 1, limit = 10, title = "", status = null } = req.query;
        const offset = (page - 1) * limit;
        const where = {};

        // Filter by title if provided
        if (title) {
            where.title = {
                [Op.iLike]: `%${title}%`,
            };
        }

        // Filter by status if provided
        if (status !== null) {
            where.status = status;
        }

        const ContentDetailsData = await ContentDetailsModels.findAll({
            where,
            limit: parseInt(limit),
            offset: parseInt(offset),
            attributes: {
                exclude: ["created_at", "updated_at"], // Exclude certain attributes
            },
        });

        const totalCount = await ContentDetailsModels.count({ where });
        const totalPages = Math.ceil(totalCount / limit);

        const responseData = ContentDetailsData.map((item) => ({
            id: item.id,
            title: item.title,
            schedule_start: item.schedule_start,
            schedule_end: item.schedule_end,
            date_start: item.date_start,
            date_end: item.date_end,
            description: item.description,
            image: item.image,
            vanues_id: item.vanues_id,
            contents_id: item.contents_id,
            event_organizers_id: item.event_organizers_id,
            is_trending: item.is_trending,
            status: item.status,
            type_content_details_id: item.type_content_details_id,
        }));

        return responseApi(res, {
            data: responseData,
            meta: {
                pagination: {
                    current_page: parseInt(page),
                    per_page: parseInt(limit),
                    total: totalCount,
                    total_page: totalPages,
                },
            },
            status: {
                code: 0,
                message_client: "Data retrieved successfully",
            },
        });
    } catch (error) {
        console.error("Error fetching content details:", error);
        return responseApi(res, {
            data: [],
            message: "Server error....",
            status: 1,
        });
    }
};
