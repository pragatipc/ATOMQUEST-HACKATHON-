import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { dbConnect } from '../lib/mongodb';
import User from '../models/User';
import Goal from '../models/Goal';
import Cycle from '../models/Cycle';
import EscalationRule from '../models/EscalationRule';
import Achievement from '../models/Achievement';
import CheckIn from '../models/CheckIn';
import AuditLog from '../models/AuditLog';
import { computeScore } from '../lib/scoring';

const FORCE = process.argv.includes('--force');

async function createUser(data: {
  name: string;
  email: string;
  password: string;
  role: 'employee' | 'manager' | 'admin';
  department?: string;
  managerId?: unknown;
}) {
  return User.create({ ...data, mustChangePassword: false, isActive: true });
}

async function seed() {
  try {
    await dbConnect();

    if (!FORCE && (await User.countDocuments()) > 0) {
      console.log('Database already has users. Run: npm run seed:reset');
      process.exit(0);
    }

    if (FORCE) {
      console.log('Resetting database...');
      await Promise.all([
        User.deleteMany({}),
        Goal.deleteMany({}),
        Cycle.deleteMany({}),
        EscalationRule.deleteMany({}),
        Achievement.deleteMany({}),
        CheckIn.deleteMany({}),
        AuditLog.deleteMany({}),
      ]);
    }

    console.log('Creating users...');

    const admin = await createUser({
      name: 'HR Admin',
      email: 'admin@company.com',
      password: 'Admin@123',
      role: 'admin',
      department: 'HR',
    });

    const rajesh = await createUser({
      name: 'Rajesh Kumar',
      email: 'rajesh@company.com',
      password: 'Manager@123',
      role: 'manager',
      department: 'Sales',
    });

    const priya = await createUser({
      name: 'Priya Sharma',
      email: 'priya@company.com',
      password: 'Manager@123',
      role: 'manager',
      department: 'Operations',
    });

    const pranav = await createUser({
      name: 'Pranav Chavan',
      email: 'pranavchavan2518@gmail.com',
      password: 'Pranav@123',
      role: 'manager',
      department: 'Sales',
    });

    await createUser({
      name: 'Pragati Chavan',
      email: 'pragatipchavan2808@gmail.com',
      password: 'Pragati@123',
      role: 'employee',
      department: 'Sales',
      managerId: pranav._id,
    });

    await createUser({
      name: 'Pradnya Chavan',
      email: 'pradnyachavan1706@gmail.com',
      password: 'Pradnya@123',
      role: 'employee',
      department: 'Sales',
      managerId: pranav._id,
    });

    const amit = await createUser({
      name: 'Amit Singh',
      email: 'amit@company.com',
      password: 'Emp@123',
      role: 'employee',
      managerId: rajesh._id,
      department: 'Sales',
    });

    const neha = await createUser({
      name: 'Neha Patel',
      email: 'neha@company.com',
      password: 'Emp@123',
      role: 'employee',
      managerId: rajesh._id,
      department: 'Sales',
    });

    const rohit = await createUser({
      name: 'Rohit Verma',
      email: 'rohit@company.com',
      password: 'Emp@123',
      role: 'employee',
      managerId: rajesh._id,
      department: 'Sales',
    });

    const sneha = await createUser({
      name: 'Sneha Joshi',
      email: 'sneha@company.com',
      password: 'Emp@123',
      role: 'employee',
      managerId: priya._id,
      department: 'Operations',
    });

    const karan = await createUser({
      name: 'Karan Mehta',
      email: 'karan@company.com',
      password: 'Emp@123',
      role: 'employee',
      managerId: priya._id,
      department: 'Operations',
    });

    const year = new Date().getFullYear();
    console.log('Creating cycles...');

    await Cycle.insertMany([
      { year, phase: 'goal_setting', windowOpen: new Date(year, 0, 1), windowClose: new Date(year, 3, 30), isActive: false },
      { year, phase: 'Q1', windowOpen: new Date(year, 6, 1), windowClose: new Date(year, 8, 30), isActive: false },
      { year, phase: 'Q2', windowOpen: new Date(year, 9, 1), windowClose: new Date(year, 11, 31), isActive: true },
    ]);

    await EscalationRule.insertMany([
      { triggerEvent: 'goal_not_submitted', daysThreshold: 7, notifyRoles: ['manager', 'admin'], isActive: true },
      { triggerEvent: 'goal_not_approved', daysThreshold: 5, notifyRoles: ['manager', 'admin'], isActive: true },
      { triggerEvent: 'checkin_not_done', daysThreshold: 14, notifyRoles: ['manager', 'admin'], isActive: true },
    ]);

    console.log('Creating goals...');

    // ── AMIT SINGH — 3 locked goals at 70% total, leaving 30% free for demo
    const amitGoals = await Goal.insertMany([
      {
        employeeId: amit._id,
        thrustArea: 'Customer',
        title: 'Improve NPS Score',
        description: 'Raise customer NPS from 7.2 to 8.5 through proactive follow-ups and resolution',
        uomType: 'numeric_min',
        target: 8.5,
        weightage: 30,
        status: 'locked',
      },
      {
        employeeId: amit._id,
        thrustArea: 'Revenue',
        title: 'Achieve Quarterly Sales Target',
        description: 'Close ₹50L in new business revenue for the fiscal year',
        uomType: 'numeric_min',
        target: 5000000,
        weightage: 25,
        status: 'locked',
      },
      {
        employeeId: amit._id,
        thrustArea: 'Process',
        title: 'Reduce TAT on Proposals',
        description: 'Reduce proposal turnaround time from 5 days to 2 days',
        uomType: 'numeric_max',
        target: 2,
        weightage: 15,
        status: 'locked',
      },
    ]);

    // ── NEHA PATEL — goals submitted, pending approval
    const nehaGoals = await Goal.insertMany([
      {
        employeeId: neha._id,
        thrustArea: 'Revenue',
        title: 'Upsell Existing Accounts',
        description: 'Generate ₹20L from upsells to existing customers',
        uomType: 'numeric_min',
        target: 2000000,
        weightage: 40,
        status: 'submitted',
      },
      {
        employeeId: neha._id,
        thrustArea: 'Customer',
        title: 'Customer Retention Rate',
        description: 'Maintain customer retention at 92% or above',
        uomType: 'numeric_min',
        target: 92,
        weightage: 30,
        status: 'submitted',
      },
      {
        employeeId: neha._id,
        thrustArea: 'Process',
        title: 'CRM Data Accuracy',
        description: 'Ensure 95%+ CRM records are up to date each month',
        uomType: 'numeric_min',
        target: 95,
        weightage: 20,
        status: 'submitted',
      },
      {
        employeeId: neha._id,
        thrustArea: 'Safety',
        title: 'Zero Incidents',
        description: 'Zero safety incidents for the year',
        uomType: 'zero',
        target: 0,
        weightage: 10,
        status: 'submitted',
      },
    ]);

    // ── ROHIT VERMA — goals in draft (just started)
    await Goal.insertMany([
      {
        employeeId: rohit._id,
        thrustArea: 'Revenue',
        title: 'New Account Acquisitions',
        description: 'Sign 15 new enterprise accounts in FY',
        uomType: 'numeric_min',
        target: 15,
        weightage: 40,
        status: 'draft',
      },
      {
        employeeId: rohit._id,
        thrustArea: 'Customer',
        title: 'Demo-to-Closure Rate',
        description: 'Improve demo-to-closure ratio from 20% to 30%',
        uomType: 'numeric_min',
        target: 30,
        weightage: 30,
        status: 'draft',
      },
      {
        employeeId: rohit._id,
        thrustArea: 'Process',
        title: 'Pipeline Coverage Ratio',
        description: 'Maintain 3x pipeline coverage at all times',
        uomType: 'numeric_min',
        target: 3,
        weightage: 20,
        status: 'draft',
      },
      {
        employeeId: rohit._id,
        thrustArea: 'Safety',
        title: 'Zero Safety Incidents',
        description: 'Zero incidents in work area',
        uomType: 'zero',
        target: 0,
        weightage: 10,
        status: 'draft',
      },
    ]);

    // ── SNEHA JOSHI — locked goals
    const snehaGoals = await Goal.insertMany([
      {
        employeeId: sneha._id,
        thrustArea: 'Process',
        title: 'Reduce Order Processing Time',
        description: 'Cut average order processing time from 4h to 2h',
        uomType: 'numeric_max',
        target: 2,
        weightage: 35,
        status: 'locked',
      },
      {
        employeeId: sneha._id,
        thrustArea: 'Quality',
        title: 'First-Time Quality Rate',
        description: 'Achieve 98%+ first-time quality pass rate',
        uomType: 'numeric_min',
        target: 98,
        weightage: 35,
        status: 'locked',
      },
      {
        employeeId: sneha._id,
        thrustArea: 'Safety',
        title: 'Zero Incidents',
        description: 'Zero recordable safety incidents',
        uomType: 'zero',
        target: 0,
        weightage: 20,
        status: 'locked',
      },
      {
        employeeId: sneha._id,
        thrustArea: 'People',
        title: 'Cross-Train Team Members',
        description: 'Complete cross-training 3 team members by Q3',
        uomType: 'numeric_min',
        target: 3,
        weightage: 10,
        status: 'locked',
      },
    ]);

    // ── KARAN MEHTA — one goal in rework (returned by manager)
    await Goal.insertMany([
      {
        employeeId: karan._id,
        thrustArea: 'Process',
        title: 'Vendor Lead Time Reduction',
        description: 'Reduce average vendor lead time from 10 to 6 days',
        uomType: 'numeric_max',
        target: 6,
        weightage: 40,
        status: 'rework',
        managerComment: 'Please clarify the baseline measurement method and add more details on the approach',
      },
      {
        employeeId: karan._id,
        thrustArea: 'Quality',
        title: 'Supplier Quality Score',
        description: 'Achieve 95%+ supplier quality rating',
        uomType: 'numeric_min',
        target: 95,
        weightage: 30,
        status: 'draft',
      },
      {
        employeeId: karan._id,
        thrustArea: 'Safety',
        title: 'Zero Incidents',
        description: 'Zero safety incidents',
        uomType: 'zero',
        target: 0,
        weightage: 20,
        status: 'draft',
      },
      {
        employeeId: karan._id,
        thrustArea: 'Revenue',
        title: 'Cost Savings Initiative',
        description: 'Identify and achieve ₹5L cost savings through procurement',
        uomType: 'numeric_min',
        target: 500000,
        weightage: 10,
        status: 'draft',
      },
    ]);

    console.log('Creating achievements...');

    // ── AMIT: Q1 achievements (only 3 goals now)
    const amitQ1Data = [
      { goal: amitGoals[0], actual: 7.9, status: 'on_track' },    // NPS
      { goal: amitGoals[1], actual: 1800000, status: 'on_track' }, // Sales
      { goal: amitGoals[2], actual: 2.5, status: 'on_track' },     // TAT (lower is better)
    ];

    for (const d of amitQ1Data) {
      const score = computeScore(d.goal as any, d.actual as any);
      await Achievement.create({
        goalId: d.goal._id,
        employeeId: amit._id,
        quarter: 'Q1',
        year,
        actualValue: d.actual,
        progressStatus: d.status,
        computedScore: score,
      });
    }

    // ── SNEHA: Q1 achievements
    const snehaQ1Data = [
      { goal: snehaGoals[0], actual: 2.2, status: 'on_track' },  // TAT (lower is better)
      { goal: snehaGoals[1], actual: 96.5, status: 'on_track' }, // Quality
      { goal: snehaGoals[2], actual: 0, status: 'completed' },   // Zero
      { goal: snehaGoals[3], actual: 2, status: 'on_track' },    // Cross-train
    ];

    for (const d of snehaQ1Data) {
      const score = computeScore(d.goal as any, d.actual as any);
      await Achievement.create({
        goalId: d.goal._id,
        employeeId: sneha._id,
        quarter: 'Q1',
        year,
        actualValue: d.actual,
        progressStatus: d.status,
        computedScore: score,
      });
    }

    console.log('Creating check-ins...');

    // Q1 check-ins
    await CheckIn.create({
      managerId: rajesh._id,
      employeeId: amit._id,
      quarter: 'Q1',
      year,
      comment: 'Good progress on NPS and sales pipeline. TAT improvement needs more focus in Q2. Keep up the safety record.',
      completedAt: new Date(year, 6, 15),
    });

    await CheckIn.create({
      managerId: priya._id,
      employeeId: sneha._id,
      quarter: 'Q1',
      year,
      comment: 'Quality metrics are improving. Cross-training is on track. Encourage more focus on reducing order TAT.',
      completedAt: new Date(year, 6, 18),
    });

    console.log('Creating audit logs...');

    // Audit entries for approval actions
    for (const goal of amitGoals) {
      await AuditLog.create({
        goalId: goal._id,
        changedBy: rajesh._id,
        changeType: 'approved',
        previousValue: { status: 'submitted' },
        newValue: { status: 'locked' },
        timestamp: new Date(year, 4, 10),
      });
    }

    for (const goal of snehaGoals) {
      await AuditLog.create({
        goalId: goal._id,
        changedBy: priya._id,
        changeType: 'approved',
        previousValue: { status: 'submitted' },
        newValue: { status: 'locked' },
        timestamp: new Date(year, 4, 12),
      });
    }

    // Manager rework log for Karan's first goal (which is now in rework status)
    const karanGoals = await Goal.find({ employeeId: karan._id });
    if (karanGoals[0]) {
      await AuditLog.create({
        goalId: karanGoals[0]._id,
        changedBy: priya._id,
        changeType: 'rework_requested',
        previousValue: { status: 'submitted' },
        newValue: { status: 'rework' },
        timestamp: new Date(year, 4, 11),
      });
    }

    console.log('\n✅ Demo data ready!\n');
    console.log('─────────────────────────────────────────');
    console.log('Role     Email                  Password');
    console.log('─────────────────────────────────────────');
    console.log('Admin    admin@company.com       Admin@123');
    console.log('Manager  rajesh@company.com      Manager@123  (Sales)');
    console.log('Manager  priya@company.com       Manager@123  (Operations)');
    console.log('Employee amit@company.com        Emp@123      (Locked goals + Q1 achievements)');
    console.log('Employee neha@company.com        Emp@123      (Goals submitted, pending approval)');
    console.log('Employee rohit@company.com       Emp@123      (Goals in draft)');
    console.log('Employee sneha@company.com       Emp@123      (Locked goals + Q1 achievements)');
    console.log('Employee karan@company.com       Emp@123      (1 goal in rework)');
    console.log('─────────────────────────────────────────\n');
    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
}

seed();
