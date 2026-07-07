import express from 'express';
import Notification from '../models/Notification.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// @route   GET /api/notifications
// @desc    Get all notifications for logged-in user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const notifications = await Notification.find({
      userId: req.user.id,
      companyId: req.user.companyId,
    }).sort({ createdAt: -1 }).limit(30);

    res.json(notifications);
  } catch (error) {
    console.error('Fetch notifications error:', error);
    res.status(500).json({ message: 'Server error fetching notifications' });
  }
});

// @route   PUT /api/notifications/read-all
// @desc    Mark all notifications for logged-in user as read
router.put('/read-all', authenticateToken, async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.user.id, companyId: req.user.companyId, read: false },
      { $set: { read: true } }
    );
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Mark read-all notifications error:', error);
    res.status(500).json({ message: 'Server error updating notifications' });
  }
});

// @route   PUT /api/notifications/:id
// @desc    Mark a specific notification as read
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      userId: req.user.id,
      companyId: req.user.companyId,
    });

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    notification.read = true;
    await notification.save();

    res.json(notification);
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({ message: 'Server error updating notification' });
  }
});

export default router;
