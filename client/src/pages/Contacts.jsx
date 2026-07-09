import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { 
  FaSearch, FaPlus, FaPhone, FaEnvelope, FaTag, FaUser, 
  FaRegStickyNote, FaTrash, FaPen, FaRobot, FaFire, FaSnowflake, FaClock 
} from 'react-icons/fa';

export default function Contacts() {
  const { apiCall, user } = useAuth();
  
  // State
  const [contacts, setContacts] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [notes, setNotes] = useState([]);
  const [users, setUsers] = useState([]); // For assignment dropdown
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Search & Filter State
  const [search, setSearch] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [allTags, setAllTags] = useState([]);

  // CRUD Modals State
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' or 'edit'
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    tags: '',
    ownerId: ''
  });
  const [formError, setFormError] = useState('');

  // Note Input State
  const [newNoteContent, setNewNoteContent] = useState('');
  
  // AI States
  const [aiScore, setAiScore] = useState(null); // { score, reason }
  const [aiSummary, setAiSummary] = useState(null); // string
  const [aiScoreLoading, setAiScoreLoading] = useState(false);
  const [aiSummaryLoading, setAiSummaryLoading] = useState(false);

  // Fetch Contacts
  async function fetchContacts() {
    try {
      setLoading(true);
      setError('');
      let url = '/api/contacts';
      const params = [];
      if (search) params.push(`search=${encodeURIComponent(search)}`);
      if (selectedTag) params.push(`tag=${encodeURIComponent(selectedTag)}`);
      
      if (params.length > 0) {
        url += `?${params.join('&')}`;
      }

      const data = await apiCall(url);
      setContacts(data);

      // Extract unique tags for filtering options
      const tagsSet = new Set();
      data.forEach(c => {
        if (c.tags) c.tags.forEach(t => tagsSet.add(t));
      });
      setAllTags(Array.from(tagsSet));

      // Select first contact if nothing selected and contacts exist
      if (data.length > 0) {
        // If the currently selected contact is still in list, keep it
        const currentActive = data.find(c => selectedContact && c._id === selectedContact._id);
        if (currentActive) {
          setSelectedContact(currentActive);
        } else {
          handleSelectContact(data[0]);
        }
      } else {
        setSelectedContact(null);
        setNotes([]);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch contacts.');
    } finally {
      setLoading(false);
    }
  }

  // Fetch Users (Admin assignment dropdown)
  async function fetchCompanyUsers() {
    if (user.role !== 'Admin') return;
    try {
      const data = await apiCall('/api/company/users');
      setUsers(data);
    } catch (err) {
      console.error('Failed to load users list:', err.message);
    }
  }

  // Select Contact details & Notes
  async function handleSelectContact(contact) {
    setSelectedContact(contact);
    setAiScore(null);
    setAiSummary(null);
    if (!contact) {
      setNotes([]);
      return;
    }
    try {
      const notesData = await apiCall(`/api/contacts/${contact._id}/notes`);
      setNotes(notesData);
    } catch (err) {
      console.error('Failed to fetch notes:', err.message);
    }
  }

  // Trigger search on typing
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchContacts();
    }, 300);
    return () => clearTimeout(delayDebounce);
  }, [search, selectedTag]);

  // Load initial settings
  useEffect(() => {
    fetchCompanyUsers();
    fetchContacts();
  }, []);

  // Note actions
  async function handleAddNote(event) {
    event.preventDefault();
    if (!newNoteContent.trim() || !selectedContact) return;

    try {
      const addedNote = await apiCall(`/api/contacts/${selectedContact._id}/notes`, {
        method: 'POST',
        body: JSON.stringify({ content: newNoteContent })
      });
      setNotes(prev => [addedNote, ...prev]);
      setNewNoteContent('');
      // Invalidate AI summary as new notes are added
      setAiSummary(null);
    } catch (err) {
      alert(err.message || 'Failed to save note');
    }
  }

  // AI scoring
  async function handleGetLeadScore() {
    if (!selectedContact) return;
    try {
      setAiScoreLoading(true);
      const data = await apiCall(`/api/ai/score-lead/${selectedContact._id}`, { method: 'POST' });
      setAiScore(data);
    } catch (err) {
      alert(err.message || 'Failed to generate lead score.');
    } finally {
      setAiScoreLoading(false);
    }
  }

  // AI summarization
  async function handleGetSummary() {
    if (!selectedContact) return;
    try {
      setAiSummaryLoading(true);
      const data = await apiCall(`/api/ai/summarize-contact/${selectedContact._id}`, { method: 'POST' });
      setAiSummary(data.summary);
    } catch (err) {
      alert(err.message || 'Failed to generate interaction summary.');
    } finally {
      setAiSummaryLoading(false);
    }
  }

  // CRUD Actions
  function openAddModal() {
    setModalMode('add');
    setFormData({
      name: '',
      email: '',
      phone: '',
      tags: '',
      ownerId: user.id
    });
    setFormError('');
    setShowModal(true);
  }

  function openEditModal() {
    if (!selectedContact) return;
    setModalMode('edit');
    setFormData({
      name: selectedContact.name,
      email: selectedContact.email,
      phone: selectedContact.phone || '',
      tags: selectedContact.tags ? selectedContact.tags.join(', ') : '',
      ownerId: selectedContact.ownerId ? (selectedContact.ownerId._id || selectedContact.ownerId) : user.id
    });
    setFormError('');
    setShowModal(true);
  }

  async function handleSaveContact(event) {
    event.preventDefault();
    setFormError('');

    if (!formData.name || !formData.email) {
      setFormError('Name and email are required');
      return;
    }

    const tagsArray = formData.tags
      ? formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag !== '')
      : [];

    const body = {
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      tags: tagsArray,
      ownerId: formData.ownerId
    };

    try {
      if (modalMode === 'add') {
        const newContact = await apiCall('/api/contacts', {
          method: 'POST',
          body: JSON.stringify(body)
        });
        setShowModal(false);
        // Refresh list
        await fetchContacts();
        handleSelectContact(newContact);
      } else {
        const updatedContact = await apiCall(`/api/contacts/${selectedContact._id}`, {
          method: 'PUT',
          body: JSON.stringify(body)
        });
        setShowModal(false);
        // Refresh list
        await fetchContacts();
      }
    } catch (err) {
      setFormError(err.message || 'Failed to save contact.');
    }
  }

  async function handleDeleteContact() {
    if (!selectedContact) return;
    const confirm = window.confirm(`Are you sure you want to delete ${selectedContact.name}? This will also delete all active deals and notes linked to them.`);
    if (!confirm) return;

    try {
      await apiCall(`/api/contacts/${selectedContact._id}`, { method: 'DELETE' });
      setSelectedContact(null);
      await fetchContacts();
    } catch (err) {
      alert(err.message || 'Failed to delete contact.');
    }
  }

  function renderLeadScoreBadge(score) {
    if (score === 'Hot') return <span className="badge badge-danger"><FaFire /> Hot</span>;
    if (score === 'Warm') return <span className="badge badge-warning"><FaClock /> Warm</span>;
    return <span className="badge badge-secondary"><FaSnowflake /> Cold</span>;
  }

  return (
    <div style={{ height: '100%' }}>
      <div className="section-header">
        <h2 className="section-title">Contact Management</h2>
        {(user.role === 'Admin' || user.role === 'Sales Rep') && (
          <button onClick={openAddModal} className="btn btn-primary" id="btn-add-contact">
            <FaPlus /> Add Contact
          </button>
        )}
      </div>

      <div className="contacts-container">
        
        {/* Left List Pane */}
        <div className="contacts-list-pane">
          <div className="pane-search-header">
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                className="form-control"
                placeholder="Search by name, email..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ paddingLeft: '2.25rem' }}
                id="contact-search-input"
              />
              <FaSearch style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            </div>

            <div>
              <select
                className="form-control"
                value={selectedTag}
                onChange={e => setSelectedTag(e.target.value)}
                id="contact-tag-filter"
              >
                <option value="">All Tags</option>
                {allTags.map(tag => (
                  <option key={tag} value={tag}>{tag}</option>
                ))}
              </select>
            </div>
          </div>

          <ul className="pane-list">
            {contacts.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
                {search || selectedTag 
                  ? "No contacts found matching filters." 
                  : "No contacts in this workspace yet."}
              </div>
            ) : (
              contacts.map(contact => (
                <li
                  key={contact._id}
                  className={`pane-item ${selectedContact && selectedContact._id === contact._id ? 'active' : ''}`}
                  onClick={() => handleSelectContact(contact)}
                >
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#1e293b' }}>{contact.name}</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{contact.email}</div>
                  {contact.tags && contact.tags.length > 0 && (
                    <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                      {contact.tags.slice(0, 3).map(tag => (
                        <span key={tag} className="badge badge-info" style={{ fontSize: '0.65rem' }}>{tag}</span>
                      ))}
                    </div>
                  )}
                </li>
              ))
            )}
          </ul>
        </div>

        {/* Right Detail Pane */}
        <div className="contacts-detail-pane">
          {selectedContact ? (
            <React.Fragment>
              
              {/* Detail Header */}
              <div className="detail-header">
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>{selectedContact.name}</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem', color: '#64748b', fontSize: '0.85rem' }}>
                    <FaUser /> Owner: <span>{selectedContact.ownerId?.name || 'Unassigned'}</span>
                  </div>
                </div>

                {(user.role === 'Admin' || user.role === 'Sales Rep') && (
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={openEditModal} className="btn btn-secondary btn-sm" id="btn-edit-contact" title="Edit Contact">
                      <FaPen /> Edit
                    </button>
                    <button onClick={handleDeleteContact} className="btn btn-danger btn-sm" id="btn-delete-contact" title="Delete Contact">
                      <FaTrash /> Delete
                    </button>
                  </div>
                )}
              </div>

              {/* Detail Body */}
              <div className="detail-body">
                <div className="detail-grid">
                  <div>
                    <div className="detail-label">Email Address</div>
                    <div className="detail-value flex-center" style={{ justifyContent: 'flex-start', gap: '0.5rem' }}>
                      <FaEnvelope style={{ color: '#94a3b8' }} /> {selectedContact.email}
                    </div>
                  </div>
                  <div>
                    <div className="detail-label">Phone Number</div>
                    <div className="detail-value flex-center" style={{ justifyContent: 'flex-start', gap: '0.5rem' }}>
                      <FaPhone style={{ color: '#94a3b8' }} /> {selectedContact.phone || 'N/A'}
                    </div>
                  </div>
                  <div>
                    <div className="detail-label">Associated Tags</div>
                    <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                      {selectedContact.tags && selectedContact.tags.length > 0 ? (
                        selectedContact.tags.map(tag => (
                          <span key={tag} className="badge badge-info"><FaTag style={{ fontSize: '0.6rem', marginRight: '0.25rem' }} /> {tag}</span>
                        ))
                      ) : (
                        <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>None</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* AI Features Segment (Admin & Sales Rep only) */}
                {(user.role === 'Admin' || user.role === 'Sales Rep') && (
                  <div className="ai-section">
                    <div className="ai-header">
                      <FaRobot /> Claude AI Sales Intelligence
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                      {/* Lead Score widget */}
                      <div className="card" style={{ padding: '1rem', background: '#fff', border: '1px solid #dbeafe', margin: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>Automated Lead Score</span>
                          {!aiScore && !aiScoreLoading && (
                            <button onClick={handleGetLeadScore} className="btn btn-secondary btn-sm" id="btn-ai-score">
                              Compute Score
                            </button>
                          )}
                        </div>

                        {aiScoreLoading && (
                          <div style={{ fontSize: '0.8rem', color: '#475569' }}>
                            <span className="ai-loader" style={{ marginRight: '0.5rem' }}></span> Analyzing customer history...
                          </div>
                        )}

                        {aiScore && (
                          <div>
                            <div style={{ marginBottom: '0.25rem' }}>{renderLeadScoreBadge(aiScore.score)}</div>
                            <p style={{ fontSize: '0.85rem', color: '#1e293b', fontStyle: 'italic' }}>"{aiScore.reason}"</p>
                            <button onClick={handleGetLeadScore} className="btn btn-secondary btn-sm" style={{ marginTop: '0.5rem', padding: '2px 8px', fontSize: '0.65rem' }}>
                              Re-evaluate
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Relationship Summary widget */}
                      <div className="card" style={{ padding: '1rem', background: '#fff', border: '1px solid #dbeafe', margin: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>Notes Summary (2-3 sentences)</span>
                          {!aiSummary && !aiSummaryLoading && (
                            <button onClick={handleGetSummary} className="btn btn-secondary btn-sm" id="btn-ai-summary">
                              Summarize Interaction
                            </button>
                          )}
                        </div>

                        {aiSummaryLoading && (
                          <div style={{ fontSize: '0.8rem', color: '#475569' }}>
                            <span className="ai-loader" style={{ marginRight: '0.5rem' }}></span> Reading timeline logs...
                          </div>
                        )}

                        {aiSummary && (
                          <div>
                            <p style={{ fontSize: '0.85rem', color: '#1e293b', lineHeight: 1.4 }}>{aiSummary}</p>
                            <button onClick={handleGetSummary} className="btn btn-secondary btn-sm" style={{ marginTop: '0.5rem', padding: '2px 8px', fontSize: '0.65rem' }}>
                              Refresh Summary
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Timeline Notes */}
                <div className="timeline-section">
                  <h4 style={{ fontSize: '1rem', fontWeight: 600, color: '#1e293b', marginBottom: '1rem' }}>Notes & Updates</h4>
                  
                  {/* Note Input */}
                  <form onSubmit={handleAddNote} className="note-input-container">
                    <textarea
                      className="form-control"
                      placeholder="Type a new update message or discussion summary..."
                      rows={3}
                      value={newNoteContent}
                      onChange={e => setNewNoteContent(e.target.value)}
                      style={{ marginBottom: '0.5rem', resize: 'vertical' }}
                      id="note-textarea"
                      required
                    ></textarea>
                    <button type="submit" className="btn btn-secondary btn-sm" id="btn-save-note">
                      <FaRegStickyNote /> Add Note
                    </button>
                  </form>

                  {/* Notes Timeline List */}
                  {notes.length === 0 ? (
                    <div style={{ padding: '1rem 0', color: '#94a3b8', fontSize: '0.85rem' }}>
                      No notes recorded for this contact yet.
                    </div>
                  ) : (
                    <div className="timeline-list">
                      {notes.map(note => (
                        <div key={note._id} className="timeline-item">
                          <div className="timeline-dot"></div>
                          <div className="timeline-content-card">
                            <div className="timeline-meta">
                              <span style={{ fontWeight: 600, color: '#475569' }}>
                                {note.authorId?.name || 'Unknown'} ({note.authorId?.role || 'User'})
                              </span>
                              <span>
                                {new Date(note.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ' + new Date(note.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            <p style={{ fontSize: '0.875rem', color: '#1e293b', whiteSpace: 'pre-wrap' }}>{note.content}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

            </React.Fragment>
          ) : (
            <div className="flex-center" style={{ flex: 1, flexDirection: 'column', color: '#94a3b8', padding: '2rem', textAlign: 'center' }}>
              <FaUsers style={{ fontSize: '3rem', marginBottom: '1rem' }} />
              {contacts.length === 0 ? (
                <React.Fragment>
                  <p style={{ fontWeight: 600, color: '#64748b', marginBottom: '0.5rem' }}>No contacts in this workspace yet</p>
                  <p style={{ fontSize: '0.85rem', maxWidth: '320px', margin: '0 auto', lineHeight: 1.5 }}>
                    Click the <strong>Add Contact</strong> button in the top right to create your first contact and start tracking pipeline deals, notes, and AI insights.
                  </p>
                </React.Fragment>
              ) : (
                <p>Select a contact from the list to view their relationship pipeline, notes history, and AI insights.</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit Contact Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">{modalMode === 'add' ? 'Add Contact' : 'Edit Contact'}</h3>
              <button onClick={() => setShowModal(false)} className="modal-close-btn">&times;</button>
            </div>

            <form onSubmit={handleSaveContact}>
              <div className="modal-body">
                {formError && (
                  <div className="alert alert-danger" id="contact-form-error">
                    {formError}
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label" htmlFor="contact-name">Full Name</label>
                  <input
                    type="text"
                    id="contact-name"
                    className="form-control"
                    placeholder="John Doe"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="contact-email">Email Address</label>
                  <input
                    type="email"
                    id="contact-email"
                    className="form-control"
                    placeholder="john@email.com"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="contact-phone">Phone Number</label>
                  <input
                    type="text"
                    id="contact-phone"
                    className="form-control"
                    placeholder="+1 555-0100"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="contact-tags">Tags (comma-separated)</label>
                  <input
                    type="text"
                    id="contact-tags"
                    className="form-control"
                    placeholder="Enterprise, VIP, Retailer"
                    value={formData.tags}
                    onChange={e => setFormData({ ...formData, tags: e.target.value })}
                  />
                  <span style={{ fontSize: '0.7rem', color: '#64748b' }}>e.g. SMB, Tech Lead (will be split by commas)</span>
                </div>

                {user.role === 'Admin' && (
                  <div className="form-group">
                    <label className="form-label" htmlFor="contact-owner">Assign Owner</label>
                    <select
                      id="contact-owner"
                      className="form-control"
                      value={formData.ownerId}
                      onChange={e => setFormData({ ...formData, ownerId: e.target.value })}
                    >
                      <option value="">Select Company Rep</option>
                      {users.map(u => (
                        <option key={u._id} value={u._id}>{u.name} ({u.role})</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" id="btn-submit-contact-form">
                  {modalMode === 'add' ? 'Create Contact' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
