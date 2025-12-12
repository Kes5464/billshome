# billsHOME MongoDB Setup

## Quick Setup (5 minutes)

### 1. Create Free MongoDB Atlas Account
1. Go to https://www.mongodb.com/cloud/atlas/register
2. Sign up (free tier)
3. Create a cluster (free M0 tier)
4. Wait for cluster to deploy (~3 minutes)

### 2. Get Your MongoDB Connection String
1. Click "Connect" on your cluster
2. Choose "Connect your application"
3. Copy the connection string (looks like: `mongodb+srv://username:password@cluster.mongodb.net/`)
4. Replace `<password>` with your actual password

### 3. Add to Vercel Environment Variables
Go to Vercel → Settings → Environment Variables → Add:
- **Key**: `MONGODB_URI`
- **Value**: Your connection string (e.g., `mongodb+srv://user:pass@cluster.mongodb.net/billshome`)

### 4. Whitelist Vercel IP
In MongoDB Atlas:
1. Network Access → Add IP Address
2. Choose "Allow Access from Anywhere" (0.0.0.0/0)
3. Save

### 5. Redeploy
Vercel will auto-redeploy with new env var.

## Your billsHOME is now fully connected! 🎉

- Frontend: https://billshome-nzwq.vercel.app
- Backend: MongoDB Atlas (cloud database)
- Payments: Flutterwave

## Test Registration:
1. Visit your app
2. Click Register
3. Fill in details
4. Should work now!
