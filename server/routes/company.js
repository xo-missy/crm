import express from 'express';
import Company from '../models/Company.js';
import User from '../models/User.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// @route   GET /api/company/users
// @desc    Get all users belonging to the company (accessible by all to support assignments)
router.get('/users', authenticateToken, async (req, res) => {
  try {
    const users = await User.find({ companyId: req.user.companyId })
      .select('-password')
      .sort({ name: 1 });
    res.json(users);
  } catch (error) {
    console.error('Fetch company users error:', error);
    res.status(500).json({ message: 'Server error fetching company users' });
  }
});

// @route   PUT /api/company/users/:userId
// @desc    Update a company user's role (Admin only)
router.put('/users/:userId', authenticateToken, requireRole(['Admin']), async (req, res) => {
  const { role } = req.body;

  if (!role || !['Admin', 'Sales Rep', 'Support Agent'].includes(role)) {
    return res.status(400).json({ message: 'Invalid or missing role' });
  }

  try {
    const userToUpdate = await User.findOne({ _id: req.params.userId, companyId: req.user.companyId });
    if (!userToUpdate) {
      return res.status(404).json({ message: 'User not found in your company' });
    }

    // Protect self from changing own role (must remain Admin)
    if (userToUpdate._id.toString() === req.user.id) {
      return res.status(400).json({ message: 'Cannot modify your own Admin role' });
    }

    userToUpdate.role = role;
    await userToUpdate.save();

    res.json({
      id: userToUpdate._id,
      name: userToUpdate.name,
      email: userToUpdate.email,
      role: userToUpdate.role,
    });
  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({ message: 'Server error updating user role' });
  }
});

// @route   DELETE /api/company/users/:userId
// @desc    Remove a user from the company (Admin only)
router.delete('/users/:userId', authenticateToken, requireRole(['Admin']), async (req, res) => {
  try {
    const userToRemove = await User.findOne({ _id: req.params.userId, companyId: req.user.companyId });
    if (!userToRemove) {
      return res.status(404).json({ message: 'User not found in your company' });
    }

    // Admin cannot delete themselves
    if (userToRemove._id.toString() === req.user.id) {
      return res.status(400).json({ message: 'Cannot remove yourself from the company' });
    }

    await User.deleteOne({ _id: userToRemove._id });
    res.json({ message: 'User successfully removed from the company' });
  } catch (error) {
    console.error('Remove user error:', error);
    res.status(500).json({ message: 'Server error removing user' });
  }
});

// @route   GET /api/company/settings
// @desc    Get company settings (Admin only)
router.get('/settings', authenticateToken, requireRole(['Admin']), async (req, res) => {
  try {
    const company = await Company.findById(req.user.companyId);
    if (!company) {
      return res.status(404).json({ message: 'Company settings not found' });
    }
    res.json(company);
  } catch (error) {
    console.error('Fetch settings error:', error);
    res.status(500).json({ message: 'Server error fetching company settings' });
  }
});

// @route   PUT /api/company/settings
// @desc    Update company settings (Admin only)
router.put('/settings', authenticateToken, requireRole(['Admin']), async (req, res) => {
  const { name } = req.body;

  if (!name || name.trim() === '') {
    return res.status(400).json({ message: 'Company name is required' });
  }

  try {
    const company = await Company.findById(req.user.companyId);
    if (!company) {
      return res.status(404).json({ message: 'Company settings not found' });
    }

    company.name = name;
    await company.save();

    res.json(company);
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ message: 'Server error updating company settings' });
  }
});

export default router;
