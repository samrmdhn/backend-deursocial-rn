import db from "../configs/Database.js";
import UsersAccessAppsModels from "../apps/models/UsersAccessAppsModels.js";
import DisplayTypesModels from "../apps/models/DisplayTypesModels.js";
import ContentModels from "../apps/models/ContentModels.js";
import CountriesModels from "../apps/models/CountriesModels.js";
import RegionsModels from "../apps/models/RegionsModels.js";
import SubregionsModels from "../apps/models/SubregionsModels.js";
import ProvincesModels from "../apps/models/ProvincesModels.js";
import CitysModels from "../apps/models/CitysModels.js";
import VanuesModels from "../apps/models/VanuesModels.js";
import EventOrganizersModels from "../apps/models/EventOrganizersModels.js";
import TypeContentDetailsModels from "../apps/models/TypeContentDetailsModels.js";
import TagsModels from "../apps/models/TagsModels.js";
import ActressModels from "../apps/models/ActressModels.js";
import ContentDetailsModels from "../apps/models/ContentDetailsModels.js";

// Menggunakan force: true akan membuat ulang tabel setiap kali dijalankan contoh => Example.sync({ force: true })
async function syncDatabase() {
    try {
        await db.authenticate();
        console.log("Connection has been established successfully.");
        await UsersAccessAppsModels.sync({ force: false });
        console.log("Table table Users Access App has been created.");
        await DisplayTypesModels.sync({ force: false });
        console.log("Table table Display Types has been created.");
        await ContentModels.sync({ force: false });
        console.log("Table table Contents has been created.");
        await RegionsModels.sync({ force: false });
        console.log("Table table regions has been created.");
        await SubregionsModels.sync({ force: false });
        console.log("Table table subregions has been created.");
        await CountriesModels.sync({ force: false });
        console.log("Table table countries has been created.");
        await ProvincesModels.sync({ force: false });
        console.log("Table table Provinces has been created.");
        await CitysModels.sync({ force: false });
        console.log("Table table City has been created.");
        await VanuesModels.sync({ force: false });
        console.log("Table table Vanues has been created.");
        await EventOrganizersModels.sync({ force: false });
        console.log("Table table event organizer has been created.");
        await TypeContentDetailsModels.sync({ force: false });
        console.log("Table table event Type content details has been created.");
        await TagsModels.sync({ force: false });
        console.log("Table table event Tags has been created.");
        await ActressModels.sync({ force: false });
        console.log("Table table Actress has been created.");
        await ContentDetailsModels.sync({ force: false });
        console.log("Table table Content Details has been created.");


        await db.close();
    } catch (error) {
        console.error("Unable to connect to the database:", error);
    }
}

syncDatabase();
