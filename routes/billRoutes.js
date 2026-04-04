const express = require('express');
const router = express.Router();
const {
    getBills,
    getBillById,
    createBill,
    updateBill,
    getDashboardStats,
    getCreditBalances
} = require('../controllers/billController');
const { protect } = require('../middleware/authMiddleware');

router.route('/').get(protect, getBills).post(protect, createBill);
router.route('/dashboard').get(protect, getDashboardStats);
router.route('/credit').get(protect, getCreditBalances);
router.route('/:id').get(protect, getBillById).put(protect, updateBill);

module.exports = router;
