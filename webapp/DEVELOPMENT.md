# Development Guide

This guide covers local development setup, architecture decisions, and contribution guidelines for Kasgeld.

## Local Setup

### Prerequisites

- **Node.js**: 18.17 or higher
- **npm**: 9 or higher
- **Git**: Latest version

### Installation Steps

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd kasgeld/webapp
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   
   Create a `.env.local` file in the webapp directory:
   ```bash
   # NextAuth Configuration
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=<generate-with-openssl-rand-base64-32>

   # Azure Cosmos DB
   AZURE_COSMOS_ENDPOINT=https://<account>.documents.azure.com:443/
   AZURE_COSMOS_KEY=<primary-key>
   AZURE_COSMOS_DB_NAME=web-db
   
   # Cosmos DB Containers
   AZURE_COSMOS_CONTAINERS_TRIPS=trips
   AZURE_COSMOS_CONTAINERS_DESTINATIONS=destinations
   AZURE_COSMOS_CONTAINERS_ACTIVITIES=activities
   AZURE_COSMOS_CONTAINERS_EXPENSES=expenses
   AZURE_COSMOS_CONTAINERS_FILES=files
   AZURE_COSMOS_CONTAINERS_TIMELINE=timeline
   AZURE_COSMOS_CONTAINERS_BUDGETS=budgets

   # Email Service (Resend)
   RESEND_API_KEY=<api-key>
   RESEND_FROM_EMAIL=notifications@kasgeld.nl
   
   # Admin Configuration
   ADMIN_EMAIL=admin@example.com
   ```

   **Generate NEXTAUTH_SECRET:**
   ```bash
   openssl rand -base64 32
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

   Server runs at [http://localhost:3000](http://localhost:3000)

## Available Scripts

```bash
# Development server with hot reload
npm run dev

# Production build
npm run build

# Start production server
npm run start

# Run ESLint
npm run lint

# Type checking
npm run type-check

# Run tests (if configured)
npm run test
```

## Project Structure

```
webapp/
├── app/
│   ├── api/          # API routes (Next.js route handlers)
│   ├── beheer/       # Admin dashboard pages
│   ├── events/       # Event management pages
│   └── page.js       # Home page
├── components/       # React components
├── lib/             # Utilities
│   ├── cosmosdb.js   # Database connection
│   ├── auth-helpers.js
│   ├── email-service.js
│   └── utils.ts
├── public/          # Static assets
├── styles/          # Global styles
├── .env.local       # Local environment variables
└── README.md        # User documentation
```

## Development Workflow

### Creating a Feature

1. **Create a feature branch**
   ```bash
   git checkout -b feat/feature-name
   ```

2. **Make changes**
   - Follow existing code patterns
   - Keep components focused and reusable
   - Add TypeScript types when applicable

3. **Test locally**
   ```bash
   npm run build
   npm run lint
   ```

4. **Commit with clear messages**
   ```bash
   git commit -m "feat: add new feature description"
   ```

5. **Push and create pull request**
   ```bash
   git push origin feat/feature-name
   ```

### Code Style

- Use TypeScript for type safety
- Follow existing naming conventions
- Use Tailwind CSS for styling
- Use Radix UI components for UI consistency
- Keep functions small and focused

## API Development

### Creating an API Endpoint

1. **Create route file** at `app/api/path/route.js`

2. **Implement handlers**
   ```javascript
   export async function GET(req) {
     // GET logic
   }

   export async function POST(req) {
     // POST logic
   }
   ```

3. **Pattern: Authorization**
   ```javascript
   const session = await getServerSession(authOptions);
   if (!session) return res.status(401).json({ error: "Unauthorized" });
   ```

4. **Pattern: Database Access**
   ```javascript
   const container = await getContainer("containerName");
   const { resources } = await container.items.query(querySpec).fetchAll();
   ```

5. **Pattern: Error Handling**
   ```javascript
   try {
     // logic
   } catch (error) {
     console.error("Operation failed:", error);
     return new Response(
       JSON.stringify({ error: "User-friendly message" }), 
       { status: 500 }
     );
   }
   ```

## Database

### Cosmos DB Structure

- **Database**: `web-db`
- **Containers**: runs, users, swaps, payments, registration-requests, unit-assignments
- **Query Language**: SQL

### Key Data Models

**Run** (Financial cycle)
```javascript
{
  id: string,
  year: number,
  monthlyAmount: number,
  units: [{ name: "MM-YYYY", hand: number, assignedTo: userId, status: string }],
  createdAt: ISO8601
}
```

**User** (Participant)
```javascript
{
  id: string,
  email: string,
  firstname: string,
  lastname: string,
  displayname: string,
  role: string[],
  createdAt: ISO8601
}
```

**Payment** (Contribution record)
```javascript
{
  id: string,
  userId: string,
  runId: string,
  month: "MM-YYYY",
  amount: number,
  paid: boolean,
  paidDate: ISO8601,
  createdAt: ISO8601
}
```

## Email Notifications

Email templates are in `lib/email-service.js`. Each notification function:

1. Creates HTML and text content
2. Calls `/api/email/send-notification` endpoint
3. Uses Resend API for delivery

### Adding a New Notification

```javascript
export async function sendMyCustomEmail(options) {
  const { recipientEmail, recipientName, customData } = options;
  
  const htmlContent = `...`;
  const textContent = `...`;
  
  try {
    const response = await fetch(`${baseUrl}/api/email/send-notification`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipientEmail,
        recipientName,
        htmlContent,
        textContent,
        subject: "Email Subject",
      }),
    });
    return { success: response.ok };
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
}
```

## Common Tasks

### Debugging

1. **Enable verbose logging**: Add `console.log()` and check terminal output
2. **Check browser console**: F12 → Console tab
3. **Cosmos DB queries**: Use Azure Portal to test queries
4. **Email issues**: Check Resend dashboard for delivery status

### Testing an API Endpoint

```bash
curl -X POST http://localhost:3000/api/endpoint \
  -H "Content-Type: application/json" \
  -d '{"field": "value"}'
```

### Reset Database

```bash
# Clear specific container (in Azure Portal)
# Or delete and recreate via Cosmos DB management
```

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `NEXTAUTH_SECRET not set` | Generate with `openssl rand -base64 32` and add to `.env.local` |
| Database connection fails | Verify AZURE_COSMOS_ENDPOINT and AZURE_COSMOS_KEY in `.env.local` |
| Emails not sending | Check RESEND_API_KEY and email format in `.env.local` |
| Build fails with Turbopack errors | Run `rm -rf .next && npm run build` |
| Port 3000 already in use | Kill process or use `npm run dev -- -p 3001` |

## Performance Tips

- Use Next.js Image component for images
- Lazy load components with `dynamic()` import
- Implement pagination for large lists
- Cache database queries when appropriate
- Use `useCallback` for stable function references

## Security Considerations

- Always validate user input
- Check authorization before database operations
- Use environment variables for secrets (never commit)
- Validate API request origins
- Sanitize user-generated content
- Use HTTPS in production

## Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Azure Cosmos DB Docs](https://docs.microsoft.com/azure/cosmos-db/)
- [Resend Email Documentation](https://resend.com/docs)
- [NextAuth.js Docs](https://next-auth.js.org/)

## Getting Help

For issues or questions:
1. Check existing documentation in `/docs` folder
2. Search for similar issues in version control
3. Ask in team communication channels
4. Refer to linked external documentation
