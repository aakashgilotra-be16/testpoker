# Planning Poker - Production Deployment Guide

## 🚀 Live Application

- **Frontend (Netlify)**: https://random-frontend-abc456.netlify.app
- **Backend (Render)**: https://random-backend-xyz123.onrender.com

## 📋 Deployment Status

### ✅ Backend (Render)
- **Service**: planning-poker-backend
- **URL**: https://random-backend-xyz123.onrender.com
- **Health Check**: https://random-backend-xyz123.onrender.com/health
- **Status**: Ready for deployment

### ✅ Frontend (Netlify)
- **Site**: random-frontend-abc456
- **URL**: https://random-frontend-abc456.netlify.app
- **Status**: Ready for deployment

## 🔧 Deployment Instructions

### Backend Deployment (Render)

1. **Connect Repository**:
   - Go to [Render Dashboard](https://dashboard.render.com)
   - Click "New +" → "Web Service"
   - Connect your GitHub repository

2. **Configure Service**:
   - **Name**: `planning-poker-backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free

3. **Environment Variables**:
   ```
   NODE_ENV=production
   PORT=(auto-assigned by Render)
   ```

4. **Health Check**:
   - Path: `/health`
   - Enabled: Yes

### Frontend Deployment (Netlify)

1. **Connect Repository**:
   - Go to [Netlify Dashboard](https://app.netlify.com)
   - Click "Add new site" → "Import an existing project"
   - Connect your GitHub repository

2. **Build Settings**:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
   - **Node version**: `18`

3. **Environment Variables**:
   ```
   VITE_BACKEND_URL=https://random-backend-xyz123.onrender.com
   ```

## 🔍 Troubleshooting

### Common Issues

1. **Backend Cold Start (Render Free Tier)**:
   - Free tier sleeps after 15 minutes of inactivity
   - First request may take 30-60 seconds to wake up
   - Solution: Visit health check URL to wake up service

2. **Connection Timeouts**:
   - Enhanced socket configuration handles this automatically
   - Falls back to polling if WebSocket fails
   - Automatic reconnection with exponential backoff

3. **CORS Issues**:
   - Backend configured to accept requests from Netlify domain
   - Supports both `.netlify.app` and `.onrender.com` domains

### Health Checks

- **Backend Health**: https://random-backend-xyz123.onrender.com/health
- **Backend Test**: https://random-backend-xyz123.onrender.com/test
- **Frontend**: https://random-frontend-abc456.netlify.app

### Monitoring

The application includes:
- Connection status indicators
- Detailed error messages
- Automatic reconnection
- Transport fallback (WebSocket → Polling)
- Enhanced logging for debugging

## 🎯 Features

### ✅ Real-time Collaboration
- Socket.IO with polling/WebSocket fallback
- Automatic reconnection
- Live user presence
- Real-time voting updates

### ✅ Story Management
- Create, edit, delete stories
- Bulk import functionality
- Story points tracking
- Export to CSV/JSON

### ✅ Voting Sessions
- Multiple deck types (Fibonacci, Powers of 2, T-Shirt)
- Timer functionality
- Vote reveal/hide
- Session reset
- Statistics calculation

### ✅ User Management
- Guest access (display name only)
- Story Creator privileges
- Role-based permissions
- Online user tracking

## 🔐 Security

- Row Level Security (RLS) enabled
- CORS properly configured
- Environment variables for sensitive data
- Secure headers in Netlify configuration

## 📊 Performance

- CDN delivery via Netlify
- Asset caching (1 year for static assets)
- Gzip compression
- Optimized bundle size
- Lazy loading where appropriate

## 🚀 Next Steps

1. **Deploy Backend to Render**:
   - Update the backend URL in all files after deployment
   - Test health endpoint

2. **Deploy Frontend to Netlify**:
   - Update the frontend URL in backend CORS settings
   - Test the full application

3. **Custom Domain** (Optional):
   - Configure custom domain in Netlify
   - Update CORS settings in backend
   - Update Supabase redirect URLs

4. **Database Setup**:
   - Configure Supabase authentication
   - Add story creators to database
   - Set up redirect URLs

5. **Monitoring**:
   - Set up Render monitoring
   - Configure Netlify analytics
   - Monitor error rates

## 📞 Support

If you encounter issues:

1. Check the health endpoints
2. Review browser console for errors
3. Verify environment variables
4. Check Render/Netlify deployment logs
5. Ensure backend is awake (free tier limitation)

---

**Last Updated**: December 2024
**Version**: 1.0.0
**Status**: Ready for Deployment 🚀

## 📝 TODO: Update URLs After Deployment

After you deploy both services, please update these URLs:

1. **Backend URL**: Replace `https://random-backend-xyz123.onrender.com` with your actual Render URL
2. **Frontend URL**: Replace `https://random-frontend-abc456.netlify.app` with your actual Netlify URL

Files to update:
- `netlify.toml` (VITE_BACKEND_URL)
- `server/index.js` (CORS origins and self-ping URL)
- `.env.example`
- `README.md`