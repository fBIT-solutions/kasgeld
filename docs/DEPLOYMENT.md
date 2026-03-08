# Deployment Guide

This document covers deploying Kasgeld to production on Vercel and configuring external services.

## Pre-Deployment Checklist

- [ ] All tests passing: `npm run test`
- [ ] Build succeeds: `npm run build`
- [ ] Environment variables configured (see below)
- [ ] Database initialized with schema
- [ ] Email service (Resend) account activated
- [ ] Authentication secrets generated
- [ ] Staging deployed and tested

## Deployment Platforms

### Vercel (Recommended)

Kasgeld is optimized for Vercel's serverless platform.

**Advantages**:
- Automatic CI/CD from GitHub
- Serverless functions scale automatically
- Edge network for fast content delivery
- Built-in Next.js support
- Environment secrets management

**Disadvantages**:
- Cost scales with usage
- Limited execution time per function (10-15 seconds)
- Database queries must complete quickly

## Environment Setup

### Production Environment Variables

Create these in Vercel dashboard under **Settings → Environment Variables**.

**Critical (Must be set)**:
```env
# NextAuth
NEXTAUTH_SECRET=<generate with: openssl rand -base64 32>
NEXTAUTH_URL=https://your-domain.com

# Azure Cosmos DB
AZURE_COSMOS_ENDPOINT=https://your-cosmos.documents.azure.com:443/
AZURE_COSMOS_KEY=<primary-key-from-azure>
AZURE_COSMOS_DB_NAME=your-db-name

# Container Names
AZURE_COSMOS_CONTAINERS_RUNS=runs
AZURE_COSMOS_CONTAINERS_USERS=users
AZURE_COSMOS_CONTAINERS_PAYMENTS=payments
AZURE_COSMOS_CONTAINERS_SWAPS=swaps
AZURE_COSMOS_CONTAINERS_REGISTRATION_REQUESTS=registration-requests
AZURE_COSMOS_CONTAINERS_UNIT_ASSIGNMENTS=unit-assignments

# Email Service
RESEND_API_KEY=<from resend.com dashboard>
FROM_EMAIL=noreply@your-domain.com
ADMIN_EMAIL=admin@your-domain.com

# Optional (Feature flags)
ENABLE_REGISTRATION=true
```

### Generating NEXTAUTH_SECRET

```bash
# Linux/macOS
openssl rand -base64 32

# Windows (PowerShell)
[Convert]::ToBase64String((1..32 | ForEach-Object {0..255} | Get-Random | ForEach-Object {[byte]$_}))

# Or use online tool: https://github.com/nextauthjs/next-auth/issues/1158
```

**Store securely** - never commit to repository.

## Azure Cosmos DB Setup

### Database Creation

1. Log in to [Azure Portal](https://portal.azure.com)
2. Create **Azure Cosmos DB** account
3. Select **NoSQL** API
4. Choose region close to your users
5. Configure failover regions for HA

### Container Creation

Create these collections in your Cosmos DB database:

```javascript
// Connect to database and create containers
const containers = [
  {
    id: "runs",
    partitionKey: { paths: ["/id"] },
    indexingPolicy: { // Speed up queries
      includedPaths: [
        { path: "/*" }
      ],
      excludedPaths: [
        { path: "/timestamp/*" }
      ]
    }
  },
  {
    id: "users",
    partitionKey: { paths: ["/id"] }
  },
  {
    id: "payments",
    partitionKey: { paths: ["/runId"] }
  },
  {
    id: "swaps",
    partitionKey: { paths: ["/id"] }
  },
  {
    id: "registration-requests",
    partitionKey: { paths: ["/id"] }
  },
  {
    id: "unit-assignments",
    partitionKey: { paths: ["/runId"] }
  }
];

// Create each container
for (const container of containers) {
  try {
    const { container: createdContainer } = await database.containers.create(container);
    console.log(`Container ${container.id} created`);
  } catch (error) {
    if (error.code !== 409) throw error; // 409 = already exists
    console.log(`Container ${container.id} already exists`);
  }
}
```

### Initial Data

Insert initial admin user:

```javascript
const adminUser = {
  id: "admin-user-id",
  email: "admin@your-domain.com",
  firstname: "Admin",
  lastname: "User",
  displayname: "Admin User",
  role: ["admin", "user"],
  createdAt: new Date().toISOString()
};

const { resource: created } = await usersContainer.items.create(adminUser);
console.log("Admin user created:", created.id);
```

### Key Indexing Strategy

For production performance, add these indexes:

```javascript
// In Azure Portal → Container → Settings → Indexing Policy

{
  "indexingMode": "consistent",
  "automatic": true,
  "includedPaths": [
    {
      "path": "/*"
    }
  ],
  "excludedPaths": [
    {
      "path": "/\"_etag\"/?",
      "path": "/createdAt/?"  // Timestamp doesn't need indexing
    }
  ],
  "compositeIndexes": [
    [
      { "path": "/runId", "order": "ascending" },
      { "path": "/createdAt", "order": "descending" }
    ]
  ]
}
```

## Resend Email Configuration

### Account Setup

1. Create account at [resend.com](https://resend.com)
2. Verify sending domain (or use Resend subdomain)
3. Generate API key
4. Add to environment: `RESEND_API_KEY`

### Domain Verification

For custom domain (e.g., noreply@your-domain.com):

1. In Resend dashboard: **Domains**
2. Add your domain
3. Update DNS records:
   ```
   CNAME: o1.resend.dev (MX records)
   TXT: resend-verification-key
   ```
4. Wait for DNS propagation (24-48 hours)

### Email Testing

Test locally before deploying:

```bash
# .env.local
RESEND_API_KEY=re_test_xxxxx

# npm run dev
# Send test email via /api/email/send-notification
```

## Vercel Deployment

### GitHub Integration

1. Push code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Import project from GitHub
4. Vercel auto-detects Next.js
5. Configure environment variables
6. Set build command: `npm run build`
7. Set output directory: `.next`

### First Deployment

```
1. Connect GitHub repository
2. Add all environment variables to Vercel
3. Click "Deploy"
4. Wait for build to complete (~3 minutes)
5. Vercel provides production URL
6. Configure NEXTAUTH_URL to new domain
```

### Continuous Deployment

After initial setup, every push to main branch:

```
main branch push
  ↓
GitHub webhook triggers Vercel
  ↓
npm install
  ↓
npm run build (production optimized)
  ↓
Deploy to edge network
  ↓
DNS updated automatically
```

### Rollback

If deployment fails:

```
1. Navigate to Deployment History in Vercel
2. Click on previous successful deployment
3. Click "Redeploy"
4. Previous version goes live instantly
```

## Database Migration

### Migrating Data from Development

```bash
# Export from local Cosmos DB
npm run export-data

# Import to production
npm run import-data --target=production
```

### Backup Strategy

1. **Weekly backups** in Azure Portal
   - Storage → Snapshots
   - Keep 4 weeks of backups

2. **Point-in-time recovery** enabled
   - Cosmos DB → Settings → Backup Policy
   - Set retention to 30 days

3. **Manual exports** (monthly)
   ```bash
   npm run export-cosmos-data > backup-2024-01-15.json
   # Commit to secure repository or cloud storage
   ```

## Performance Optimization

### Build Optimization

Vercel automatically:
- Minifies JavaScript
- Optimizes images
- Tree-shakes unused code

To further optimize:

```javascript
// next.config.js
module.exports = {
  productionBrowserSourceMaps: false,  // Disable source maps
  swcMinify: true,                     // SWC minifier (faster)
  compress: true,                      // GZIP compression
  poweredByHeader: false,              // Hide Next.js version
};
```

### Database Query Optimization

Cosmos DB is billed by RU (Request Units) consumed:

```javascript
// 👎 Bad: Reads entire container
const { resources: allPayments } = await payments.items.query(
  "SELECT * FROM c"
).fetchAll();

// 👍 Good: Filter at database level
const { resources: userPayments } = await payments.items.query(
  "SELECT * FROM c WHERE c.userId = @userId",
  { parameters: [{ name: "@userId", value: userId }] }
).fetchAll();

// 👍 Better: Pagination to limit results
const { resources, continuationToken } = await payments.items.query(
  "SELECT * FROM c WHERE c.userId = @userId ORDER BY c.createdAt DESC OFFSET @offset LIMIT @limit",
  {
    parameters: [
      { name: "@userId", value: userId },
      { name: "@offset", value: (page - 1) * limit },
      { name: "@limit", value: limit }
    ]
  }
).fetchAll();
```

### Caching Strategy

```javascript
// next.config.js - Cache static assets
{
  headers: [
    {
      source: "/images/:path*",
      headers: [
        {
          key: "Cache-Control",
          value: "public, max-age=31536000, immutable"  // 1 year
        }
      ]
    },
    {
      source: "/api/:path*",
      headers: [
        {
          key: "Cache-Control",
          value: "private, no-store"  // No cached
        }
      ]
    }
  ]
}
```

## Monitoring & Logging

### Vercel Analytics

Enable in Vercel dashboard:

1. **Analytics** tab
2. Enable Web Analytics
3. View real-time metrics:
   - Page views
   - Response times
   - Error rates

### Error Tracking

```javascript
// lib/error-tracking.js
export function logError(error, context = {}) {
  console.error({
    timestamp: new Date().toISOString(),
    message: error.message,
    stack: error.stack,
    context
  });

  // Send to error tracking service (Sentry, LogRocket, etc.)
  if (process.env.NODE_ENV === "production") {
    // Optional: sendToErrorService(error, context);
  }
}
```

### Database Monitoring

In Azure Portal:

1. **Cosmos DB → Insights**
2. Monitor Request Unit consumption
3. Review slow queries
4. Alert on RU spike

## Security Hardening

### HTTPS & HSTS

Vercel handles HTTPS automatically.

For extra security:

```javascript
// next.config.js
{
  headers: [
    {
      source: "/:path*",
      headers: [
        {
          key: "Strict-Transport-Security",
          value: "max-age=31536000; includeSubDomains"
        }
      ]
    }
  ]
}
```

### CORS Headers

```javascript
// API routes (if needed)
res.setHeader("Access-Control-Allow-Origin", process.env.NEXTAUTH_URL);
res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE");
res.setHeader("Access-Control-Allow-Headers", "Content-Type");
```

### Environment Secret Rotation

```bash
# Generate new secrets (quarterly)
openssl rand -base64 32

# Update in Vercel dashboard
# Redeploy to activate
# Monitor for errors
```

### Database Network Security

In Azure Portal:

1. **Cosmos DB → Networking**
2. Enable firewall
3. Allow only Vercel IP ranges
4. Disable public endpoint if possible

## Troubleshooting Deployment

### Build Fails

```
Error: Cannot find module 'X'
```

**Solution**:
```bash
# Rebuild dependencies
rm -rf node_modules package-lock.json
npm install

# Push and redeploy
git add . && git commit -m "chore: rebuild deps" && git push
```

### Environment Variables Not Applied

```
ReferenceError: process.env.NEXTAUTH_SECRET is undefined
```

**Solution**:
1. Verify variables in Vercel dashboard
2. Variables must be added BEFORE deployment
3. If added after, redeploy: **Deployments → Redeploy**

### Database Connection Timeout

```
Error: Connection timeout after 30s
```

**Solution**:
1. Verify IP whitelisting in Cosmos DB firewall
2. Check AZURE_COSMOS_ENDPOINT format
3. Verify AZURE_COSMOS_KEY is correct (not expired)
4. Check network latency to Cosmos DB

### Email Not Sending

```
Error: 401 Unauthorized from Resend
```

**Solution**:
1. Verify RESEND_API_KEY in environment (not expired)
2. Check email domain verification in Resend dashboard
3. Verify FROM_EMAIL matches verified domain
4. Test with `/api/email/send-notification` endpoint

## Post-Deployment

### Verify Functionality

```bash
# Test critical paths
1. Sign up: POST /api/registration-requests
2. Login: POST /api/auth/callback/credentials
3. List runs: GET /api/runs
4. Update payment: PATCH /api/payments/:id
5. Request swap: POST /api/swaps

# Check logs
1. Vercel Functions → Logs
2. Check for errors in last 24 hours
3. Monitor RU consumption in Azure
```

### Notify Users

```
Subject: Kasgeld is now live!

Hi,

Kasgeld is now available at: https://your-domain.com

What's new:
- Feature 1
- Feature 2

Questions? Email: support@your-domain.com
```

## Performance Benchmarks

Target metrics for production:

| Metric | Target |
|--------|--------|
| TTFB (Time to First Byte) | < 200ms |
| First Contentful Paint | < 1s |
| Page Load (Lighthouse) | > 90 |
| API Response Time | < 300ms |
| Error Rate | < 0.1% |
| Database RU/s | < 1000 |

Monitor these in Vercel Analytics.

## Scaling Strategy

If traffic grows:

### Phase 1: Optimize (Current)
- Index databases
- Compress assets
- Enable caching
- RU cost: ~$50-200/month

### Phase 2: Scale (If needed)
- Add read replicas to Cosmos DB
- Increase query throughput
- Add CDN for static content
- RU cost: ~$200-500/month

### Phase 3: Restructure (If needed)
- Microservices architecture
- Background job queue
- Real-time pub/sub
- RU cost: $500+/month

Cost monitoring:
```
Vercel: Usage-based (~$0.50 per million requests)
Cosmos DB: RU pricing (~$0.25 per 100 RUs)
Resend: Per email (~$0.0001 per email, 50K free per month)
```
