import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { authService } from '../services/auth';
import { useAuth } from '../context/AuthContext';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('verifying');
  const [errorMessage, setErrorMessage] = useState('');
  const { refreshUser } = useAuth();

  useEffect(() => {
    verifyToken();
  }, []);

  const verifyToken = async () => {
    const token = searchParams.get('token');
    if (!token) {
      setStatus('error');
      setErrorMessage('No verification token provided');
      return;
    }

    try {
      await authService.verifyEmail(token);
      setStatus('success');
      await refreshUser();
    } catch (err) {
      setStatus('error');
      setErrorMessage(err.response?.data?.error || 'Verification failed');
    }
  };

  return (
    <div className="max-w-md mx-auto mt-16">
      <div className="card text-center">
        {status === 'verifying' && (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-secondary-navy border-t-transparent mx-auto mb-4"></div>
            <p className="text-gray-600">Verifying your email...</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="text-green-500 text-5xl mb-4">&#10003;</div>
            <h2 className="text-2xl font-bold text-secondary-navy mb-2">Email Verified!</h2>
            <p className="text-gray-600 mb-6">Your email has been verified. You can now make picks.</p>
            <Link to="/dashboard" className="btn-primary inline-block">
              Go to Dashboard
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="text-red-500 text-5xl mb-4">&#10007;</div>
            <h2 className="text-2xl font-bold text-secondary-navy mb-2">Verification Failed</h2>
            <p className="text-gray-600 mb-6">{errorMessage}</p>
            <Link to="/dashboard" className="btn-primary inline-block">
              Go to Dashboard
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
