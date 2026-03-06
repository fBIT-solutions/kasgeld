/**
 * Send payment reminder emails to unpaid participants
 * @param {String} runYear - Year of the run (e.g., "2027")
 * @param {String} month - Month in MM-YYYY format
 * @param {Array} unpaidUsers - Array of users with {id, firstname, lastname, displayname, email}
 * @param {Number} amount - Total unpaid amount for each user
 * @param {Date} dueDate - Optional due date for payment
 */
export async function sendPaymentReminders(
  runYear,
  month,
  unpaidUsers,
  getUserAmount,
  dueDate = null
) {
  console.log(`Sending payment reminders for ${runYear} ${month}`);

  const results = {
    sent: [],
    failed: [],
  };

  for (const user of unpaidUsers) {
    try {
      const userAmount = getUserAmount(user.id);
      const userEmail = user.email;

      if (!userEmail) {
        console.warn(`No email found for user ${user.id}`);
        results.failed.push({
          userId: user.id,
          error: 'No email address',
        });
        continue;
      }

      const recipientName = user.firstname || user.displayname || 'Deelnemer';

      const response = await fetch('/api/email/send-payment-reminder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipientEmail: userEmail,
          recipientName: recipientName,
          runYear: runYear,
          month: month,
          amount: userAmount,
          dueDate: dueDate ? new Date(dueDate).toLocaleDateString('nl-NL') : null,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`Email sent to ${userEmail}`);
        results.sent.push({
          userId: user.id,
          email: userEmail,
          messageId: data.messageId,
        });
      } else {
        const error = await response.json();
        console.error(`Failed to send email to ${userEmail}:`, error);
        results.failed.push({
          userId: user.id,
          email: userEmail,
          error: error.error || 'Unknown error',
        });
      }
    } catch (error) {
      console.error(`Error sending reminder to user ${user.id}:`, error);
      results.failed.push({
        userId: user.id,
        error: error.message,
      });
    }
  }

  return results;
}

/**
 * Send welcome email with OTP to new user
 * @param {Object} options - Email options
 * @param {String} options.recipientEmail - User's email
 * @param {String} options.recipientName - User's name
 * @param {String} options.email - Login email
 * @param {String} options.otp - One-time password
 * @param {String} options.tempPassword - Temporary password
 */
export async function sendWelcomeEmail(options) {
  const { recipientEmail, recipientName, email, otp, tempPassword } = options;

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px;">
        <h1 style="color: #333; margin-top: 0;">Welkom bij Kasgeld!</h1>
        
        <p style="color: #666; font-size: 16px;">
          Hallo ${recipientName},
        </p>
        
        <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
          Je account is aangemaakt. Hieronder vind je je inloggegevens en eenmalig wachtwoord.
        </p>
        
        <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 2px solid #3b82f6;">
          <h3 style="color: #333; margin-top: 0;">Inloggegevens</h3>
          
          <p style="margin: 10px 0; color: #666;">
            <strong>Email:</strong><br>
            <code style="background-color: #f0f0f0; padding: 8px 12px; border-radius: 4px; font-family: monospace;">
              ${email}
            </code>
          </p>
          
          <p style="margin: 10px 0; color: #666;">
            <strong>Wachtwoord:</strong><br>
            <code style="background-color: #f0f0f0; padding: 8px 12px; border-radius: 4px; font-family: monospace;">
              ${tempPassword}
            </code>
          </p>
          
          <p style="margin: 10px 0; color: #666;">
            <strong>Eenmalig wachtwoord (OTP):</strong><br>
            <code style="background-color: #fff3cd; padding: 8px 12px; border-radius: 4px; font-family: monospace; font-size: 18px; font-weight: bold; letter-spacing: 2px;">
              ${otp}
            </code>
          </p>
        </div>
        
        <div style="background-color: #e8f4f8; padding: 15px; border-radius: 8px; border-left: 4px solid #3b82f6; margin: 20px 0;">
          <h4 style="color: #0369a1; margin-top: 0;">Eerste Stappen</h4>
          <ol style="color: #666; line-height: 1.8;">
            <li>Log in met je email en het gegeven wachtwoord</li>
            <li>Voer het eenmalig wachtwoord (OTP) in</li>
            <li>Je wordt verzocht je wachtwoord te wijzigen</li>
            <li>Kies een sterk, persoonlijk wachtwoord</li>
          </ol>
        </div>

        <div style="text-align: center; margin: 20px 0;">
          <a href="${process.env.NEXTAUTH_URL || "http://localhost:3000"}/auth" style="display: inline-block; background-color: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
            → Ga naar Kasgeld
          </a>
        </div>
        
        <p style="color: #d32f2f; background-color: #ffebee; padding: 12px; border-radius: 4px; border-left: 4px solid #d32f2f; margin: 20px 0;">
          <strong>⚠️ Belangrijk:</strong> Het OTP is slechts 24 uur geldig. Zorg dat je vandaag nog inlogt en je wachtwoord wijzigt.
        </p>
        
        <p style="color: #666; font-size: 14px; line-height: 1.6;">
          Als je vragen hebt, neem contact op met je beheerder.
        </p>
        
        <p style="color: #999; font-size: 12px; margin-top: 30px; border-top: 1px solid #ddd; padding-top: 20px;">
          Dit is een automatische melding van het Kasgeld-systeem. Gelieve niet op deze e-mail te antwoorden.
        </p>
      </div>
    </div>
  `;

  const textContent = `
Welkom bij Kasgeld!

Hallo ${recipientName},

Je account is aangemaakt. Hieronder vind je je inloggegevens:

Email: ${email}
Wachtwoord: ${tempPassword}
Eenmalig wachtwoord (OTP): ${otp}

Eerste stappen:
1. Log in met je email en het gegeven wachtwoord
2. Voer het eenmalig wachtwoord (OTP) in
3. Je wordt verzocht je wachtwoord te wijzigen
4. Kies een sterk, persoonlijk wachtwoord

Ga naar Kasgeld:
${process.env.NEXTAUTH_URL || "http://localhost:3000"}/auth

⚠️ BELANGRIJK: Het OTP is slechts 24 uur geldig. Zorg dat je vandaag nog inlogt.

Als je vragen hebt, neem contact op met je beheerder.

Dit is een automatische melding van het Kasgeld-systeem.
  `;

  try {
    // Use full URL for server-side fetch
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/email/send-welcome`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        recipientEmail,
        recipientName,
        htmlContent,
        textContent,
        subject: "Welkom bij Kasgeld - Je accountgegevens",
      }),
    });

    if (!response.ok) {
      throw new Error(`Email API returned ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error sending welcome email:", error);
    throw error;
  }
}
