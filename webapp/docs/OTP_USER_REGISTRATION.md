# OTP User Registration System

## Overview

Dit systeem stelt admins in staat om nieuwe gebruikers aan te maken waarbij elke gebruiker een:
- **OTP code** (6 cijfers) - gelddig voor 24 uur
- **Temporary wachtwoord** - gegenereerd bij aanmaak
- **Welkomstmail** - met alle inloggegevens

krijgt.

Bij eerste inlog moet de gebruiker:
1. Email + temporary wachtwoord invoeren
2. OTP code verifiëren (uit de email)
3. Nieuw wachtwoord instellen

## Workflow

### 1. Admin maakt gebruiker aan

**Component:** `UserCreationForm` 
**Locatie:** Settings/Admin panel
**API:** `POST /api/users/create-user`

```javascript
// Admin vult in:
{
  email: "jan@example.com",
  firstname: "Jan",
  lastname: "Jansen",
  displayname: "Jan J.",
  role: "participant" // or "admin", "staff", etc.
}

// Systeem genereert:
{
  otp: "123456" // + hash opgeslagen in DB
  tempPassword: "a1b2c3d4e5f6" // + hash opgeslagen in DB
  mustChangePassword: true
  otpExpires: "2026-03-07T12:34:56Z" // 24 uur later
}

// Email verzonden met:
- Email
- Temporary wachtwoord
- OTP code
```

### 2. Gebruiker logt in met welkomstmail

**Component:** `SignInForm` (v2)
**Stap 1: Credentials**

```
Email: jan@example.com
Wachtwoord: a1b2c3d4e5f6 (from email)
```

**API Check:** `/api/auth/signin` (NextAuth)
- Valideert email + password
- Checkt of user OTP code has

**if hasOTP → go to STEP 2**

### 3. Gebruiker voert OTP in

**Stap 2: OTP Verification**

```
OTP Code: 123456
```

**API:** `POST /api/auth/verify-otp`
- Haalt user op
- Valideert OTP tegen stored hash
- Checkt expiration
- Returnt `mustChangePassword: true`

**if mustChangePassword → go to STEP 3**

### 4. Gebruiker stelt nieuw wachtwoord in

**Stap 3: Password Change**

```
New Password: MySecurePassword123!
Confirm: MySecurePassword123!
```

**API:** `POST /api/auth/change-password`
- Valideert password strength (min 8 chars)
- Hasht new password
- Updates user:
  - `password: newHashedPassword`
  - `otp: null` (clear OTP)
  - `otpExpires: null`
  - `mustChangePassword: false`
  - `passwordChangedAt: now()`

**Success → Redirect to dashboard**

## File Structure

```
app/api/
├── users/
│   └── create-user/
│       └── route.js          # Admin creates user + sends email
├── auth/
│   ├── verify-otp/
│   │   └── route.js          # Verify OTP code
│   └── change-password/
│       └── route.js          # Set new password after OTP
└── email/
    ├── send-welcome/
    │   └── route.js          # Send welcome email via Resend
    └── send-payment-reminder/
        └── route.js          # (existing)

components/
├── user-creation-form.jsx    # Admin form to create users
├── signin_form_v2.jsx        # 3-step login form
└── settings.js               # Settings page (add form here)

lib/
└── email-service.js          # sendWelcomeEmail() function
```

## Database Schema Updates

User document now includes:

```javascript
{
  id: "uuid",
  email: "jan@example.com",
  firstname: "Jan",
  lastname: "Jansen",
  displayname: "Jan J.",
  password: "bcryptHash",
  role: ["participant"], // or ["admin"], etc.
  
  // OTP fields (new)
  otp: "bcryptHash", // null after first password change
  otpExpires: "2026-03-07T12:34:56Z", // null after first password change
  mustChangePassword: true, // false after first password change
  passwordChangedAt: "2026-03-06T12:34:56Z",
  
  // Metadata
  createdAt: "2026-03-06T12:34:56Z",
  createdBy: "admin@example.com",
}
```

## Security Considerations

1. **OTP Hash:** OTP wordt bcrypt gehasht - nooit in plaintext
2. **Temp Password:** Gegenereerd willekeurig via `nanoid(12)`
3. **OTP Expiration:** 24 uur - alleen geldig voor eerste inlog
4. **Email Delivery:** Via Resend (requires `RESEND_API_KEY` in `.env.local`)
5. **Admin Only:** Alleen admins kunnen users aanmaken
6. **Password Requirements:** Min 8 karakters

## Email Template

Welcome email bevat:
- Gebruikersnaam (firstname of displayname)
- Email adres
- Temporary wachtwoord
- OTP code (groot weergegeven)
- Stappen voor eerste inlog
- Waarschuwing: OTP geldig 24 uur

## Configuration

Nodig in `.env.local`:

```
RESEND_API_KEY=re_xxxxxxxxxxxx
RESEND_FROM_EMAIL=kasgeld@mail.fambalker.net
NEXTAUTH_SECRET=your-secret
NEXTAUTH_URL=http://localhost:3000
```

## Usage in Settings Component

```jsx
import UserCreationForm from "@/components/user-creation-form";

export default function Settings() {
  const isAdmin = session?.user?.role?.includes("admin");

  return (
    <div>
      {/* ... existing settings ... */}
      
      {isAdmin && (
        <section className="mt-8">
          <h2 className="text-2xl font-bold mb-4">Gebruikers Beheer</h2>
          <UserCreationForm onUserCreated={() => {
            // Refresh users list if needed
            onChangeUsers();
          }} />
        </section>
      )}
    </div>
  );
}
```

## Troubleshooting

### Email niet ontvangen
- Check RESEND_API_KEY is correct
- Verify domain kasgeld@mail.fambalker.net in Resend
- Check spam folder
- Check server logs for email errors

### OTP Invalid na email
- OTP moet exact 6 cijfers zijn
- OTP is 24 uur geldig (check otpExpires in DB)
- Hash mismatch: Resend email en DB moeten synced zijn

### User kan niet inloggen
- Check temporary password (case-sensitive)
- Verify user exists in database
- Check if user has `mustChangePassword: true` flag

### Password change fails
- New password moet min 8 chars zijn
- OTP moet nog geldig zijn (< 24 uur)
- Confirm password moet exact hetzelfde zijn

## Future Enhancements

- [ ] Email re-send OTP
- [ ] Admin can reset password
- [ ] Two-factor authentication
- [ ] Password expiration policy
- [ ] Login history/audit trail
- [ ] IP whitelisting
