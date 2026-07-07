import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { FaPlus, FaUser, FaBriefcase, FaEnvelope, FaExclamationCircle, FaCheck, FaPen } from 'react-icons/fa';

const STATUS_BADGES = {
  'Open': 'badge-danger',
  'In Progress': 'badge-warning',
  'Resolved': 'badge-success',
  'Closed': 'badge-secondary'
};

export default function Tickets() {
  const { apiCall, user } = useAuth();
  
  const [tickets, setTickets] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Ticket Modal State
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' or 'edit'
  const [selectedTicket, setSelectedDeal] = useState(null);
  const [formData, setFormData] = useState({
    subject: '',
    description: '',
    status: 'Open',
    contactId: '',
    assignedTo: ''
  });
  const [formError, setFormError] = useState('');

  async function fetchTickets() {
    try {
      const data = await apiCall('/api/tickets');
      setTickets(data);
    } catch (err) {
      setError(err.message || 'Failed to load support tickets.');
    }
  }

  async function fetchContacts() {
    try {
      const data = await apiCall('/api/contacts');
      setContacts(data);
    } catch (err) {
      console.error('Failed to load contacts for ticket association:', err.message);
    }
  }

  async function fetchCompanyUsers() {
    try {
      const data = await apiCall('/api/company/users');
      setUsers(data);
    } catch (err) {
      console.error('Failed to load users list:', err.message);
    }
  }

  async function initializeData() {
    try {
      setLoading(true);
      setError('');
      await Promise.all([fetchTickets(), fetchContacts(), fetchCompanyUsers()]);
    } catch (err) {
      setError(err.message || 'Error loading tickets database');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    initializeData();
  }, []);

  // Quick status update from the card itself
  async function handleQuickStatusChange(ticketId, newStatus) {
    // Optimistic UI update
    setTickets(prev => prev.map(t => t._id === ticketId ? { ...t, status: newStatus } : t));
    
    try {
      await apiCall(`/api/tickets/${ticketId}`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus })
      });
    } catch (err) {
      alert(err.message || 'Failed to save ticket status');
      fetchTickets(); // Rollback
    }
  }

  // CRUD actions
  function openAddModal() {
    setModalMode('add');
    setFormData({
      subject: '',
      description: '',
      status: 'Open',
      contactId: contacts.length > 0 ? contacts[0]._id : '',
      assignedTo: user.id
    });
    setFormError('');
    setShowModal(true);
  }

  function openEditModal(ticket) {
    setModalMode('edit');
    setSelectedDeal(ticket);
    setFormData({
      subject: ticket.subject,
      description: ticket.description,
      status: ticket.status,
      contactId: ticket.contactId ? (ticket.contactId._id || ticket.contactId) : '',
      assignedTo: ticket.assignedTo ? (ticket.assignedTo._id || ticket.assignedTo) : user.id
    });
    setFormError('');
    setShowModal(true);
  }

  async function handleSaveTicket(event) {
    event.preventDefault();
    setFormError('');

    if (!formData.subject || !formData.description || !formData.contactId) {
      setFormError('Subject, description, and contact are required.');
      return;
    }

    const body = {
      subject: formData.subject,
      description: formData.description,
      status: formData.status,
      contactId: formData.contactId,
      assignedTo: formData.assignedTo
    };

    try {
      if (modalMode === 'add') {
        await apiCall('/api/tickets', {
          method: 'POST',
          body: JSON.stringify(body)
        });
      } else {
        await apiCall(`/api/tickets/${selectedTicket._id}`, {
          method: 'PUT',
          body: JSON.stringify(body)
        });
      }
      setShowModal(false);
      fetchTickets();
    } catch (err) {
      setFormError(err.message || 'Failed to save ticket.');
    }
  }

  async function handleDeleteTicket() {
    if (!selectedTicket) return;
    const confirm = window.confirm(`Are you sure you want to delete ticket: "${selectedTicket.subject}"?`);
    if (!confirm) return;

    try {
      await apiCall(`/api/tickets/${selectedTicket._id}`, { method: 'DELETE' });
      setShowModal(false);
      fetchTickets();
    } catch (err) {
      alert(err.message || 'Failed to delete ticket.');
    }
  }

  // Filters logic
  const filteredTickets = tickets.filter(t => {
    const matchesSearch = 
      t.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.contactId?.name && t.contactId.name.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesStatus = statusFilter === '' || t.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="loading-container flex-center">
        <div className="spinner"></div>
        <p>Loading support tickets workspace...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger" style={{ margin: '2rem' }} id="tickets-error-alert">
        {error}
      </div>
    );
  }

  return (
    <div>
      <div className="section-header">
        <h2 className="section-title">Support Tickets</h2>
        <button onClick={openAddModal} className="btn btn-primary" id="btn-add-ticket">
          <FaPlus /> Create Ticket
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="card" style={{ padding: '1rem', marginBottom: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', flexDirection: 'row', alignItems: 'center' }}>
        <div style={{ flex: 1, minWidth: '240px' }}>
          <input
            type="text"
            className="form-control"
            placeholder="Search tickets by subject, description, contact..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            id="ticket-search-query"
          />
        </div>
        <div style={{ width: '180px' }}>
          <select
            className="form-control"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            id="ticket-status-filter"
          >
            <option value="">All Statuses</option>
            <option value="Open">Open</option>
            <option value="In Progress">In Progress</option>
            <option value="Resolved">Resolved</option>
            <option value="Closed">Closed</option>
          </select>
        </div>
      </div>

      {/* Tickets List Workspace */}
      {filteredTickets.length === 0 ? (
        <div className="card flex-center" style={{ padding: '4rem', flexDirection: 'column', color: '#94a3b8' }}>
          <FaExclamationCircle style={{ fontSize: '2.5rem', marginBottom: '1rem' }} />
          <p>No support tickets logged matching filters.</p>
        </div>
      ) : (
        <div className="tickets-grid">
          {filteredTickets.map(ticket => (
            <div 
              key={ticket._id} 
              className="card ticket-card" 
              style={{ 
                borderLeft: `4px solid ${
                  ticket.status === 'Open' ? '#ef4444' : 
                  ticket.status === 'In Progress' ? '#f59e0b' : 
                  ticket.status === 'Resolved' ? '#10b981' : '#64748b'
                }` 
              }}
              id={`ticket-card-${ticket._id}`}
            >
              <div className="ticket-header">
                <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#1e293b' }}>{ticket.subject}</h3>
                <span className={`badge ${STATUS_BADGES[ticket.status]}`}>{ticket.status}</span>
              </div>
              
              <p className="ticket-desc">{ticket.description}</p>
              
              <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', flexDirection: 'column', gap: '0.4rem', borderTop: '1px solid #f1f5f9', paddingTop: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <FaEnvelope style={{ color: '#94a3b8' }} />
                  <span>Contact: <strong>{ticket.contactId?.name || 'Unlinked'}</strong> ({ticket.contactId?.email})</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <FaUser style={{ color: '#94a3b8' }} />
                  <span>Agent: <strong>{ticket.assignedTo?.name || 'Unassigned'}</strong> ({ticket.assignedTo?.role})</span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px dashed #f1f5f9' }}>
                <button onClick={() => openEditModal(ticket)} className="btn btn-secondary btn-sm" style={{ padding: '0.25rem 0.5rem' }}>
                  <FaPen style={{ fontSize: '0.7rem' }} /> Edit
                </button>

                {/* Quick actions status transition */}
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                  {ticket.status !== 'In Progress' && ticket.status !== 'Resolved' && ticket.status !== 'Closed' && (
                    <button 
                      onClick={() => handleQuickStatusChange(ticket._id, 'In Progress')}
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem', color: '#d97706' }}
                    >
                      Start Work
                    </button>
                  )}
                  {ticket.status !== 'Resolved' && ticket.status !== 'Closed' && (
                    <button 
                      onClick={() => handleQuickStatusChange(ticket._id, 'Resolved')}
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem', color: '#059669' }}
                    >
                      <FaCheck /> Resolve
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Ticket Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">{modalMode === 'add' ? 'Create Support Ticket' : 'Edit Support Ticket'}</h3>
              <button onClick={() => setShowModal(false)} className="modal-close-btn">&times;</button>
            </div>

            <form onSubmit={handleSaveTicket}>
              <div className="modal-body">
                {formError && (
                  <div className="alert alert-danger" id="ticket-form-error">
                    {formError}
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label" htmlFor="ticket-subject">Subject</label>
                  <input
                    type="text"
                    id="ticket-subject"
                    className="form-control"
                    placeholder="E.g., Portal authentication failures"
                    value={formData.subject}
                    onChange={e => setFormData({ ...formData, subject: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="ticket-description">Description</label>
                  <textarea
                    id="ticket-description"
                    className="form-control"
                    placeholder="Enter detailed error description..."
                    rows={4}
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    required
                  ></textarea>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="ticket-status">Status</label>
                  <select
                    id="ticket-status"
                    className="form-control"
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="Open">Open</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Resolved">Resolved</option>
                    <option value="Closed">Closed</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="ticket-contact">Linked Customer Contact</label>
                  <select
                    id="ticket-contact"
                    className="form-control"
                    value={formData.contactId}
                    onChange={e => setFormData({ ...formData, contactId: e.target.value })}
                    required
                  >
                    <option value="" disabled>Select Customer</option>
                    {contacts.map(c => (
                      <option key={c._id} value={c._id}>{c.name} ({c.email})</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="ticket-assignee">Assigned Agent</label>
                  <select
                    id="ticket-assignee"
                    className="form-control"
                    value={formData.assignedTo}
                    onChange={e => setFormData({ ...formData, assignedTo: e.target.value })}
                  >
                    <option value="">Select Support Agent</option>
                    {users.map(u => (
                      <option key={u._id} value={u._id}>{u.name} ({u.role})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
                <div>
                  {modalMode === 'edit' && (
                    <button type="button" onClick={handleDeleteTicket} className="btn btn-danger" id="btn-delete-ticket">
                      Delete Ticket
                    </button>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" id="btn-submit-ticket-form">
                    {modalMode === 'add' ? 'Create Ticket' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
