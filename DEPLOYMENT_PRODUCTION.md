# 🚀 RecoverPay AI - Deployment Guide

This guide covers deploying RecoverPay AI to production:
- **Frontend**: Vercel (vercel.app)
- **Backend**: Heroku or Railway
- **Database**: PostgreSQL (cloud-hosted)

---

## **Part 1: Frontend Deployment to Vercel**

### **Option A: Auto-Deploy from GitHub (Recommended)**

1. **Go to Vercel**: https://vercel.com
2. **Sign in with GitHub** (or create account)
3. **Click "New Project"**
4. **Import Repository**: `123Sumit-r/recoverpayai`
5. **Configure Project**:
   - Root Directory: `frontend`
   - Framework: `Vite`
   - Build Command: `npm run build`
   - Output Directory: `dist`
6. **Add Environment Variables**:
   - Key: `VITE_API_URL`
   - Value: `https://your-backend-url.com/api` (will update after backend deployment)
7. **Click Deploy** ✅

Your frontend will be live at: `https://recoverpayai.vercel.app/`

---

## **Part 2: Backend Deployment**

### **Option A: Heroku (Easy, Free Tier Ended)**

**Requirements:**
- Heroku account: https://heroku.com
- Heroku CLI installed

**Steps:**
```bash
# Login to Heroku
heroku login

# Create app
heroku create your-app-name

# Set environment variables
heroku config:set RAZORPAY_KEY_ID=your_key
heroku config:set RAZORPAY_KEY_SECRET=your_secret
heroku config:set RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
heroku config:set RESEND_API_KEY=your_resend_key
heroku config:set RESEND_FROM_EMAIL="RecoverPay AI <your-email@domain.com>"
heroku config:set RESEND_MODE=production
heroku config:set AI_API_KEY=your_groq_key
heroku config:set DB_HOST=your-db-host
heroku config:set DB_USER=your-db-user
heroku config:set DB_PASSWORD=your-db-password
heroku config:set DB_NAME=raz_ai
heroku config:set NODE_ENV=production

# Deploy
git push heroku main

# View logs
heroku logs --tail
```

Backend will be at: `https://your-app-name.herokuapp.com/`

---

### **Option B: Railway (Recommended - Free Credits)**

**Requirements:**
- Railway account: https://railway.app
- GitHub connected

**Steps:**
1. Go to Railway: https://railway.app
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Choose: `123Sumit-r/recoverpayai`
5. **Add Services**:
   - Select "Node.js" plugin
   - Root: `backend`
   - Start Command: `node server.js`
6. **Add PostgreSQL** service (Railway provides this)
7. **Set Environment Variables**:
   ```
   RAZORPAY_KEY_ID=your_key
   RAZORPAY_KEY_SECRET=your_secret
   RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
   RESEND_API_KEY=your_resend_key
   RESEND_FROM_EMAIL=RecoverPay AI <verified-email@domain.com>
   RESEND_MODE=production
   AI_API_KEY=your_groq_key
   NODE_ENV=production
   DB_HOST=${{POSTGRES.PGHOST}}
   DB_USER=${{POSTGRES.PGUSER}}
   DB_PASSWORD=${{POSTGRES.PGPASSWORD}}
   DB_NAME=${{POSTGRES.PGDATABASE}}
   DB_PORT=${{POSTGRES.PGPORT}}
   ```
8. **Deploy** ✅

Backend will be at: `https://your-railway-project.railway.app/`

---

### **Option C: AWS / Azure (Enterprise)**

For production-grade deployments, consider:
- AWS EC2 + RDS
- Azure App Service + Azure PostgreSQL
- Google Cloud Run

---

## **Part 3: Connect Frontend to Backend**

After backend deployment, update Vercel environment variable:

1. Go to Vercel Project Settings
2. Update `VITE_API_URL` to your backend URL
3. Redeploy frontend

Example:
```
VITE_API_URL=https://your-backend-on-railway.app/api
```

---

## **Part 4: Database Setup**

Your backend needs PostgreSQL. Options:

1. **Railway PostgreSQL** (easiest - included with Railway)
2. **Vercel Postgres** (integrated with Vercel)
3. **Heroku PostgreSQL** (if using Heroku backend)
4. **AWS RDS** or **Azure Database**

**Setup Database Schema:**
```bash
# Connect to your cloud database
psql postgresql://user:password@host:5432/raz_ai

# Run schema
\i backend/schema.sql
\i backend/schema-razorpay-enhancement.sql
```

---

## **Part 5: Webhook Configuration**

Update Razorpay webhook URL:

1. Go to Razorpay Dashboard: https://dashboard.razorpay.com/app/webhooks
2. Update webhook URL to:
   ```
   https://your-backend-url.com/api/webhooks/razorpay/payment
   ```
3. Verify it's receiving events

---

## **Part 6: Email Configuration (Production)**

For production emails via Resend:

1. Go to Resend: https://resend.com
2. **Verify a Domain** (your business domain)
3. Update backend `.env`:
   ```
   RESEND_FROM_EMAIL=RecoverPay AI <recovery@yourdomain.com>
   RESEND_MODE=production
   ```

---

## **Deployment Checklist**

- [ ] Frontend deployed to Vercel
- [ ] Backend deployed to Railway/Heroku
- [ ] PostgreSQL database connected
- [ ] Environment variables configured
- [ ] Razorpay webhook URL updated
- [ ] Email verified in Resend
- [ ] AI (Groq) API key configured
- [ ] Frontend → Backend connection tested
- [ ] Health check: `https://backend-url.com/api/health`
- [ ] Create test payment via Razorpay

---

## **Testing Deployment**

### **Frontend:**
```bash
curl https://your-frontend.vercel.app/
```

### **Backend Health:**
```bash
curl https://your-backend.railway.app/api/health
```

Expected response:
```json
{
  "success": true,
  "message": "RecoverPay AI backend is running"
}
```

---

## **Troubleshooting**

**Frontend shows "Cannot connect to backend"**
- Check `VITE_API_URL` in Vercel environment variables
- Verify backend is running: `curl https://backend-url/api/health`
- Check CORS settings in backend

**Backend won't start**
- Check logs: `heroku logs --tail` or Railway logs
- Verify all environment variables are set
- Ensure database connection is working

**Emails not sending**
- Verify Resend API key is correct
- Confirm domain/email is verified in Resend
- Check `RESEND_MODE=production` is set

**Webhooks not received**
- Verify webhook URL in Razorpay dashboard
- Test webhook from Razorpay dashboard
- Check backend logs for webhook events

---

## **Support**

- Vercel Docs: https://vercel.com/docs
- Railway Docs: https://docs.railway.app
- Razorpay Docs: https://razorpay.com/docs/
- Resend Docs: https://resend.com/docs
