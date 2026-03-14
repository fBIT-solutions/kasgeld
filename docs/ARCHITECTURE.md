# Architecture Overview

Kasgeld is built on a modern serverless stack optimized for financial management and multi-tenant support.

## System Architecture

```
┌─────────────────┐
│   Next.js App   │ ← React Frontend + Server Components
├─────────────────┤
│   API Routes    │ ← Authentication, Business Logic
├─────────────────┤
│  Data Layer     │ ← Azure Cosmos DB
└─────────────────┘
     ↓
┌─────────────────────────────────┐
│  External Services              │
├─────────────────────────────────┤
│ • Resend (Email)                │
│ • Vercel Blob (File Storage)    │
│ • NextAuth (Authentication)     │
└─────────────────────────────────┘
```

## Technology Stack

### Frontend
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript, JSX
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI
- **State Management**: React Hooks + Context
- **Forms**: Controlled components with validation

### Backend (API Routes)
- **Runtime**: Node.js (Vercel Edge/Serverless)
- **Language**: JavaScript/TypeScript
- **Session Management**: NextAuth.js
- **Data Access**: Cosmos DB SDK for JavaScript
- **Email Service**: Resend API

### Data Storage
- **Primary Database**: Azure Cosmos DB (NoSQL)
- **Collections**:
  - `runs` - Financial cycles
  - `users` - Participants and admins
  - `payments` - Payment records
  - `swaps` - Unit swap requests
  - `registration-requests` - New user applications
  - `unit-assignments` - Draft/active assignments
  
- **File Storage**: Vercel Blob (future use)

### Authentication
- **Provider**: NextAuth.js
- **Session Store**: Server-side session management
- **Protected Routes**: Middleware-based protection

## Data Models

### Core Entity: Run

A Run represents a complete financial cycle.

```typescript
interface Run {
  id: string;
  year: number;
  monthlyAmount: number;        // Per hand/unit
  units: Unit[];                // All units in run
  createdAt: ISO8601;
  createdBy: string;            // User ID
  updatedAt: ISO8601;
}

interface Unit {
  name: "MM-YYYY";             // Month
  hand: number;                // Hand number (1-N)
  assignedTo?: string;         // User ID
  status: "open" | "pending" | "uitbetaald";
}
```

### User Model

```typescript
interface User {
  id: string;
  email: string;
  firstname: string;
  lastname: string;
  displayname: string;
  role: string[];              // ["user", "admin"]
  createdAt: ISO8601;
}
```

### Payment Model (Financial Record)

```typescript
interface Payment {
  id: string;
  userId: string;              // Who is paying
  runId: string;               // Which cycle
  month: "MM-YYYY";
  amount: number;              // (user's hands × monthlyAmount)
  handCount: number;
  paid: boolean;
  paidDate?: ISO8601;
  createdAt: ISO8601;
}
```

### Swap Request Model

```typescript
interface SwapRequest {
  id: string;
  status: "pending" | "approved" | "rejected";
  requesterUserId: string;     // Who requested
  targetedUserId: string;      // Who to swap with
  requesterUnitName: "MM-YYYY";
  targetedUnitName: "MM-YYYY";
  requesterUnitHand: number;
  targetedUnitHand: number;
  note: string;
  requestedDate: ISO8601;
}
```

## API Architecture

### Request Flow

```
Client Request
    ↓
[Next.js Middleware] → Auth Check, CORS
    ↓
Route Handler (app/api/...)
    ↓
[Permission Check] → Read from auth context
    ↓
[Business Logic] → Call Cosmos DB, Resend
    ↓
Response (JSON)
```

### Key Patterns

#### Authorization Pattern
```javascript
// 1. Get session
const session = await getServerSession(authOptions);
// 2. Extract user info
const userId = session?.user?.id;
// 3. Load resource
const resource = await getResource(id);
// 4. Check permission
if (!canAccess(resource, userId)) return 403;
// 5. Proceed
```

#### Database Access Pattern
```javascript
// 1. Get container
const container = await getContainer("containerName");
// 2. Query with parameters
const { resources } = await container.items.query({
  query: "SELECT * FROM c WHERE c.id = @id",
  parameters: [{ name: "@id", value: id }]
}).fetchAll();
// 3. Return or manipulate
return resources[0];
```

#### Error Handling
- Try/Catch blocks
- Graceful degradation (especially for email)
- User-friendly error messages
- Server-side logging

## Key Algorithms

### Payment Calculation

**Monthly Pot (Total Distribution)**:
```
Pot = (Σ all hand numbers in Run) × (monthly rate)
```

Example:
- Run has 10 hands total
- Monthly rate: €50/hand
- Pot = 10 × €50 = €500 (distributed to all)

**Individual Payment (Contribution)**:
```
Payment = (user's assigned hands) × (monthly rate)
```

Example:
- User has 3 hands assigned
- Monthly rate: €50/hand
- Payment = 3 × €50 = €150 (user pays)

### Unit Assignment Logic

1. Admin creates or edits Run units
2. Units can be assigned to users
3. When payment marked as "uitbetaald":
   - Unit status → "uitbetaald"
   - Next month's unit status → "open" (auto-transitions)
   - Email sent with total pot amount

### Swap Request Processing

1. User requests swap of units
2. Target user receives notification
3. Notification email with acceptance CTA
4. Admin approves/rejects in dashboard
5. If approved: units exchange assignedTo values
6. Notification sent to initiator

## Security Architecture

### Authentication
- NextAuth.js handles session tokens
- Secure HTTP-only cookies
- CSRF protection built-in

### Authorization
- Role-based access (admin vs user)
- Resource-level checks
- Permission helpers in `lib/auth-helpers.ts`

### Data Protection
- No PII in logs
- Sensetive data in environment variables
- HTTPS only (production)
- API rate limiting (configured at Vercel)

## Scalability Considerations

### Current Design
- Serverless functions (Vercel)
- NoSQL database (Cosmos DB) for horizontal scaling
- Stateless API design
- CDN-fronted static content

### Future Optimization Points
- Database indexing strategies
- Query result caching
- Background job queue for email (if volume increases)
- WebSocket support for real-time updates

## Deployment Architecture

### Development
- Local Next.js dev server
- Environment variables in `.env.local`

### Production
- Hosted on Vercel
- GitHub repository connected for CI/CD
- Cosmos DB in Azure
- Resend for email delivery
- Environment secrets configured in Vercel dashboard

## Integration Points

### Cosmos DB
- CRUD operations via Node.js SDK
- Connection pooling handled by SDK
- Partition keys optimize query performance

### Resend
- REST API for email delivery
- HTML + text content templates
- Open/click tracking available

### NextAuth.js
- Extensible provider system
- Custom credentials provider
- Secure session handling

## Error Handling Strategy

- **Client Errors (4xx)**: Input validation, missing auth
- **Server Errors (5xx)**: Database, email service failures
- **Graceful Degradation**: Failed emails don't break primary operations
- **Logging**: Server-side errors logged for debugging

## Performance Optimizations

1. **Image Optimization**: Next.js Image component
2. **Code Splitting**: Automatic route-based splitting
3. **Database Queries**: Pagination, filtering at DB level
4. **Email Optimization**: Async sending, no blocking
5. **Caching**: Browser cache headers, SWR for API calls

## Future Architecture Considerations

- **Microservices**: If payment/email complexity grows
- **Event-Driven**: Pub/sub for state changes
- **Real-time**: WebSocket support for live updates
- **Analytics**: Event tracking for insights
- **Backup Strategy**: Database replication, point-in-time recovery
