import { makeEpocTime } from "../../helpers/customHelpers.js";
import { responseApi } from "../../libs/RestApiHandler.js";
import GroupsModels from "../models/GroupsModels.js";

export const createGroups = async(req, res) => {
    try {
        const {
            title,
            users_id,
            description,
            citys_id,
            content_details_id,
            max_members,
            is_gender,
            is_anonymous,
            is_private,
        } = req.body;
        await GroupsModels.create({
            title: title,
            users_id: users_id,
            description: description,
            citys_id: citys_id,
            content_details_id: content_details_id,
            max_members: max_members,
            is_gender: is_gender,
            is_private: is_private,
            created_at: makeEpocTime(),
        });
        return responseApi(res, [], null, "Data Success Saved", 0);
    } catch (error) {
        console.log(error);
        return responseApi(res, [], null, "Server error....", 1);
    }
}