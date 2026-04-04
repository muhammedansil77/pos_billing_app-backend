const Product = require('../models/Product');

const getProducts = async (req, res) => {
    try {
        const products = await Product.find({}).populate('category');
        res.json(products);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getProductById = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id).populate('category');

        if (product) {
            res.json(product);
        } else {
            res.status(404).json({ message: 'Product not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getProductByBarcode = async (req, res) => {
    try {
        const product = await Product.findOne({ barcode: req.params.barcode }).populate('category');

        if (product) {
            res.json(product);
        } else {
            res.status(404).json({ message: 'Product not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const createProduct = async (req, res) => {
    let { name, price, sellingPrice, wholesalePrice, quantity, unit, barcode, gstPercentage, category } = req.body;

    // Support legacy 'price' if 'sellingPrice' is missing
    sellingPrice = sellingPrice || price;

    try {
        if (!barcode || barcode.trim() === '') {
            barcode = Math.floor(100000000000 + Math.random() * 900000000000).toString();
        }

        const productExists = await Product.findOne({ barcode });
        
        if (productExists) {
            return res.status(400).json({ message: 'Product with this barcode already exists' });
        }

        const product = new Product({
            name,
            wholesalePrice,
            sellingPrice,
            quantity,
            unit: unit || 'kg',
            barcode,
            gstPercentage,
            category,
        });

        const createdProduct = await product.save();
        res.status(201).json(createdProduct);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const updateProduct = async (req, res) => {
    const { name, price, sellingPrice, wholesalePrice, quantity, unit, barcode, gstPercentage, category } = req.body;

    try {
        const product = await Product.findById(req.params.id);

        if (product) {
            product.name = name || product.name;
            product.wholesalePrice = wholesalePrice !== undefined ? wholesalePrice : product.wholesalePrice;
            product.sellingPrice = sellingPrice !== undefined ? sellingPrice : (price !== undefined ? price : product.sellingPrice);
            product.quantity = quantity !== undefined ? quantity : product.quantity;
            product.unit = unit || product.unit;
            product.barcode = barcode || product.barcode;
            product.gstPercentage = gstPercentage !== undefined ? gstPercentage : product.gstPercentage;
            product.category = category || product.category;

            const updatedProduct = await product.save();
            res.json(updatedProduct);
        } else {
            res.status(404).json({ message: 'Product not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const deleteProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);

        if (product) {
            await product.deleteOne();
            res.json({ message: 'Product removed' });
        } else {
            res.status(404).json({ message: 'Product not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getProducts,
    getProductById,
    getProductByBarcode,
    createProduct,
    updateProduct,
    deleteProduct,
};
