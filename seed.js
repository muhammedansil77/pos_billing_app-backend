const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User.js');

dotenv.config();

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('Connected to DB...');
    const userExists = await User.findOne({ email: 'admin@test.com' });
    if (!userExists) {
        await User.create({
          name: 'Store Admin',
          email: 'admin@test.com',
          password: 'password123',
          role: 'admin'
        });
        console.log('Default Admin created successfully!');
    } else {
        console.log('Admin already exists.');
    }

    const Customer = require('./models/Customer.js');
    const walkinExists = await Customer.findOne({ phone: '0000000000' });
    if (!walkinExists) {
        await Customer.create({
            name: 'Walk-in Customer',
            phone: '0000000000',
            address: 'Store'
        });
        console.log('Walk-in Customer created successfully!');
    } else {
        console.log('Walk-in Customer already exists.');
    }
    process.exit();
  })
  .catch((err) => {
    console.error('Error connecting to MongoDB:', err.message);
    process.exit(1);
  });
