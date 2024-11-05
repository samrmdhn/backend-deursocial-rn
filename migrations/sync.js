import db from '../configs/Database.js';
import Example from '../apps/models/Example.js';
import UsersModels from '../apps/models/UsersModels.js';
import UsersActivityModels from '../apps/models/UsersActivityModels.js';


async function syncDatabase() {
  try {
    await db.authenticate();
    console.log('Connection has been established successfully.');

    // Sinkronisasi model dengan database
    await Example.sync({ force: false }); // Menggunakan force: true akan membuat ulang tabel setiap kali dijalankan
    console.log('Table table example has been created.');

    await UsersModels.sync({ force: false }); // Menggunakan force: true akan membuat ulang tabel setiap kali dijalankan
    console.log('Table table Users has been created.');

    await UsersActivityModels.sync({ force: false }); // Menggunakan force: true akan membuat ulang tabel setiap kali dijalankan
    console.log('Table table Users Activity has been created.');

    await db.close();
  } catch (error) {
    console.error('Unable to connect to the database:', error);
  }
}

syncDatabase();
