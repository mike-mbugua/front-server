const db= require('../config/db');
const Product = db.products;


exports.createNewProduct = async (req, res) => {
    try {
        const products = Array.isArray(req.body) ? req.body : [req.body];

        const validProducts = products.filter(product =>
            product.name &&
            product.url &&
            product.currentPrice !== undefined &&
            product.competitorName
        );

        if (validProducts.length === 0) {
            return res.status(400).json({
                success: false,
                error: "Each product must have 'name', 'url', 'currentPrice', and 'competitorName'.",
            });
        }

        const createdProducts = await Product.bulkCreate(validProducts, {
            validate: true, 
            individualHooks: true
        });

        res.status(201).json({ success: true, products: createdProducts });
    } catch (error) {
        console.log(error)
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.getAllProducts = async (req, res) => {
    try {
        const products = await Product.findAll();
        return res.status(200).json({ success: true, products });
    } catch (error) {
        console.log(error)
        return res.status(500).json({ success: false, error: error.message });
        
    }
}