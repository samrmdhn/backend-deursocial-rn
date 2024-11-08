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
const Op = Sequelize.Op;

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
        ContentModels.belongsTo(DisplayTypesModels, {
            foreignKey: "display_types_id",
        });
        DisplayTypesModels.hasMany(ContentModels, {
            foreignKey: "display_types_id",
        });

        ContentModels.hasMany(ContentDetailsModels, {
            foreignKey: "contents_id",
            sourceKey: "id",
        });
        ContentDetailsModels.belongsTo(ContentModels, {
            foreignKey: "contents_id",
            targetKey: "id",
        });
        ContentDetailsModels.belongsTo(TypeContentDetailsModels, {
            foreignKey: "type_content_details_id",
            sourceKey: "id",
        });
        TypeContentDetailsModels.hasMany(ContentDetailsModels, {
            foreignKey: "type_content_details_id",
            targetKey: "id",
        });

        ContentDetailsModels.belongsTo(EventOrganizersModels, {
            foreignKey: "event_organizers_id",
            sourceKey: "id",
        });
        EventOrganizersModels.hasMany(ContentDetailsModels, {
            foreignKey: "event_organizers_id",
            targetKey: "id",
        });
        ContentDetailsModels.belongsTo(VanuesModels, {
            foreignKey: "vanues_id",
            sourceKey: "id",
        });
        VanuesModels.hasMany(ContentDetailsModels, {
            foreignKey: "vanues_id",
            targetKey: "id",
        });
        VanuesModels.belongsTo(CitysModels, {
            foreignKey: "citys_id",
            sourceKey: "id",
        });
        CitysModels.hasMany(VanuesModels, {
            foreignKey: "citys_id",
            targetKey: "id",
        });
        CitysModels.belongsTo(ProvincesModels, {
            foreignKey: "provinces_id",
            sourceKey: "id",
        });
        ProvincesModels.hasMany(CitysModels, {
            foreignKey: "provinces_id",
            targetKey: "id",
        });

        ProvincesModels.belongsTo(CountriesModels, {
            foreignKey: "countries_id",
            sourceKey: "id",
        });
        CountriesModels.hasMany(ProvincesModels, {
            foreignKey: "countries_id",
            targetKey: "id",
        });
        // end
        ContentDetailTagsModels.belongsTo(ContentDetailsModels, {
            foreignKey: "content_details_id",
            sourceKey: "id",
        });
        ContentDetailsModels.hasMany(ContentDetailTagsModels, {
            foreignKey: "content_details_id",
            targetKey: "id",
        });
        ContentDetailTagsModels.belongsTo(TagsModels, {
            foreignKey: "tags_id",
            sourceKey: "id",
        });
        TagsModels.hasMany(ContentDetailTagsModels, {
            foreignKey: "tags_id",
            targetKey: "id",
        });
        // end
        ContentDetailActressModels.belongsTo(ContentDetailsModels, {
            foreignKey: "content_details_id",
            sourceKey: "id",
        });
        ContentDetailsModels.hasMany(ContentDetailActressModels, {
            foreignKey: "content_details_id",
            targetKey: "id",
        });
        ContentDetailActressModels.belongsTo(ActressModels, {
            foreignKey: "actress_id",
            sourceKey: "id",
        });
        ActressModels.hasMany(ContentDetailActressModels, {
            foreignKey: "actress_id",
            targetKey: "id",
        });
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
        const contentData = await ContentModels.findAll({
            where,
            limit: parseInt(limit),
            offset: parseInt(offset),
            attributes: {
                exclude: ["created_at", "updated_at", "status", "id"],
            },
            include: [
                {
                    model: DisplayTypesModels,
                    attributes: ["title"],
                },
                {
                    model: ContentDetailsModels,
                    include: [
                        {
                            model: TypeContentDetailsModels,
                        },
                        {
                            model: EventOrganizersModels,
                        },
                        {
                            model: VanuesModels,
                            include: {
                                model: CitysModels,
                                include: {
                                    model: ProvincesModels,
                                    include: {
                                        model: CountriesModels,
                                    },
                                },
                            },
                        },
                        {
                            model: ContentDetailTagsModels,
                            include: [
                                {
                                    model: TagsModels,
                                },
                            ],
                        },
                        {
                            model: ContentDetailActressModels,
                            include: [
                                {
                                    model: ActressModels,
                                },
                            ],
                        },
                    ],
                },
            ],
        });
        const totalCount = await ContentModels.count({
            where,
        });
        const totalPages = Math.ceil(totalCount / limit);
        const responseData = contentData.map((item) => ({
            id: item.id,
            title: item.title,
            display_types: item.ir_display_type
                ? item.ir_display_type.title
                : null,
            content_details: item?.ir_content_details?.map(
                (itemContentDetails) => ({
                    title: itemContentDetails.title,
                    slug: itemContentDetails.slug,
                    schedule_start: epochToDateJakarta(
                        itemContentDetails.schedule_start
                    ),
                    schedule_end: epochToDateJakarta(
                        itemContentDetails.schedule_end
                    ),
                    date_start: epochToDateJakarta(
                        itemContentDetails.date_start
                    ),
                    date_end: epochToDateJakarta(itemContentDetails.date_end),
                    description: itemContentDetails.description,
                    image: itemContentDetails.image,
                    is_trending:
                        itemContentDetails.is_trending === 1 ? true : false,
                    status:
                        itemContentDetails.is_trending === 0
                            ? "ended"
                            : itemContentDetails.is_trending === 1
                            ? "ongoing"
                            : "upcoming",
                    type_content_details: {
                        id: itemContentDetails?.ir_type_content_detail?.id,
                        name: itemContentDetails?.ir_type_content_detail?.name,
                    },
                    event_organizers: {
                        id: itemContentDetails?.ir_event_organizer?.id,
                        name: itemContentDetails?.ir_event_organizer?.name,
                        image: itemContentDetails?.ir_event_organizer?.image,
                    },
                    tags: itemContentDetails?.ir_content_detail_tags?.map(
                        (itemContentDetailTags) => ({
                            id: itemContentDetailTags?.ir_tag?.id,
                            title: itemContentDetailTags?.ir_tag?.title,
                        })
                    ),
                    actress:
                        itemContentDetails?.ir_content_detail_actresses?.map(
                            (itemContentDetailTags) => ({
                                id: itemContentDetailTags?.ir_actress?.id,
                                name: itemContentDetailTags?.ir_actress?.name,
                            })
                        ),
                    location: itemContentDetails?.ir_vanue
                        ? {
                              region: {
                                  id: itemContentDetails?.ir_vanue?.ir_city
                                      ?.ir_province?.ir_country?.id,
                                  name: itemContentDetails?.ir_vanue?.ir_city
                                      ?.ir_province?.ir_country?.titl
                              },
                              city: {
                                  id: itemContentDetails?.ir_vanue?.ir_city?.id,
                                  name: itemContentDetails?.ir_vanue?.ir_city
                                      ?.title
                              },
                              venue: {
                                  id: itemContentDetails?.ir_vanue?.id,
                                  name: itemContentDetails?.ir_vanue?.title
                              },
                          }
                        : null,
                })
            ),
        }));
        return responseApi(res, {
            data: responseData,
            // nyimak: contentData,
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
