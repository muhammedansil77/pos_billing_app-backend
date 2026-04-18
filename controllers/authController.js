const User = require('../models/User');
const jwt = require('jsonwebtoken');
const Otp = require('../models/Otp');
const sendEmail = require('../utils/sendEmail');
const { OAuth2Client } = require('google-auth-library');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

const sendOtp = async (req, res) => {
    const { email } = req.body;
    try {
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        await Otp.deleteMany({ email });
        await Otp.create({ email, otp });

        const message = `Your POS Billing App registration OTP is: ${otp}\n\nIt is valid for 5 minutes.`;

        // Always print the OTP to the terminal so the user is never blocked by Gmail errors during development
        console.log(`\n=========================================`);
        console.log(`🔑 OTP GENERATED: ${otp} for ${email}`);
        console.log(`=========================================\n`);

        try {
            await sendEmail({
                email,
                subject: 'Your Registration OTP',
                message,
            });
            res.status(200).json({ message: 'OTP sent successfully to your email' });
        } catch (emailError) {
            console.error(`\n🚨 GMAIL SECURE LOGIN FAILED 🚨`);
            console.error(`Google rejected your password. Check if it's the valid App Password for ${process.env.NODEMAILER_EMAIL}.`);
            // Graceful fallback for development: Don't block the user, let them read the OTP from the terminal!
            res.status(200).json({ 
                message: 'Email failed (Invalid App Password), but you can find the OTP in your backend terminal!',
                warning: 'Check backend terminal for OTP'
            });
        }
    } catch (error) {
        console.error(`Error sending OTP: ${error.message}`);
        res.status(500).json({ message: 'Error sending OTP' });
    }
};

const registerUser = async (req, res) => {
    const { name, email, password, otp } = req.body;

    try {
        if (!otp) {
            return res.status(400).json({ message: 'OTP is required' });
        }

        const validOtp = await Otp.findOne({ email, otp });
        if (!validOtp) {
            return res.status(400).json({ message: 'Invalid or expired OTP' });
        }

        const userExists = await User.findOne({ email });

        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const user = await User.create({
            name,
            email,
            password,
        });

        if (user) {
            await Otp.deleteMany({ email });
            res.status(201).json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                token: generateToken(user._id),
            });
        } else {
            res.status(400).json({ message: 'Invalid user data' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const authUser = async (req, res) => {
    const { email, password } = req.body;
    console.log(`Login attempt for email: ${email}`);

    try {
        const user = await User.findOne({ email });

        if (user && (await user.matchPassword(password))) {
            console.log(`Successful login for email: ${email}`);
            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                token: generateToken(user._id),
            });
        } else {
            console.log(`Failed login attempt: Invalid email or password for ${email}`);
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        console.error(`Error during authentication: ${error.message}`);
        res.status(500).json({ message: error.message });
    }
};

const getUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        if (user) {
            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
            });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const authGoogle = async (req, res) => {
    const { idToken } = req.body;
    try {
        const ticket = await client.verifyIdToken({
            idToken,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
        const { name, email, sub: googleId } = ticket.getPayload();

        let user = await User.findOne({ email });

        if (!user) {
            user = await User.create({
                name,
                email,
                googleId,
            });
        } else if (!user.googleId) {
            // If user exists by email but doesn't have googleId, link them
            user.googleId = googleId;
            await user.save();
        }

        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            token: generateToken(user._id),
        });
    } catch (error) {
        console.error(`Google Auth Error: ${error.message}`);
        res.status(401).json({ message: 'Google authentication failed' });
    }
};

module.exports = { sendOtp, registerUser, authUser, authGoogle, getUserProfile };
