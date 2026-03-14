import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req) {
  try {
    const { subject, message, recipients } = await req.json();

    if (!subject || !message || !recipients || recipients.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Subject, message, en recipients zijn verplicht' }),
        { status: 400 }
      );
    }

    // Send email to each recipient
    const emailPromises = recipients.map(recipient =>
      resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'noreply@kasgeldbeheer.nl',
        to: recipient.email,
        subject: subject,
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <p>Hallo ${recipient.name || recipient.email},</p>
            <div style="margin: 20px 0; padding: 20px; background-color: #f9f9f9; border-left: 4px solid #0066cc;">
              ${message.replace(/\n/g, '<br/>')}
            </div>
            <p>Met vriendelijke groeten,<br/>Kasgeld Beheer</p>
          </div>
        `,
      })
    );

    const results = await Promise.all(emailPromises);

    // Check if any emails failed
    const failed = results.filter(r => r.error);
    if (failed.length > 0) {
      return new Response(
        JSON.stringify({
          error: `${failed.length}/${recipients.length} emails konden niet worden verstuurd`,
          details: failed.map(f => f.error),
        }),
        { status: 500 }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Email succesvol verstuurd naar ${recipients.length} ontvanger(s)`,
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Email send error:', error);
    return new Response(
      JSON.stringify({ error: 'Fout bij verzenden van email: ' + error.message }),
      { status: 500 }
    );
  }
}
