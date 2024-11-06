import fs from "fs/promises";
import path from "path";
import RegionsModels from "../../../apps/models/RegionsModels.js";
import { makeEpocTime } from "../../../helpers/customHelpers.js";
const runnerForJson = async () => {
    try {
        const __filename = new URL(import.meta.url).pathname;
        const __dirname = path.dirname(__filename);
        const filePath = path.resolve(__dirname, "../regions.json");

        // Membaca file JSON secara sinkronus
        const data = await fs.readFile(filePath, "utf8");

        // Mengubah string JSON menjadi objek JavaScript
        const jsonData = JSON.parse(data);
        jsonData.forEach((val, index) => {
            RegionsModels.create({
                id: val.id,
                title: val.name,
                created_at: makeEpocTime(),
            });
        });
        console.log("data has been created on table");
    } catch (error) {
        console.log("error :", error);
    }
};
runnerForJson();
