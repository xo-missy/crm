import React, { useState } from 'react';
import { Link } from 'react-router-dom';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!email) {
      setError('Please provide your email address.');
      return;
    }

    try {
      setError('');
      setMessage('');
      setLoading(true);

      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to submit reset request.');
      }

      setMessage(data.message || 'Password reset request submitted successfully.');
    } catch (err) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <span className="auth-logo" role="img" aria-label="Globe Logo">🌐</span>
          <h2 className="auth-title">Recover Password</h2>
          <p className="auth-subtitle">We will email you a link to reset your password</p>
        </div>

        {error && (
          <div className="alert alert-danger" id="forgot-password-error-alert">
            {error}
          </div>
        )}

        {message && (
          <div className="alert alert-success" id="forgot-password-success-alert">
            {message}
          </div>
        )}

        {!message && (
          <form onSubmit={handleSubmit} id="forgot-password-form">
            <div className="form-group">
              <label className="form-label" htmlFor="forgot-email">Email Address</label>
              <input
                type="email"
                id="forgot-email"
                className="form-control"
                placeholder="you@company.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '0.75rem' }}
              disabled={loading}
              id="forgot-submit-btn"
            >
              {loading ? 'Sending request...' : 'Send Reset Link'}
            </button>
          </form>
        )}

        <div className="auth-footer">
          Remember your password?{' '}
          <Link to="/login" id="forgot-login-link">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
