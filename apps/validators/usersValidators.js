import Joi from "joi";

export const validationRegisterUsers = (userData) => {
    const userSchema = Joi.object({
        fullname: Joi.string()
        .required()
        .min(3)
        .max(50)
        .pattern(/^[a-zA-Z0-9\s]+$/)
        .messages({
            "string.pattern.base": "Display name not valid",
        }),
        description: Joi.string().optional().max(100),
        email: Joi.string().email().required(),
        username: Joi.string()
            .required()
            .min(3)
            .max(50)
            .pattern(/^[a-zA-Z0-9._]+$/)
            .messages({
                "string.pattern.base": "Username not valid",
            }),
        gender: Joi.number().required().not(Joi.valid(0)).valid(1, 2).messages({
            "any.required": "Gender is required",
            "any.invalid": "Select Gender",
            "any.only": "Please Select Gender",
        }),
        // image: Joi.string().uri().optional()  // Validasi URL gambar (opsional)
    });

    const { error, value } = userSchema.validate(userData);

    if (error) {
        const modifiedErrors = error.details.map((err) => ({
            message: err.message,
            label: err.context.key,
        }));

        return { valid: false, errors: modifiedErrors };
    }

    return { valid: true, value };
};
