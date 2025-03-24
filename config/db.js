const dotenv = require("dotenv");
const { Sequelize, DataTypes } = require("sequelize");

dotenv.config();

const db_name = process.env.DATABASE_NAME;
const db_username = process.env.DATABASE_USERNAME;
const db_password = process.env.DATABASE_PASSWORD;
const db_host = process.env.DATABASE_HOST;
const db_dialect = process.env.DATABASE_DIALECT || 'mysql';
const db_port = process.env.DATABASE_PORT || 3306;
console.log("Database Host:", process.env.DATABASE_HOST);

const sequelize = new Sequelize(db_name, db_username, db_password, {
  host: db_host,
  dialect: db_dialect,
  port: db_port,
  logging: false,
  define: {
    timestamps: true,
  },
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false, 
    },
  },
});

sequelize
  .authenticate()
  .then(() => console.log("Connected to AWS MySQL successfully!"))
  .catch((err) => console.error("Error connecting to AWS MySQL:", err));

const db = {};

db.Sequelize = Sequelize;
db.sequelize = sequelize;
db.prices = require("../models/Price")(sequelize, DataTypes);
db.products = require("../models/Products")(sequelize, DataTypes);
db.offers = require("../models/Offers")(sequelize, DataTypes);

db.products.hasMany(db.prices, { as: "product", foreignKey: "productId" });


db.sequelize.sync()
  .then(() => console.log("All models were synchronized successfully."))
  .catch((err) => console.error("Error synchronizing models:", err));

module.exports = db;