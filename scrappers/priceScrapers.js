const express = require("express");
const router = express.Router();
const db = require("../config/db");
const Product = db.products;
const Price = db.prices;
const { scrapePrice } = require("../utils/scrapePrice");
const cron = require("node-cron");

const checkAndUpdatePrices = async () => {
  try {
    const products = await Product.findAll();

    for (const product of products) {
      const scrapedData = await scrapePrice(product.url);
      const newPrice = typeof scrapedData === "object" ? scrapedData.price : scrapedData;
      if (!newPrice) {
        console.log(`Failed to scrape price for ${product.name}`);
        continue;
      }

      const newPriceNum = Number(newPrice);
      
      const latestPrice = await Price.findOne({
        where: { productId: product.id },
        order: [["date_scraped", "DESC"]],
      });

      const lastPrice = latestPrice ? Number(latestPrice.price) : null;
      
      console.log(`Comparing prices for ${product.name}: Last price = ${lastPrice}, New price = ${newPriceNum}`);

      const priceChanged = lastPrice !== null && Math.abs(lastPrice - newPriceNum) > 0.001;

      if (priceChanged) {
        console.log(`Price changed for ${product.name}: ${lastPrice} -> ${newPriceNum}`);

        await Price.create({
          product_name: product.name,
          competitor_url: product.url,
          productId: product.id,
          price: newPriceNum,
        });

        await product.update({
          currentPrice: newPriceNum,
          lastUpdated: new Date(),
        });

        sendNotification(product, newPriceNum);
      } else if (lastPrice === null) {
        console.log(`Initial price set for ${product.name}: ${newPriceNum}`);
        
        await Price.create({
          product_name: product.name,
          competitor_url: product.url,
          productId: product.id,
          price: newPriceNum,
        });
        
        await product.update({
          currentPrice: newPriceNum,
          lastUpdated: new Date(),
        });
      } else {
        console.log(`No price change for ${product.name}, still at ${newPriceNum}`);
        
        if (latestPrice) {
          await latestPrice.update({
            date_scraped: new Date()
          });
        }
        
        await product.update({
          lastUpdated: new Date(),
        });
      }
    }
  } catch (error) {
    console.error("Error updating prices:", error);
  }
};

cron.schedule("*/5 * * * *", () => {
  console.log("Running scheduled price check...");
  checkAndUpdatePrices();
});

router.post("/scrape", async (req, res) => {
  try {
    await checkAndUpdatePrices();
    res.json({ success: true, message: "Scraping process initiated" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get("/latest", async (req, res) => {
  try {
    const products = await Product.findAll({
      include: [
        {
          model: Price,
          as: "prices",
          order: [["date_scraped", "DESC"]],
          limit: 1,
        },
      ],
    });

    res.json(products);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get("/history/:productId", async (req, res) => {
  try {
    const priceHistory = await Price.findAll({
      where: { productId: req.params.productId },
      order: [["date_scraped", "ASC"]],
    });

    res.json(priceHistory);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

const sendNotification = (product, newPrice) => {
  console.log(`🔔 Price Alert: ${product.name} is now $${newPrice}!`);
};

module.exports = router;