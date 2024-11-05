import db from "../configs/Database.js";
import Example from "../apps/models/Example.js";
import UsersModels from "../apps/models/UsersModels.js";
import UsersAccessAppsModels from "../apps/models/UsersAccessAppsModels.js";
import DisplayTypesModels from "../apps/models/DisplayTypesModels.js";
import ContentModels from "../apps/models/ContentModels.js";

// Menggunakan force: true akan membuat ulang tabel setiap kali dijalankan contoh => Example.sync({ force: true })
async function syncDatabase() {
    try {
        await db.authenticate();
        console.log("Connection has been established successfully.");

        // await Example.sync({ force: false });
        // console.log('Table table example has been created.');

        // await UsersModels.sync({ force: false });
        // console.log('Table table Users has been created.');

        await UsersAccessAppsModels.sync({ force: false });
        console.log("Table table Users Access App has been created.");
        await DisplayTypesModels.sync({ force: false });
        console.log("Table table Display Types has been created.");
        await ContentModels.sync({ force: false });
        console.log("Table table Contents has been created.");


        await db.close();
    } catch (error) {
        console.error("Unable to connect to the database:", error);
    }
}

syncDatabase();
