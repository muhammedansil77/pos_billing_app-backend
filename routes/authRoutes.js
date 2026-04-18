const express = require('express');
const router = express.Router();
const { sendOtp, registerUser, authUser, authGoogle, getUserProfile } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/send-otp', sendOtp);
router.post('/register', registerUser);
router.post('/login', authUser);
router.post('/google-login', authGoogle);
router.get('/profile', protect, getUserProfile);

module.exports = router;
