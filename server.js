const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const Flutterwave = require('flutterwave-node-v3');
const cors = require('cors');
const { MongoClient } = require('mongodb');
const app = express();

app.use(express.json());
app.use(cors());
app.use(express.static('.'));

const flw = new Flutterwave(process.env.FLW_PUBLIC_KEY || 'FLWPUBK_TEST-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX-X', process.env.FLW_SECRET_KEY || 'FLWSECK_TEST-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX-X');

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = 'billshome';
let db;
let usersCollection;

async function connectDB() {
    try {
        const client = await MongoClient.connect(MONGODB_URI);
        db = client.db(DB_NAME);
        usersCollection = db.collection('users');
        console.log('Connected to MongoDB');
    } catch (err) {
        console.error('MongoDB connection error:', err);
    }
}

connectDB();

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/')
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname)
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'), false);
  }
};

const upload = multer({ storage: storage, fileFilter: fileFilter });

// Keep file-based storage as fallback for local development
const usersFile = path.join(__dirname, 'users.json');

function readUsers() {
    try {
        const data = fs.readFileSync(usersFile, 'utf8');
        return JSON.parse(data).map(user => ({ ...user, balance: user.balance || 0, profilePic: user.profilePic || null, pin: user.pin || null, transactions: user.transactions || [] }));
    } catch (err) {
        return [];
    }
}

function writeUsers(users) {
    try {
        fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
    } catch (err) {
        console.log('File write skipped (running on serverless)');
    }
}

let users = readUsers();

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

app.get('/styles.css', (req, res) => {
    res.setHeader('Content-Type', 'text/css');
    res.sendFile(__dirname + '/styles.css');
});

app.get('/script.js', (req, res) => {
    res.setHeader('Content-Type', 'application/javascript');
    res.sendFile(__dirname + '/script.js');
});

app.get('/login.html', (req, res) => {
    res.sendFile(__dirname + '/login.html');
});

app.get('/register.html', (req, res) => {
    res.sendFile(__dirname + '/register.html');
});

app.get('/profile.html', (req, res) => {
    res.sendFile(__dirname + '/profile.html');
});

app.get('/airtime.html', (req, res) => {
    res.sendFile(__dirname + '/airtime.html');
});

app.get('/data.html', (req, res) => {
    res.sendFile(__dirname + '/data.html');
});

app.get('/sportybet.html', (req, res) => {
    res.sendFile(__dirname + '/sportybet.html');
});

app.get('/tv.html', (req, res) => {
    res.sendFile(__dirname + '/tv.html');
});

app.get('/payment-success.html', (req, res) => {
    res.sendFile(__dirname + '/payment-success.html');
});

app.post('/api/register', async (req, res) => {
    const { name, email, password, pin } = req.body;
    
    try {
        if (usersCollection) {
            // Use MongoDB
            const existingUser = await usersCollection.findOne({ email });
            if (existingUser) {
                return res.status(400).json({ message: 'User already exists' });
            }
            const user = { name, email, password, pin, balance: 0, profilePic: null, transactions: [], createdAt: new Date() };
            await usersCollection.insertOne(user);
            res.json({ message: 'Registration successful' });
        } else {
            // Fallback to file storage (local only)
            const existingUser = users.find(u => u.email === email);
            if (existingUser) {
                return res.status(400).json({ message: 'User already exists' });
            }
            const user = { name, email, password, pin, balance: 0, profilePic: null, transactions: [] };
            users.push(user);
            writeUsers(users);
            res.json({ message: 'Registration successful' });
        }
    } catch (err) {
        console.error('Registration error:', err);
        res.status(500).json({ message: 'Registration failed' });
    }
});

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        let user;
        if (usersCollection) {
            user = await usersCollection.findOne({ email, password });
        } else {
            user = users.find(u => u.email === email && u.password === password);
        }
        if (user) {
            res.json({ user });
        } else {
            res.status(401).json({ message: 'Invalid credentials' });
        }
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ message: 'Login failed' });
    }
});

app.get('/api/profile', async (req, res) => {
    // For demo, return the first user; in real app, use sessions
    try {
        let user;
        if (usersCollection) {
            user = await usersCollection.findOne({});
        } else {
            user = users.length > 0 ? users[0] : null;
        }
        if (user) {
            res.json(user);
        } else {
            res.status(404).json({ message: 'No user found' });
        }
    } catch (err) {
        console.error('Profile error:', err);
        res.status(500).json({ message: 'Failed to load profile' });
    }
});

app.post('/api/upload-profile-pic', upload.single('profilePic'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
    }
    // Update user profile pic
    if (users.length > 0) {
        users[0].profilePic = req.file.filename;
        writeUsers(users);
        res.json({ message: 'Profile picture uploaded', filename: req.file.filename });
    } else {
        res.status(404).json({ message: 'No user found' });
    }
});

app.post('/api/deposit', async (req, res) => {
    const { amount, pin } = req.body;
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
        return res.status(400).json({ message: 'Invalid amount' });
    }

    try {
        let user;
        if (usersCollection) {
            user = await usersCollection.findOne({});
        } else {
            user = users.length > 0 ? users[0] : null;
        }

        if (!user || user.pin !== pin) {
            return res.status(400).json({ message: 'Invalid PIN' });
        }

        const payload = {
            tx_ref: `deposit-${Date.now()}`,
            amount: amt,
            currency: 'NGN',
            redirect_url: `${req.protocol}://${req.get('host')}/payment-success`,
            customer: {
                email: user.email,
                name: user.name,
            },
            customizations: {
                title: 'Deposit to billsHOME',
                description: 'Fund your billsHOME wallet',
            },
        };

        const response = await flw.Charge.card(payload);
        res.json({ payment_link: response.data.link });
    } catch (error) {
        console.error('Flutterwave error:', error);
        res.status(500).json({ message: 'Payment initiation failed' });
    }
});

app.post('/api/flutterwave-webhook', async (req, res) => {
    const secretHash = process.env.FLW_SECRET_HASH || 'your_webhook_secret_hash';
    const signature = req.headers['verif-hash'];

    if (!signature || signature !== secretHash) {
        return res.status(401).send('Unauthorized');
    }

    const payload = req.body;

    if (payload.event === 'charge.completed' && payload.data.status === 'successful') {
        const txRef = payload.data.tx_ref;
        const amount = payload.data.amount;

        if (txRef.startsWith('deposit-')) {
            try {
                if (usersCollection) {
                    const user = await usersCollection.findOne({});
                    if (user) {
                        await usersCollection.updateOne(
                            { _id: user._id },
                            {
                                $inc: { balance: amount },
                                $push: { transactions: { type: 'Deposit', amount: amount, date: new Date().toISOString() } }
                            }
                        );
                    }
                } else {
                    if (users.length > 0) {
                        users[0].balance += amount;
                        users[0].transactions.push({ type: 'Deposit', amount: amount, date: new Date().toISOString() });
                        writeUsers(users);
                    }
                }
            } catch (err) {
                console.error('Webhook update error:', err);
            }
        }
    }

    res.status(200).send('Webhook received');
});

app.post('/api/change-pin', async (req, res) => {
    const { currentPin, newPin } = req.body;
    try {
        let user;
        if (usersCollection) {
            user = await usersCollection.findOne({});
        } else {
            user = users.length > 0 ? users[0] : null;
        }

        if (!user) {
            return res.status(404).json({ message: 'No user found' });
        }
        if (user.pin !== currentPin) {
            return res.status(400).json({ message: 'Current PIN is incorrect' });
        }
        if (!/^\d{4}$/.test(newPin)) {
            return res.status(400).json({ message: 'New PIN must be 4 digits' });
        }

        if (usersCollection) {
            await usersCollection.updateOne({ _id: user._id }, { $set: { pin: newPin } });
        } else {
            users[0].pin = newPin;
            writeUsers(users);
        }
        res.json({ message: 'PIN changed successfully' });
    } catch (err) {
        console.error('Change PIN error:', err);
        res.status(500).json({ message: 'Failed to change PIN' });
    }
});

app.get('/api/transactions', async (req, res) => {
    try {
        let user;
        if (usersCollection) {
            user = await usersCollection.findOne({});
        } else {
            user = users.length > 0 ? users[0] : null;
        }
        if (user) {
            res.json({ transactions: user.transactions || [] });
        } else {
            res.status(404).json({ message: 'No user found' });
        }
    } catch (err) {
        console.error('Transactions error:', err);
        res.status(500).json({ message: 'Failed to load transactions' });
    }
});

app.get('/api/user-data', async (req, res) => {
    try {
        let user;
        if (usersCollection) {
            user = await usersCollection.findOne({});
        } else {
            user = users.length > 0 ? users[0] : null;
        }
        if (user) {
            res.json({
                name: user.name,
                email: user.email,
                balance: user.balance,
                profilePic: user.profilePic,
                transactions: user.transactions
            });
        } else {
            res.status(404).json({ message: 'No user found' });
        }
    } catch (err) {
        console.error('User data error:', err);
        res.status(500).json({ message: 'Failed to load user data' });
    }
});

app.post('/api/airtime', async (req, res) => {
    const { network, phone, amount, pin } = req.body;
    const cost = parseFloat(amount);
    try {
        let user;
        if (usersCollection) {
            user = await usersCollection.findOne({});
        } else {
            user = users.length > 0 ? users[0] : null;
        }

        if (!user || user.pin !== pin) {
            return res.status(400).json({ message: 'Invalid PIN' });
        }
        if (user.balance < cost) {
            return res.status(400).json({ message: 'Insufficient balance' });
        }

        const newBalance = user.balance - cost;
        const transaction = { type: 'Airtime Purchase', amount: -cost, date: new Date().toISOString() };

        if (usersCollection) {
            await usersCollection.updateOne(
                { _id: user._id },
                {
                    $set: { balance: newBalance },
                    $push: { transactions: transaction }
                }
            );
        } else {
            users[0].balance = newBalance;
            users[0].transactions.push(transaction);
            writeUsers(users);
        }

        res.json({ message: `Airtime of ₦${amount} purchased for ${phone} on ${network}`, balance: newBalance });
    } catch (err) {
        console.error('Airtime error:', err);
        res.status(500).json({ message: 'Purchase failed' });
    }
});

const dataPrices = { '1GB': 5, '5GB': 20, '10GB': 35 };

app.post('/api/data', async (req, res) => {
    const { phone, plan, pin } = req.body;
    const cost = dataPrices[plan];
    if (!cost) {
        return res.status(400).json({ message: 'Invalid plan' });
    }
    try {
        let user;
        if (usersCollection) {
            user = await usersCollection.findOne({});
        } else {
            user = users.length > 0 ? users[0] : null;
        }

        if (!user || user.pin !== pin) {
            return res.status(400).json({ message: 'Invalid PIN' });
        }
        if (user.balance < cost) {
            return res.status(400).json({ message: 'Insufficient balance' });
        }

        const newBalance = user.balance - cost;
        const transaction = { type: 'Data Purchase', amount: -cost, date: new Date().toISOString() };

        if (usersCollection) {
            await usersCollection.updateOne(
                { _id: user._id },
                {
                    $set: { balance: newBalance },
                    $push: { transactions: transaction }
                }
            );
        } else {
            users[0].balance = newBalance;
            users[0].transactions.push(transaction);
            writeUsers(users);
        }

        res.json({ message: `${plan} data purchased for ${phone}`, balance: newBalance });
    } catch (err) {
        console.error('Data purchase error:', err);
        res.status(500).json({ message: 'Purchase failed' });
    }
});

app.post('/api/bet', async (req, res) => {
    const { stake, odds, pin } = req.body;
    const cost = parseFloat(stake);
    try {
        let user;
        if (usersCollection) {
            user = await usersCollection.findOne({});
        } else {
            user = users.length > 0 ? users[0] : null;
        }

        if (!user || user.pin !== pin) {
            return res.status(400).json({ message: 'Invalid PIN' });
        }
        if (user.balance < cost) {
            return res.status(400).json({ message: 'Insufficient balance' });
        }

        const newBalance = user.balance - cost;
        const transaction = { type: 'Bet', amount: -cost, date: new Date().toISOString() };

        if (usersCollection) {
            await usersCollection.updateOne(
                { _id: user._id },
                {
                    $set: { balance: newBalance },
                    $push: { transactions: transaction }
                }
            );
        } else {
            users[0].balance = newBalance;
            users[0].transactions.push(transaction);
            writeUsers(users);
        }

        res.json({ message: `Bet placed with stake ₦${stake} at odds ${odds}`, balance: newBalance });
    } catch (err) {
        console.error('Bet error:', err);
        res.status(500).json({ message: 'Bet failed' });
    }
});

const tvPrices = { 'Basic': 10, 'Premium': 25, 'Ultimate': 50 };

app.post('/api/tv', async (req, res) => {
    const { provider, plan, pin } = req.body;
    const cost = tvPrices[plan];
    if (!cost) {
        return res.status(400).json({ message: 'Invalid plan' });
    }
    try {
        let user;
        if (usersCollection) {
            user = await usersCollection.findOne({});
        } else {
            user = users.length > 0 ? users[0] : null;
        }

        if (!user || user.pin !== pin) {
            return res.status(400).json({ message: 'Invalid PIN' });
        }
        if (user.balance < cost) {
            return res.status(400).json({ message: 'Insufficient balance' });
        }

        const newBalance = user.balance - cost;
        const transaction = { type: 'TV Subscription', amount: -cost, date: new Date().toISOString() };

        if (usersCollection) {
            await usersCollection.updateOne(
                { _id: user._id },
                {
                    $set: { balance: newBalance },
                    $push: { transactions: transaction }
                }
            );
        } else {
            users[0].balance = newBalance;
            users[0].transactions.push(transaction);
            writeUsers(users);
        }

        res.json({ message: `${plan} subscription for ${provider} activated`, balance: newBalance });
    } catch (err) {
        console.error('TV subscription error:', err);
        res.status(500).json({ message: 'Subscription failed' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

module.exports = app;