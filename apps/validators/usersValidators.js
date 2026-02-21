import Joi from "joi";

// Fungsi untuk menghitung usia berdasarkan tanggal lahir
const calculateAge = (birthDate) => {
    const now = new Date();
    const birthDateObj = new Date(birthDate);
    
    let age = now.getFullYear() - birthDateObj.getFullYear();
    const monthDifference = now.getMonth() - birthDateObj.getMonth();
    
    // Jika bulan lahir lebih besar atau sama dengan bulan sekarang, periksa tanggal
    if (monthDifference < 0 || (monthDifference === 0 && now.getDate() < birthDateObj.getDate())) {
        age--; // Kurangi satu tahun jika belum melewati tanggal lahir
    }
    return age;
};

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
        date_of_birth: Joi.date()
            .required()
            .less('now') // Memastikan tanggal tidak lebih dari hari ini
            .custom((value, helpers) => {
                const age = calculateAge(value);
                if (age < 18) {
                    return helpers.error("date_of_birth.greater");
                }
                return value;
            })
            .messages({
                "date.base": "Date of birth is not valid",
                "date.less": "Date of birth cannot be in the future",
                "date_of_birth.greater": "You must be at least 18 years old",
            }),
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
