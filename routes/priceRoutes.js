const express = require("express");
const router = express.Router();
const db = require("../config/db");
const Product = db.products;
const Price = db.prices;
const Offer = db.offers;
const { scrapeCarrefourPrices } = require("../utils/scrapePrice");
const cron = require("node-cron");
const nodemailer = require("nodemailer");
require("dotenv").config();

const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE, 
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});
const checkAndUpdatePrices = async (specificProductId = null) => {
  try {
    const whereClause = specificProductId ? { id: specificProductId } : {};
    const products = await Product.findAll({ where: whereClause });
    
    if (products.length === 0) {
      console.log("No products found to check");
      return { success: false, message: "No products found to check" };
    }
    
    const priceChanges = [];
    const newOffers = [];

    for (const product of products) {
      try {
        const scrapedData = await scrapeCarrefourPrices(product.url);
        
        if (!scrapedData) {
          console.log(`Failed to scrape data for ${product.name}`);
          continue;
        }
        
        const newPriceNum = Number(scrapedData.price);
        
        const latestPrice = await Price.findOne({
          where: { productId: product.id },
          order: [["date_scraped", "DESC"]],
        });

        const lastPrice = latestPrice ? Number(latestPrice.price) : null;
        
        console.log(`Comparing prices for ${product.name}: Last price = ${lastPrice}, New price = ${newPriceNum}`);

        const priceChanged = lastPrice !== null && Math.abs(lastPrice - newPriceNum) > 0.001;

        if (scrapedData.isOfferPrice) {
          const existingOffer = await Offer.findOne({
            where: { url: product.url }
          });

          if (!existingOffer || existingOffer.offerPrice !== newPriceNum) {
            const offerEntry = {
              name: product.name,
              url: product.url,
              offerPrice: newPriceNum,
              productId: product.id
            };

            const createdOffer = await Offer.create(offerEntry);
            
            newOffers.push({
              name: product.name,
              url: product.url,
              offerPrice: newPriceNum,
              previousOfferPrice: existingOffer ? existingOffer.offerPrice : null
            });
          }
        }

        if (priceChanged) {
          console.log(`Price changed for ${product.name}: ${lastPrice} -> ${newPriceNum}`);
          
          await product.update({
            currentPrice: newPriceNum,
            previousPrice: lastPrice,
            lastUpdated: new Date(),
          });

          if (latestPrice) {
            await latestPrice.update({
              price: newPriceNum,
              date_scraped: new Date(),
              previous_price: lastPrice
            });
          } else {
            await Price.create({
              product_name: product.name,
              competitor_url: product.url,
              productId: product.id,
              price: newPriceNum,
            });
          }

          priceChanges.push({
            name: product.name,
            url: product.url,
            oldPrice: lastPrice,
            newPrice: newPriceNum,
            percentChange: ((newPriceNum - lastPrice) / lastPrice * 100).toFixed(2)
          });
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
      } catch (productError) {
        console.error(`Error processing product ${product.name}:`, productError);
      }
    }
    
    await sendNotificationEmail(priceChanges, newOffers);
    
    return { 
      success: true, 
      message: priceChanges.length > 0 || newOffers.length > 0 
        ? "Price changes or new offers detected" 
        : "Prices checked, no changes detected", 
      priceChanges, 
      newOffers 
    };
  } catch (error) {
    console.error("Error updating prices:", error);
    return { success: false, error: error.message };
  }
};

const sendNotificationEmail = async (priceChanges = [], newOffers = []) => {
  if (priceChanges.length === 0 && newOffers.length === 0) {
    console.log("No changes to report. Skipping email.");
    return false;
  }

  let emailContent = `
    <html>
    <body>
      <h1>Price Tracking Update</h1>
  `;

  // Price Changes Section
  if (priceChanges.length > 0) {
    emailContent += `
      <h2>Price Changes Detected</h2>
      <ul>
        ${priceChanges.map(change => `
          <li>
            <strong>${change.name}</strong>
            <br>Old Price: $${change.oldPrice.toFixed(2)}
            <br>New Price: $${change.newPrice.toFixed(2)}
            <br>Change: ${change.percentChange}%
            <br>Product URL: <a href="${change.url}">${change.url}</a>
          </li>
        `).join('')}
      </ul>
    `;
  }

  // New Offers Section
  if (newOffers.length > 0) {
    emailContent += `
      <h2>New Offers Discovered</h2>
      <ul>
        ${newOffers.map(offer => `
          <li>
            <strong>${offer.name}</strong>
            <br>Offer Price: $${offer.offerPrice.toFixed(2)}
            ${offer.previousOfferPrice ? 
              `<br>Previous Offer Price: $${offer.previousOfferPrice.toFixed(2)}` : 
              '<br><em>New Offer!</em>'
            }
            <br>Product URL: <a href="${offer.url}">${offer.url}</a>
          </li>
        `).join('')}
      </ul>
    `;
  }

  emailContent += `
      <p><small>Generated on: ${new Date().toLocaleString()}</small></p>
    </body>
    </html>
  `;

  const mailOptions = {
    from: "kamirimichael369@gmail.com",
    to: "michael@greenspoon.co.ke",
    subject: `Price Tracker Alert: ${priceChanges.length} Changes, ${newOffers.length} Offers`,
    html: emailContent
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Email notification sent for ${priceChanges.length} price changes and ${newOffers.length} new offers`);
    return true;
  } catch (error) {
    console.error("Error sending email notification:", error);
    return false;
  }
};

// cron.schedule("30 15 * * *", () => {
//   checkAndUpdatePrices();
// });

router.post("/scrape", async (req, res) => {
  const progressTracker = [];

  try {
    const result = await checkAndUpdatePrices(null, (progressUpdate) => {
      progressTracker.push(progressUpdate);
      console.log('Progress Update:', progressUpdate);
    });

    return res.status(200).json({
      msg: "Price checking completed", 
      progressTracker,
      result
    });
  } catch (error) {
    console.error("Scrape route error:", error);
    return res.status(500).json({ 
      success: false, 
      error: error.message,
      details: error.stack 
    });
  }
});
router.post("/check/:productId", async (req, res) => {
  try {
    const productId = req.params.productId;
    const result = await checkAndUpdatePrices(productId);
    res.json(result);
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

router.get("/offers", async (req, res) => {
  try {
    const offers = await Offer.findAll({
      order: [["scrapedAt", "DESC"]]
    });

    res.json(offers);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;