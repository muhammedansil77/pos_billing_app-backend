const mongoose = require('mongoose');

const billSchema = mongoose.Schema(
    {
        invoiceNumber: {
            type: String,
            required: true,
            unique: true,
        },
        customer: {
            type: mongoose.Schema.Types.ObjectId,
            required: false,
            ref: 'Customer',
        },
        paymentMode: {
            type: String,
            required: true,
            enum: ['Cash', 'Credit'],
            default: 'Cash',
        },
        items: [
            {
                product: {
                    type: mongoose.Schema.Types.ObjectId,
                    required: true,
                    ref: 'Product',
                },
                name: {
                    type: String,
                    required: true,
                },
                quantity: {
                    type: Number,
                    required: true,
                },
                price: {
                    type: Number,
                    required: true,
                },
                wholesalePrice: {
                    type: Number,
                    required: true,
                },
                gstAmount: {
                    type: Number,
                    required: true,
                },
                subtotal: {
                    type: Number,
                    required: true,
                },
            },
        ],
        subtotal: {
            type: Number,
            required: true,
            default: 0.0,
        },
        totalGst: {
            type: Number,
            required: true,
            default: 0.0,
        },
        discount: {
            type: Number,
            required: true,
            default: 0.0,
        },
        grandTotal: {
            type: Number,
            required: true,
            default: 0.0,
        },
        date: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: true,
    }
);

const Bill = mongoose.model('Bill', billSchema);

module.exports = Bill;
