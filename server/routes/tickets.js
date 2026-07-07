import express from 'express';
import Ticket from '../models/Ticket.js';
import Contact from '../models/Contact.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { sendTicketAssignmentEmail } from '../services/emailService.js';

const router = express.Router();

// Helper to handle ticket assignment notifications
async function handleTicketAssignmentNotification(ticket, previousAssignedTo, modifierUser) {
  const newAssignedId = ticket.assignedTo.toString();

  // Trigger notification if assigned to another user (and not self-assigned)
  if (newAssignedId !== previousAssignedTo && newAssignedId !== modifierUser.id) {
    try {
      const assignedUser = await User.findById(newAssignedId);
      const contact = await Contact.findById(ticket.contactId);
      const contactName = contact ? contact.name : 'Unknown Contact';

      if (assignedUser) {
        // Create in-app notification
        const notification = new Notification({
          title: 'New Ticket Assigned',
          message: `You have been assigned to the support ticket: "${ticket.subject}" for ${contactName}.`,
          userId: assignedUser._id,
          companyId: ticket.companyId,
        });
        await notification.save();

        // Send email
        await sendTicketAssignmentEmail(assignedUser, ticket, contactName);
      }
    } catch (err) {
      console.error('Error sending ticket assignment notification:', err);
    }
  }
}

// @route   GET /api/tickets
// @desc    Get all tickets for the company
router.get('/', authenticateToken, requireRole(['Admin', 'Support Agent']), async (req, res) => {
  try {
    const query = { companyId: req.user.companyId };

    const tickets = await Ticket.find(query)
      .populate('contactId', 'name email phone')
      .populate('assignedTo', 'name email role')
      .sort({ createdAt: -1 });

    res.json(tickets);
  } catch (error) {
    console.error('Fetch tickets error:', error);
    res.status(500).json({ message: 'Server error fetching tickets' });
  }
});

// @route   POST /api/tickets
// @desc    Create a new support ticket
router.post('/', authenticateToken, requireRole(['Admin', 'Support Agent']), async (req, res) => {
  const { subject, description, status, contactId, assignedTo } = req.body;

  if (!subject || !description || !contactId) {
    return res.status(400).json({ message: 'Subject, description, and contactId are required' });
  }

  try {
    // Verify contact belongs to same company
    const contact = await Contact.findOne({ _id: contactId, companyId: req.user.companyId });
    if (!contact) {
      return res.status(404).json({ message: 'Contact not found' });
    }

    // Default assignee is creator
    let assignedUserId = assignedTo || req.user.id;

    // Verify assignee is member of same company
    if (assignedTo) {
      const userExists = await User.findOne({ _id: assignedTo, companyId: req.user.companyId });
      if (!userExists) {
        return res.status(400).json({ message: 'Assigned agent must belong to your company' });
      }
    }

    const newTicket = new Ticket({
      subject,
      description,
      status: status || 'Open',
      contactId,
      assignedTo: assignedUserId,
      companyId: req.user.companyId,
    });

    await newTicket.save();

    // Trigger notification
    await handleTicketAssignmentNotification(newTicket, null, req.user);

    const populatedTicket = await Ticket.findById(newTicket._id)
      .populate('contactId', 'name email phone')
      .populate('assignedTo', 'name email role');

    res.status(201).json(populatedTicket);
  } catch (error) {
    console.error('Create ticket error:', error);
    res.status(500).json({ message: 'Server error creating ticket' });
  }
});

// @route   PUT /api/tickets/:id
// @desc    Update a ticket
router.put('/:id', authenticateToken, requireRole(['Admin', 'Support Agent']), async (req, res) => {
  const { subject, description, status, contactId, assignedTo } = req.body;

  try {
    const ticket = await Ticket.findOne({ _id: req.params.id, companyId: req.user.companyId });
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    const previousAssignedTo = ticket.assignedTo.toString();

    if (subject) ticket.subject = subject;
    if (description) ticket.description = description;
    if (status) ticket.status = status;

    if (contactId) {
      const contact = await Contact.findOne({ _id: contactId, companyId: req.user.companyId });
      if (!contact) {
        return res.status(404).json({ message: 'Contact not found' });
      }
      ticket.contactId = contactId;
    }

    if (assignedTo) {
      const userExists = await User.findOne({ _id: assignedTo, companyId: req.user.companyId });
      if (!userExists) {
        return res.status(400).json({ message: 'Assigned agent must belong to your company' });
      }
      ticket.assignedTo = assignedTo;
    }

    await ticket.save();

    // Trigger notification
    await handleTicketAssignmentNotification(ticket, previousAssignedTo, req.user);

    const populatedTicket = await Ticket.findById(ticket._id)
      .populate('contactId', 'name email phone')
      .populate('assignedTo', 'name email role');

    res.json(populatedTicket);
  } catch (error) {
    console.error('Update ticket error:', error);
    res.status(500).json({ message: 'Server error updating ticket' });
  }
});

// @route   DELETE /api/tickets/:id
// @desc    Delete a ticket
router.delete('/:id', authenticateToken, requireRole(['Admin', 'Support Agent']), async (req, res) => {
  try {
    const ticket = await Ticket.findOne({ _id: req.params.id, companyId: req.user.companyId });
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    await Ticket.deleteOne({ _id: ticket._id });
    res.json({ message: 'Ticket deleted successfully' });
  } catch (error) {
    console.error('Delete ticket error:', error);
    res.status(500).json({ message: 'Server error deleting ticket' });
  }
});

export default router;
