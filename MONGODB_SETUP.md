# MongoDB Atlas Setup Guide

## Step 1: Create MongoDB Atlas Account

1. Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Click "Try Free" and create an account
3. Choose "Build a Database" → "FREE" (M0 Sandbox)
4. Choose your cloud provider and region (any is fine)
5. Name your cluster (e.g., "planning-poker")

## Step 2: Configure Database Access

### Create Database User:
1. Go to "Database Access" in the left sidebar
2. Click "Add New Database User"
3. Choose "Password" authentication
4. Username: `planningpoker` (or your choice)
5. Password: Generate a secure password (save it!)
6. Database User Privileges: "Read and write to any database"
7. Click "Add User"

### Configure Network Access:
1. Go to "Network Access" in the left sidebar
2. Click "Add IP Address"
3. Choose "Allow Access from Anywhere" (0.0.0.0/0)
   - For development: This is fine
   - For production: Add specific IPs
4. Click "Confirm"

## Step 3: Get Connection String

1. Go to "Database" in the left sidebar
2. Click "Connect" on your cluster
3. Choose "Connect your application"
4. Select "Node.js" and version "4.1 or later"
5. Copy the connection string

It will look like:
```
mongodb+srv://planningpoker:<password>@cluster0.abc123.mongodb.net/?retryWrites=true&w=majority
```

## Step 4: Configure Your Project

### Create .env file:
```bash
cd server
cp .env.example .env
```

### Edit .env file:
```env
MONGODB_URI=mongodb+srv://planningpoker:YOUR_ACTUAL_PASSWORD@cluster0.abc123.mongodb.net/planning-poker?retryWrites=true&w=majority
PORT=3001
NODE_ENV=development
```

**Important:** 
- Replace `YOUR_ACTUAL_PASSWORD` with the password you created
- Replace `cluster0.abc123` with your actual cluster name
- Add `/planning-poker` before the `?` to specify the database name

## Step 5: Install Dependencies and Test

```bash
# Install new dependencies
npm install

# Start the server
npm run dev
```

You should see:
```
✅ MongoDB Connected: cluster0.abc123.mongodb.net
🚀 Socket.IO server running on port 3001
```

## Alternative: Local MongoDB (Development Only)

If you prefer to run MongoDB locally:

1. Install MongoDB locally
2. Start MongoDB service
3. Use this in your .env:
```env
MONGODB_URI=mongodb://localhost:27017/planning-poker
```

## Troubleshooting

### "MongoNetworkError" or connection timeout:
- Check your Network Access settings in Atlas
- Verify your internet connection
- Try adding 0.0.0.0/0 to allowed IPs

### "Authentication failed":
- Double-check username/password in connection string
- Ensure special characters in password are URL-encoded

### "Database not found":
- MongoDB will create the database automatically when first data is inserted
- Make sure you have `/planning-poker` in your connection string

## Security Notes

- **Never commit .env files** to git (already in .gitignore)
- Use environment variables in production
- For production, restrict IP access to your server's IP only
