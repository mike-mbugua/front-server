const express = require("express");
const router = express.Router();
const db = require("../config/db");
const Product = db.products;
const Price = db.prices;
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
const checkAndUpdatePrices = async () => {
  try {
    const products = await Product.findAll();
    const priceChanges = [];

    for (const product of products) {
      const scrapedData = await scrapeCarrefourPrices(product.url);
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
    }
    
    if (priceChanges.length > 0) {
      await sendPriceChangeEmail(priceChanges);
    }
  } catch (error) {
    console.error("Error updating prices:", error);
  }
};

// cron.schedule("30 15 * * *", () => {
//   checkAndUpdatePrices();
// });




// router.post("/scrape", async (req, res) => {
//   try {
//     await checkAndUpdatePrices();
//     res.json({ success: true, message: "Scraping process initiated" });
//   } catch (error) {
//     res.status(500).json({ success: false, error: error.message });
//   }
// });

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

const sendPriceChangeEmail = async (priceChanges) => {
  const priceChangesHTML = priceChanges.map(change => {
    const priceDirection = change.newPrice > change.oldPrice ? '📈' : '📉';
    const changeColor = change.newPrice > change.oldPrice ? 'red' : 'green';
    
    return `
      <tr>
        <td><a href="${change.url}" target="_blank">${change.name}</a></td>
        <td>$${change.oldPrice}</td>
        <td>$${change.newPrice}</td>
        <td style="color: ${changeColor}">${priceDirection} ${change.percentChange}%</td>
      </tr>
    `;
  }).join('');

  const emailHtml = `
    <h2>Price Change Alert</h2>
    <p>The following products have changed in price:</p>
    <table border="1" cellpadding="5" cellspacing="0">
      <tr>
        <th>Product</th>
        <th>Old Price</th>
        <th>New Price</th>
        <th>Change</th>
      </tr>
      ${priceChangesHTML}
    </table>
    <p>This is an automated notification from your price tracker.</p>
  `;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: process.env.NOTIFICATION_EMAIL,
    subject: `Price Alert: ${priceChanges.length} Product${priceChanges.length > 1 ? 's' : ''} Changed`,
    html: emailHtml
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Email notification sent for ${priceChanges.length} price changes`);
  } catch (error) {
    console.error("Error sending email notification:", error);
  }
};

module.exports = router;