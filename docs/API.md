# API Documentation

Kasgeld's API follows REST conventions and returns JSON responses. All endpoints require authentication unless otherwise noted.

## Authentication

All API endpoints (except `/api/auth/*`) require an active session via NextAuth.js.

**Session Management**:
```
Browser sends HTTP-only cookie with session token
→ Middleware validates token
→ Request proceeds with authenticated session
```

## Standard Response Format

### Success Response
```json
{
  "data": {},        // Single object or array
  "message": "Success message (optional)"
}
```

### Error Response
```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "status": 400
}
```

## Status Codes

| Code | Meaning |
|------|---------|
| 200 | OK - Request succeeded |
| 201 | Created - Resource created |
| 204 | No Content - Success, no response body |
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - No session |
| 403 | Forbidden - No permission |
| 404 | Not Found - Resource missing |
| 409 | Conflict - State conflict |
| 500 | Server Error - Unexpected error |

## Endpoints by Domain

### Authentication (`/api/auth/`)

#### POST /api/auth/callback/credentials
Register/authenticate a user.

**Request**:
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response**:
```json
{
  "ok": true,
  "user": {
    "id": "user-123",
    "email": "user@example.com"
  }
}
```

---

### Runs (`/api/runs/`)

#### GET /api/runs
List all runs (with pagination).

**Query Parameters**:
```
?page=1&limit=10
```

**Response**:
```json
{
  "data": [
    {
      "id": "run-2024",
      "year": 2024,
      "monthlyAmount": 50,
      "units": [...],
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ],
  "total": 5,
  "page": 1,
  "limit": 10
}
```

#### POST /api/runs
Create a new run. **Admin only**.

**Request**:
```json
{
  "year": 2024,
  "monthlyAmount": 50,
  "units": [
    {
      "name": "01-2024",
      "hand": 1,
      "assignedTo": null
    }
  ]
}
```

**Response**: `201 Created`
```json
{
  "data": { "id": "run-newid", /* ... */ }
}
```

#### GET /api/runs/:id
Get run details.

**Response**:
```json
{
  "data": {
    "id": "run-id",
    "year": 2024,
    "monthlyAmount": 50,
    "units": [
      {
        "name": "01-2024",
        "hand": 1,
        "assignedTo": "user-123",
        "status": "open"
      }
    ]
  }
}
```

#### PUT /api/runs/:id
Update run settings. **Admin only**.

**Request**:
```json
{
  "monthlyAmount": 55
}
```

**Response**: `200 OK` (updated run object)

---

### Units (`/api/units/`)

#### GET /api/units/:id
Get unit assignment details.

**Response**:
```json
{
  "data": {
    "id": "unit-id",
    "name": "01-2024",
    "hand": 1,
    "assignedTo": "user-id",
    "status": "open"
  }
}
```

#### PUT /api/units/:id
Update unit assignment. **Admin only**.

**Request**:
```json
{
  "assignedTo": "user-123"
}
```

**Response**: `200 OK` (updated unit)

#### PATCH /api/units/:id/status
Update unit payment status. **Admin only**.

**Request**:
```json
{
  "newStatus": "uitbetaald"
}
```

**Behavior**:
- Sets unit status to "uitbetaald"
- Creates payment record for assigned user
- Sends confirmation email with pot amount
- Transitions next month's unit to "open" (if applicable)
- Creates automatic payment record

**Response**:
```json
{
  "data": {
    "unitId": "unit-id",
    "status": "uitbetaald",
    "paymentCreated": true,
    "emailSent": true
  }
}
```

---

### Payments (`/api/payments/`)

#### GET /api/payments
List user's payments (all roles).

**Query**:
```
?runId=run-123&month=01-2024
```

**Response**:
```json
{
  "data": [
    {
      "id": "payment-1",
      "userId": "user-123",
      "runId": "run-id",
      "month": "01-2024",
      "amount": 150,
      "handCount": 3,
      "paid": false,
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### POST /api/payments
Create payment record. **Admin only**.

**Request**:
```json
{
  "userId": "user-123",
  "runId": "run-id",
  "month": "01-2024",
  "amount": 150,
  "handCount": 3
}
```

**Response**: `201 Created`

#### PATCH /api/payments/:id
Mark payment as paid. **Admin only**.

**Request**:
```json
{
  "paid": true
}
```

**Behavior**:
- Sets `paid = true` and `paidDate = now`
- Sends confirmation email with pot amount
- Triggers automatic transition of current month's units

**Response**:
```json
{
  "data": {
    "id": "payment-id",
    "paid": true,
    "paidDate": "2024-01-15T10:30:00Z",
    "emailSent": true
  }
}
```

---

### Swap Requests (`/api/swaps/`)

#### GET /api/swaps
List swap requests.

**Query**:
```
?status=pending&userId=user-123
```

**Statuses**: `pending`, `approved`, `rejected`

**Response**:
```json
{
  "data": [
    {
      "id": "swap-1",
      "status": "pending",
      "requesterUserId": "user-1",
      "targetedUserId": "user-2",
      "requesterUnitName": "01-2024",
      "requesterUnitHand": 1,
      "targetedUnitName": "02-2024",
      "targetedUnitHand": 2,
      "note": "Need early month",
      "requestedDate": "2024-01-10T00:00:00Z"
    }
  ]
}
```

#### POST /api/swaps
Create new swap request.

**Request**:
```json
{
  "targetedUserId": "user-2",
  "requesterUnitName": "01-2024",
  "requesterUnitHand": 1,
  "targetedUnitName": "02-2024",
  "targetedUnitHand": 2,
  "note": "Optional reason"
}
```

**Behavior**:
- Creates swap request
- Sends notification email to targeted user with approval link
- Shows in targeted user's dashboard

**Response**: `201 Created`

#### PATCH /api/swaps/:id
Approve or reject swap. **Admin only**.

**Request**:
```json
{
  "status": "approved"  // or "rejected"
}
```

**Behavior (if approved)**:
- Swaps unit assignments
- Sends confirmation to both users
- Updates statusto "approved"

**Response**: `200 OK`

---

### Swap Review (`/api/swaps/:id/review`)

#### POST
Admin reviews (approves/rejects) swap.

**Request**:
```json
{
  "decision": "approve"  // or "reject"
}
```

**Response**:
```json
{
  "data": {
    "swapId": "swap-id",
    "status": "approved",
    "unitsSwapped": true,
    "emailsSent": 2
  }
}
```

---

### Registration Requests (`/api/registration-requests/`)

#### GET /api/registration-requests
List pending registrations. **Admin only**.

**Response**:
```json
{
  "data": [
    {
      "id": "req-1",
      "email": "newuser@example.com",
      "firstname": "John",
      "lastname": "Doe",
      "requestedDate": "2024-01-10T00:00:00Z",
      "reviewed": false
    }
  ]
}
```

#### POST /api/registration-requests
User submits registration request.

**Request**:
```json
{
  "email": "newuser@example.com",
  "firstname": "John",
  "lastname": "Doe",
  "password": "secure-password"
}
```

**Behavior**:
- Validates email format
- Checks if already registered
- Creates registration request
- Sends admin notification email
- User must wait for approval

**Response**: `201 Created`

#### PATCH /api/registration-requests/:id
Admin approves or rejects.

**Request**:
```json
{
  "approved": true
}
```

**Behavior (if approved)**:
- Creates User account
- Sends welcome email
- Marks request as reviewed

**Response**: `200 OK`

---

### Users (`/api/users/`)

#### GET /api/users
List all users. **Admin only**.

**Response**:
```json
{
  "data": [
    {
      "id": "user-1",
      "email": "user@example.com",
      "firstname": "John",
      "lastname": "Doe",
      "displayname": "John Doe",
      "role": ["user"]
    }
  ]
}
```

#### GET /api/users/:id
Get user profile.

**Response**:
```json
{
  "data": {
    "id": "user-id",
    "email": "user@example.com",
    "firstname": "John",
    "lastname": "Doe",
    "displayname": "John Doe",
    "role": ["user"]
  }
}
```

#### PATCH /api/users/:id
Update user profile.

**Request**:
```json
{
  "firstname": "Jonathan",
  "lastname": "Doe"
}
```

**Response**: `200 OK` (updated user)

---

### Email Notifications (`/api/email/`)

#### POST /api/email/send-notification
**Internal use only** - called by other endpoints.

**Request**:
```json
{
  "to": "user@example.com",
  "subject": "Email Subject",
  "htmlContent": "<html>...</html>",
  "textContent": "Plain text version"
}
```

**Response**:
```json
{
  "data": {
    "id": "email-message-id",
    "from": "noreply@kasgeld.nl",
    "to": "user@example.com",
    "created_at": "2024-01-10T10:30:00Z"
  }
}
```

---

## Common Workflows

### Paying a Unit (Admin)

```
1. PATCH /api/units/:unitId/status { newStatus: "uitbetaald" }
   ↓ Sends email to assigned user with total pot amount
   ↓ Creates payment record
   ↓ Transitions next month's unit to "open"

2. Response includes:
   - unitId
   - status: "uitbetaald"
   - paymentCreated: true
   - emailSent: true
```

### Approving New User

```
1. GET /api/registration-requests
   ↓ Find pending request

2. PATCH /api/registration-requests/:id { approved: true }
   ↓ Creates User account
   ↓ Sends welcome email
   ↓ User can now login

3. Response confirms user created and email sent
```

### Processing Swap Request

```
1. User requests swap:
   POST /api/swaps { targetedUserId, requesterUnitName, ... }
   ↓ Notification email to targeted user

2. Admin reviews request:
   POST /api/swaps/:id/review { decision: "approve" }
   ↓ Units are swapped
   ↓ Emails sent to both users
```

## Error Examples

### Unauthorized
```json
{
  "error": "Unauthorized",
  "status": 401
}
```

### Forbidden (Permission Denied)
```json
{
  "error": "You don't have permission to access this resource",
  "status": 403
}
```

### Validation Error
```json
{
  "error": "Invalid email format",
  "status": 400,
  "field": "email"
}
```

### Conflict (Can't perform action)
```json
{
  "error": "Unit already assigned and paid",
  "status": 409
}
```

## Rate Limiting

Currently no explicit rate limiting. Consider implementing:
- 100 requests per minute per IP
- 1000 requests per hour per user

## Pagination

Endpoints supporting pagination:
- GET /api/runs
- GET /api/payments
- GET /api/swaps
- GET /api/users
- GET /api/registration-requests

**Query Parameters**:
```
?page=1         // Default: 1
&limit=10       // Default: 10, Max: 100
&sort=-createdAt  // Default: ascending
```

## Versions

Current API version: **v1** (implied)

No versioning scheme implemented yet. When breaking changes occur, consider:
- Accept version header: `X-API-Version: 1`
- URL versioning: `/api/v1/runs`
- Feature flags for gradual rollout
