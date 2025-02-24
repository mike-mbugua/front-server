const express = require('express');
const router = express.Router();
const productController = require('../controllers/product');
router.post('/', productController.createNewProduct);    

module.exports = router;