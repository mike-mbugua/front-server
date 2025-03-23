exports.scrapePrice = async (url) => {
  let browser;
  try {
    browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 });

    // Define selectors
    const normalPriceSelector = "h2.css-17ctnp, .css-1bdwabt";
    const offerPriceSelector = ".css-1i90gmp";

    const normalPrice = await page.evaluate((selector) => {
      const el = document.querySelector(selector);
      return el ? parseFloat(el.innerText.replace(/[^\d.]/g, "")) : null;
    }, normalPriceSelector);

    const offerPrice = await page.evaluate((selector) => {
      const el = document.querySelector(selector);
      return el ? parseFloat(el.innerText.replace(/[^\d.]/g, "")) : null;
    }, offerPriceSelector);

    return { normalPrice: isNaN(normalPrice) ? null : normalPrice, offerPrice: isNaN(offerPrice) ? null : offerPrice };
  } catch (error) {
    console.error(`❌ Error scraping ${url}:`, error.message);
    return null;
  } finally {
    if (browser) await browser.close();
  }
};
