import db from "../../configs/Database.js";
import { responseApi } from "../../libs/RestApiHandler.js";
import { Sequelize } from "sequelize";

const Op = Sequelize.Op;

export const getDataCity = async (req, res) => {
    try {
        const textCity = req.query.text_city;

        const dataCities = await db.query(`
            SELECT c.id, c.title
            FROM ir_citys c
            JOIN ir_provinces p ON c.provinces_id = p.id
            WHERE c.title ILIKE :textCity
            AND p.countries_id = 102
        `, {
            replacements: {
                textCity: `%${textCity.trim()}%`
            },
            type: db.QueryTypes.SELECT,
        });

        return responseApi(res, dataCities, null, "Data has been retrived", 0);
    } catch (error) {
        console.log("error post", error);
        return responseApi(res, [], null, "Server error....", 1);
    }

}