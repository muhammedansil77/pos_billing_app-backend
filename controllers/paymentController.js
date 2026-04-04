const Payment = require('../models/Payment');

const createPayment = async (req, res) => {
    const { customer, amount, paymentMethod, note } = req.body;

    try {
        if (!customer || !amount) {
            return res.status(400).json({ message: 'Customer and amount are required' });
        }

        const payment = new Payment({
            customer,
            amount: Number(amount),
            paymentMethod: paymentMethod || 'Cash',
            note: note || '',
        });

        const createdPayment = await payment.save();
        res.status(201).json(createdPayment);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getCustomerPayments = async (req, res) => {
    const { customerId } = req.params;
    try {
        const payments = await Payment.find({ customer: customerId }).sort({ date: -1 });
        res.json(payments);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    createPayment,
    getCustomerPayments,
};
