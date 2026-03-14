import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'welcome@kasgeld.nl';

export async function POST(req) {
  try {
    const {
      recipientEmail,
      recipientName,
      htmlContent,
      textContent,
      subject
    } = await req.json();

    if (!recipientEmail) {
      return Response.json(
        { error: 'Missing recipientEmail' },
        { status: 400 }
      );
    }

    const emailResponse = await resend.emails.send({
      from: `Kasgeld <${FROM_EMAIL}>`,
      to: recipientEmail,
      subject: subject || 'Kasgeld - Welcome',
      html: htmlContent,
      text: textContent,
    });

    console.log('Welcome email sent:', emailResponse);

    return Response.json({
      success: true,
      messageId: emailResponse.id,
    });
  } catch (error) {
    console.error('Error sending welcome email:', error);
    return Response.json(
      { error: error.message || 'Failed to send email' },
      { status: 500 }
    );
  }
}
