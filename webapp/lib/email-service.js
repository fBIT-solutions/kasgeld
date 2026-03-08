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
            <span style="color: #0369a1; font-style: italic;">
              ${tempPassword}
            </span>
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
/**
 * Send rejection email to registration request applicant
 * @param {String} recipientEmail - User's email
 * @param {String} recipientName - User's name
 * @param {String} rejectionMessage - Admin's rejection message
 */
export async function sendRejectionEmail(recipientEmail, recipientName, rejectionMessage) {
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px;">
        <h1 style="color: #d32f2f; margin-top: 0;">Registratieverzoek Status Update</h1>
        
        <p style="color: #666; font-size: 16px;">
          Hallo ${recipientName},
        </p>
        
        <div style="background-color: #ffebee; padding: 20px; border-radius: 8px; border-left: 4px solid #d32f2f; margin: 20px 0;">
          <h3 style="color: #d32f2f; margin-top: 0;">Verzoek Afgewezen</h3>
          
          <p style="color: #666; line-height: 1.6; margin: 10px 0;">
            We hebben je registratieverzoek helaas afgewezen. 
          </p>
          
          <p style="color: #666; line-height: 1.6; margin: 10px 0;">
            <strong>Bericht van de beheerder:</strong>
          </p>
          
          <div style="background-color: white; padding: 15px; border-radius: 4px; border-left: 4px solid #ff9800; margin: 10px 0;">
            <p style="color: #666; margin: 0; line-height: 1.6;">
              ${rejectionMessage || "Je aanvraag voldeed niet aan onze voorwaarden."}
            </p>
          </div>
        </div>
        
        <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
          Heb je vragen over deze beslissing? Neem contact op met de beheerder van Kasgeld.
        </p>
        
        <p style="color: #999; font-size: 12px; margin-top: 30px; border-top: 1px solid #ddd; padding-top: 20px;">
          Dit is een automatische melding van het Kasgeld-systeem. Gelieve niet op deze e-mail te antwoorden.
        </p>
      </div>
    </div>
  `;

  const textContent = `
Registratieverzoek Status Update

Hallo ${recipientName},

We hebben je registratieverzoek helaas afgewezen.

Bericht van de beheerder:
${rejectionMessage || "Je aanvraag voldeed niet aan onze voorwaarden."}

Heb je vragen over deze beslissing? Neem contact op met de beheerder van Kasgeld.

Dit is een automatische melding van het Kasgeld-systeem.
  `;

  try {
    // Use full URL for server-side fetch
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/email/send-rejection`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        recipientEmail,
        recipientName,
        htmlContent,
        textContent,
        subject: "Kasgeld: Registratieverzoek Afgewezen",
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
      throw new Error(`Email API returned ${response.status}: ${errorData.error}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error sending rejection email:", error);
    throw error;
  }
}

/**
 * Send contact message to admin from user
 * @param {Object} options - Email options
 * @param {String} options.adminEmail - Admin's email
 * @param {String} options.fromEmail - User's email
 * @param {String} options.fromName - User's name
 * @param {String} options.subject - Message subject
 * @param {String} options.message - Message content
 */
export async function sendContactMessage(options) {
  const { adminEmail, fromEmail, fromName, subject, message } = options;

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px;">
        <h1 style="color: #333; margin-top: 0;">📧 Nieuw bericht van gebruiker</h1>
        
        <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6;">
          <h3 style="color: #333; margin-top: 0;">Van:</h3>
          <p style="margin: 5px 0; color: #666;">
            <strong>${fromName}</strong><br>
            ${fromEmail}
          </p>

          <h3 style="color: #333; margin: 20px 0 0 0;">Onderwerp:</h3>
          <p style="margin: 5px 0; color: #0369a1; font-weight: bold; font-size: 16px;">
            ${subject}
          </p>

          <h3 style="color: #333; margin: 20px 0 0 0;">Bericht:</h3>
          <div style="background-color: #f9f9f9; padding: 15px; border-radius: 4px; border-left: 3px solid #0369a1; color: #333; line-height: 1.6;">
            ${message.replace(/\n/g, '<br>')}
          </div>
        </div>

        <p style="color: #999; font-size: 12px; margin-top: 30px; border-top: 1px solid #ddd; padding-top: 20px;">
          Dit is een automatische melding van het Kasgeld-systeem.
        </p>
      </div>
    </div>
  `;

  const textContent = `
Nieuw bericht van gebruiker

Van: ${fromName} (${fromEmail})
Onderwerp: ${subject}

Bericht:
${message}
  `;

  try {
    const response = await fetch(
      `${process.env.NEXTAUTH_URL}/api/email/send-contact-message`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recipientEmail: adminEmail,
          htmlContent,
          textContent,
          subject: `Kasgeld: ${subject}`,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
      throw new Error(`Email API returned ${response.status}: ${errorData.error}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error sending contact message email:", error);
    throw error;
  }
}

/**
 * Send swap request notification to requester and recipient
 * @param {Object} options
 */
export async function sendSwapRequestReceivedEmail(options) {
  const { requesterEmail, requesterName, recipientEmail, recipientName, swapDetails } = options;

  try {
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

    // Notification to requester
    const requesterHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px;">
          <h1 style="color: #333; margin-top: 0;">🔄 Ruilverzoek Verzonden</h1>
          
          <p style="color: #666; font-size: 16px;">
            Hallo ${requesterName},
          </p>
          
          <div style="background-color: #e3f2fd; padding: 15px; border-radius: 8px; border-left: 4px solid #2196F3; margin: 20px 0;">
            <p style="color: #1565c0; margin: 0;">
              Je ruilverzoek aan <strong>${recipientName}</strong> is verzonden. Je ontvangt een update zodra deze reageert.
            </p>
          </div>

          <div style="background-color: white; padding: 15px; border: 1px solid #ddd; border-radius: 4px; margin: 15px 0;">
            <p style="color: #666; margin: 5px 0;">
              <strong>Jouw unit:</strong> ${swapDetails.requesterUnit || 'N/A'}
            </p>
            <p style="color: #666; margin: 5px 0;">
              <strong>Verzoek voor:</strong> ${swapDetails.recipientUnit || 'N/A'}
            </p>
          </div>

          <p style="color: #999; font-size: 12px; margin-top: 30px; border-top: 1px solid #ddd; padding-top: 20px;">
            Dit is een automatische melding van het Kasgeld-systeem.
          </p>
        </div>
      </div>
    `;

    const requesterText = `
Ruilverzoek Verzonden

Hallo ${requesterName},

Je ruilverzoek aan ${recipientName} is verzonden. Je ontvangt een update zodra deze reageert.

Jouw unit: ${swapDetails.requesterUnit || 'N/A'}
Verzoek voor: ${swapDetails.recipientUnit || 'N/A'}

Dit is een automatische melding van het Kasgeld-systeem.
    `;

    // Notification to recipient
    const recipientHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px;">
          <h1 style="color: #333; margin-top: 0;">🔄 Ruilverzoek Ontvangen</h1>
          
          <p style="color: #666; font-size: 16px;">
            Hallo ${recipientName},
          </p>
          
          <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; border-left: 4px solid #ff9800; margin: 20px 0;">
            <p style="color: #856404; margin: 0;">
              <strong>${requesterName}</strong> heeft je een ruilverzoek gestuurd. Log in om je reactie in te dienen.
            </p>
          </div>

          <div style="background-color: white; padding: 15px; border: 1px solid #ddd; border-radius: 4px; margin: 15px 0;">
            <p style="color: #666; margin: 5px 0;">
              <strong>Hun unit:</strong> ${swapDetails.requesterUnit || 'N/A'}
            </p>
            <p style="color: #666; margin: 5px 0;">
              <strong>Ze willen:</strong> ${swapDetails.recipientUnit || 'N/A'}
            </p>
          </div>

          <div style="text-align: center; margin: 20px 0;">
            <a href="${baseUrl}/dashboard" style="display: inline-block; background-color: #ff9800; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              → Reageer op Verzoek
            </a>
          </div>

          <p style="color: #999; font-size: 12px; margin-top: 30px; border-top: 1px solid #ddd; padding-top: 20px;">
            Dit is een automatische melding van het Kasgeld-systeem.
          </p>
        </div>
      </div>
    `;

    const recipientText = `
Ruilverzoek Ontvangen

Hallo ${recipientName},

${requesterName} heeft je een ruilverzoek gestuurd. Log in om je reactie in te dienen.

Hun unit: ${swapDetails.requesterUnit || 'N/A'}
Ze willen: ${swapDetails.recipientUnit || 'N/A'}

Ga naar dashboard:
${baseUrl}/dashboard

Dit is een automatische melding van het Kasgeld-systeem.
    `;

    // Send to requester
    await fetch(`${baseUrl}/api/email/send-notification`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipientEmail: requesterEmail,
        recipientName: requesterName,
        htmlContent: requesterHtml,
        textContent: requesterText,
        subject: "Kasgeld: Ruilverzoek Verzonden",
      }),
    });

    // Send to recipient
    await fetch(`${baseUrl}/api/email/send-notification`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipientEmail: recipientEmail,
        recipientName: recipientName,
        htmlContent: recipientHtml,
        textContent: recipientText,
        subject: "Kasgeld: Ruilverzoek Ontvangen",
      }),
    });

    return { success: true };
  } catch (error) {
    console.error("Error sending swap request email:", error);
    throw error;
  }
}

/**
 * Send swap request review notification
 * @param {Object} options
 */
export async function sendSwapRequestReviewedEmail(options) {
  const { requesterEmail, requesterName, recipientName, status, message } = options;

  const statusText = status === 'approved' ? 'Goedgekeurd' : 'Afgewezen';
  const statusColor = status === 'approved' ? '#4CAF50' : '#f44336';
  const bgColor = status === 'approved' ? '#e8f5e9' : '#ffebee';

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px;">
        <h1 style="color: #333; margin-top: 0;">🔄 Ruilverzoek Beoordeeld</h1>
        
        <p style="color: #666; font-size: 16px;">
          Hallo ${requesterName},
        </p>
        
        <div style="background-color: ${bgColor}; padding: 15px; border-radius: 8px; border-left: 4px solid ${statusColor}; margin: 20px 0;">
          <p style="color: ${statusColor}; margin: 0;">
            <strong>${recipientName}</strong> heeft je ruilverzoek <strong>${statusText}</strong>.
          </p>
        </div>

        ${message ? `
          <div style="background-color: white; padding: 15px; border: 1px solid #ddd; border-radius: 4px; margin: 15px 0;">
            <p style="color: #666; margin: 5px 0;">
              <strong>Bericht:</strong>
            </p>
            <p style="color: #666; margin: 5px 0; line-height: 1.6;">
              ${message}
            </p>
          </div>
        ` : ''}

        <p style="color: #999; font-size: 12px; margin-top: 30px; border-top: 1px solid #ddd; padding-top: 20px;">
          Dit is een automatische melding van het Kasgeld-systeem.
        </p>
      </div>
    </div>
  `;

  const textContent = `
Ruilverzoek Beoordeeld

Hallo ${requesterName},

${recipientName} heeft je ruilverzoek ${statusText}.

${message ? `Bericht:\n${message}` : ''}

Dit is een automatische melding van het Kasgeld-systeem.
  `;

  try {
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    await fetch(`${baseUrl}/api/email/send-notification`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipientEmail: requesterEmail,
        recipientName: requesterName,
        htmlContent,
        textContent,
        subject: `Kasgeld: Ruilverzoek ${statusText}`,
      }),
    });

    return { success: true };
  } catch (error) {
    console.error("Error sending swap review email:", error);
    throw error;
  }
}

/**
 * Send registration request received notification to admin
 * @param {Object} options
 */
export async function sendRegistrationRequestEmail(options) {
  const { adminEmail, applicantName, applicantEmail, reason, baseUrl } = options;

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px;">
        <h1 style="color: #333; margin-top: 0;">📝 Registratieverzoek Ontvangen</h1>
        
        <p style="color: #666; font-size: 16px;">
          Een nieuw registratieverzoek is ontvangen en wacht op je goedkeuring.
        </p>
        
        <div style="background-color: white; padding: 20px; border-radius: 8px; border-left: 4px solid #2196F3; margin: 20px 0;">
          <h3 style="color: #333; margin-top: 0;">Aanvrager Gegevens</h3>
          <p style="color: #666; margin: 5px 0;">
            <strong>Naam:</strong> ${applicantName}
          </p>
          <p style="color: #666; margin: 5px 0;">
            <strong>Email:</strong> ${applicantEmail}
          </p>
          <p style="color: #666; margin: 5px 0;">
            <strong>Reden:</strong> ${reason || 'Geen reden vermeld'}
          </p>
        </div>

        <div style="text-align: center; margin: 20px 0;">
          <a href="${baseUrl}/beheer" style="display: inline-block; background-color: #2196F3; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
            → Bekijk Verzoeken
          </a>
        </div>

        <p style="color: #999; font-size: 12px; margin-top: 30px; border-top: 1px solid #ddd; padding-top: 20px;">
          Dit is een automatische melding van het Kasgeld-systeem.
        </p>
      </div>
    </div>
  `;

  const textContent = `
Registratieverzoek Ontvangen

Een nieuw registratieverzoek is ontvangen en wacht op je goedkeuring.

Aanvrager Gegevens
Naam: ${applicantName}
Email: ${applicantEmail}
Reden: ${reason || 'Geen reden vermeld'}

Bekijk verzoeken:
${baseUrl}/beheer

Dit is een automatische melding van het Kasgeld-systeem.
  `;

  try {
    const baseUrlDefault = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    await fetch(`${baseUrlDefault}/api/email/send-notification`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipientEmail: adminEmail,
        recipientName: "Beheerder",
        htmlContent,
        textContent,
        subject: "Kasgeld: Nieuw Registratieverzoek",
      }),
    });

    return { success: true };
  } catch (error) {
    console.error("Error sending registration request email:", error);
    throw error;
  }
}

/**
 * Send unit assigned notification
 * @param {Object} options
 */
export async function sendUnitAssignedEmail(options) {
  const { recipientEmail, recipientName, handNumber, month, year } = options;

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px;">
        <h1 style="color: #4CAF50; margin-top: 0;">✓ Hand Toegewezen</h1>
        
        <p style="color: #666; font-size: 16px;">
          Hallo ${recipientName},
        </p>
        
        <div style="background-color: #e8f5e9; padding: 15px; border-radius: 8px; border-left: 4px solid #4CAF50; margin: 20px 0;">
          <p style="color: #2e7d32; margin: 0;">
            Je bent toegewezen aan <strong>Hand ${handNumber}</strong> voor <strong>${month} ${year}</strong>.
          </p>
        </div>

        <div style="background-color: white; padding: 20px; border: 1px solid #ddd; border-radius: 4px; margin: 15px 0;">
          <h3 style="color: #333; margin-top: 0;">Toewijzingsdetails</h3>
          <table style="width: 100%; color: #666;">
            <tr>
              <td style="padding: 8px 0;"><strong>Hand nummer:</strong></td>
              <td style="padding: 8px 0; text-align: right;">${handNumber}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0;"><strong>Maand:</strong></td>
              <td style="padding: 8px 0; text-align: right;">${month}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0;"><strong>Jaar:</strong></td>
              <td style="padding: 8px 0; text-align: right;">${year}</td>
            </tr>
          </table>
        </div>

        <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
          Zorg dat je je verplichtingen op tijd naleefd. Bij vragen kun je altijd contact opnemen met de beheerder.
        </p>

        <p style="color: #999; font-size: 12px; margin-top: 30px; border-top: 1px solid #ddd; padding-top: 20px;">
          Dit is een automatische melding van het Kasgeld-systeem.
        </p>
      </div>
    </div>
  `;

  const textContent = `
Hand Toegewezen

Hallo ${recipientName},

Je bent toegewezen aan Hand ${handNumber} voor ${month} ${year}.

Toewijzingsdetails
Hand nummer: ${handNumber}
Maand: ${month}
Jaar: ${year}

Zorg dat je je verplichtingen op tijd nakomt. Bij vragen kun je altijd contact opnemen met de beheerder.

Dit is een automatische melding van het Kasgeld-systeem.
  `;

  try {
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    await fetch(`${baseUrl}/api/email/send-notification`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipientEmail,
        recipientName,
        htmlContent,
        textContent,
        subject: `Kasgeld: Hand ${handNumber} Toegewezen - ${month} ${year}`,
      }),
    });

    return { success: true };
  } catch (error) {
    console.error("Error sending unit assigned email:", error);
    throw error;
  }
}

/**
 * Send unit paid notification
 * @param {Object} options
 */
export async function sendUnitPaidEmail(options) {
  const { recipientEmail, recipientName, handNumber, month, year, amount } = options;

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px;">
        <h1 style="color: #4CAF50; margin-top: 0;">💳 Hand Uitbetaald</h1>
        
        <p style="color: #666; font-size: 16px;">
          Hallo ${recipientName},
        </p>
        
        <div style="background-color: #e8f5e9; padding: 15px; border-radius: 8px; border-left: 4px solid #4CAF50; margin: 20px 0;">
          <p style="color: #2e7d32; margin: 0;">
            Je uitbetaling voor <strong>Hand ${handNumber}</strong> (${month} ${year}) is verwerkt.
          </p>
        </div>

        <div style="background-color: white; padding: 20px; border: 2px solid #4CAF50; border-radius: 4px; margin: 20px 0; text-align: center;">
          <h2 style="color: #4CAF50; margin: 0;">€${amount.toFixed(2)}</h2>
          <p style="color: #666; margin: 5px 0; font-size: 14px;">Uitbetaalde bedrag excl. administratie kosten</p>
        </div>

        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 4px; margin: 15px 0;">
          <h3 style="color: #333; margin-top: 0;">Transactiegegevens</h3>
          <p style="color: #666; margin: 5px 0;">
            <strong>Hand nummer:</strong> ${handNumber}
          </p>
          <p style="color: #666; margin: 5px 0;">
            <strong>Periode:</strong> ${month} ${year}
          </p>
        </div>

        <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
          Het geld is overgemaakt naar je bankrekeninggegevens. Dit kan 1-3 werkdagen duren voordat het op je rekening staat.
        </p>

        <p style="color: #999; font-size: 12px; margin-top: 30px; border-top: 1px solid #ddd; padding-top: 20px;">
          Dit is een automatische melding van het Kasgeld-systeem.
        </p>
      </div>
    </div>
  `;

  const textContent = `
Hand Uitbetaald

Hallo ${recipientName},

Je uitbetaling voor Hand ${handNumber} (${month} ${year}) is verwerkt.

Uitbetaalde hoeveelheid: €${amount.toFixed(2)}

Transactiegegevens
Hand nummer: ${handNumber}
Periode: ${month} ${year}

Het geld is overgemaakt naar je bankrekeninggegevens. Dit kan 1-3 werkdagen duren voordat het op je rekening staat.

Dit is een automatische melding van het Kasgeld-systeem.
  `;

  try {
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/email/send-notification`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipientEmail,
        recipientName,
        htmlContent,
        textContent,
        subject: `Kasgeld: Hand ${handNumber} Uitbetaald - €${amount.toFixed(2)}`,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Email endpoint returned error:", errorData);
      throw new Error(`Failed to send unit paid email: ${response.status}`);
    }

    const result = await response.json();
    console.log("Unit paid email sent successfully:", result);
    return { success: true };
  } catch (error) {
    console.error("Error sending unit paid email:", error);
    throw error;
  }
}