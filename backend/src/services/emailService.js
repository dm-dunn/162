const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.FROM_EMAIL || 'MLB162 <noreply@mlb162.com>';
const APP_URL = process.env.APP_URL || 'http://localhost:5173';

class EmailService {
    static async sendVerificationEmail(email, token) {
        const verifyUrl = `${APP_URL}/verify-email?token=${token}`;

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
