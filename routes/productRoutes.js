const express = require('express');
const router = express.Router();
const {
    getProducts,
    getProductById,
    getProductByBarcode,
    createProduct,
    updateProduct,
    deleteProduct,
} = require('../controllers/productController');
const { protect } = require('../middleware/authMiddleware');

router.route('/').get(protect, getProducts).post(protect, createProduct);
router.route('/barcode/:barcode').get(protect, getProductByBarcode);
router.route('/:id').get(protect, getProductById).put(protect, updateProduct).delete(protect, deleteProduct);

module.exports = router;
