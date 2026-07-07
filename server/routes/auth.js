import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/User.js';
import Company from '../models/Company.js';
import { authenticateToken } from '../middleware/auth.js';
import { sendWelcomeEmail, sendPasswordResetEmail } from '../services/emailService.js';

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_jwt_secret_key_12345';

// Helper to generate 6-character invite code
function generateInviteCode() {
  return crypto.randomBytes(3).toString('hex').toUpperCase();
}

// @route   POST /api/auth/signup
// @desc    Register a new user & create/join a company
router.post('/signup', async (req, res) => {
  const { name, email, password, companyName, inviteCode, role } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email, and password are required' });
  }

  try {
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    let companyId;
    let finalRole = role || 'Sales Rep';
    let resolvedCompanyName = '';

    if (companyName) {
      // Creating a new company (Admin role)
      let uniqueCode = generateInviteCode();
      // Ensure unique code
      while (await Company.findOne({ inviteCode: uniqueCode })) {
        uniqueCode = generateInviteCode();
      }

      const newCompany = new Company({
        name: companyName,
        inviteCode: uniqueCode,
      });
      await newCompany.save();

      companyId = newCompany._id;
      finalRole = 'Admin';
      resolvedCompanyName = newCompany.name;
    } else if (inviteCode) {
      // Joining an existing company
      const company = await Company.findOne({ inviteCode: inviteCode.toUpperCase() });
      if (!company) {
        return res.status(400).json({ message: 'Invalid invite code' });
      }
      companyId = company._id;
      resolvedCompanyName = company.name;
      
      if (finalRole === 'Admin') {
        return res.status(400).json({ message: 'Cannot join an existing company as Admin' });
      }
    } else {
      return res.status(400).json({ message: 'Must either specify a company name to create or an invite code to join' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create User
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      role: finalRole,
      companyId,
    });

    await newUser.save();

    // Send Welcome Email
    await sendWelcomeEmail(newUser, resolvedCompanyName);

    // Generate JWT
    const token = jwt.sign({ id: newUser._id }, JWT_SECRET, { expiresIn: '1d' });

    res.status(201).json({
      token,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        companyId,
      },
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ message: 'Server error during signup' });
  }
});

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '1d' });

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        companyId: user.companyId,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user profile
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ message: 'Server error fetching profile' });
  }
});

// Simple memory store for reset tokens since we aren't creating a dedicated token schema
const resetTokens = new Map();

// @route   POST /api/auth/forgot-password
// @desc    Send password reset email
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      // Return 200 even if user doesn't exist for security
      return res.json({ message: 'If an account exists with that email, a password reset link has been sent.' });
    }

    const resetToken = crypto.randomBytes(20).toString('hex');
    const expiry = Date.now() + 3600000; // 1 hour from now

    resetTokens.set(resetToken, { userId: user._id, expiry });

    await sendPasswordResetEmail(user, resetToken);

    res.json({ message: 'If an account exists with that email, a password reset link has been sent.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Server error processing password reset request' });
  }
});

// @route   POST /api/auth/reset-password
// @desc    Reset password
router.post('/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return res.status(400).json({ message: 'Token and new password are required' });
  }

  try {
    const record = resetTokens.get(token);
    if (!record || record.expiry < Date.now()) {
      return res.status(400).json({ message: 'Invalid or expired password reset token' });
    }

    const user = await User.findById(record.userId);
    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }

    // Update password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    // Invalidate token
    resetTokens.delete(token);

    res.json({ message: 'Password has been reset successfully. You can now log in.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Server error resetting password' });
  }
});

export default router;
