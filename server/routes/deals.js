import express from 'express';
import Deal from '../models/Deal.js';
import Contact from '../models/Contact.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { sendDealAssignmentEmail } from '../services/emailService.js';

const router = express.Router();

// Helper to check access and ownership of a deal
async function checkDealOwnership(dealId, user, res) {
  const deal = await Deal.findOne({ _id: dealId, companyId: user.companyId });
  if (!deal) {
    res.status(404).json({ message: 'Deal not found' });
    return null;
  }

  // Sales Reps can view shared pipeline but only modify their own deals
  if (user.role === 'Sales Rep' && deal.ownerId.toString() !== user.id) {
    res.status(403).json({ message: 'Forbidden: You do not own this deal' });
    return null;
  }

  return deal;
}

// Helper to handle deal assignment notifications
async function handleDealAssignmentNotification(deal, previousOwnerId, modifierUser) {
  const newOwnerId = deal.ownerId.toString();

  // Trigger notification if assigned to a new rep (and not self-assigned)
  if (newOwnerId !== previousOwnerId && newOwnerId !== modifierUser.id) {
    try {
      const assignedUser = await User.findById(newOwnerId);
      const contact = await Contact.findById(deal.contactId);
      const contactName = contact ? contact.name : 'Unknown Contact';

      if (assignedUser) {
        // Create in-app notification
        const notification = new Notification({
          title: 'New Deal Assigned',
          message: `You have been assigned to the deal: "${deal.title}" ($${deal.value}) for ${contactName}.`,
          userId: assignedUser._id,
          companyId: deal.companyId,
        });
        await notification.save();

        // Send email
        await sendDealAssignmentEmail(assignedUser, deal, contactName);
      }
    } catch (err) {
      console.error('Error sending deal assignment notification:', err);
    }
  }
}

// @route   GET /api/deals
// @desc    Get all deals (Admin/Sales Rep see the company pipeline)
router.get('/', authenticateToken, requireRole(['Admin', 'Sales Rep']), async (req, res) => {
  try {
    const query = { companyId: req.user.companyId };

    const deals = await Deal.find(query)
      .populate('contactId', 'name email phone')
      .populate('ownerId', 'name email')
      .sort({ createdAt: -1 });

    res.json(deals);
  } catch (error) {
    console.error('Fetch deals error:', error);
    res.status(500).json({ message: 'Server error fetching deals' });
  }
});

// @route   POST /api/deals
// @desc    Create a new deal
router.post('/', authenticateToken, requireRole(['Admin', 'Sales Rep']), async (req, res) => {
  const { title, value, stage, contactId, ownerId, expectedCloseDate } = req.body;

  if (!title || value === undefined || !contactId) {
    return res.status(400).json({ message: 'Title, value, and contactId are required' });
  }

  try {
    // Verify contact belongs to same company
    const contact = await Contact.findOne({ _id: contactId, companyId: req.user.companyId });
    if (!contact) {
      return res.status(404).json({ message: 'Contact not found' });
    }

    // Force Sales Rep to own their deals
    let assignedOwnerId = req.user.role === 'Sales Rep' ? req.user.id : (ownerId || req.user.id);

    // Verify owner belongs to same company
    if (req.user.role === 'Admin' && ownerId) {
      const ownerExists = await User.findOne({ _id: ownerId, companyId: req.user.companyId });
      if (!ownerExists) {
        return res.status(400).json({ message: 'Assigned owner must be a member of your company' });
      }
    }

    const newDeal = new Deal({
      title,
      value,
      stage: stage || 'Lead',
      contactId,
      ownerId: assignedOwnerId,
      companyId: req.user.companyId,
      expectedCloseDate,
    });

    await newDeal.save();

    // Trigger notification if assigned to another user
    await handleDealAssignmentNotification(newDeal, null, req.user);

    const populatedDeal = await Deal.findById(newDeal._id)
      .populate('contactId', 'name email phone')
      .populate('ownerId', 'name email');

    res.status(201).json(populatedDeal);
  } catch (error) {
    console.error('Create deal error:', error);
    res.status(500).json({ message: 'Server error creating deal' });
  }
});

// @route   PUT /api/deals/:id
// @desc    Update a deal
router.put('/:id', authenticateToken, requireRole(['Admin', 'Sales Rep']), async (req, res) => {
  const { title, value, stage, contactId, ownerId, expectedCloseDate } = req.body;

  try {
    const deal = await checkDealOwnership(req.params.id, req.user, res);
    if (!deal) return;

    const previousOwnerId = deal.ownerId.toString();

    if (title) deal.title = title;
    if (value !== undefined) deal.value = value;
    if (stage) deal.stage = stage;
    if (expectedCloseDate !== undefined) deal.expectedCloseDate = expectedCloseDate;

    if (contactId) {
      const contact = await Contact.findOne({ _id: contactId, companyId: req.user.companyId });
      if (!contact) {
        return res.status(404).json({ message: 'Contact not found' });
      }
      deal.contactId = contactId;
    }

    if (req.user.role === 'Admin' && ownerId) {
      const ownerExists = await User.findOne({ _id: ownerId, companyId: req.user.companyId });
      if (!ownerExists) {
        return res.status(400).json({ message: 'Assigned owner must belong to your company' });
      }
      deal.ownerId = ownerId;
    }

    await deal.save();

    // Handle notifications
    await handleDealAssignmentNotification(deal, previousOwnerId, req.user);

    const populatedDeal = await Deal.findById(deal._id)
      .populate('contactId', 'name email phone')
      .populate('ownerId', 'name email');

    res.json(populatedDeal);
  } catch (error) {
    console.error('Update deal error:', error);
    res.status(500).json({ message: 'Server error updating deal' });
  }
});

// @route   DELETE /api/deals/:id
// @desc    Delete a deal
router.delete('/:id', authenticateToken, requireRole(['Admin', 'Sales Rep']), async (req, res) => {
  try {
    const deal = await checkDealOwnership(req.params.id, req.user, res);
    if (!deal) return;

    await Deal.deleteOne({ _id: deal._id });
    res.json({ message: 'Deal deleted successfully' });
  } catch (error) {
    console.error('Delete deal error:', error);
    res.status(500).json({ message: 'Server error deleting deal' });
  }
});

export default router;
