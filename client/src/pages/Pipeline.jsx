import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { FaPlus, FaCalendarAlt, FaUser, FaDollarSign, FaTrash, FaPen, FaBriefcase } from 'react-icons/fa';

const STAGES = ['Lead', 'Contacted', 'Proposal', 'Negotiation', 'Won', 'Lost'];

export default function Pipeline() {
  const { apiCall, user, currency, formatCurrency, toDisplayValue, toDatabaseValue } = useAuth();
  
  const [deals, setDeals] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Deal Modal State
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' or 'edit'
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    value: '',
    stage: 'Lead',
    contactId: '',
    ownerId: '',
    expectedCloseDate: ''
  });
  const [formError, setFormError] = useState('');

  // Fetch all pipeline deals
  async function fetchDeals() {
    try {
      const data = await apiCall('/api/deals');
      setDeals(data);
    } catch (err) {
      setError(err.message || 'Failed to load pipeline deals.');
    }
  }

  // Fetch company contacts
  async function fetchContacts() {
    try {
      const data = await apiCall('/api/contacts');
      setContacts(data);
    } catch (err) {
      console.error('Failed to load contacts for deal association:', err.message);
    }
  }

  // Fetch company users (for owner select)
  async function fetchCompanyUsers() {
    if (user.role !== 'Admin') return;
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
      await Promise.all([fetchDeals(), fetchContacts(), fetchCompanyUsers()]);
    } catch (err) {
      setError(err.message || 'Error initializing pipeline workspace');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    initializeData();
  }, []);

  // Handle Drag & Drop
  async function handleDragEnd(result) {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId) return;

    const dealId = draggableId;
    const targetStage = destination.droppableId;

    // Optimistically update frontend state
    setDeals(prevDeals => prevDeals.map(d => 
      d._id === dealId ? { ...d, stage: targetStage } : d
    ));

    try {
      await apiCall(`/api/deals/${dealId}`, {
        method: 'PUT',
        body: JSON.stringify({ stage: targetStage })
      });
    } catch (err) {
      alert(err.message || 'Failed to persist deal stage.');
      // Rollback to original database values
      fetchDeals();
    }
  }

  // CRUD Trigger
  function openAddModal(initialStage = 'Lead') {
    setModalMode('add');
    setFormData({
      title: '',
      value: '',
      stage: initialStage,
      contactId: contacts.length > 0 ? contacts[0]._id : '',
      ownerId: user.id,
      expectedCloseDate: ''
    });
    setFormError('');
    setShowModal(true);
  }

  function openEditModal(deal) {
    setModalMode('edit');
    setSelectedDeal(deal);
    
    // Format date string for input type="date"
    let formattedDate = '';
    if (deal.expectedCloseDate) {
      const d = new Date(deal.expectedCloseDate);
      formattedDate = d.toISOString().split('T')[0];
    }

    setFormData({
      title: deal.title,
      value: toDisplayValue(deal.value),
      stage: deal.stage,
      contactId: deal.contactId ? (deal.contactId._id || deal.contactId) : '',
      ownerId: deal.ownerId ? (deal.ownerId._id || deal.ownerId) : user.id,
      expectedCloseDate: formattedDate
    });
    setFormError('');
    setShowModal(true);
  }

  async function handleSaveDeal(event) {
    event.preventDefault();
    setFormError('');

    if (!formData.title || formData.value === '' || !formData.contactId) {
      setFormError('Title, value, and associated contact are required.');
      return;
    }

    const valueNumber = parseFloat(formData.value);
    if (isNaN(valueNumber) || valueNumber < 0) {
      setFormError('Deal value must be a valid positive number.');
      return;
    }

    const body = {
      title: formData.title,
      value: toDatabaseValue(valueNumber),
      stage: formData.stage,
      contactId: formData.contactId,
      ownerId: formData.ownerId,
      expectedCloseDate: formData.expectedCloseDate || null
    };

    try {
      if (modalMode === 'add') {
        await apiCall('/api/deals', {
          method: 'POST',
          body: JSON.stringify(body)
        });
      } else {
        await apiCall(`/api/deals/${selectedDeal._id}`, {
          method: 'PUT',
          body: JSON.stringify(body)
        });
      }
      setShowModal(false);
      fetchDeals();
    } catch (err) {
      setFormError(err.message || 'Failed to save deal.');
    }
  }

  async function handleDeleteDeal() {
    if (!selectedDeal) return;
    const confirm = window.confirm(`Are you sure you want to delete this deal: "${selectedDeal.title}"?`);
    if (!confirm) return;

    try {
      await apiCall(`/api/deals/${selectedDeal._id}`, { method: 'DELETE' });
      setShowModal(false);
      fetchDeals();
    } catch (err) {
      alert(err.message || 'Failed to delete deal.');
    }
  }

  if (loading) {
    return (
      <div className="loading-container flex-center">
        <div className="spinner"></div>
        <p>Loading sales pipeline board...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger" style={{ margin: '2rem' }} id="pipeline-error-alert">
        {error}
      </div>
    );
  }

  return (
    <div style={{ height: '100%' }}>
      <div className="section-header">
        <h2 className="section-title">Sales Pipeline</h2>
        <button onClick={() => openAddModal('Lead')} className="btn btn-primary" id="btn-add-deal">
          <FaPlus /> Add Deal
        </button>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="kanban-board">
          {STAGES.map(stage => {
            const dealsInStage = deals.filter(d => d.stage === stage);
            const totalStageValue = dealsInStage.reduce((sum, d) => sum + d.value, 0);

            return (
              <div key={stage} className="kanban-column" id={`pipeline-column-${stage.toLowerCase()}`}>
                <div className="kanban-column-header">
                  <span>{stage} ({dealsInStage.length})</span>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                    {formatCurrency(totalStageValue)}
                  </span>
                </div>

                <Droppable droppableId={stage}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="kanban-card-list"
                      style={{ 
                        backgroundColor: snapshot.isDraggingOver ? '#f1f5f9' : 'transparent',
                        transition: 'background-color 0.2s ease'
                      }}
                    >
                      {dealsInStage.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#94a3b8', fontSize: '0.75rem' }}>
                          No deals here
                        </div>
                      ) : (
                        dealsInStage.map((deal, index) => {
                          const hasAccess = user.role === 'Admin' || deal.ownerId?._id === user.id || deal.ownerId === user.id;
                          return (
                            <Draggable 
                              key={deal._id} 
                              draggableId={deal._id} 
                              index={index}
                              isDragDisabled={!hasAccess}
                            >
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className="kanban-card"
                                  onClick={() => openEditModal(deal)}
                                  style={{
                                    ...provided.draggableProps.style,
                                    opacity: snapshot.isDragging ? 0.8 : 1,
                                    borderLeft: `3px solid ${
                                      stage === 'Won' 
                                        ? '#10b981' 
                                        : stage === 'Lost' 
                                          ? '#ef4444' 
                                          : '#3b82f6'
                                    }`
                                  }}
                                >
                                  <div className="kanban-card-title">{deal.title}</div>
                                  <div className="kanban-card-value">{formatCurrency(deal.value)}</div>
                                  
                                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                    <FaBriefcase style={{ color: '#94a3b8', fontSize: '0.65rem' }} />
                                    <span>{deal.contactId?.name || 'Contact'}</span>
                                  </div>

                                  <div className="kanban-card-footer">
                                    <span className="flex-center" style={{ gap: '0.25rem' }}>
                                      <FaUser style={{ fontSize: '0.6rem' }} /> 
                                      {deal.ownerId?.name ? deal.ownerId.name.split(' ')[0] : 'Rep'}
                                    </span>
                                    {deal.expectedCloseDate && (
                                      <span className="flex-center" style={{ gap: '0.25rem' }}>
                                        <FaCalendarAlt style={{ fontSize: '0.6rem' }} />
                                        {new Date(deal.expectedCloseDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          );
                        })
                      )}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>

      {/* Add / Edit Deal Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">{modalMode === 'add' ? 'Create Sales Deal' : 'Edit Sales Deal'}</h3>
              <button onClick={() => setShowModal(false)} className="modal-close-btn">&times;</button>
            </div>

            <form onSubmit={handleSaveDeal}>
              <div className="modal-body">
                {formError && (
                  <div className="alert alert-danger" id="deal-form-error">
                    {formError}
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label" htmlFor="deal-title">Deal Title</label>
                  <input
                    type="text"
                    id="deal-title"
                    className="form-control"
                    placeholder="Acme Annual Licensing"
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="deal-value">Deal Value ({currency === 'NGN' ? '₦' : '$'})</label>
                  <input
                    type="number"
                    id="deal-value"
                    className="form-control"
                    placeholder={currency === 'NGN' ? '24000000' : '15000'}
                    value={formData.value}
                    onChange={e => setFormData({ ...formData, value: e.target.value })}
                    min="0"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="deal-stage">Pipeline Stage</label>
                  <select
                    id="deal-stage"
                    className="form-control"
                    value={formData.stage}
                    onChange={e => setFormData({ ...formData, stage: e.target.value })}
                  >
                    {STAGES.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="deal-contact">Associated Contact</label>
                  <select
                    id="deal-contact"
                    className="form-control"
                    value={formData.contactId}
                    onChange={e => setFormData({ ...formData, contactId: e.target.value })}
                    required
                  >
                    <option value="" disabled>Select Contact</option>
                    {contacts.map(c => (
                      <option key={c._id} value={c._id}>{c.name} ({c.email})</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="deal-close-date">Expected Close Date</label>
                  <input
                    type="date"
                    id="deal-close-date"
                    className="form-control"
                    value={formData.expectedCloseDate}
                    onChange={e => setFormData({ ...formData, expectedCloseDate: e.target.value })}
                  />
                </div>

                {user.role === 'Admin' && (
                  <div className="form-group">
                    <label className="form-label" htmlFor="deal-owner">Assign Deal Owner</label>
                    <select
                      id="deal-owner"
                      className="form-control"
                      value={formData.ownerId}
                      onChange={e => setFormData({ ...formData, ownerId: e.target.value })}
                    >
                      <option value="">Select Rep</option>
                      {users.map(u => (
                        <option key={u._id} value={u._id}>{u.name} ({u.role})</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
                <div>
                  {modalMode === 'edit' && (
                    <button type="button" onClick={handleDeleteDeal} className="btn btn-danger" id="btn-delete-deal">
                      Delete Deal
                    </button>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" id="btn-submit-deal-form">
                    {modalMode === 'add' ? 'Create Deal' : 'Save Changes'}
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
