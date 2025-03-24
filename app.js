require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const { scrapeAllProducts } = require('./scrappers/priceScrapers');
const db = require('./config/db');
const Price = db.prices;



const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/v1/prices', require('./routes/priceRoutes'));
app.use('/api/v1/products', require('./routes/productRoutes'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));