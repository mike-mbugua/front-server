const express = require('express');
const router = express.Router();
const db = require('../config/db');
const Price = db.prices;
const { scrapeAllProducts } = require('../scrappers/priceScrapers');

// Run scraper manually
router.post('/scrape', async (req, res) => {
  try {
    const results = await scrapeAllProducts();
    if (results.length > 0) {
      await Price.insertMany(results);
      res.json({ success: true, message: `Scraped ${results.length} products` });
    } else {
      res.json({ success: false, message: 'No products scraped' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get latest prices
router.get('/latest', async (req, res) => {
  try {
    const latestPrices = await Price.aggregate([
      { $sort: { dateScraped: -1 } },
      { $group: {
          _id: {
            productName: "$productName",
            competitorName: "$competitorName"
          },
          latestEntry: { $first: "$$ROOT" }
        }
      },
      { $replaceRoot: { newRoot: "$latestEntry" } },
      { $sort: { productName: 1, competitorName: 1 } }
    ]);
    
    res.json(latestPrices);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get price history for a product
router.get('/history/:productName', async (req, res) => {
  try {
    const history = await Price.find({ 
      productName: req.params.productName 
    }).sort({ dateScraped: 1 });
    
    res.json(history);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;