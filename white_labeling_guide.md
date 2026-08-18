# 🏷️ Voice OS — White-Labeling & Pre-Deployment Guide

This guide details everything you need to customize, rebrand, and configure your Voice OS platform before going to production, replacing all previous owner details and defaults with your own.

---

## 📋 Quick-Start Checklist

| Category | Key Files | What to Configure |
| :--- | :--- | :--- |
| **👑 Super Admin / Owner** | [`api/.env`](file:///d:/projects/voice-engine/api/.env) | `ADMIN_EMAILS` (your personal/work email) |
| **🎨 Branding & Logo** | [`ui/.env`](file:///d:/projects/voice-engine/ui/.env), [`ui/public/`](file:///d:/projects/voice-engine/ui/public) | Name, logo path, tagline, support email |
| **📬 Lead Inbox & SMTP** | [`api/.env`](file:///d:/projects/voice-engine/api/.env) | `LEAD_NOTIFICATION_EMAIL`, SMTP credentials |
| **🌐 URLs & DNS** | [`api/.env`](file:///d:/projects/voice-engine/api/.env), [`ui/.env`](file:///d:/projects/voice-engine/ui/.env) | Your API & UI domain names |
| **🎙️ Audio & Storage** | [`api/.env`](file:///d:/projects/voice-engine/api/.env) | MinIO or AWS S3 credentials |
| **🔒 Security & WebRTC** | [`api/.env`](file:///d:/projects/voice-engine/api/.env) | `TURN_SECRET`, `JWT_SECRET_KEY` |
| **💳 Billing (Optional)** | [`api/.env`](file:///d:/projects/voice-engine/api/.env) | PayU / Razorpay keys for client top-ups |

---

## 1. 👑 Super Admin & Owner Configuration

The platform uses the `ADMIN_EMAILS` variable. Any account created or logging in with an email listed here receives **instant superuser privileges and unlimited call credits**.

In [`api/.env`](file:///d:/projects/voice-engine/api/.env):

```env
# Comma-separated list of your admin emails
ADMIN_EMAILS="your-email@yourdomain.com,co-founder@yourdomain.com"
```

> [!TIP]
> When you sign up or log in using this email, your workspace is automatically granted **unlimited trial credits**, bypasses credit locks, and gives you access to the super admin panel at `/clients`.

---

## 2. 🎨 White-Labeling the Frontend UI

All user-visible branding is centralized in [`ui/src/lib/brand.ts`](file:///d:/projects/voice-engine/ui/src/lib/brand.ts) and driven by [`ui/.env`](file:///d:/projects/voice-engine/ui/.env).

In [`ui/.env`](file:///d:/projects/voice-engine/ui/.env):

```env
# 1. Product Name (displayed in navigation, titles, login screen)
NEXT_PUBLIC_BRAND_NAME="YourCompany Voice AI"

# 2. Custom Logo (place an SVG/PNG in ui/public/e.g. /my-logo.svg)
NEXT_PUBLIC_BRAND_LOGO="/brand-logo.svg"

# 3. Product Tagline (used for page titles & meta descriptions)
NEXT_PUBLIC_BRAND_TAGLINE="Next-generation conversational voice AI platform"

# 4. Support Email (shown on enterprise billing and manual review modals)
NEXT_PUBLIC_BRAND_SUPPORT_EMAIL="support@yourdomain.com"

# 5. Calendly / Booking Meeting Link (for "Book a meeting" CTAs)
NEXT_PUBLIC_BOOK_A_MEETING_URL="https://calendly.com/your-team/intro-call"

# 6. Documentation & Legal Links (Optional)
NEXT_PUBLIC_BRAND_DOCS_URL="https://docs.yourdomain.com"
NEXT_PUBLIC_BRAND_PRIVACY_URL="https://yourdomain.com/privacy"
NEXT_PUBLIC_BRAND_TERMS_URL="https://yourdomain.com/terms"

# 7. Community Badges (Set false to hide upstream GitHub star & Slack links)
NEXT_PUBLIC_BRAND_COMMUNITY="false"

# 8. Client-Safe Mode (Set true to hide backend model keys/telephony from regular clients)
NEXT_PUBLIC_CLIENT_MODE="false"
```

### Adding Custom Logos & Favicons
- Place your logo in [`ui/public/brand-logo.svg`](file:///d:/projects/voice-engine/ui/public/brand-logo.svg) or [`ui/public/logo.png`](file:///d:/projects/voice-engine/ui/public/).
- Place your favicon in [`ui/public/favicon.ico`](file:///d:/projects/voice-engine/ui/public/).

---

## 3. 📬 Lead Notifications & SMTP Email Delivery

When clients click **"Hire an Expert"**, submit an enterprise quote request, or fill out the onboarding questionnaire, submissions are emailed directly to your inbox.

In [`api/.env`](file:///d:/projects/voice-engine/api/.env):

```env
# Where you want to receive lead submissions
LEAD_NOTIFICATION_EMAIL="leads@yourdomain.com"

# SMTP Delivery (e.g. Resend, SendGrid, Amazon SES, or Gmail App Password)
SMTP_HOST="smtp.resend.com"
SMTP_PORT=587
SMTP_USER="resend"
SMTP_PASSWORD="re_your_api_key_here"
SMTP_FROM="notifications@yourdomain.com"
SMTP_STARTTLS="true"
SMTP_SSL="false"
```

---

## 4. 🌐 Production URLs & DNS Setup

When deploying to a custom domain (e.g. `app.yourdomain.com` and `api.yourdomain.com`):

### Backend ([`api/.env`](file:///d:/projects/voice-engine/api/.env))
```env
BACKEND_API_ENDPOINT="https://api.yourdomain.com"
UI_APP_URL="https://app.yourdomain.com"
```

### Frontend ([`ui/.env`](file:///d:/projects/voice-engine/ui/.env))
```env
BACKEND_URL="https://api.yourdomain.com"
NEXT_PUBLIC_BACKEND_URL="https://api.yourdomain.com"
NEXT_PUBLIC_NODE_ENV="production"
```

---

## 5. 🎙️ Media Storage (MinIO or AWS S3)

Audio recordings and call transcripts are stored in MinIO or S3.

### Option A: Using Built-in Containerized MinIO (Default)
In [`api/.env`](file:///d:/projects/voice-engine/api/.env):
```env
ENABLE_AWS_S3="false"
MINIO_ENDPOINT="minio:9000"
MINIO_PUBLIC_ENDPOINT="https://api.yourdomain.com/voice-audio" # or https://minio.yourdomain.com
MINIO_ACCESS_KEY="your-minio-admin-user"
MINIO_SECRET_KEY="generate-a-strong-secret-key-here"
MINIO_BUCKET="voice-audio"
MINIO_SECURE="true"
```

### Option B: Using AWS S3
In [`api/.env`](file:///d:/projects/voice-engine/api/.env):
```env
ENABLE_AWS_S3="true"
AWS_ACCESS_KEY_ID="AKIA..."
AWS_SECRET_ACCESS_KEY="your-aws-secret-key"
S3_BUCKET="your-voice-audio-bucket"
S3_REGION="us-east-1"
```

---

## 6. 🔒 Security & TURN WebRTC Server

For reliable WebRTC audio connections across restricted firewalls and corporate NATs:

In [`api/.env`](file:///d:/projects/voice-engine/api/.env):
```env
# Change this secret to a random string before production!
TURN_HOST="turn.yourdomain.com" # or your server IP/domain
TURN_SECRET="generate-a-random-long-secret-key"
TURN_PORT=3478
TURN_CREDENTIAL_TTL=86400
```

---

## 7. 💳 Payment Gateways (Optional)

If you plan to sell credit packs to your users via PayU or Razorpay:

In [`api/.env`](file:///d:/projects/voice-engine/api/.env):
```env
# PayU Gateway
PAYU_MERCHANT_KEY="your-payu-key"
PAYU_MERCHANT_SALT="your-payu-salt"
PAYU_IS_PROD="true"

# OR Razorpay Gateway
RAZORPAY_KEY_ID="rzp_live_..."
RAZORPAY_KEY_SECRET="your-razorpay-secret"
```

---

## 8. 🚀 Verification & Pre-Flight Checklist

Before launching:

1. [ ] **Environment Check**:
   - Have you replaced `ADMIN_EMAILS` in `api/.env` with your own email?
   - Have you updated `NEXT_PUBLIC_BRAND_NAME` and `NEXT_PUBLIC_BRAND_SUPPORT_EMAIL` in `ui/.env`?
2. [ ] **Build Check**:
   ```bash
   # Run in ui/
   npm run lint
   npm run build
   ```
3. [ ] **Test Database & First Superuser**:
   - Deploy backend & frontend.
   - Go to `https://app.yourdomain.com/auth/signup`.
   - Register with the email configured in `ADMIN_EMAILS`.
   - Confirm you see **Unlimited** credits in the dashboard.
