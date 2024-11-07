import fs from "fs/promises";
import path from "path";
import { makeEpocTime } from "../../../helpers/customHelpers.js";
import SubregionsModels from "../../../apps/models/SubregionsModels.js";
const runnerForJsonSubRegions = async () => {
    try {
        const __filename = new URL(import.meta.url).pathname;
        const __dirname = path.dirname(__filename);
        const filePath = path.resolve(__dirname, "../subregions.json");

        // Membaca file JSON secara sinkronus
        const data = await fs.readFile(filePath, "utf8");

        // Mengubah string JSON menjadi objek JavaScript
        const jsonData = JSON.parse(data);
        jsonData.forEach(async (val, index) => {
            if (val.region_id) {
                await SubregionsModels.create({
                    id: val.id,
                    title: val.name,
                    regions_id: Number(val.region_id),
                    created_at: makeEpocTime(),
                });
            }
        });
        console.log("data has been created on table");
    } catch (error) {
        console.log("error :", error);
    }
};

export default runnerForJsonSubRegions;