import fs from "fs/promises";
import path from "path";
import { makeEpocTime } from "../../../helpers/customHelpers.js";
import ProvincesModels from "../../../apps/models/ProvincesModels.js";
const runnerForJson = async () => {
    try {
        const __filename = new URL(import.meta.url).pathname;
        const __dirname = path.dirname(__filename);
        const filePath = path.resolve(__dirname, "../states.json");

        // Membaca file JSON secara sinkronus
        const data = await fs.readFile(filePath, "utf8");

        // Mengubah string JSON menjadi objek JavaScript
        const jsonData = JSON.parse(data);
        jsonData.forEach((val, index) => {
            if (val.country_id) {
                ProvincesModels.create({
                    id: val.id,
                    title: val.name,
                    countries_id: Number(val.country_id),
                    created_at: makeEpocTime(),
                });
            }
        });
        console.log("data has been created on table");
    } catch (error) {
        console.log("error :", error);
    }
};
runnerForJson();
