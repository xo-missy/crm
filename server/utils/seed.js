import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import Company from '../models/Company.js';
import User from '../models/User.js';
import Contact from '../models/Contact.js';
import Deal from '../models/Deal.js';
import Ticket from '../models/Ticket.js';
import Note from '../models/Note.js';
import Notification from '../models/Notification.js';

dotenv.config();

const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/multi-tenant-crm';

async function seed() {
  console.log('Connecting to database:', mongoURI);
  await mongoose.connect(mongoURI);
  console.log('Wiping existing data...');

  await Company.deleteMany({});
  await User.deleteMany({});
  await Contact.deleteMany({});
  await Deal.deleteMany({});
  await Ticket.deleteMany({});
  await Note.deleteMany({});
  await Notification.deleteMany({});

  console.log('Generating seed data...');

  const salt = await bcrypt.genSalt(10);
  const commonPassword = await bcrypt.hash('password123', salt);

  // --- COMPANY 1: Acme Corp ---
  const company1 = new Company({
    name: 'Acme Industrial',
    inviteCode: 'ACME12',
  });
  await company1.save();

  // Users for Acme
  const admin1 = new User({
    name: 'Alice Admin',
    email: 'alice@acme.com',
    password: commonPassword,
    role: 'Admin',
    companyId: company1._id,
  });
  const rep1 = new User({
    name: 'Bob Rep',
    email: 'bob@acme.com',
    password: commonPassword,
    role: 'Sales Rep',
    companyId: company1._id,
  });
  const support1 = new User({
    name: 'Charlie Support',
    email: 'charlie@acme.com',
    password: commonPassword,
    role: 'Support Agent',
    companyId: company1._id,
  });
  await Promise.all([admin1.save(), rep1.save(), support1.save()]);

  // Contacts for Acme
  const contact1_1 = new Contact({
    name: 'John Doe',
    email: 'john.doe@gmail.com',
    phone: '+1 555-0199',
    tags: ['Enterprise', 'Tech Lead'],
    ownerId: rep1._id,
    companyId: company1._id,
  });
  const contact1_2 = new Contact({
    name: 'Jane Smith',
    email: 'jane.smith@yahoo.com',
    phone: '+1 555-0210',
    tags: ['SMB', 'Decision Maker'],
    ownerId: rep1._id,
    companyId: company1._id,
  });
  const contact1_3 = new Contact({
    name: 'Robert Johnson',
    email: 'rjohnson@corp.com',
    phone: '+1 555-0322',
    tags: ['Partner'],
    ownerId: admin1._id,
    companyId: company1._id,
  });
  await Promise.all([contact1_1.save(), contact1_2.save(), contact1_3.save()]);

  // Deals for Acme
  const deal1_1 = new Deal({
    title: 'Acme Cloud Integration',
    value: 12000,
    stage: 'Proposal',
    contactId: contact1_1._id,
    ownerId: rep1._id,
    companyId: company1._id,
    expectedCloseDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days out
  });
  const deal1_2 = new Deal({
    title: 'SMB CRM Licensing',
    value: 3500,
    stage: 'Won',
    contactId: contact1_2._id,
    ownerId: rep1._id,
    companyId: company1._id,
    expectedCloseDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
  });
  const deal1_3 = new Deal({
    title: 'Strategic Reseller Program',
    value: 50000,
    stage: 'Negotiation',
    contactId: contact1_3._id,
    ownerId: admin1._id,
    companyId: company1._id,
    expectedCloseDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
  });
  await Promise.all([deal1_1.save(), deal1_2.save(), deal1_3.save()]);

  // Tickets for Acme
  const ticket1_1 = new Ticket({
    subject: 'Unable to access dashboard login',
    description: 'User gets a 403 error on trying to load the admin profile dashboard after password resets.',
    status: 'Open',
    contactId: contact1_1._id,
    assignedTo: support1._id,
    companyId: company1._id,
  });
  const ticket1_2 = new Ticket({
    subject: 'Billing inquiry',
    description: 'Wants to upgrade subscription and pay annually. Needs invoice generated.',
    status: 'In Progress',
    contactId: contact1_2._id,
    assignedTo: support1._id,
    companyId: company1._id,
  });
  await Promise.all([ticket1_1.save(), ticket1_2.save()]);

  // Notes for Acme
  const note1_1 = new Note({
    content: 'Initial discovery call went great. John was interested in server-side scaling.',
    contactId: contact1_1._id,
    authorId: rep1._id,
    companyId: company1._id,
  });
  const note1_2 = new Note({
    content: 'Emailed the proposal contract over. Awaiting feedback from their legal team.',
    contactId: contact1_1._id,
    authorId: rep1._id,
    companyId: company1._id,
  });
  const note1_3 = new Note({
    content: 'Jane requested a discount on annual licenses. Agreed to 10% off list price.',
    contactId: contact1_2._id,
    authorId: rep1._id,
    companyId: company1._id,
  });
  await Promise.all([note1_1.save(), note1_2.save(), note1_3.save()]);

  // Notifications for Acme
  const notify1 = new Notification({
    title: 'New Deal Assigned',
    message: 'You have been assigned to the deal: Acme Cloud Integration.',
    userId: rep1._id,
    companyId: company1._id,
  });
  await notify1.save();


  // --- COMPANY 2: Innovate LLC ---
  const company2 = new Company({
    name: 'Innovate Digital',
    inviteCode: 'INNV99',
  });
  await company2.save();

  // Users for Innovate
  const admin2 = new User({
    name: 'Isaac Admin',
    email: 'isaac@innovate.com',
    password: commonPassword,
    role: 'Admin',
    companyId: company2._id,
  });
  const rep2 = new User({
    name: 'Rachel Rep',
    email: 'rachel@innovate.com',
    password: commonPassword,
    role: 'Sales Rep',
    companyId: company2._id,
  });
  const support2 = new User({
    name: 'Sam Support',
    email: 'sam@innovate.com',
    password: commonPassword,
    role: 'Support Agent',
    companyId: company2._id,
  });
  await Promise.all([admin2.save(), rep2.save(), support2.save()]);

  // Contacts for Innovate
  const contact2_1 = new Contact({
    name: 'David Miller',
    email: 'david.miller@innovatedigital.com',
    phone: '+1 555-0455',
    tags: ['Enterprise'],
    ownerId: rep2._id,
    companyId: company2._id,
  });
  const contact2_2 = new Contact({
    name: 'Sarah Connor',
    email: 'sconnor@resistance.net',
    phone: '+1 555-0800',
    tags: ['VIP', 'Urgent'],
    ownerId: admin2._id,
    companyId: company2._id,
  });
  await Promise.all([contact2_1.save(), contact2_2.save()]);

  // Deals for Innovate
  const deal2_1 = new Deal({
    title: 'Digital Transformation Phase 1',
    value: 85000,
    stage: 'Lead',
    contactId: contact2_1._id,
    ownerId: rep2._id,
    companyId: company2._id,
    expectedCloseDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
  });
  const deal2_2 = new Deal({
    title: 'Cyberdyne Security Audit',
    value: 15000,
    stage: 'Negotiation',
    contactId: contact2_2._id,
    ownerId: admin2._id,
    companyId: company2._id,
    expectedCloseDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
  });
  await Promise.all([deal2_1.save(), deal2_2.save()]);

  // Tickets for Innovate
  const ticket2_1 = new Ticket({
    subject: 'API integration returning 500 errors',
    description: 'When calling our webhook, their server times out and crashes.',
    status: 'Open',
    contactId: contact2_1._id,
    assignedTo: support2._id,
    companyId: company2._id,
  });
  await ticket2_1.save();


  console.log('Database successfully seeded!');
  console.log('Demo Login details:');
  console.log('------------------------------');
  console.log('Company: Acme Industrial (Invite Code: ACME12)');
  console.log(' - Admin: alice@acme.com / password123');
  console.log(' - Sales Rep: bob@acme.com / password123');
  console.log(' - Support: charlie@acme.com / password123');
  console.log('------------------------------');
  console.log('Company: Innovate Digital (Invite Code: INNV99)');
  console.log(' - Admin: isaac@innovate.com / password123');
  console.log(' - Sales Rep: rachel@innovate.com / password123');
  console.log(' - Support: sam@innovate.com / password123');
  console.log('------------------------------');

  await mongoose.disconnect();
}

seed().catch(err => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
