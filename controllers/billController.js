const Bill = require('../models/Bill');
const Product = require('../models/Product');

const getBills = async (req, res) => {
    const { filter, startDate, endDate, customer, paymentMode } = req.query;
    let query = {};

    const now = new Date();
    const startOfDay = new Date(now.setHours(0, 0, 0, 0));

    if (customer) {
        query.customer = customer;
    }

    if (paymentMode) {
        query.paymentMode = paymentMode;
    }

    if (filter === 'today') {
        query.createdAt = { $gte: startOfDay };
    } else if (filter === 'yesterday') {
        const yesterdayStart = new Date(startOfDay.getTime() - 24 * 60 * 60 * 1000);
        const yesterdayEnd = new Date(startOfDay.getTime() - 1);
        query.createdAt = { $gte: yesterdayStart, $lte: yesterdayEnd };
    } else if (filter === 'week') {
        const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        query.createdAt = { $gte: lastWeek };
    } else if (filter === 'month') {
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        query.createdAt = { $gte: firstDayOfMonth };
    } else if (filter === 'year') {
        const firstDayOfYear = new Date(now.getFullYear(), 0, 1);
        query.createdAt = { $gte: firstDayOfYear };
    } else if (startDate && endDate) {
        query.createdAt = {
            $gte: new Date(startDate),
            $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999))
        };
    }

    try {
        const bills = await Bill.find(query)
            .populate('customer', 'name phone address')
            .sort({ createdAt: -1 });
        res.json(bills);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getBillById = async (req, res) => {
    try {
        const bill = await Bill.findById(req.params.id).populate('customer', 'name phone address');

        if (bill) {
            res.json(bill);
        } else {
            res.status(404).json({ message: 'Bill not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const createBill = async (req, res) => {
    const { customer, items, subtotal, totalGst, discount, grandTotal } = req.body;

    try {
        if (items && items.length === 0) {
            return res.status(400).json({ message: 'No order items' });
        }

        // Generate a random invoice number
        const invoiceNumber = 'INV-' + Date.now().toString() + Math.floor(Math.random() * 1000).toString();

        const bill = new Bill({
            invoiceNumber,
            customer,
            paymentMode: req.body.paymentMode || 'Cash',
            items,
            subtotal,
            totalGst,
            discount,
            grandTotal,
        });

        // Update product quantities
        for (const item of items) {
            const product = await Product.findById(item.product);
            if (product) {
                if(product.quantity >= item.quantity) {
                    product.quantity -= item.quantity;
                    product.salesCount = (product.salesCount || 0) + item.quantity;
                    await product.save();
                } else {
                   return res.status(400).json({ message: `Insufficient quantity for ${product.name}`});
                }
            }
        }

        const createdBill = await bill.save();
        res.status(201).json(createdBill);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const updateBill = async (req, res) => {
    try {
        const bill = await Bill.findById(req.params.id);
        if (!bill) {
            return res.status(404).json({ message: 'Bill not found' });
        }

        const { customer, items, subtotal, totalGst, discount, grandTotal, paymentMode } = req.body;

        if (items && items.length === 0) {
            return res.status(400).json({ message: 'No order items' });
        }

        // 1. Restore stock and salesCount from old bill items
        for (const oldItem of bill.items) {
            const product = await Product.findById(oldItem.product);
            if (product) {
                product.quantity += oldItem.quantity;
                product.salesCount = Math.max(0, (product.salesCount || 0) - oldItem.quantity);
                await product.save();
            }
        }

        // 2. Deduct stock and increment salesCount for new bill items
        for (const newItem of items) {
            const product = await Product.findById(newItem.product);
            if (product) {
                if (product.quantity >= newItem.quantity) {
                    product.quantity -= newItem.quantity;
                    product.salesCount = (product.salesCount || 0) + newItem.quantity;
                    await product.save();
                } else {
                    // Try to rollback partially (complex in non-transactional, keeping simple)
                    return res.status(400).json({ message: `Insufficient quantity for ${product.name}`});
                }
            }
        }

        // 3. Update the bill record
        bill.customer = customer || null;
        bill.paymentMode = paymentMode || 'Cash';
        bill.items = items;
        bill.subtotal = subtotal;
        bill.totalGst = totalGst;
        bill.discount = discount;
        bill.grandTotal = grandTotal;

        const updatedBill = await bill.save();
        res.json(updatedBill);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getDashboardStats = async (req, res) => {
    try {
        const billsCount = await Bill.countDocuments();
        
        const aggregation = await Bill.aggregate([
            {
                $group: {
                    _id: null,
                    totalSales: { $sum: "$grandTotal" }
                }
            }
        ]);
        
        const totalSales = aggregation.length > 0 ? aggregation[0].totalSales : 0;
        
        const recentBills = await Bill.find().sort({ createdAt: -1 }).limit(5).populate('customer', 'name');

        res.json({
            totalSales,
            billsCount,
            recentBills
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getCreditBalances = async (req, res) => {
    try {
        const balances = await Bill.aggregate([
            { $match: { paymentMode: 'Credit', customer: { $exists: true, $ne: null } } },
            {
                $group: {
                    _id: '$customer',
                    totalCredit: { $sum: '$grandTotal' },
                    billCount: { $sum: 1 }
                }
            },
            {
                $lookup: {
                    from: 'payments',
                    localField: '_id',
                    foreignField: 'customer',
                    as: 'payments'
                }
            },
            {
                $addFields: {
                    totalPaid: { $sum: '$payments.amount' }
                }
            },
            {
                $lookup: {
                    from: 'customers',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'customerDetails'
                }
            },
            { $unwind: '$customerDetails' },
            {
                $project: {
                    _id: 1,
                    totalCredit: 1,
                    totalPaid: 1,
                    balance: { $subtract: ['$totalCredit', '$totalPaid'] },
                    billCount: 1,
                    name: '$customerDetails.name',
                    phone: '$customerDetails.phone',
                    address: '$customerDetails.address'
                }
            },
            { $match: { balance: { $gt: 0 } } },
            { $sort: { balance: -1 } }
        ]);
        res.json(balances);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getBills,
    getBillById,
    createBill,
    updateBill,
    getDashboardStats,
    getCreditBalances
};
