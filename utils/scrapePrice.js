const puppeteer = require("puppeteer");

exports.scrapePrice = async (url) => {
  let browser;
  try {
    browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 });

    await page.waitForSelector("h2.css-17ctnp", { timeout: 10000 });

    const price = await page.evaluate(() => {
      const priceElement = document.querySelector("h2.css-17ctnp");
      if (!priceElement) return null;

      let priceText = priceElement.innerText.replace("KES", "").trim();
      
      priceText = priceText.replace(/[^\d.]/g, ""); 

      return parseFloat(priceText); 
    });

    return { price: isNaN(price) ? null : price }; 
  } catch (error) {
    console.error(`❌ Error scraping ${url}:`, error.message);
    return null;
  } finally {
    if (browser) await browser.close();
  }
};
