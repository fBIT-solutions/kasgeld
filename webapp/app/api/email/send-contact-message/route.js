import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * POST /api/email/send-contact-message
 * Send contact message email via Resend
 */
export async function POST(req) {
  try {
    const { recipientEmail, htmlContent, textContent, subject } = await req.json();

    if (!recipientEmail || !htmlContent || !subject) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400 }
      );
    }

    const data = await resend.emails.send({
      from: "kasgeld@mail.fambalker.net",
      to: recipientEmail,
      subject: subject,
      html: htmlContent,
      text: textContent || "",
    });

    console.log("Contact message email sent:", data);

    return new Response(JSON.stringify(data), { status: 200 });
  } catch (error) {
    console.error("Error sending contact message email:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to send email" }),
      { status: 500 }
    );
  }
}
