import express from 'express';
import Contact from '../models/Contact.js';
import Note from '../models/Note.js';
import Deal from '../models/Deal.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { generateLeadScore, generateContactSummary } from '../services/aiService.js';

const router = express.Router();

// Helper to fetch contact and its details for AI processing
async function getContactAndHistory(contactId, user, res) {
  const query = { _id: contactId, companyId: user.companyId };
  
  if (user.role === 'Sales Rep') {
    query.ownerId = user.id;
  }

  const contact = await Contact.findOne(query);
  if (!contact) {
    res.status(404).json({ message: 'Contact not found or access denied' });
    return null;
  }

  const notes = await Note.find({ contactId, companyId: user.companyId }).sort({ createdAt: -1 });
  const deals = await Deal.find({ contactId, companyId: user.companyId }).sort({ createdAt: -1 });

  return { contact, notes, deals };
}

// @route   POST /api/ai/score-lead/:contactId
// @desc    Generate a lead score for a contact
router.post('/score-lead/:contactId', authenticateToken, requireRole(['Admin', 'Sales Rep']), async (req, res) => {
  try {
    const data = await getContactAndHistory(req.params.contactId, req.user, res);
    if (!data) return;

    const result = await generateLeadScore(data);
    res.json(result);
  } catch (error) {
    console.error('Lead scoring route error:', error);
    res.status(500).json({ message: 'Server error generating lead score' });
  }
});

// @route   POST /api/ai/summarize-contact/:contactId
// @desc    Generate an interaction summary for a contact
router.post('/summarize-contact/:contactId', authenticateToken, requireRole(['Admin', 'Sales Rep']), async (req, res) => {
  try {
    const data = await getContactAndHistory(req.params.contactId, req.user, res);
    if (!data) return;

    const summary = await generateContactSummary(data);
    res.json({ summary });
  } catch (error) {
    console.error('Contact summary route error:', error);
    res.status(500).json({ message: 'Server error generating contact summary' });
  }
});

export default router;
