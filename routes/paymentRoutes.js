const express = require('express');
const router = express.Router();
const {
    createPayment,
    getCustomerPayments,
} = require('../controllers/paymentController');
const { protect } = require('../middleware/authMiddleware');

router.route('/').post(protect, createPayment);
router.route('/customer/:customerId').get(protect, getCustomerPayments);

module.exports = router;
