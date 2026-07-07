import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { FaCopy, FaBuilding, FaUsers, FaUserCog, FaTrash, FaCheck } from 'react-icons/fa';

export default function Settings() {
  const { apiCall, user } = useAuth();
  
  const [company, setCompany] = useState(null);
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [companyNameInput, setCompanyNameInput] = useState('');
  const [companySaveSuccess, setCompanySaveSuccess] = useState('');
  const [companySaveError, setCompanySaveError] = useState('');
  
  const [teamError, setTeamError] = useState('');
  const [copied, setCopied] = useState(false);

  async function fetchCompanySettings() {
    try {
      const data = await apiCall('/api/company/settings');
      setCompany(data);
      setCompanyNameInput(data.name);
    } catch (err) {
      console.error('Failed to load settings:', err.message);
    }
  }

  async function fetchTeamMembers() {
    try {
      const data = await apiCall('/api/company/users');
      setTeam(data);
    } catch (err) {
      console.error('Failed to load team:', err.message);
    }
  }

  async function initializeData() {
    try {
      setLoading(true);
      await Promise.all([fetchCompanySettings(), fetchTeamMembers()]);
    } catch (err) {
      setTeamError(err.message || 'Failed to initialize company settings workspace');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    initializeData();
  }, []);

  // Update Company Name
  async function handleCompanyUpdate(event) {
    event.preventDefault();
    setCompanySaveError('');
    setCompanySaveSuccess('');

    if (!companyNameInput.trim()) {
      setCompanySaveError('Company name cannot be blank.');
      return;
    }

    try {
      const updated = await apiCall('/api/company/settings', {
        method: 'PUT',
        body: JSON.stringify({ name: companyNameInput })
      });
      setCompany(updated);
      setCompanySaveSuccess('Company profile updated successfully.');
    } catch (err) {
      setCompanySaveError(err.message || 'Failed to save company profile settings.');
    }
  }

  // Update Team Member Role
  async function handleRoleChange(userId, newRole) {
    setTeamError('');
    try {
      const updatedUser = await apiCall(`/api/company/users/${userId}`, {
        method: 'PUT',
        body: JSON.stringify({ role: newRole })
      });
      setTeam(prev => prev.map(member => member._id === userId ? { ...member, role: updatedUser.role } : member));
    } catch (err) {
      setTeamError(err.message || 'Failed to update member role.');
    }
  }

  // Remove Team Member
  async function handleRemoveUser(memberId, memberName) {
    const confirm = window.confirm(`Are you sure you want to remove ${memberName} from your company workspace?`);
    if (!confirm) return;

    setTeamError('');
    try {
      await apiCall(`/api/company/users/${memberId}`, { method: 'DELETE' });
      setTeam(prev => prev.filter(member => member._id !== memberId));
    } catch (err) {
      setTeamError(err.message || 'Failed to remove user.');
    }
  }

  // Click-to-copy invite code
  function handleCopyInviteCode() {
    if (!company) return;
    navigator.clipboard.writeText(company.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <div className="loading-container flex-center">
        <div className="spinner"></div>
        <p>Loading company configuration workspace...</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* 2 Column Settings Frame */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
        
        {/* Left Card: Company Profile Details */}
        <div className="card" id="settings-company-profile">
          <h3 className="flex-center" style={{ justifyContent: 'flex-start', gap: '0.5rem', fontSize: '1.1rem', fontWeight: 700, color: '#1e293b', marginBottom: '1.5rem' }}>
            <FaBuilding style={{ color: '#3b82f6' }} /> Company Profile Settings
          </h3>

          {companySaveError && <div className="alert alert-danger">{companySaveError}</div>}
          {companySaveSuccess && <div className="alert alert-success">{companySaveSuccess}</div>}

          <form onSubmit={handleCompanyUpdate}>
            <div className="form-group">
              <label className="form-label" htmlFor="settings-company-name">Registered Company Name</label>
              <input
                type="text"
                id="settings-company-name"
                className="form-control"
                value={companyNameInput}
                onChange={e => setCompanyNameInput(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn btn-primary" id="btn-save-company-name">
              Update Profile Name
            </button>
          </form>
        </div>

        {/* Right Card: Company Invite Code details */}
        <div className="card" id="settings-invite-workspace">
          <h3 className="flex-center" style={{ justifyContent: 'flex-start', gap: '0.5rem', fontSize: '1.1rem', fontWeight: 700, color: '#1e293b', marginBottom: '1.5rem' }}>
            Workspace Recruitment Invitation
          </h3>
          
          <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1.5rem' }}>
            Share this unique workspace code with your sales representatives and support agents. They can input it during signup to automatically join your tenant portal.
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '1rem', borderRadius: '0.5rem', justifyContent: 'space-between' }}>
            <div>
              <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', fontWeight: 600 }}>Active Invite Code</span>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a', letterSpacing: '0.1em' }} id="display-invite-code">
                {company ? company.inviteCode : '------'}
              </div>
            </div>
            
            <button 
              onClick={handleCopyInviteCode} 
              className="btn btn-secondary flex-center" 
              style={{ gap: '0.5rem', padding: '0.75rem 1rem' }}
              id="btn-copy-invite"
            >
              {copied ? (
                <React.Fragment>
                  <FaCheck style={{ color: '#10b981' }} /> <span style={{ color: '#10b981', fontWeight: 600 }}>Copied!</span>
                </React.Fragment>
              ) : (
                <React.Fragment>
                  <FaCopy /> <span>Copy Code</span>
                </React.Fragment>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Segment: Team management */}
      <div className="card" id="settings-team-management">
        <h3 className="flex-center" style={{ justifyContent: 'flex-start', gap: '0.5rem', fontSize: '1.1rem', fontWeight: 700, color: '#1e293b', marginBottom: '1rem' }}>
          <FaUsers style={{ color: '#3b82f6' }} /> Team Workspace Members
        </h3>
        
        <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1.5rem' }}>
          Manage your team members and roles. Sales Reps have pipeline capabilities. Support Agents have ticket resolution capabilities. Admins have complete configuration access.
        </p>

        {teamError && <div className="alert alert-danger">{teamError}</div>}

        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email Address</th>
                <th>Role Assignment</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {team.map(member => {
                const isSelf = member._id === user.id;
                return (
                  <tr key={member._id}>
                    <td style={{ fontWeight: 600 }}>
                      {member.name} {isSelf && <span style={{ fontSize: '0.7rem', color: '#3b82f6', background: '#eff6ff', padding: '2px 6px', borderRadius: '4px', marginLeft: '6px' }}>You</span>}
                    </td>
                    <td>{member.email}</td>
                    <td>
                      {isSelf ? (
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>{member.role}</span>
                      ) : (
                        <select
                          className="form-control"
                          value={member.role}
                          onChange={e => handleRoleChange(member._id, e.target.value)}
                          style={{ padding: '0.25rem 0.5rem', width: '160px', fontSize: '0.8rem' }}
                          id={`select-role-${member._id}`}
                        >
                          <option value="Admin">Admin</option>
                          <option value="Sales Rep">Sales Rep</option>
                          <option value="Support Agent">Support Agent</option>
                        </select>
                      )}
                    </td>
                    <td className="text-right">
                      {!isSelf && (
                        <button
                          onClick={() => handleRemoveUser(member._id, member.name)}
                          className="btn btn-danger btn-sm btn-icon"
                          title="Remove user from company"
                          id={`btn-remove-user-${member._id}`}
                        >
                          <FaTrash />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
