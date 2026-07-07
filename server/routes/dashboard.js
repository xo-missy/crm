import express from 'express';
import Deal from '../models/Deal.js';
import Ticket from '../models/Ticket.js';
import Contact from '../models/Contact.js';
import User from '../models/User.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// @route   GET /api/dashboard/stats
// @desc    Get aggregated stats for dashboard reports (role-aware)
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const { role, companyId, id: userId } = req.user;

    const stats = {
      pipelineByStage: [],
      wonLostDeals: { won: 0, lost: 0, wonValue: 0, lostValue: 0 },
      ticketStats: { open: 0, inProgress: 0, resolved: 0, closed: 0 },
      topReps: [],
      summaryCards: {
        totalContacts: 0,
        totalDealsValue: 0,
        activeDealsCount: 0,
        openTicketsCount: 0,
      }
    };

    // 1. Summary Card Calculations
    if (role === 'Admin') {
      stats.summaryCards.totalContacts = await Contact.countDocuments({ companyId });
      const activeDeals = await Deal.find({ companyId, stage: { $nin: ['Won', 'Lost'] } });
      stats.summaryCards.activeDealsCount = activeDeals.length;
      stats.summaryCards.totalDealsValue = activeDeals.reduce((sum, d) => sum + d.value, 0);
      stats.summaryCards.openTicketsCount = await Ticket.countDocuments({ companyId, status: { $in: ['Open', 'In Progress'] } });
    } else if (role === 'Sales Rep') {
      stats.summaryCards.totalContacts = await Contact.countDocuments({ companyId, ownerId: userId });
      const activeDeals = await Deal.find({ companyId, ownerId: userId, stage: { $nin: ['Won', 'Lost'] } });
      stats.summaryCards.activeDealsCount = activeDeals.length;
      stats.summaryCards.totalDealsValue = activeDeals.reduce((sum, d) => sum + d.value, 0);
      stats.summaryCards.openTicketsCount = 0; // Reps don't manage tickets
    } else if (role === 'Support Agent') {
      stats.summaryCards.totalContacts = await Contact.countDocuments({ companyId });
      stats.summaryCards.activeDealsCount = 0;
      stats.summaryCards.totalDealsValue = 0;
      stats.summaryCards.openTicketsCount = await Ticket.countDocuments({ companyId, assignedTo: userId, status: { $in: ['Open', 'In Progress'] } });
    }

    // 2. Deals / Pipeline metrics (Only for Admin & Sales Rep)
    if (role === 'Admin' || role === 'Sales Rep') {
      const dealQuery = { companyId };
      if (role === 'Sales Rep') {
        dealQuery.ownerId = userId;
      }

      const deals = await Deal.find(dealQuery);

      // Group pipeline value by stage
      const stageMap = { Lead: 0, Contacted: 0, Proposal: 0, Negotiation: 0, Won: 0, Lost: 0 };
      deals.forEach(deal => {
        if (stageMap[deal.stage] !== undefined) {
          stageMap[deal.stage] += deal.value;
        }
      });

      stats.pipelineByStage = Object.keys(stageMap).map(stage => ({
        stage,
        value: stageMap[stage]
      }));

      // Won vs Lost stats
      deals.forEach(deal => {
        if (deal.stage === 'Won') {
          stats.wonLostDeals.won++;
          stats.wonLostDeals.wonValue += deal.value;
        } else if (deal.stage === 'Lost') {
          stats.wonLostDeals.lost++;
          stats.wonLostDeals.lostValue += deal.value;
        }
      });
    }

    // 3. Ticket Stats (For Admins and Support Agents)
    if (role === 'Admin' || role === 'Support Agent') {
      const ticketQuery = { companyId };
      if (role === 'Support Agent') {
        ticketQuery.assignedTo = userId;
      }

      const tickets = await Ticket.find(ticketQuery);
      
      tickets.forEach(ticket => {
        if (ticket.status === 'Open') stats.ticketStats.open++;
        else if (ticket.status === 'In Progress') stats.ticketStats.inProgress++;
        else if (ticket.status === 'Resolved') stats.ticketStats.resolved++;
        else if (ticket.status === 'Closed') stats.ticketStats.closed++;
      });
    }

    // 4. Top Performing Reps (Leaderboard - Admin only)
    if (role === 'Admin') {
      const wonDeals = await Deal.find({ companyId, stage: 'Won' }).populate('ownerId', 'name');
      
      const repEarningsMap = {};
      wonDeals.forEach(deal => {
        if (deal.ownerId) {
          const repId = deal.ownerId._id.toString();
          const name = deal.ownerId.name;
          if (!repEarningsMap[repId]) {
            repEarningsMap[repId] = { name, value: 0 };
          }
          repEarningsMap[repId].value += deal.value;
        }
      });

      stats.topReps = Object.values(repEarningsMap)
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);
    }

    res.json(stats);
  } catch (error) {
    console.error('Fetch dashboard stats error:', error);
    res.status(500).json({ message: 'Server error generating dashboard statistics' });
  }
});

export default router;
