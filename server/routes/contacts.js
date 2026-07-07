import express from 'express';
import Contact from '../models/Contact.js';
import Note from '../models/Note.js';
import Deal from '../models/Deal.js';
import User from '../models/User.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Helper to check if a user has access to edit/delete a contact
async function checkContactOwnership(contactId, user, res) {
  const contact = await Contact.findOne({ _id: contactId, companyId: user.companyId });
  if (!contact) {
    res.status(404).json({ message: 'Contact not found' });
    return null;
  }

  // Sales Reps can only manage their own contacts
  if (user.role === 'Sales Rep' && contact.ownerId.toString() !== user.id) {
    res.status(403).json({ message: 'Forbidden: You do not own this contact' });
    return null;
  }

  return contact;
}

// @route   GET /api/contacts
// @desc    Get all contacts (scoped by tenant and role)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { search, tag } = req.query;
    let query = { companyId: req.user.companyId };

    // Role-based restrictions
    if (req.user.role === 'Sales Rep') {
      // Sales reps see only their own contacts
      query.ownerId = req.user.id;
    }

    // Filters
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    if (tag) {
      query.tags = tag;
    }

    const contacts = await Contact.find(query)
      .populate('ownerId', 'name email')
      .sort({ name: 1 });

    res.json(contacts);
  } catch (error) {
    console.error('Fetch contacts error:', error);
    res.status(500).json({ message: 'Server error fetching contacts' });
  }
});

// @route   POST /api/contacts
// @desc    Create a contact
router.post('/', authenticateToken, requireRole(['Admin', 'Sales Rep']), async (req, res) => {
  const { name, email, phone, tags, ownerId } = req.body;

  if (!name || !email) {
    return res.status(400).json({ message: 'Name and email are required' });
  }

  try {
    // If Sales Rep, force ownerId to be the active user. Admins can assign to anyone.
    let assignedOwnerId = req.user.role === 'Sales Rep' ? req.user.id : (ownerId || req.user.id);

    // Verify owner belongs to same company
    if (req.user.role === 'Admin' && ownerId) {
      const ownerExists = await User.findOne({ _id: ownerId, companyId: req.user.companyId });
      if (!ownerExists) {
        return res.status(400).json({ message: 'Assigned owner must be a member of your company' });
      }
    }

    const newContact = new Contact({
      name,
      email,
      phone,
      tags: tags || [],
      ownerId: assignedOwnerId,
      companyId: req.user.companyId,
    });

    await newContact.save();
    res.status(201).json(newContact);
  } catch (error) {
    console.error('Create contact error:', error);
    res.status(500).json({ message: 'Server error creating contact' });
  }
});

// @route   GET /api/contacts/:id
// @desc    Get contact details by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const contact = await Contact.findOne({ _id: req.params.id, companyId: req.user.companyId }).populate('ownerId', 'name email');
    if (!contact) {
      return res.status(404).json({ message: 'Contact not found' });
    }

    // Sales Rep can only access their own contacts
    if (req.user.role === 'Sales Rep' && contact.ownerId._id.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Forbidden: Access denied' });
    }

    res.json(contact);
  } catch (error) {
    console.error('Fetch contact details error:', error);
    res.status(500).json({ message: 'Server error fetching contact details' });
  }
});

// @route   PUT /api/contacts/:id
// @desc    Update a contact
router.put('/:id', authenticateToken, requireRole(['Admin', 'Sales Rep']), async (req, res) => {
  const { name, email, phone, tags, ownerId } = req.body;

  try {
    const contact = await checkContactOwnership(req.params.id, req.user, res);
    if (!contact) return; // Response is already handled inside helper

    if (name) contact.name = name;
    if (email) contact.email = email;
    if (phone !== undefined) contact.phone = phone;
    if (tags) contact.tags = tags;

    // Admin can reassign ownership
    if (req.user.role === 'Admin' && ownerId) {
      const ownerExists = await User.findOne({ _id: ownerId, companyId: req.user.companyId });
      if (!ownerExists) {
        return res.status(400).json({ message: 'Assigned owner must belong to your company' });
      }
      contact.ownerId = ownerId;
    }

    await contact.save();
    res.json(contact);
  } catch (error) {
    console.error('Update contact error:', error);
    res.status(500).json({ message: 'Server error updating contact' });
  }
});

// @route   DELETE /api/contacts/:id
// @desc    Delete a contact
router.delete('/:id', authenticateToken, requireRole(['Admin', 'Sales Rep']), async (req, res) => {
  try {
    const contact = await checkContactOwnership(req.params.id, req.user, res);
    if (!contact) return;

    // Delete associated notes and deals to maintain database integrity
    await Note.deleteMany({ contactId: contact._id, companyId: req.user.companyId });
    await Deal.deleteMany({ contactId: contact._id, companyId: req.user.companyId });
    await Contact.deleteOne({ _id: contact._id });

    res.json({ message: 'Contact and related deals/notes deleted successfully' });
  } catch (error) {
    console.error('Delete contact error:', error);
    res.status(500).json({ message: 'Server error deleting contact' });
  }
});

// --- NOTES SUB-ROUTES ---

// @route   GET /api/contacts/:contactId/notes
// @desc    Get all notes for a contact
router.get('/:contactId/notes', authenticateToken, async (req, res) => {
  const { contactId } = req.params;

  try {
    // Verify user can view the contact
    const contactQuery = { _id: contactId, companyId: req.user.companyId };
    if (req.user.role === 'Sales Rep') {
      contactQuery.ownerId = req.user.id;
    }
    const contact = await Contact.findOne(contactQuery);
    if (!contact) {
      return res.status(404).json({ message: 'Contact not found or access denied' });
    }

    const notes = await Note.find({ contactId, companyId: req.user.companyId })
      .populate('authorId', 'name role')
      .sort({ createdAt: -1 });

    res.json(notes);
  } catch (error) {
    console.error('Fetch notes error:', error);
    res.status(500).json({ message: 'Server error fetching notes' });
  }
});

// @route   POST /api/contacts/:contactId/notes
// @desc    Add a note to a contact
router.post('/:contactId/notes', authenticateToken, async (req, res) => {
  const { contactId } = req.params;
  const { content } = req.body;

  if (!content) {
    return res.status(400).json({ message: 'Note content is required' });
  }

  try {
    // Verify user can add notes to the contact (Support Agents can also view contacts, so they can add notes)
    const contactQuery = { _id: contactId, companyId: req.user.companyId };
    if (req.user.role === 'Sales Rep') {
      contactQuery.ownerId = req.user.id;
    }
    const contact = await Contact.findOne(contactQuery);
    if (!contact) {
      return res.status(404).json({ message: 'Contact not found or access denied' });
    }

    const newNote = new Note({
      content,
      contactId,
      authorId: req.user.id,
      companyId: req.user.companyId,
    });

    await newNote.save();
    
    const populatedNote = await Note.findById(newNote._id).populate('authorId', 'name role');
    res.status(201).json(populatedNote);
  } catch (error) {
    console.error('Add note error:', error);
    res.status(500).json({ message: 'Server error adding note' });
  }
});

export default router;
