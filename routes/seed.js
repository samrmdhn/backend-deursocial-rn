import express from "express";
import BaseNameAnonymousUsersModels from "../apps/models/BaseNameAnonymousUsersModels.js";
import DisplayTypesModels from "../apps/models/DisplayTypesModels.js";
import TypeContentDetailsModels from "../apps/models/TypeContentDetailsModels.js";
import RegionsModels from "../apps/models/RegionsModels.js";
import SubregionsModels from "../apps/models/SubregionsModels.js";
import EventOrganizersModels from "../apps/models/EventOrganizersModels.js";
import TagsModels from "../apps/models/TagsModels.js";
import TopicPostModels from "../apps/models/TopicPostModels.js";
import AboutModels from "../apps/models/AboutModels.js";
import ContentModels from "../apps/models/ContentModels.js";
import CountriesModels from "../apps/models/CountriesModels.js";

const seed = express.Router();
const now = Math.floor(Date.now() / 1000);

seed.get("/api/seed-data", async (req, res) => {
  const results = [];
  const errors = [];

  const seedTable = async (name, Model, data) => {
    try {
      const count = await Model.count();
      if (count > 0) {
        results.push({ table: name, status: "skipped", reason: `already has ${count} rows` });
        return;
      }
      await Model.bulkCreate(data);
      results.push({ table: name, status: "seeded", rows: data.length });
    } catch (err) {
      errors.push({ table: name, error: err.message });
    }
  };

  // 1. Anonymous Names - Animals (type 1)
  const animals = ["Singa","Harimau","Gajah","Kuda","Panda","Beruang","Kanguru","Elang","Burung Hantu","Penyu","Jerapah","Kelelawar","Domba","Kelinci","Pudel","Kucing","Koala","Cheetah","Zebra","Lumba-Lumba","Pinguin","Gorila","Burung Beo","Kupu-Kupu","Bebek","Ikan Paus","Harimau Putih","Cicak","Ular","Gurita","Lynx","Macan Tutul","Komodo","Tupai","Kuda Nil","Rubah","Serigala","Bison","Tikus","Nyamuk","Bunglon","Banteng","Gajah Laut","Elang Laut","Unta","Ayam","Kuda Laut","Beruang Kutub","Chinchilla","Penguin","Macan","Angsa","Kucing Laut","Kasuari","Kura-Kura","Kucing Rimba","Kucing Hutan","Rusa","Kambing","Berang-Berang","Ikan Hiu","Panda Merah","Burung Puyuh","Ikan Piranha","Ikan Salmon","Burung Kakaktua","Kakatua","Burung Merak","Capung","Semut","Capybara"];
  const foods = ["Donat","Brownies","Kue Cubir","Kue Lapis","Kue Nastar","Cokelat","Puding","Es Krim","Pie Apel","Pancake","Kue Tart","Kue Sus","Kue Keju","Kue Bolu","Kue Mochi","Kue Cincin","Kue Kering","Kue Apem","Kue Bika Ambon","Es Campur","Es Teler","Es Krim Goreng","Martabak Manis","Puding Cokelat","Lemper","Kue Pukis","Kue Semprit","Kue Sagu","Roti Manis","Roti Pisang","Kue Lapis Legit","Kue Lumpur","Es Krim Cokelat","Matcha","Es Buah","Puding Roti","Kue Cokelat","Pudding Mangga","Puding Kelapa","Kue Talam","Kue Tiramisu","Kue Cheesecake","Roti Kukus","Kue Putu","Soda Gula","Teh Manis","Es Cendol","Es Jeruk","Sirup Markisa","Jus Mangga","Jus Alpukat","Teh Tarik","Lassi","Susu Cokelat","Bubble Tea","Jus Strawberry","Milkshake Cokelat","Kopi Susu Manis","Smoothie Pisang","Es Krim Float","Soda Apel","Jus Kelapa","Kelapa","Es Teh","Susu","Vanila"];
  const chars = ["Sabar","Cerdas","Ramah","Pekerja Keras","Jujur","Kreatif","Disiplin","Cekatan","Pemimpin","Optimis","Penyabar","Pemalu","Bijaksana","Humoris","Penuh Perhatian","Bertanggung Jawab","Penuh Semangat","Penyayang","Suka Tantangan","Realistis","Berani","Baik Hati","Mandiri","Sederhana","Toleran","Pintar","Pede","Fleksibel","Sensitif","Penuh Kasih","Waspada","Rendah Hati","Periang","Mudah Beradaptasi","Amanah","Rajin","Menyenangkan","Berintegritas","Empati","Tidak Mudah Menyerah","Percaya Diri","Tegas","Berpikir Positif","Ceria","Rapi","Aktif","Teliti","Menarik","Penuh Inspirasi","Bersahaja","Setia","Cermat","Inovatif","Antusias","Penuh Cinta","Berhati Lembut","Terbuka","Dewasa","Fokus","Bersahabat","Kritis","Berempati","Hormat","Adil","Tangguh","Santun","Ambisius","Gembira","Energik","Visioner","Peduli","Lucu","Imut","Cute","Positif","Bersemangat"];

  const anonData = [
    ...animals.map(name => ({ name, type: 1, created_at: now })),
    ...foods.map(name => ({ name, type: 2, created_at: now })),
    ...chars.map(name => ({ name, type: 3, created_at: now })),
  ];
  await seedTable("ir_base_name_anonymous_users", BaseNameAnonymousUsersModels, anonData);

  // 2. Display Types
  await seedTable("ir_display_types", DisplayTypesModels, [
    { title: "Event", status: 1, created_at: now },
    { title: "Festival", status: 1, created_at: now },
    { title: "Concert", status: 1, created_at: now },
    { title: "Workshop", status: 1, created_at: now },
    { title: "Seminar", status: 1, created_at: now },
    { title: "Exhibition", status: 1, created_at: now },
  ]);

  // 3. Type Content Details
  await seedTable("ir_type_content_details", TypeContentDetailsModels, [
    { name: "Music", created_at: now },
    { name: "Art", created_at: now },
    { name: "Technology", created_at: now },
    { name: "Sports", created_at: now },
    { name: "Food & Beverage", created_at: now },
    { name: "Education", created_at: now },
    { name: "Community", created_at: now },
    { name: "Entertainment", created_at: now },
  ]);

  // 4. Regions
  await seedTable("ir_regions", RegionsModels, [
    { id: 1, title: "Africa", created_at: now },
    { id: 2, title: "Americas", created_at: now },
    { id: 3, title: "Asia", created_at: now },
    { id: 4, title: "Europe", created_at: now },
    { id: 5, title: "Oceania", created_at: now },
    { id: 6, title: "Polar", created_at: now },
  ]);

  // 5. Subregions
  await seedTable("ir_subregions", SubregionsModels, [
    { id: 1, title: "Northern Africa", regions_id: 1, created_at: now },
    { id: 2, title: "Middle Africa", regions_id: 1, created_at: now },
    { id: 3, title: "Eastern Africa", regions_id: 1, created_at: now },
    { id: 4, title: "Western Africa", regions_id: 1, created_at: now },
    { id: 5, title: "Southern Africa", regions_id: 1, created_at: now },
    { id: 6, title: "Caribbean", regions_id: 2, created_at: now },
    { id: 7, title: "Central America", regions_id: 2, created_at: now },
    { id: 8, title: "South America", regions_id: 2, created_at: now },
    { id: 9, title: "Northern America", regions_id: 2, created_at: now },
    { id: 10, title: "Central Asia", regions_id: 3, created_at: now },
    { id: 11, title: "Eastern Asia", regions_id: 3, created_at: now },
    { id: 12, title: "Southern Asia", regions_id: 3, created_at: now },
    { id: 13, title: "South-Eastern Asia", regions_id: 3, created_at: now },
    { id: 14, title: "Western Asia", regions_id: 3, created_at: now },
    { id: 15, title: "Eastern Europe", regions_id: 4, created_at: now },
    { id: 16, title: "Northern Europe", regions_id: 4, created_at: now },
    { id: 17, title: "Southern Europe", regions_id: 4, created_at: now },
    { id: 18, title: "Western Europe", regions_id: 4, created_at: now },
    { id: 19, title: "Australia and New Zealand", regions_id: 5, created_at: now },
    { id: 20, title: "Melanesia", regions_id: 5, created_at: now },
    { id: 21, title: "Micronesia", regions_id: 5, created_at: now },
    { id: 22, title: "Polynesia", regions_id: 5, created_at: now },
  ]);

  // 6. Countries (Southeast Asia focus + major countries)
  await seedTable("ir_countries", CountriesModels, [
    { id: 102, title: "Indonesia", subregions_id: 13, created_at: now },
    { id: 132, title: "Malaysia", subregions_id: 13, created_at: now },
    { id: 197, title: "Singapore", subregions_id: 13, created_at: now },
    { id: 214, title: "Thailand", subregions_id: 13, created_at: now },
    { id: 174, title: "Philippines", subregions_id: 13, created_at: now },
    { id: 239, title: "Vietnam", subregions_id: 13, created_at: now },
    { id: 233, title: "United States", subregions_id: 9, created_at: now },
    { id: 232, title: "United Kingdom", subregions_id: 16, created_at: now },
    { id: 110, title: "Japan", subregions_id: 11, created_at: now },
    { id: 116, title: "South Korea", subregions_id: 11, created_at: now },
    { id: 14, title: "Australia", subregions_id: 19, created_at: now },
  ]);

  // 7. Tags
  await seedTable("ir_tags", TagsModels, [
    { title: "music", created_at: now },
    { title: "concert", created_at: now },
    { title: "festival", created_at: now },
    { title: "art", created_at: now },
    { title: "food", created_at: now },
    { title: "technology", created_at: now },
    { title: "sports", created_at: now },
    { title: "community", created_at: now },
    { title: "workshop", created_at: now },
    { title: "nightlife", created_at: now },
  ]);

  // 8. Topic Posts
  await seedTable("ir_topic_posts", TopicPostModels, [
    { text_title: "General", created_at: now },
    { text_title: "Music", created_at: now },
    { text_title: "Events", created_at: now },
    { text_title: "Food & Drink", created_at: now },
    { text_title: "Travel", created_at: now },
    { text_title: "Technology", created_at: now },
    { text_title: "Sports", created_at: now },
    { text_title: "Art & Culture", created_at: now },
  ]);

  // 9. About (Terms & Privacy)
  await seedTable("ir_abouts", AboutModels, [
    { description: "Terms and Conditions for DeurSocial. By using this application, you agree to these terms. Users must be at least 17 years old. Content posted must comply with community guidelines. We reserve the right to remove any content that violates our policies.", type: 1, created_at: now },
    { description: "Privacy Policy for DeurSocial. We collect and process your personal data to provide our services. Your data is stored securely and will not be shared with third parties without your consent. You can request deletion of your data at any time.", type: 2, created_at: now },
  ]);

  // 10. Event Organizers
  await seedTable("ir_event_organizers", EventOrganizersModels, [
    { name: "DeurSocial Official", image: null, detail: "Official event organizer by DeurSocial team", created_at: now },
    { name: "Jakarta Music Festival", image: null, detail: "Premier music festival organizer in Jakarta", created_at: now },
    { name: "Tech Community ID", image: null, detail: "Indonesian technology community events", created_at: now },
  ]);

  res.json({
    status: errors.length === 0 ? "ok" : "partial",
    results,
    errors,
  });
});

export default seed;
