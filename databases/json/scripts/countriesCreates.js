import fs from "fs/promises";
import path from "path";
import { makeEpocTime } from "../../../helpers/customHelpers.js";
import CountriesModels from "../../../apps/models/CountriesModels.js";
const runnerForJsonCountries = async () => {
    try {
        const __filename = new URL(import.meta.url).pathname;
        const __dirname = path.dirname(__filename);
        const filePath = path.resolve(__dirname, "../countries.json");

        // Membaca file JSON secara sinkronus
        const data = await fs.readFile(filePath, "utf8");

        // Mengubah string JSON menjadi objek JavaScript
        const jsonData = JSON.parse(data);
        jsonData.forEach(async(val, index) => {
            if (val.subregion_id) {
                await CountriesModels.create({
                    id: val.id,
                    title: val.name,
                    subregions_id: Number(val.subregion_id),
                    created_at: makeEpocTime(),
                });
            }
        });
        console.log("data has been created on table");
    } catch (error) {
        console.log("error :", error);
    }
};
export default runnerForJsonCountries