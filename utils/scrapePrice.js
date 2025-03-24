const puppeteer = require("puppeteer-extra");
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const db = require("../config/db");
const Product = db.products;

puppeteer.use(StealthPlugin());

exports.scrapeCarrefourPrices = async (onProgressCallback) => {
  const carrefourProducts = await Product.findAll({
    where: { 
      competitorName: 'Carrefour' 
    }
  });

  let browser;
  const scrapingResults = [];

  try {
    browser = await puppeteer.launch({ 
      headless: true,  
      protocolTimeout: 120000,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--window-size=1920,1080'
      ]
    });

    for (const product of carrefourProducts) {
      let page = null;
      try {
        page = await browser.newPage();
        
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
        
        await page.setDefaultNavigationTimeout(90000);
        await page.setDefaultTimeout(90000);

        const navigateWithComprehensiveWait = async (url) => {
          try {
            await page.goto(url, { 
              waitUntil: ['networkidle0', 'domcontentloaded', 'load'],
              timeout: 60000 
            });

            await page.waitForFunction(() => {
              return document.readyState === 'complete' && 
                     document.querySelectorAll('h2.css-1i90gmp, h2.css-17ctnp').length > 0;
            }, { timeout: 30000 });

          } catch (navError) {
            console.error('Navigation error:', navError);
            throw navError;
          }
        };

        await navigateWithComprehensiveWait(product.url);

        await page.setRequestInterception(true);
        page.on('request', (request) => {
          const resourceType = request.resourceType();
          const url = request.url();
          
          const blockedTypes = ['image', 'stylesheet', 'font', 'media'];
          if (blockedTypes.includes(resourceType)) {
            request.abort();
          } else {
            request.continue();
          }
        });

        const priceInfo = await page.evaluate(() => {
          const extractPrice = (element) => {
            if (!element) return null;
            const priceText = element.innerText
              .replace(/[^\d.]/g, '') 
              .trim();
            
            const parsedPrice = parseFloat(priceText);
            return !isNaN(parsedPrice) && parsedPrice > 0 ? parsedPrice : null;
          };

          const offerPriceElement = document.querySelector('h2.css-1i90gmp');
          const normalPriceElement = document.querySelector('h2.css-17ctnp');

          if (offerPriceElement) {
            return {
              price: extractPrice(offerPriceElement),
              isOffer: true
            };
          }

          if (normalPriceElement) {
            return {
              price: extractPrice(normalPriceElement),
              isOffer: false
            };
          }

          return null;
        });

        const result = {
          productId: product.id,
          productName: product.name,
          url: product.url,
          scrapedAt: new Date()
        };

        if (priceInfo && priceInfo.price !== null) {
          if (product.currentPrice !== priceInfo.price) {
            await product.update({
              newPrice: priceInfo.price,
              currentPrice: priceInfo.price,
              priceChangedAt: new Date(),
              isOffer: priceInfo.isOffer
            });

            result.priceChanged = true;
            result.oldPrice = product.currentPrice;
            result.newPrice = priceInfo.price;
            result.isOffer = priceInfo.isOffer;
          } else {
            result.priceChanged = false;
          }
        } else {
          result.priceChanged = false;
          result.error = 'Price not found or invalid';
        }

        scrapingResults.push(result);

        if (onProgressCallback && typeof onProgressCallback === 'function') {
          onProgressCallback(result);
        }

      } catch (productError) {
        const errorResult = {
          productId: product.id,
          productName: product.name,
          url: product.url,
          error: productError.message,
          scrapedAt: new Date()
        };

        scrapingResults.push(errorResult);
        console.error(`❌ Error scraping product ${product.name}:`, productError.message);

        if (onProgressCallback && typeof onProgressCallback === 'function') {
          onProgressCallback(errorResult);
        }
      } finally {
        if (page && !page.isClosed()) {
          await page.close();
        }
      }
    }

    return { 
      status: 'completed', 
      totalProductsScrapped: carrefourProducts.length,
      results: scrapingResults
    };
  } catch (error) {
    console.error('❌ Overall scraping error:', error.message);
    return { 
      status: 'failed', 
      error: error.message 
    };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};