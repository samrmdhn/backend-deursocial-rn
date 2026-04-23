import Joi from "joi";

export const validationSetMeetingPoint = (data) => {
    const schema = Joi.object({
        group_slug: Joi.string().required().messages({
            "any.required": "group_slug is required",
        }),
        name: Joi.string().required().messages({
            "any.required": "name is required",
        }),
        notes: Joi.string().allow("", null).optional(),
        latitude: Joi.number().allow(null).optional(),
        longitude: Joi.number().allow(null).optional(),
        set_by: Joi.string().required().messages({
            "any.required": "set_by is required",
        }),
        set_by_user_id: Joi.string().required().messages({
            "any.required": "set_by_user_id is required",
        }),
    });

    return schema.validate(data);
};

export const validationGetOrCreateConversation = (data) => {
    const schema = Joi.object({
        current_username: Joi.string().required().messages({
            "any.required": "current_username is required",
        }),
        other_username: Joi.string().required().messages({
            "any.required": "other_username is required",
        }),
        current_user_id: Joi.string().allow("", null).optional(),
        other_user_id: Joi.string().allow("", null).optional(),
    });

    return schema.validate(data);
};
