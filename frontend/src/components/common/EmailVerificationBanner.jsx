import { useState } from 'react';
import { authService } from '../../services/auth';

export default function EmailVerificationBanner() {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleResend = async () => {
    setSending(true);
    setError('');
    try {
      await authService.resendVerification();
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send verification email');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-semibold text-yellow-800">
            Please verify your email address
          </p>
          <p className="text-sm text-yellow-700 mt-1">
            Check your inbox for a verification link. You won't be able to make picks until your email is verified.
          </p>
        </div>
        <button
          onClick={handleResend}
          disabled={sending || sent}
          className="ml-4 px-4 py-2 bg-yellow-600 text-white rounded-lg text-sm font-medium hover:bg-yellow-700 disabled:opacity-50 whitespace-nowrap"
        >
          {sent ? 'Sent!' : sending ? 'Sending...' : 'Resend Email'}
        </button>
      </div>
      {error && (
        <p className="text-red-600 text-sm mt-2">{error}</p>
      )}
    </div>
  );
}
