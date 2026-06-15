const nodemailer = require('nodemailer');

// ============================================================
// EMAIL CONFIGURATION
// ============================================================
// Production: Use SMTP credentials from environment variables
// Local: Use console.log for debugging (no real emails sent)
// ============================================================

// Deduplication set — prevents duplicate emails for same action
const sentEmailCache = new Set();

// Generate a unique key for each email action
function getEmailKey(action, userId) {
  return `${action}_${userId}_${Date.now()}`;
}

/**
 * Create nodemailer transporter based on environment
 */
function createTransporter() {
  // If SMTP is configured, use it
  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
      }
    });
  }

  // For development: use Ethereal (test email service)
  if (process.env.NODE_ENV !== 'production') {
    // Return null — we'll log to console instead
    return null;
  }

  // Production fallback: log error
  return null;
}

/**
 * Send email with HTML template
 */
async function sendEmail({ to, subject, html }) {
  const transporter = createTransporter();

  if (!transporter) {
    // Development mode or no SMTP configured — log to console
    console.log('========================================');
    console.log('EMAIL (development mode - no SMTP):');
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body: ${html.substring(0, 500)}...`);
    console.log('========================================');
    return { success: true, devMode: true };
  }

  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || '"YEC Gilam Tizimi" <noreply@yecgilam.uz>',
      to,
      subject,
      html
    });

    console.log(`Email sent successfully: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error('Email send error:', err.message);
    // Never throw — email failure should not break the app
    return { success: false, error: err.message };
  }
}

/**
 * Send user notification email (create or update)
 * @param {Object} options
 * @param {'created'|'updated'} options.action
 * @param {Object} options.user - { id, name, email, role }
 * @param {string} [options.tempPassword] - temporary password (for new users)
 * @param {Array} [options.changedFields] - list of changed field names (for updates)
 */
async function sendUserNotificationEmail({ action, user, tempPassword, changedFields }) {
  // Deduplication check (within same second)
  const cacheKey = `${action}_${user.email}`;
  if (sentEmailCache.has(cacheKey)) {
    console.log(`Email already sent for ${cacheKey}, skipping duplicate.`);
    return { success: true, skipped: true };
  }

  const { sendEmailHtml } = require('./emailTemplate');
  const html = sendEmailHtml({
    action,
    userName: user.name,
    userEmail: user.email,
    userRole: user.role,
    tempPassword,
    changedFields,
    loginUrl: process.env.FRONTEND_URL || 'https://yec-sallers.vercel.app/login'
  });

  const result = await sendEmail({
    to: user.email,
    subject: action === 'created'
      ? 'YEC Gilam Tizimiga xush kelibsiz!'
      : 'YEC Gilam Tizimi - Profil ma\'lumotlaringiz yangilandi',
    html
  });

  // Add to deduplication cache (auto-clear after 30 seconds)
  sentEmailCache.add(cacheKey);
  setTimeout(() => sentEmailCache.delete(cacheKey), 30000);

  return result;
}

module.exports = {
  sendEmail,
  sendUserNotificationEmail
};