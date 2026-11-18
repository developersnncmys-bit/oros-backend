import nodemailer from "nodemailer";

/**
 * SMTP is configured through env vars. When any of SMTP_HOST / SMTP_USER /
 * SMTP_PASS is missing we skip real sending and just log — so `postman run`
 * and local smoke tests don't break just because mail isn't wired up yet.
 */
let cachedTransporter = null;

const mailerConfigured = () =>
    Boolean(
        process.env.SMTP_HOST &&
        process.env.SMTP_USER &&
        process.env.SMTP_PASS
    );

const getTransporter = () => {
    if (cachedTransporter) return cachedTransporter;
    if (!mailerConfigured()) return null;

    const port = Number(process.env.SMTP_PORT || 587);
    // Port 465 implies implicit TLS; 587 uses STARTTLS. Allow explicit override
    // via SMTP_SECURE for provider quirks (e.g. some hosts terminate TLS on
    // non-standard ports).
    const secure =
        process.env.SMTP_SECURE != null
            ? process.env.SMTP_SECURE === "true"
            : port === 465;

    cachedTransporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port,
        secure,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    });
    return cachedTransporter;
};

/**
 * Send one email. Returns { sent: true } when SMTP actually accepted it,
 * { sent: false, reason } when mail isn't configured or the send errored.
 *
 * Callers should NOT fail the request when { sent: false } — forgot-password,
 * for example, still progresses to the OTP step so the dev-stub code
 * ("123456") remains usable during setup.
 */
export const sendMail = async ({ to, subject, text, html }) => {
    const transporter = getTransporter();
    if (!transporter) {
        console.warn(
            "📭 mailer not configured (set SMTP_HOST/SMTP_USER/SMTP_PASS) — skipping send to",
            to
        );
        return { sent: false, reason: "not-configured" };
    }
    try {
        const info = await transporter.sendMail({
            from: process.env.MAIL_FROM || process.env.SMTP_USER,
            to,
            subject,
            text,
            html
        });
        return { sent: true, messageId: info.messageId };
    } catch (error) {
        console.error("📭 mail send failed:", error.message);
        return { sent: false, reason: error.message };
    }
};

export const sendPasswordResetEmail = async ({ to, otp, name }) => {
    const subject = "Your OROS password reset code";
    const greeting = name ? `Hi ${name},` : "Hi,";
    const text = [
        greeting,
        "",
        `Your OROS password reset code is: ${otp}`,
        "",
        "This code is valid for 10 minutes. If you did not request a password reset, you can safely ignore this email.",
        "",
        "— OROS"
    ].join("\n");

    const html = `
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#1a1033;">
            <h2 style="margin:0 0 16px;font-size:20px;">Reset your OROS password</h2>
            <p style="margin:0 0 12px;">${greeting}</p>
            <p style="margin:0 0 16px;">Use the code below to reset your password. It expires in 10 minutes.</p>
            <div style="font-size:28px;font-weight:800;letter-spacing:6px;background:#f5b30122;color:#8a5a00;padding:16px 24px;border-radius:12px;text-align:center;margin:16px 0;">
                ${otp}
            </div>
            <p style="margin:16px 0 0;font-size:13px;color:#6b6480;">If you didn't request this, you can safely ignore this email.</p>
            <p style="margin:24px 0 0;font-size:13px;color:#6b6480;">— OROS</p>
        </div>
    `;

    return sendMail({ to, subject, text, html });
};
