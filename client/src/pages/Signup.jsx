import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { FaEye, FaEyeSlash } from 'react-icons/fa';

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  
  // Tab control: 'create' or 'join'
  const [mode, setMode] = useState('create');
  
  // Input fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [role, setRole] = useState('Sales Rep'); // Defaults to Sales Rep for joining

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!name || !email || !password) {
      setError('Please fill in name, email, and password.');
      return;
    }

    if (mode === 'create' && !companyName) {
      setError('Please specify a company name.');
      return;
    }

    if (mode === 'join' && !inviteCode) {
      setError('Please specify the company invite code.');
      return;
    }

    const payload = {
      name,
      email,
      password,
      ...(mode === 'create' ? { companyName } : { inviteCode, role }),
    };

    try {
      setError('');
      setLoading(true);
      await signup(payload);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Failed to complete registration.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <span className="auth-logo" role="img" aria-label="Globe Logo">🌐</span>
          <h2 className="auth-title">Create CRM Account</h2>
          <p className="auth-subtitle">Select how you want to set up your workspace</p>
        </div>

        <div className="auth-toggle-group">
          <button
            type="button"
            className={`auth-toggle-btn ${mode === 'create' ? 'active' : ''}`}
            onClick={() => {
              setMode('create');
              setError('');
            }}
            id="signup-mode-create-btn"
          >
            Create Company
          </button>
          <button
            type="button"
            className={`auth-toggle-btn ${mode === 'join' ? 'active' : ''}`}
            onClick={() => {
              setMode('join');
              setError('');
            }}
            id="signup-mode-join-btn"
          >
            Join Company
          </button>
        </div>

        {error && (
          <div className="alert alert-danger" id="signup-error-alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} id="signup-form">
          <div className="form-group">
            <label className="form-label" htmlFor="signup-name">Full Name</label>
            <input
              type="text"
              id="signup-name"
              className="form-control"
              placeholder="Alice Vance"
              value={name}
              onChange={e => setName(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="signup-email">Email Address</label>
            <input
              type="email"
              id="signup-email"
              className="form-control"
              placeholder="alice@domain.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="signup-password">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                id="signup-password"
                className="form-control"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                disabled={loading}
                required
                style={{ paddingRight: '2.5rem' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(prev => !prev)}
                style={{
                  position: 'absolute',
                  right: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0.25rem',
                }}
                id="signup-toggle-password"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>

          {mode === 'create' ? (
            <div className="form-group" id="group-company-name">
              <label className="form-label" htmlFor="signup-company-name">Company Name</label>
              <input
                type="text"
                id="signup-company-name"
                className="form-control"
                placeholder="Acme Industrial LLC"
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
                disabled={loading}
                required={mode === 'create'}
              />
              <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block', marginTop: '0.25rem' }}>
                You will be configured as the Admin for this new tenant workspace.
              </span>
            </div>
          ) : (
            <React.Fragment>
              <div className="form-group" id="group-invite-code">
                <label className="form-label" htmlFor="signup-invite-code">Invite Code (6 digits)</label>
                <input
                  type="text"
                  id="signup-invite-code"
                  className="form-control"
                  placeholder="ACME12"
                  value={inviteCode}
                  onChange={e => setInviteCode(e.target.value)}
                  disabled={loading}
                  maxLength={10}
                  required={mode === 'join'}
                />
              </div>

              <div className="form-group" id="group-role">
                <label className="form-label" htmlFor="signup-role">Your Role</label>
                <select
                  id="signup-role"
                  className="form-control"
                  value={role}
                  onChange={e => setRole(e.target.value)}
                  disabled={loading}
                >
                  <option value="Sales Rep">Sales Representative</option>
                  <option value="Support Agent">Support Agent</option>
                </select>
              </div>
            </React.Fragment>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '0.75rem' }}
            disabled={loading}
            id="signup-submit-btn"
          >
            {loading 
              ? 'Creating account...' 
              : mode === 'create' 
                ? 'Create Company & Admin' 
                : 'Join Tenant Workspace'
            }
          </button>
        </form>

        <div className="auth-footer">
          Already have an account?{' '}
          <Link to="/login" id="signup-login-link">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
