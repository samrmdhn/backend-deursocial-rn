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
                return {messageValidation: `${fields[i].charAt(0).toUpperCase() + fields[i].slice(1)} already exists`, statusValidation: 1, labelValidation: fields[i]};
            }
        }
        return {messageValidation: '', statusValidation: 0, labelValidation: ""};
        
    } catch (err) {
        console.error(err);
        return {messageValidation: "Internal server error", statusValidation: 500}
    }
};
