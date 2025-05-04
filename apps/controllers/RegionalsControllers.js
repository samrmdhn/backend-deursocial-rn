import { responseApi } from "../../libs/RestApiHandler.js";
import CitysModels from "../models/CitysModels.js";
import { Sequelize } from "sequelize";

const Op = Sequelize.Op;

export const getDataCity = async (req, res) => {
    
    try {
        const textCity = req.query.text_city;
        const dataCities = await CitysModels.findAll({
            attributes: ['id', 'title'],
            where: {
                title: {
                    [Op.iLike]: `%${textCity.trim()}%`,
                },
            },
        });
        return responseApi(res, dataCities, null, "Data has been retrived", 0);
    } catch (error) {
        console.log("error post", error);
        return responseApi(res, [], null, "Server error....", 1);
    }
}