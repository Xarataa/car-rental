import nodemailer from "nodemailer";

// Demo now, real Gmail later.
// If GMAIL_USER + GMAIL_PASS are set in .env, send real mail.
// Else log code to server console and return it for demo screen.

export function makeEmailCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function sendEmailCode(to: string, code: string) {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_PASS;

  if (user && pass) {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass },
    });
    await transporter.sendMail({
      from: user,
      to,
      subject: "Your Car Rental code",
      text: `Your verification code is: ${code}. It ends in 15 minutes.`,
    });
    return { real: true as const };
  }

  console.log(`[DEMO EMAIL] code for ${to}: ${code}`);
  return { real: false as const, demoCode: code };
}
