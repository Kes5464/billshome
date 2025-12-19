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

// Use memory storage for serverless compatibility (Vercel)
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'), false);
  }
};

const upload = multer({ 
  storage: storage, 
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

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

app.get('/bank-accounts.html', (req, res) => {
    res.sendFile(__dirname + '/bank-accounts.html');
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
    const userEmail = req.query.userEmail;
    
    try {
        let user;
        if (usersCollection) {
            user = await usersCollection.findOne({ email: userEmail });
        } else {
            user = users.find(u => u.email === userEmail);
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

app.post('/api/upload-profile-pic', upload.single('profilePic'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
    }
    
    const userEmail = req.body.userEmail;
    if (!userEmail) {
        return res.status(400).json({ message: 'User email required' });
    }
    
    try {
        // Convert image to base64 for serverless compatibility
        const base64Image = req.file.buffer.toString('base64');
        const imageDataUrl = `data:${req.file.mimetype};base64,${base64Image}`;
        
        let user;
        if (usersCollection) {
            user = await usersCollection.findOne({ email: userEmail });
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }
            
            await usersCollection.updateOne(
                { email: userEmail },
                { $set: { profilePic: imageDataUrl } }
            );
        } else {
            user = users.find(u => u.email === userEmail);
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }
            user.profilePic = imageDataUrl;
            writeUsers(users);
        }
        
        res.json({ message: 'Profile picture uploaded', profilePic: imageDataUrl });
    } catch (err) {
        console.error('Upload error:', err);
        res.status(500).json({ message: 'Upload failed' });
    }
});

app.post('/api/deposit', async (req, res) => {
    const { amount, pin, userEmail } = req.body;
    console.log('Deposit request - Email:', userEmail, 'PIN:', pin);
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
        return res.status(400).json({ message: 'Invalid amount' });
    }

    try {
        let user;
        if (usersCollection) {
            user = await usersCollection.findOne({ email: userEmail });
            console.log('User found in DB:', user ? user.email : 'NOT FOUND');
        } else {
            user = users.find(u => u.email === userEmail);
        }

        if (!user) {
            console.log('User not found for email:', userEmail);
            return res.status(404).json({ message: 'User not found. Please login again.' });
        }
        
        if (user.pin !== pin) {
            console.log('PIN mismatch - Provided:', pin, 'Stored:', user.pin);
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
    const { currentPin, newPin, userEmail } = req.body;
    try {
        let user;
        if (usersCollection) {
            user = await usersCollection.findOne({ email: userEmail });
        } else {
            user = users.find(u => u.email === userEmail);
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

// Link bank account using Flutterwave
app.post('/api/link-bank-account', async (req, res) => {
    const { accountNumber, accountBank, pin, userEmail } = req.body;
    try {
        let user;
        if (usersCollection) {
            user = await usersCollection.findOne({ email: userEmail });
        } else {
            user = users.find(u => u.email === userEmail);
        }

        if (!user || user.pin !== pin) {
            return res.status(400).json({ message: 'Invalid PIN' });
        }

        // Verify account with Flutterwave
        const payload = {
            account_number: accountNumber,
            account_bank: accountBank
        };

        const response = await flw.Misc.verify_Account(payload);

        if (response.status === 'success') {
            const bankAccount = {
                accountNumber: accountNumber,
                accountBank: accountBank,
                accountName: response.data.account_name,
                linkedAt: new Date().toISOString(),
                isDefault: user.bankAccounts ? user.bankAccounts.length === 0 : true
            };

            if (usersCollection) {
                await usersCollection.updateOne(
                    { _id: user._id },
                    { $push: { bankAccounts: bankAccount } }
                );
            } else {
                if (!users[0].bankAccounts) users[0].bankAccounts = [];
                users[0].bankAccounts.push(bankAccount);
                writeUsers(users);
            }

            res.json({ 
                message: 'Bank account linked successfully', 
                account: bankAccount 
            });
        } else {
            res.status(400).json({ message: 'Invalid bank account details' });
        }
    } catch (err) {
        console.error('Link bank error:', err);
        res.status(500).json({ message: 'Failed to link bank account: ' + err.message });
    }
});

// Get linked bank accounts
app.get('/api/bank-accounts', async (req, res) => {
    const userEmail = req.query.userEmail;
    try {
        let user;
        if (usersCollection) {
            user = await usersCollection.findOne({ email: userEmail });
        } else {
            user = users.find(u => u.email === userEmail);
        }
        if (user) {
            res.json({ bankAccounts: user.bankAccounts || [] });
        } else {
            res.status(404).json({ message: 'No user found' });
        }
    } catch (err) {
        console.error('Bank accounts error:', err);
        res.status(500).json({ message: 'Failed to load bank accounts' });
    }
});

// Remove linked bank account
app.post('/api/remove-bank-account', async (req, res) => {
    const { accountNumber, pin, userEmail } = req.body;
    try {
        let user;
        if (usersCollection) {
            user = await usersCollection.findOne({ email: userEmail });
        } else {
            user = users.find(u => u.email === userEmail);
        }

        if (!user || user.pin !== pin) {
            return res.status(400).json({ message: 'Invalid PIN' });
        }

        if (usersCollection) {
            await usersCollection.updateOne(
                { _id: user._id },
                { $pull: { bankAccounts: { accountNumber: accountNumber } } }
            );
        } else {
            users[0].bankAccounts = users[0].bankAccounts.filter(acc => acc.accountNumber !== accountNumber);
            writeUsers(users);
        }

        res.json({ message: 'Bank account removed successfully' });
    } catch (err) {
        console.error('Remove bank error:', err);
        res.status(500).json({ message: 'Failed to remove bank account' });
    }
});

// Charge bank account for purchases
app.post('/api/charge-bank-account', async (req, res) => {
    const { accountNumber, amount, pin, description, userEmail } = req.body;
    try {
        let user;
        if (usersCollection) {
            user = await usersCollection.findOne({ email: userEmail });
        } else {
            user = users.find(u => u.email === userEmail);
        }

        if (!user || user.pin !== pin) {
            return res.status(400).json({ message: 'Invalid PIN' });
        }

        const bankAccount = user.bankAccounts?.find(acc => acc.accountNumber === accountNumber);
        if (!bankAccount) {
            return res.status(400).json({ message: 'Bank account not linked' });
        }

        // Charge bank account using Flutterwave
        const payload = {
            tx_ref: `bank_charge_${Date.now()}_${user._id || 'local'}`,
            amount: parseFloat(amount),
            currency: 'NGN',
            account_bank: bankAccount.accountBank,
            account_number: accountNumber,
            email: user.email,
            phone_number: user.phone || '08000000000',
            fullname: user.name
        };

        const response = await flw.Charge.ng_account(payload);

        if (response.status === 'success') {
            // Add to user balance
            const newBalance = user.balance + parseFloat(amount);
            const transaction = {
                type: 'Bank Transfer',
                amount: parseFloat(amount),
                date: new Date().toISOString(),
                reference: payload.tx_ref,
                description: description || 'Bank account charge'
            };

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

            res.json({ 
                message: 'Payment successful', 
                balance: newBalance,
                reference: payload.tx_ref
            });
        } else {
            res.status(400).json({ message: response.message || 'Payment failed' });
        }
    } catch (err) {
        console.error('Charge bank error:', err);
        res.status(500).json({ message: 'Payment failed: ' + err.message });
    }
});

app.get('/api/transactions', async (req, res) => {
    const userEmail = req.query.userEmail;
    try {
        let user;
        if (usersCollection) {
            user = await usersCollection.findOne({ email: userEmail });
        } else {
            user = users.find(u => u.email === userEmail);
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
    const { network, phone, amount, pin, paymentMethod, accountNumber, userEmail } = req.body;
    const cost = parseFloat(amount);
    try {
        let user;
        if (usersCollection) {
            user = await usersCollection.findOne({ email: userEmail });
        } else {
            user = users.find(u => u.email === userEmail);
        }

        if (!user || user.pin !== pin) {
            return res.status(400).json({ message: 'Invalid PIN' });
        }

        // Check payment method
        if (paymentMethod === 'bank' && accountNumber) {
            // Pay directly from bank account
            const bankAccount = user.bankAccounts?.find(acc => acc.accountNumber === accountNumber);
            if (!bankAccount) {
                return res.status(400).json({ message: 'Bank account not linked' });
            }

            // Charge bank and make purchase
            const chargePayload = {
                tx_ref: `airtime_bank_${Date.now()}_${user._id || 'local'}`,
                amount: cost,
                currency: 'NGN',
                account_bank: bankAccount.accountBank,
                account_number: accountNumber,
                email: user.email,
                phone_number: phone,
                fullname: user.name
            };

            const chargeResponse = await flw.Charge.ng_account(chargePayload);
            
            if (chargeResponse.status !== 'success') {
                return res.status(400).json({ message: 'Bank charge failed' });
            }
        } else {
            // Pay from wallet balance
            if (user.balance < cost) {
                return res.status(400).json({ message: 'Insufficient balance' });
            }
        }

        // Make real Flutterwave Bill Payment API call
        const payload = {
            country: 'NG',
            customer: phone,
            amount: cost,
            recurrence: 'ONCE',
            type: network.toUpperCase(),
            reference: `airtime_${Date.now()}_${user._id || 'local'}`
        };

        const response = await flw.Bills.create_bill(payload);

        if (response.status === 'success') {
            const newBalance = paymentMethod === 'wallet' ? user.balance - cost : user.balance;
            const transaction = { 
                type: 'Airtime Purchase', 
                amount: -cost, 
                date: new Date().toISOString(),
                reference: payload.reference,
                phone: phone,
                network: network,
                paymentMethod: paymentMethod === 'bank' ? 'Bank Account' : 'Wallet'
            };

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

            res.json({ 
                message: `Airtime of ₦${amount} purchased for ${phone} on ${network}`, 
                balance: newBalance,
                reference: payload.reference
            });
        } else {
            res.status(400).json({ message: response.message || 'Airtime purchase failed' });
        }
    } catch (err) {
        console.error('Airtime error:', err);
        res.status(500).json({ message: 'Purchase failed: ' + err.message });
    }
});

const dataPrices = { '1GB': 500, '5GB': 2000, '10GB': 3500 };
const dataBillerCodes = { '1GB': 'BIL099', '5GB': 'BIL099', '10GB': 'BIL099' };

app.post('/api/data', async (req, res) => {
    const { phone, plan, network, pin, paymentMethod, accountNumber, userEmail } = req.body;
    const cost = dataPrices[plan];
    if (!cost) {
        return res.status(400).json({ message: 'Invalid plan' });
    }
    try {
        let user;
        if (usersCollection) {
            user = await usersCollection.findOne({ email: userEmail });
        } else {
            user = users.find(u => u.email === userEmail);
        }

        if (!user || user.pin !== pin) {
            return res.status(400).json({ message: 'Invalid PIN' });
        }
        if (user.balance < cost) {
            return res.status(400).json({ message: 'Insufficient balance' });
        }

        // Make real Flutterwave Bill Payment API call for data
        const payload = {
            country: 'NG',
            customer: phone,
            amount: cost,
            recurrence: 'ONCE',
            type: `${network.toUpperCase()}_DATA`,
            reference: `data_${Date.now()}_${user._id || 'local'}`
        };

        const response = await flw.Bills.create_bill(payload);

        if (response.status === 'success') {
            const newBalance = user.balance - cost;
            const transaction = { 
                type: 'Data Purchase', 
                amount: -cost, 
                date: new Date().toISOString(),
                reference: payload.reference,
                phone: phone,
                plan: plan
            };

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

            res.json({ 
                message: `${plan} data purchased for ${phone}`, 
                balance: newBalance,
                reference: payload.reference
            });
        } else {
            res.status(400).json({ message: response.message || 'Data purchase failed' });
        }
    } catch (err) {
        console.error('Data purchase error:', err);
        res.status(500).json({ message: 'Purchase failed: ' + err.message });
    }
});

app.post('/api/bet', async (req, res) => {
    const { stake, odds, pin, userEmail } = req.body;
    const cost = parseFloat(stake);
    try {
        let user;
        if (usersCollection) {
            user = await usersCollection.findOne({ email: userEmail });
        } else {
            user = users.find(u => u.email === userEmail);
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

const tvPrices = { 'Basic': 1000, 'Premium': 2500, 'Ultimate': 5000 };
const tvBillerCodes = { 
    'DSTV': 'BIL119',
    'GOTV': 'BIL120', 
    'Startimes': 'BIL121'
};

app.post('/api/tv', async (req, res) => {
    const { provider, plan, smartcard, pin, paymentMethod, accountNumber, userEmail } = req.body;
    const cost = tvPrices[plan];
    if (!cost) {
        return res.status(400).json({ message: 'Invalid plan' });
    }
    try {
        let user;
        if (usersCollection) {
            user = await usersCollection.findOne({ email: userEmail });
        } else {
            user = users.find(u => u.email === userEmail);
        }

        if (!user || user.pin !== pin) {
            return res.status(400).json({ message: 'Invalid PIN' });
        }
        if (user.balance < cost) {
            return res.status(400).json({ message: 'Insufficient balance' });
        }

        // Make real Flutterwave Bill Payment API call for TV
        const payload = {
            country: 'NG',
            customer: smartcard || '+2348000000000',
            amount: cost,
            recurrence: 'ONCE',
            type: provider.toUpperCase(),
            reference: `tv_${Date.now()}_${user._id || 'local'}`
        };

        const response = await flw.Bills.create_bill(payload);

        if (response.status === 'success') {
            const newBalance = user.balance - cost;
            const transaction = { 
                type: 'TV Subscription', 
                amount: -cost, 
                date: new Date().toISOString(),
                reference: payload.reference,
                provider: provider,
                plan: plan
            };

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

            res.json({ 
                message: `${plan} subscription for ${provider} activated`, 
                balance: newBalance,
                reference: payload.reference
            });
        } else {
            res.status(400).json({ message: response.message || 'TV subscription failed' });
        }
    } catch (err) {
        console.error('TV subscription error:', err);
        res.status(500).json({ message: 'Subscription failed: ' + err.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

module.exports = app;