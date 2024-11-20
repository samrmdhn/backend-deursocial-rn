export const validateUniqueField = async (Model, fields, values) => {
    try {
        const validationPromises = fields.map((field, index) => {
            if (values[index]) {
                return Model.findOne({ where: { [field]: values[index] } });
            }
        });
    
        const results = await Promise.all(validationPromises);
    
        for (let i = 0; i < results.length; i++) {
            if (results[i]) {
                return {messageValidation: `${fields[i].charAt(0).toUpperCase() + fields[i].slice(1)} already exists`, statusValidation: 1};
            }
        }
        return {messageValidation: '', statusValidation: 0};
        
    } catch (err) {
        console.error(err);
        return {messageValidation: "Internal server error", statusValidation: 500}
    }
};


export const validateDataRequestBody = (data) => {
    // Menyaring hanya properti yang tidak undefined
    for (let key in data) {
        if (data[key] === undefined) {
            return {
                messageValidation: `${key} cannot be undefined`,
                statusValidation: 500
            }; 
        }
    }
    return {messageValidation: '', statusValidation: 0};
}
