import db from "../../configs/Database.js";
import { dateToEpochTime, getDataUserUsingToken, withTransaction } from "../../helpers/customHelpers.js";
import { responseApi } from "../../libs/RestApiHandler.js"
import ContentDetailsModels from "../models/ContentDetailsModels.js";
import ReportedUsersModels from "../models/ReportedUsersModels.js";

export const getDataReport = async (req, res) => {
    try {
        const { page = 1, limit = 10, type_report = '' } = req.query;
        const offset = (page - 1) * limit;
        let whereClause = ` WHERE status = 1 `
        const replacements = {
            limit: parseInt(limit, 10),
            offset: parseInt(offset, 10),
        };
        if (type_report) {
            whereClause += `AND type = :type_report`
            replacements.type_report = type_report
        }

        const query = `
            SELECT id, title, description FROM ir_reports
           ${whereClause}
            LIMIT :limit OFFSET :offset;
        `;
        const executeQuery = await db.query(query, {
            type: db.QueryTypes.SELECT,
            replacements,
        });
        const countQuery = `
            SELECT COUNT(*) AS total_count
            FROM ir_reports
           ${whereClause}
        `;
        const totalCountResult = await db.query(countQuery, {
            type: db.QueryTypes.SELECT,
            replacements,
        });

        const totalCount = totalCountResult[0].total_count;
        const totalPages = Math.ceil(totalCount / limit);

        return responseApi(
            res,
            executeQuery,
            {
                assets_image_url: process.env.APP_BUCKET_IMAGE,
                pagination: {
                    current_page: parseInt(page, 10),
                    per_page: parseInt(limit, 10),
                    total: totalCount,
                    total_page: totalPages,
                },
            },
            "Data has been retrieved",
            0
        );
    } catch (error) {
        console.log("[ERROR] getDataReport", error)
        return responseApi(res, [], null, 'server error......!')
    }
}

export const saveReportedByUsers = withTransaction(
    async (req, res, transaction) => {
        try {
            const { reports_id, description, source, type } = req.body;
            const usersToken = getDataUserUsingToken(req, res);
            const users_id = usersToken.tod;
            if (users_id === 0) {
                return responseApi(res, [], null, "What are you doing? You can login yaah", 418);
            }
            let source_id = 0
            if (type === 1) {
                const postOrMoment = await ContentDetailsModels.findOne({
                    slug: source
                })
                if (!postOrMoment) {
                    return responseApi(res, [], null, "What are you doing? You can login yaah", 418);
                }
                source_id = postOrMoment.id
            }
            const dataReport = {
                users_id: users_id,
                reports_id: reports_id,
                type: type,
                source_id: source_id,
                description: description,
                created_at: dateToEpochTime(req.headers["x-date-for"]),
            }
            await ReportedUsersModels.create(dataReport,
                { transaction }
            );
            return responseApi(res, null, null, "Data has been retrieved", 0);
        } catch (error) {
            console.log("[ERROR] getDataReport", error)
            return responseApi(res, [], null, 'server error......!')
        }
    }
)