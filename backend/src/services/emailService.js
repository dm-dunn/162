const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.FROM_EMAIL || 'MLB162 <noreply@mlb162.com>';
const APP_URL = process.env.APP_URL || 'http://localhost:5173';

// BACKEND_URL is used for links that must hit a backend route (e.g. email verification).
// In production this should be the Render API URL: https://one62.onrender.com
// APP_URL (the frontend) is kept for frontend-handled links (password reset, etc.)
const BACKEND_URL = (process.env.BACKEND_URL || 'http://localhost:3000').replace(/\/$/, '');

class EmailService {
    static async sendVerificationEmail(email, token) {
        const verifyUrl = `${BACKEND_URL}/verify-email?token=${token}`;

        await resend.emails.send({
            from: FROM_EMAIL,
            to: email,
            subject: 'Verify your MLB162 account',
            html: `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
                    <div style="text-align: center; margin-bottom: 32px;">
                        <h1 style="color: #1e3a5f; font-size: 28px; margin: 0;">
                            MLB<span style="color: #dc2626;">162</span>
                        </h1>
                    </div>
                    <div style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 32px;">
                        <h2 style="color: #1e3a5f; font-size: 22px; margin-top: 0;">Verify your email</h2>
                        <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
                            Thanks for signing up for MLB162! Click the button below to verify your email address and start making picks.
                        </p>
                        <div style="text-align: center; margin: 32px 0;">
                            <a href="${verifyUrl}" style="background: #1e3a5f; color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block;">
                                Verify Email
                            </a>
                        </div>
                        <p style="color: #9ca3af; font-size: 13px; line-height: 1.5;">
                            This link expires in 24 hours. If you didn't create an account, you can safely ignore this email.
                        </p>
                        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
                        <p style="color: #9ca3af; font-size: 12px;">
                            If the button doesn't work, copy and paste this URL into your browser:<br />
                            <a href="${verifyUrl}" style="color: #6b7280; word-break: break-all;">${verifyUrl}</a>
                        </p>
                    </div>
                </div>
            `
        });
    }

    static async sendPasswordResetEmail(email, token) {
        const resetUrl = `${APP_URL}/reset-password?token=${token}`;

        await resend.emails.send({
            from: FROM_EMAIL,
            to: email,
            subject: 'Reset your MLB162 password',
            html: `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
                    <div style="text-align: center; margin-bottom: 32px;">
                        <h1 style="color: #1e3a5f; font-size: 28px; margin: 0;">
                            MLB<span style="color: #dc2626;">162</span>
                        </h1>
                    </div>
                    <div style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 32px;">
                        <h2 style="color: #1e3a5f; font-size: 22px; margin-top: 0;">Reset your password</h2>
                        <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
                            We received a request to reset your password. Click the button below to choose a new password.
                        </p>
                        <div style="text-align: center; margin: 32px 0;">
                            <a href="${resetUrl}" style="background: #1e3a5f; color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block;">
                                Reset Password
                            </a>
                        </div>
                        <p style="color: #9ca3af; font-size: 13px; line-height: 1.5;">
                            This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email.
                        </p>
                        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
                        <p style="color: #9ca3af; font-size: 12px;">
                            If the button doesn't work, copy and paste this URL into your browser:<br />
                            <a href="${resetUrl}" style="color: #6b7280; word-break: break-all;">${resetUrl}</a>
                        </p>
                    </div>
                </div>
            `
        });
    }

    static async sendTemporaryPasswordEmail(email, tempPassword) {
        await resend.emails.send({
            from: FROM_EMAIL,
            to: email,
            subject: 'Your MLB162 temporary password',
            html: `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
                    <div style="text-align: center; margin-bottom: 32px;">
                        <h1 style="color: #1e3a5f; font-size: 28px; margin: 0;">
                            MLB<span style="color: #dc2626;">162</span>
                        </h1>
                    </div>
                    <div style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 32px;">
                        <h2 style="color: #1e3a5f; font-size: 22px; margin-top: 0;">Temporary password</h2>
                        <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
                            We received a request to reset your MLB162 password. Use the temporary password below to sign in to the app — you'll be asked to create a new password right away.
                        </p>
                        <div style="background: #f3f4f6; border: 2px dashed #d1d5db; border-radius: 8px; padding: 20px; text-align: center; margin: 24px 0;">
                            <p style="color: #6b7280; font-size: 13px; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 0.05em;">Your temporary password</p>
                            <p style="color: #111827; font-size: 28px; font-weight: 700; letter-spacing: 0.1em; margin: 0; font-family: monospace;">${tempPassword}</p>
                        </div>
                        <p style="color: #4b5563; font-size: 15px; line-height: 1.6;">
                            Open the MLB162 app, sign in with your email and this temporary password, then follow the prompts to set a permanent password.
                        </p>
                        <p style="color: #9ca3af; font-size: 13px; line-height: 1.5;">
                            If you didn't request this, your account password has still been changed. Sign in with this temporary password immediately and set a new permanent password to secure your account.
                        </p>
                    </div>
                </div>
            `
        });
    }

    static async sendLeagueInvitation(email, leagueName, inviterName, token) {
        const joinUrl = `${APP_URL}/leagues/join?token=${token}`;

        await resend.emails.send({
            from: FROM_EMAIL,
            to: email,
            subject: `You're invited to join "${leagueName}" on MLB162`,
            html: `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
                    <div style="text-align: center; margin-bottom: 32px;">
                        <h1 style="color: #1e3a5f; font-size: 28px; margin: 0;">
                            MLB<span style="color: #dc2626;">162</span>
                        </h1>
                    </div>
                    <div style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 32px;">
                        <h2 style="color: #1e3a5f; font-size: 22px; margin-top: 0;">You've been invited!</h2>
                        <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
                            <strong>${inviterName}</strong> invited you to join their league <strong>"${leagueName}"</strong> on MLB162 — a daily MLB pick'em game where you compete across the full 162-game season.
                        </p>
                        <div style="text-align: center; margin: 32px 0;">
                            <a href="${joinUrl}" style="background: #dc2626; color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block;">
                                Join League
                            </a>
                        </div>
                        <p style="color: #9ca3af; font-size: 13px; line-height: 1.5;">
                            This invitation expires in 7 days. If you don't have an account yet, you'll be able to create one when you click the link.
                        </p>
                        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
                        <p style="color: #9ca3af; font-size: 12px;">
                            If the button doesn't work, copy and paste this URL into your browser:<br />
                            <a href="${joinUrl}" style="color: #6b7280; word-break: break-all;">${joinUrl}</a>
                        </p>
                    </div>
                </div>
            `
        });
    }
}

module.exports = EmailService;
