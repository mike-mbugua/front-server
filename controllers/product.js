const db= require('../config/db');
const Product = db.products;
exports.createNewProduct = async (req, res) => {
    try {
        const product = await Product.create({
            name: req.body.name,
            url: req.body.url,
            current_price: req.body.current_price,
        });
        res.json({ success: true, product });
        
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
        
    }
}