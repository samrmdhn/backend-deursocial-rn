import db from '../configs/Database.js';
import Example from '../apps/models/Example.js';
import UsersModels from '../apps/models/UsersModels.js';
import UsersAccessModels from '../apps/models/UsersAccessModels.js';


// Menggunakan force: true akan membuat ulang tabel setiap kali dijalankan contoh => Example.sync({ force: true })
async function syncDatabase() {
  try {
    await db.authenticate();
    console.log('Connection has been established successfully.');

    // await Example.sync({ force: false }); 
    // console.log('Table table example has been created.');

    // await UsersModels.sync({ force: false });
    // console.log('Table table Users has been created.');

    await UsersAccessModels.sync({ force: false });
    console.log('Table table Users Activity has been created.');

    await db.close();
  } catch (error) {
    console.error('Unable to connect to the database:', error);
  }
}

syncDatabase();
