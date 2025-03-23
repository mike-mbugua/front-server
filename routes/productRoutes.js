const express = require('express');
const router = express.Router();
const productController = require('../controllers/product');
const scrapePrice =require('../scrappers/priceScrapers')
router.post('/', productController.createNewProduct);    
router.post('/', productController.createNewProduct);        

module.exports = router;