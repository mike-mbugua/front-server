const express = require('express');
const router = express.Router();
const productController = require('../controllers/product');
router.post('/', productController.createNewProduct);    
router.get('/', productController.getAllProducts);    

module.exports = router;