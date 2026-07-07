import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { 
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie
} from 'recharts';
import { FaUsers, FaHandshake, FaTicketAlt, FaDollarSign } from 'react-icons/fa';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#06b6d4', '#6366f1', '#ec4899'];
const TICKET_COLORS = {
  open: '#ef4444',
  inProgress: '#f59e0b',
  resolved: '#10b981',
  closed: '#64748b'
};

export default function Dashboard() {
  const { apiCall, user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function fetchDashboardStats() {
    try {
      setLoading(true);
      setError('');
      const data = await apiCall('/api/dashboard/stats');
      setStats(data);
    } catch (err) {
      setError(err.message || 'Failed to fetch dashboard metrics.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  if (loading) {
    return (
      <div className="loading-container flex-center">
        <div className="spinner"></div>
        <p>Generating real-time analytics dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger" style={{ margin: '2rem' }} id="dashboard-error-alert">
        {error}
      </div>
    );
  }

  if (!stats) return null;

  const { summaryCards, pipelineByStage, wonLostDeals, ticketStats, topReps } = stats;

  // Prepare ticket pie data
  const ticketPieData = [
    { name: 'Open', value: ticketStats.open, color: TICKET_COLORS.open },
    { name: 'In Progress', value: ticketStats.inProgress, color: TICKET_COLORS.inProgress },
    { name: 'Resolved', value: ticketStats.resolved, color: TICKET_COLORS.resolved },
    { name: 'Closed', value: ticketStats.closed, color: TICKET_COLORS.closed }
  ].filter(t => t.value > 0);

  // Prepare won/lost deal comparison data
  const dealsPieData = [
    { name: 'Won Deals', value: wonLostDeals.wonValue || 0, color: '#10b981' },
    { name: 'Lost Deals', value: wonLostDeals.lostValue || 0, color: '#ef4444' }
  ].filter(d => d.value > 0);

  return (
    <div>
      <div className="section-header">
        <h2 className="section-title">Welcome, {user.name}</h2>
        <span style={{ fontSize: '0.875rem', color: '#64748b' }}>
          Workspace ID: <strong>{user.companyId.slice(-6).toUpperCase()}</strong>
        </span>
      </div>

      {/* Summary Cards */}
      <div className="dashboard-grid">
        <div className="card" id="card-total-contacts">
          <div className="card-icon-wrapper">
            <div>
              <div className="card-title">Total Contacts</div>
              <div className="card-value">{summaryCards.totalContacts}</div>
            </div>
            <div className="card-icon" style={{ backgroundColor: '#eff6ff', color: '#3b82f6' }}>
              <FaUsers />
            </div>
          </div>
        </div>

        {(user.role === 'Admin' || user.role === 'Sales Rep') && (
          <React.Fragment>
            <div className="card" id="card-pipeline-value">
              <div className="card-icon-wrapper">
                <div>
                  <div className="card-title">Pipeline Value</div>
                  <div className="card-value">
                    ${summaryCards.totalDealsValue.toLocaleString(undefined, { minimumFractionDigits: 0 })}
                  </div>
                </div>
                <div className="card-icon" style={{ backgroundColor: '#ecfdf5', color: '#10b981' }}>
                  <FaDollarSign />
                </div>
              </div>
            </div>

            <div className="card" id="card-active-deals">
              <div className="card-icon-wrapper">
                <div>
                  <div className="card-title">Active Deals</div>
                  <div className="card-value">{summaryCards.activeDealsCount}</div>
                </div>
                <div className="card-icon" style={{ backgroundColor: '#fef3c7', color: '#f59e0b' }}>
                  <FaHandshake />
                </div>
              </div>
            </div>
          </React.Fragment>
        )}

        {(user.role === 'Admin' || user.role === 'Support Agent') && (
          <div className="card" id="card-open-tickets">
            <div className="card-icon-wrapper">
              <div>
                <div className="card-title">Open Tickets</div>
                <div className="card-value">{summaryCards.openTicketsCount}</div>
              </div>
              <div className="card-icon" style={{ backgroundColor: '#fef2f2', color: '#ef4444' }}>
                <FaTicketAlt />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Analytics Charts Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '2rem', marginTop: '2rem' }}>
        
        {/* Chart 1: Pipeline Stage Value (Only for Admin & Sales Rep) */}
        {(user.role === 'Admin' || user.role === 'Sales Rep') && (
          <div className="card" style={{ display: 'flex', flexDirection: 'column' }} id="chart-pipeline-stage">
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1.5rem', color: '#1e293b' }}>
              Pipeline Value by Stage
            </h3>
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <BarChart data={pipelineByStage} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="stage" tickLine={false} axisLine={false} style={{ fontSize: '0.75rem', fill: '#64748b' }} />
                  <YAxis tickLine={false} axisLine={false} style={{ fontSize: '0.75rem', fill: '#64748b' }} tickFormatter={val => `$${val}`} />
                  <Tooltip formatter={value => [`$${value.toLocaleString()}`, 'Value']} contentStyle={{ borderRadius: '0.5rem', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {pipelineByStage.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Chart 2: Won vs Lost Deals Value (Only for Admin & Sales Rep) */}
        {(user.role === 'Admin' || user.role === 'Sales Rep') && wonLostDeals && (dealsPieData.length > 0) && (
          <div className="card" style={{ display: 'flex', flexDirection: 'column' }} id="chart-won-lost-deals">
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1.5rem', color: '#1e293b' }}>
              Deals Value (Won vs Lost)
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
              <div style={{ width: '60%', height: '100%' }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={dealsPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {dealsPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={value => [`$${value.toLocaleString()}`, 'Value']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#10b981', display: 'inline-block' }}></span>
                  <span>Won: <strong>${wonLostDeals.wonValue.toLocaleString()}</strong> ({wonLostDeals.won} deals)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#ef4444', display: 'inline-block' }}></span>
                  <span>Lost: <strong>${wonLostDeals.lostValue.toLocaleString()}</strong> ({wonLostDeals.lost} deals)</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Chart 3: Ticket Volume by Status (Only for Admin & Support Agent) */}
        {(user.role === 'Admin' || user.role === 'Support Agent') && ticketPieData.length > 0 && (
          <div className="card" style={{ display: 'flex', flexDirection: 'column' }} id="chart-ticket-status">
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1.5rem', color: '#1e293b' }}>
              Tickets by Status
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
              <div style={{ width: '60%', height: '100%' }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={ticketPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={0}
                      outerRadius={85}
                      dataKey="value"
                    >
                      {ticketPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={value => [value, 'Tickets']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem' }}>
                {Object.keys(TICKET_COLORS).map(status => {
                  const val = ticketStats[status] || 0;
                  return (
                    <div key={status} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: TICKET_COLORS[status], display: 'inline-block' }}></span>
                      <span style={{ textTransform: 'capitalize' }}>
                        {status.replace(/([A-Z])/g, ' $1')}: <strong>{val}</strong>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Leaderboard Table (Admin only) */}
        {user.role === 'Admin' && (
          <div className="card" style={{ display: 'flex', flexDirection: 'column' }} id="leaderboard-sales-reps">
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: '#1e293b' }}>
              Top Performing Sales Reps
            </h3>
            <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '1rem' }}>
              Based on cumulative value of deals in Won stage.
            </p>
            {topReps.length === 0 ? (
              <div style={{ padding: '2rem', textAlignment: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
                No completed deal revenues recorded yet.
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Sales Representative</th>
                      <th className="text-right">Won Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topReps.map((rep, idx) => (
                      <tr key={idx}>
                        <td style={{ fontWeight: 600 }}>{rep.name}</td>
                        <td className="text-right" style={{ color: '#10b981', fontWeight: 700 }}>
                          ${rep.value.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
