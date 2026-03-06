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
