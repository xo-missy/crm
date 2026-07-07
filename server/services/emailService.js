import nodemailer from 'nodemailer';

// Helper to create mail transporter
function createTransporter() {
  const host = process.env.SMTP_HOST || 'smtp.ethereal.email';
  const port = parseInt(process.env.SMTP_PORT || '587');
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (user && pass) {
    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass }
    });
  }

  // Fallback to ethereal.email test account or console logging
  return null;
}

export async function sendEmail({ to, subject, html, text }) {
  const transporter = createTransporter();
  const from = process.env.EMAIL_FROM || '"CRM Platform" <noreply@crm-multi-tenant.com>';

  if (!transporter) {
    console.log('--- EMAIL MOCK LOG ---');
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Text: ${text || 'N/A'}`);
    console.log(`HTML: ${html.substring(0, 200)}...`);
    console.log('----------------------');
    return { mock: true, messageId: 'mock-id-' + Date.now() };
  }

  try {
    const info = await transporter.sendMail({
      from,
      to,
      subject,
      text,
      html,
    });
    console.log(`Email sent: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error('Failed to send email:', error);
    // Don't crash the server, just log
    return null;
  }
}

export async function sendWelcomeEmail(user, companyName) {
  const subject = `Welcome to ${companyName}!`;
  const html = `
    <h1>Hello, ${user.name}!</h1>
    <p>Welcome to ${companyName}. Your account has been successfully created as <strong>${user.role}</strong>.</p>
    <p>You can log in and start managing your customer relations now.</p>
  `;
  return sendEmail({ to: user.email, subject, html, text: `Welcome to ${companyName}, ${user.name}! Your role is ${user.role}.` });
}

export async function sendPasswordResetEmail(user, resetToken) {
  const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;
  const subject = 'Password Reset Request';
  const html = `
    <h1>Password Reset Request</h1>
    <p>You requested a password reset. Click the link below to set a new password:</p>
    <p><a href="${resetUrl}" target="_blank">${resetUrl}</a></p>
    <p>If you did not request this, please ignore this email.</p>
  `;
  return sendEmail({ to: user.email, subject, html, text: `Password Reset Request: ${resetUrl}` });
}

export async function sendDealAssignmentEmail(user, deal, contactName) {
  const subject = `New Deal Assigned: ${deal.title}`;
  const html = `
    <h1>New Deal Assigned</h1>
    <p>Hi ${user.name},</p>
    <p>You have been assigned to a new deal:</p>
    <ul>
      <li><strong>Title:</strong> ${deal.title}</li>
      <li><strong>Value:</strong> $${deal.value}</li>
      <li><strong>Contact:</strong> ${contactName}</li>
    </ul>
    <p>Check your dashboard for details.</p>
  `;
  return sendEmail({ to: user.email, subject, html, text: `New Deal Assigned: ${deal.title} valued at $${deal.value} for ${contactName}.` });
}

export async function sendTicketAssignmentEmail(user, ticket, contactName) {
  const subject = `New Ticket Assigned: ${ticket.subject}`;
  const html = `
    <h1>New Ticket Assigned</h1>
    <p>Hi ${user.name},</p>
    <p>A new support ticket has been assigned to you:</p>
    <ul>
      <li><strong>Subject:</strong> ${ticket.subject}</li>
      <li><strong>Description:</strong> ${ticket.description}</li>
      <li><strong>Contact:</strong> ${contactName}</li>
    </ul>
    <p>Please resolve this at your earliest convenience.</p>
  `;
  return sendEmail({ to: user.email, subject, html, text: `New Ticket Assigned: ${ticket.subject} - ${ticket.description} for ${contactName}.` });
}
