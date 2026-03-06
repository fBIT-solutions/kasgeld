import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req) {
  try {
    const { 
      recipientEmail, 
      recipientName, 
      runYear,
      month,
      amount,
      dueDate,
      deelnemers // optional: for admin notification
    } = await req.json();

    if (!recipientEmail || !amount) {
      return Response.json(
        { error: 'Missing required fields: recipientEmail, amount' },
        { status: 400 }
      );
    }

    // HTML email template
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px;">
          <h1 style="color: #333; margin-top: 0;">Kasgeld Betalingsherinnering</h1>
          
          <p style="color: #666; font-size: 16px;">
            Hallo ${recipientName},
          </p>
          
          <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6;">
            <p style="margin: 0 0 10px 0; color: #666;">
              <strong>Run:</strong> ${runYear}
            </p>
            <p style="margin: 0 0 10px 0; color: #666;">
              <strong>Maand:</strong> ${month}
            </p>
            <p style="margin: 0 0 10px 0; color: #666;">
              <strong>Bedrag:</strong> <span style="font-size: 20px; color: #e53e3e; font-weight: bold;">€ ${parseFloat(amount).toFixed(2)}</span>
            </p>
            ${dueDate ? `
            <p style="margin: 0; color: #666;">
              <strong>Vervaldatum:</strong> ${dueDate}
            </p>
            ` : ''}
          </div>
          
          <p style="color: #666; font-size: 14px; line-height: 1.6;">
            Je bent vriendelijk verzocht het openstaande bedrag te betalen via het Kasgeld-systeem.
          </p>
          
          <p style="color: #999; font-size: 12px; margin-top: 30px; border-top: 1px solid #ddd; padding-top: 20px;">
            Dit is een automatische melding van het Kasgeld-systeem. Gelieve niet op deze e-mail te antwoorden.
          </p>
        </div>
      </div>
    `;

    // Text version
    const textContent = `
Kasgeld Betalingsherinnering

Hallo ${recipientName},

Run: ${runYear}
Maand: ${month}
Bedrag: € ${parseFloat(amount).toFixed(2)}
${dueDate ? `Vervaldatum: ${dueDate}` : ''}

Je bent vriendelijk verzocht het openstaande bedrag te betalen via het Kasgeld-systeem.

Dit is een automatische melding van het Kasgeld-systeem.
    `;

    const emailResponse = await resend.emails.send({
      from: 'Kasgeld <kasgeld@mail.fambalker.net>',
      to: recipientEmail,
      subject: `Kasgeld Betalingsherinnering - ${runYear} ${month}`,
      html: htmlContent,
      text: textContent,
    });

    console.log('Email sent successfully:', emailResponse);

    return Response.json({
      success: true,
      messageId: emailResponse.id,
      recipient: recipientEmail,
    });
  } catch (error) {
    console.error('Error sending email:', error);
    return Response.json(
      { error: error.message || 'Failed to send email' },
      { status: 500 }
    );
  }
}
