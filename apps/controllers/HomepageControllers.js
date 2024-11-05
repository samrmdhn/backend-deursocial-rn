import { makeEpocTime } from "../../helpers/customHelpers.js";
import { responseApi } from "../../libs/RestApiHandler.js";
import DisplayTypesModels from "../models/DisplayTypesModels.js";
import ContentModels from "../models/ContentModels.js";
import { Sequelize } from "sequelize";
const Op = Sequelize.Op;
ContentModels.belongsTo(DisplayTypesModels, {
    foreignKey: "display_types_id",
});
DisplayTypesModels.hasMany(ContentModels, {
    foreignKey: "display_types_id",
});

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
