import mongoose from 'mongoose';

const dealSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  value: {
    type: Number,
    required: true,
    min: 0,
  },
  stage: {
    type: String,
    enum: ['Lead', 'Contacted', 'Proposal', 'Negotiation', 'Won', 'Lost'],
    default: 'Lead',
    required: true,
  },
  contactId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Contact',
    required: true,
    index: true,
  },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true,
  },
  expectedCloseDate: {
    type: Date,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Deal = mongoose.model('Deal', dealSchema);
export default Deal;
