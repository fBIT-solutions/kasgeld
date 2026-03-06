import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req) {
  try {
    const { recipientEmail, recipientName, htmlContent, textContent, subject } = await req.json();

    if (!recipientEmail || !htmlContent) {
      return new Response(
        JSON.stringify({ error: "Email en HTML content zijn verplicht" }),
        { status: 400 }
      );
    }

    const data = await resend.emails.send({
      from: "Kasgeld <kasgeld@mail.fambalker.net>",
      to: recipientEmail,
      subject: subject || "Kasgeld - Registratieverzoek Afgewezen",
      html: htmlContent,
      text: textContent,
    });

    if (data.error) {
      return new Response(
        JSON.stringify({ error: "Fout bij versturen van email", details: data.error }),
        { status: 500 }
      );
    }

    return new Response(JSON.stringify({ success: true, messageId: data.id }), { status: 200 });
  } catch (error) {
    console.error("Error sending rejection email:", error);
    return new Response(JSON.stringify({ error: "Fout bij versturen van email", details: error.message }), { status: 500 });
  }
}
