/**
 * CloudCorp Billing Service — INTENTIONALLY VULNERABLE
 *
 * Vulnerabilities:
 * - IDOR-004: Any user can view any invoice
 * - AUTHZ-004: Plan upgrade without payment verification
 * - INFO-002: Billing admin endpoint accessible without admin role
 */
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3004;
app.use(express.json());

const plans = {
    free:       { price: 0,   features: ['5 projects', '1GB storage', 'Community support'] },
    pro:        { price: 99,  features: ['Unlimited projects', '50GB storage', 'Priority support', 'API access'] },
    enterprise: { price: 499, features: ['All Pro features', '1TB storage', '24/7 support', 'SLA 99.99%', 'Custom integrations'] }
};

let userPlans = { 1: 'free', 2: 'pro', 3: 'enterprise' };

let invoices = [
    { id: 1, userId: 1, amount: 0,   plan: 'free',       date: '2024-01-01', status: 'paid', paymentMethod: null },
    { id: 2, userId: 2, amount: 99,  plan: 'pro',        date: '2024-01-01', status: 'paid', paymentMethod: 'card-****-4242' },
    { id: 3, userId: 2, amount: 99,  plan: 'pro',        date: '2024-02-01', status: 'paid', paymentMethod: 'card-****-4242' },
    { id: 4, userId: 3, amount: 499, plan: 'enterprise', date: '2024-01-01', status: 'paid', paymentMethod: 'bank-transfer' },
    { id: 5, userId: 3, amount: 499, plan: 'enterprise', date: '2024-02-01', status: 'paid', paymentMethod: 'bank-transfer' }
];

// VULNERABLE: Returns ALL invoices for all users without filtering
app.get('/billing/invoices', (req, res) => {
    const requesterId = parseInt(req.headers['x-user-id'] || '0');
    console.log(`[BILLING] GET /billing/invoices - user ${requesterId} accessing ALL invoices (IDOR)`);
    // VULNERABLE: Should filter by: invoices.filter(i => i.userId === requesterId)
    res.json({ invoices, total: invoices.length, note: 'VULNERABLE: all users invoices returned' });
});

// VULNERABLE: Access any invoice by ID
app.get('/billing/invoices/:id', (req, res) => {
    const invoiceId = parseInt(req.params.id);
    const requesterId = parseInt(req.headers['x-user-id'] || '0');
    const invoice = invoices.find(i => i.id === invoiceId);
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    // VULNERABLE: Should check invoice.userId === requesterId
    res.json(invoice);
});

// VULNERABLE: Plan upgrade without payment verification
app.put('/billing/plan', (req, res) => {
    const requesterId = parseInt(req.headers['x-user-id'] || '0');
    const { plan, paymentMethod } = req.body;

    console.log(`[BILLING] User ${requesterId} upgrading to ${plan} - payment: ${paymentMethod} (VULNERABLE: no payment verification!)`);

    if (!plans[plan]) {
        return res.status(400).json({ error: 'Invalid plan', validPlans: Object.keys(plans) });
    }

    // VULNERABLE: No actual payment processing - just accepts any plan upgrade
    const oldPlan = userPlans[requesterId] || 'free';
    userPlans[requesterId] = plan;

    // Add a fake invoice
    invoices.push({
        id: invoices.length + 1, userId: requesterId,
        amount: plans[plan].price, plan,
        date: new Date().toISOString().split('T')[0],
        status: 'paid',  // VULNERABLE: marked as paid without actual payment
        paymentMethod: paymentMethod || 'none - free upgrade exploit'
    });

    res.json({
        success: true,
        message: `Plan upgraded from ${oldPlan} to ${plan}`,
        newPlan: plan, features: plans[plan].features,
        charge: plans[plan].price,
        warning: 'VULNERABILITY: Plan upgraded without payment verification'
    });
});

// VULNERABLE: Admin billing data accessible without strict admin check
app.get('/billing/admin/all', (req, res) => {
    const role = req.headers['x-user-role'] || 'user';
    console.log(`[BILLING] Admin endpoint accessed by role: ${role}`);
    // VULNERABLE: Gateway doesn't consistently enforce admin role
    res.json({
        allInvoices: invoices,
        allPlans: userPlans,
        totalRevenue: invoices.reduce((sum, i) => sum + i.amount, 0),
        note: 'SENSITIVE: Complete billing data for all users'
    });
});

app.get('/health', (req, res) => res.json({ service: 'billing-service', status: 'healthy', port: PORT }));

app.listen(PORT, '0.0.0.0', () => {
    console.log(`💰 Billing Service on port ${PORT} - INTENTIONALLY VULNERABLE (IDOR, missing payment check)`);
});

module.exports = app;
