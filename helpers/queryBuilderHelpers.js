import { Sequelize } from "sequelize";
const Op = Sequelize.Op;

/**
 * helper where clause query(ORM only)
 * @param {*} where object for initiator condition
 * @param {*} field string name field name
 * @param {*} value string value from field name
 * @returns 
 */
export const buildWhereClause = (where, field, value) => {
    if (value) {
        where[field] = { [Op.iLike]: `%${value}%` };
    }
    return where;
};