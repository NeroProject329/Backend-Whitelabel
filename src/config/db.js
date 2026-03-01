// src/config/db.js
const mongoose = require("mongoose");
const { env } = require("./env");

async function connectDb() {
  mongoose.set("strictQuery", true);

  await mongoose.connect(env.MONGO_URI, {
    autoIndex: true
  });

  console.log("Mongo connected");
}

module.exports = { connectDb };