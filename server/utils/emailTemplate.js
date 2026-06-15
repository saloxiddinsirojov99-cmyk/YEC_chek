/**
 * Generate professional HTML email for user notifications
 */
function sendEmailHtml({ action, userName, userEmail, userRole, tempPassword, changedFields, loginUrl }) {
  const isCreated = action === 'created';
  const roleLabel = userRole === 'admin' ? 'Administrator' : 'Sotuvchi';

  const changedFieldsHtml = changedFields && changedFields.length > 0
    ? `
    <tr>
      <td style="padding: 10px 0;">
        <p style="margin: 0 0 8px 0; font-size: 14px; color: #555;">O'zgartirilgan maydonlar:</p>
        <ul style="margin: 0; padding-left: 20px; color: #555; font-size: 14px;">
          ${changedFields.map(f => `<li>${f}</li>`).join('')}
        </ul>
      </td>
    </tr>`
    : '';

  const tempPasswordHtml = tempPassword
    ? `
    <tr>
      <td style="padding: 10px 0;">
        <p style="margin: 0 0 8px 0; font-size: 14px; color: #555;">
          Tizimga kirish uchun vaqtinchalik parolingiz:
        </p>
        <div style="background: #f3f4f6; border: 1px dashed #d1d5db; border-radius: 8px; padding: 12px 20px; text-align: center; font-family: 'Courier New', monospace; font-size: 18px; font-weight: bold; color: #1a56db; letter-spacing: 2px;">
          ${tempPassword}
        </div>
        <p style="margin: 8px 0 0 0; font-size: 12px; color: #999;">
          * Tizimga birinchi marta kirganingizdan so'ng parolingizni o'zgartirishingiz tavsiya etiladi.
        </p>
      </td>
    </tr>`
    : '';

  return `
<!DOCTYPE html>
<html lang="uz">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 0; background-color: #f4f7fb; font-family: Arial, Helvetica, sans-serif; }
  </style>
</head>
<body>
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f7fb; padding: 30px 10px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">

          <!-- HEADER -->
          <tr>
            <td style="background: linear-gradient(135deg, #1a56db 0%, #0f3b8c 100%); padding: 30px 40px; text-align: center;">
              <img src="https://yec-sallers.vercel.app/favicon.svg" alt="YEC Gilam" width="60" height="60" style="display: block; margin: 0 auto 15px auto; border-radius: 50%; background: rgba(255,255,255,0.15); padding: 8px;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: 1px;">YEC GILAM</h1>
              <p style="margin: 5px 0 0 0; color: rgba(255,255,255,0.85); font-size: 14px;">Buyurtma Boshqaruv Tizimi</p>
            </td>
          </tr>

          <!-- BODY -->
          <tr>
            <td style="padding: 35px 40px;">
              <h2 style="margin: 0 0 10px 0; color: #1a56db; font-size: 20px;">
                ${isCreated ? 'Assalomu alaykum!' : 'Profil ma\'lumotlaringiz yangilandi'}
              </h2>
              <p style="margin: 0 0 20px 0; color: #555; font-size: 14px; line-height: 1.6;">
                ${isCreated
                  ? `Siz YEC Gilam tizimiga <strong>${roleLabel}</strong> sifatida ro'yxatdan o'tkazildingiz. Quyida tizimga kirish ma'lumotlaringiz keltirilgan:`
                  : `Sizning profilingizdagi quyidagi ma'lumotlar muvaffaqiyatli yangilandi:`
                }
              </p>

              <table width="100%" cellpadding="0" cellspacing="0" style="background: #f8fafc; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                <tr>
                  <td style="padding: 6px 0; font-size: 14px; color: #888; width: 140px;">Foydalanuvchi:</td>
                  <td style="padding: 6px 0; font-size: 14px; color: #333; font-weight: 600;">${userName}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-size: 14px; color: #888;">Email:</td>
                  <td style="padding: 6px 0; font-size: 14px; color: #333; font-weight: 600;">${userEmail}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-size: 14px; color: #888;">Roli:</td>
                  <td style="padding: 6px 0; font-size: 14px;">
                    <span style="display: inline-block; padding: 2px 12px; border-radius: 12px; font-size: 13px; font-weight: 600; ${userRole === 'admin' ? 'background: #dbeafe; color: #1a56db;' : 'background: #d1fae5; color: #065f46;'}">
                      ${roleLabel}
                    </span>
                  </td>
                </tr>
                ${changedFieldsHtml}
              </table>

              ${tempPasswordHtml}

              <p style="margin: 20px 0 25px 0; color: #555; font-size: 14px; line-height: 1.6;">
                Tizimga kirish uchun quyidagi tugmani bosing:
              </p>

              <!-- BUTTON -->
              <table cellpadding="0" cellspacing="0" style="margin: 0 auto 25px auto;">
                <tr>
                  <td align="center" style="background: linear-gradient(135deg, #1a56db 0%, #0f3b8c 100%); border-radius: 8px;">
                    <a href="${loginUrl}" target="_blank" style="display: inline-block; padding: 14px 40px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; letter-spacing: 0.5px;">
                      Tizimga Kirish
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0; font-size: 12px; color: #999; text-align: center;">
                Agar yuqoridagi tugma ishlamasa, quyidagi havolani brauzeringizga ko'chiring:<br>
                <a href="${loginUrl}" style="color: #1a56db; text-decoration: underline; word-break: break-all;">${loginUrl}</a>
              </p>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background: #f8fafc; padding: 20px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 5px 0; font-size: 12px; color: #999;">
                © ${new Date().getFullYear()} YEC Gilam. Barcha huquqlar himoyalangan.
              </p>
              <p style="margin: 0; font-size: 11px; color: #bbb;">
                Ushbu xat avtomatik tarzda yuborildi, unga javob bermang.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

module.exports = { sendEmailHtml };