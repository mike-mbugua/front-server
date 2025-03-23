const puppeteer = require("puppeteer");

exports.scrapePrice = async (url) => {
  let browser;
  try {
    browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 });

    // Define selectors
    const normalPriceSelector = "h2.css-17ctnp";
    const offerPriceSelector = ".css-1i90gmp";

    // Get both prices
    const normalPrice = await page.evaluate((selector) => {
      const el = document.querySelector(selector);
      return el ? parseFloat(el.innerText.replace(/[^\d.]/g, "")) : null;
    }, normalPriceSelector);

    const offerPrice = await page.evaluate((selector) => {
      const el = document.querySelector(selector);
      return el ? parseFloat(el.innerText.replace(/[^\d.]/g, "")) : null;
    }, offerPriceSelector);

    // Return the offer price if it exists and is a valid number,
    // otherwise return the normal price
    const price = !isNaN(offerPrice) && offerPrice !== null ? offerPrice : 
                 (!isNaN(normalPrice) && normalPrice !== null ? normalPrice : null);
    
    return price;
  } catch (error) {
    console.error(`❌ Error scraping ${url}:`, error.message);
    return null;
  } finally {
    if (browser) await browser.close();
  }
};