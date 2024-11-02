import db from '../configs/Database.js';
import Example from '../apps/models/Example.js';


async function syncDatabase() {
  try {
    await db.authenticate();
    console.log('Connection has been established successfully.');

    // Sinkronisasi model dengan database
    await Example.sync({ force: true }); // Menggunakan force: true akan membuat ulang tabel setiap kali dijalankan
    console.log('Table table has been created.');

    await db.close();
  } catch (error) {
    console.error('Unable to connect to the database:', error);
  }
}

syncDatabase();
