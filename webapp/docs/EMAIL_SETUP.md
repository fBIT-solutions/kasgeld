# Email Notifications Setup Guide

## Resend Configuration

This Kasgeld app uses **Resend** for sending email notifications about payment reminders.

### Step 1: Get Your Resend API Key

1. Go to [https://resend.com](https://resend.com)
2. Sign up or log in to your account
3. Navigate to **API Keys** section
4. Create a new API key
5. Copy the API key

### Step 2: Configure Your Domain

To send emails from `kasgeld@mail.fambalker.net`:

1. In Resend dashboard, go to **Domains**
2. Add your domain: `mail.fambalker.net`
3. Follow the DNS verification steps provided by Resend
4. Verify the domain (usually takes a few minutes to hours)

### Step 3: Update Environment Variables

Add the following to your `.env.local` file:

```
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
RESEND_FROM_EMAIL=kasgeld@mail.fambalker.net
```

Replace `re_xxxxxxxxxxxxxxxxxxxx` with your actual Resend API key.

### Step 4: Ensure Users Have Email Addresses

The email reminder system requires that all participants (users) have valid email addresses stored in their profiles. 

When a user registers or updates their profile, make sure their email is saved in the database.

### Usage

1. Open the Kasgeld Payment Tracker
2. Select a month in the "Betalingsoverzicht" accordion
3. If there are unpaid participants, a "Herinneringen verzenden" button will appear
4. Click the button to send payment reminder emails to all unpaid participants
5. Each recipient will receive a personalized email with:
   - Their name
   - Run year
   - Month
   - Amount due
   - Payment instructions

### Email Customization

To customize the email template, edit:
- `app/api/email/send-payment-reminder/route.js` - Email template and content

### Testing

You can test the email sending without a fully verified domain by:

1. Using Resend's test mode (free tier allows testing)
2. Sending to the email address you used to create the Resend account

For production, a verified domain is required.

### Troubleshooting

**Emails not sending:**
- Check that `RESEND_API_KEY` is correct
- Verify that users have email addresses in their profiles
- Check browser console for error messages
- Look at server logs for detailed error information

**Domain verification issues:**
- Ensure DNS records are set correctly in your domain provider
- Wait for DNS propagation (can take up to 48 hours)
- Check Resend documentation for your specific domain provider

**Email not received:**
- Check spam folder
- Verify recipient email address is correct
- Ensure domain is fully verified in Resend

### API Endpoint

Email sending is handled by:
- **Endpoint:** `POST /api/email/send-payment-reminder`
- **Required fields:**
  - `recipientEmail`: Email address to send to
  - `recipientName`: Name of recipient
  - `runYear`: Year of the run
  - `month`: Month in MM-YYYY format
  - `amount`: Amount due
  - `dueDate` (optional): Payment due date

### More Information

- [Resend Documentation](https://resend.com/docs)
- [Resend Domain Setup](https://resend.com/docs/dashboard/domains)
- [Resend API Reference](https://resend.com/docs/api/send-email)
