/**
 * CloudCorp User Service — INTENTIONALLY VULNERABLE
 *
 * Vulnerabilities:
 * - IDOR-001: GET /users/:id returns ANY user's full profile (no ownership check)
 * - AUTHZ-001: PUT /users/:id allows ANY user to modify ANY user (horizontal escalation)
 * - AUTHZ-002: PUT /users/:id/role allows ANY user to change ANY user's role (vertical escalation)
 * - INFO-001: Full PII (SSN, credit card, API keys) returned without scrubbing
 */
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key-for-training-only';

app.use(express.json());

// In-memory user store with sensitive data
let users = [
    {
        id: 1, email: 'alice@cloudcorp.com', password: bcrypt.hashSync('Alice123!', 10),
        name: 'Alice Smith', role: 'user', plan: 'free',
        apiKey: 'ccorp-alice-key-a1b2c3d4e5f6',
        creditCard: '4111-1111-1111-1111', ssn: '123-45-6789',
        address: '123 Main St, San Francisco, CA',
        salary: 95000, performanceRating: 'Excellent'
    },
    {
        id: 2, email: 'bob@cloudcorp.com', password: bcrypt.hashSync('Bob456!', 10),
        name: 'Bob Jones', role: 'user', plan: 'pro',
        apiKey: 'ccorp-bob-key-g7h8i9j0k1l2',
        creditCard: '4222-2222-2222-2222', ssn: '987-65-4321',
        address: '456 Oak Ave, Austin, TX',
        salary: 87000, performanceRating: 'Good'
    },
    {
        id: 3, email: 'admin@cloudcorp.com', password: bcrypt.hashSync('Admin789!', 10),
        name: 'Admin User', role: 'admin', plan: 'enterprise',
        apiKey: 'ccorp-admin-key-SUPER-SECRET-m3n4o5p6',
        creditCard: '4333-3333-3333-3333', ssn: '555-55-5555',
        address: '789 Corp Blvd, Seattle, WA',
        salary: 180000, performanceRating: 'Outstanding'
    }
];

// Auth
app.post('/auth/login', (req, res) => {
    const { email, password } = req.body;
    const user = users.find(u => u.email === email);
    if (!user || !bcrypt.compareSync(password, user.password)) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign(
        { userId: user.id, id: user.id, email: user.email, name: user.name, role: user.role },
        JWT_SECRET, { expiresIn: '24h' }
    );
    res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role, plan: user.plan } });
});

app.post('/auth/register', (req, res) => {
    const { email, password, name } = req.body;
    if (users.find(u => u.email === email)) {
        return res.status(409).json({ error: 'Email already exists' });
    }
    const newUser = {
        id: users.length + 1, email, name, role: 'user', plan: 'free',
        password: bcrypt.hashSync(password, 10),
        apiKey: 'ccorp-new-key-' + Math.random().toString(36).substring(2),
        creditCard: null, ssn: null, address: null, salary: null
    };
    users.push(newUser);
    const token = jwt.sign(
        { userId: newUser.id, id: newUser.id, email: newUser.email, name: newUser.name, role: newUser.role },
        JWT_SECRET, { expiresIn: '24h' }
    );
    res.status(201).json({ token, user: { id: newUser.id, email, name, role: 'user' } });
});

// VULNERABLE: Returns ALL user data including SSN, credit card, API keys
// No ownership check - any logged-in user can get any user's sensitive data
app.get('/users', (req, res) => {
    console.log(`[USER] GET /users accessed - returning ALL user data including sensitive fields`);
    res.json(users.map(u => ({ ...u, password: '[hashed]' })));
});

// VULNERABLE: IDOR - no check that requester owns this user ID
app.get('/users/:id', (req, res) => {
    const userId = parseInt(req.params.id);
    const requesterId = parseInt(req.headers['x-user-id'] || '0');
    const role = req.headers['x-user-role'] || 'user';

    console.log(`[USER] GET /users/${userId} - requested by user ${requesterId} (role: ${role})`);
    // VULNERABLE: No authorization check. Should be: if (userId !== requesterId && role !== 'admin') return 403

    const user = users.find(u => u.id === userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ ...user, password: '[hashed]' });
});

// VULNERABLE: Horizontal privilege escalation - any user can modify any user
app.put('/users/:id', (req, res) => {
    const userId = parseInt(req.params.id);
    const requesterId = parseInt(req.headers['x-user-id'] || '0');
    console.log(`[USER] PUT /users/${userId} - modified by user ${requesterId} - IDOR VULNERABILITY`);
    // VULNERABLE: Should check requesterId === userId || role === 'admin'

    const idx = users.findIndex(u => u.id === userId);
    if (idx === -1) return res.status(404).json({ error: 'User not found' });

    const { name, email, address } = req.body;
    if (name) users[idx].name = name;
    if (email) users[idx].email = email;
    if (address) users[idx].address = address;

    res.json({ success: true, message: `User ${userId} updated`, user: { ...users[idx], password: '[hashed]' } });
});

// VULNERABLE: Vertical privilege escalation - any user can change any user's role
app.put('/users/:id/role', (req, res) => {
    const userId = parseInt(req.params.id);
    const requesterId = parseInt(req.headers['x-user-id'] || '0');
    const { role } = req.body;
    console.log(`[USER] PRIVILEGE ESCALATION: User ${requesterId} changing user ${userId} role to ${role}`);
    // VULNERABLE: Should require admin role and prevent self-escalation

    const idx = users.findIndex(u => u.id === userId);
    if (idx === -1) return res.status(404).json({ error: 'User not found' });

    users[idx].role = role;
    res.json({ success: true, message: `Role updated to ${role}`, userId, newRole: role });
});

// VULNERABLE: Exposes API key without ownership check
app.get('/users/:id/apikey', (req, res) => {
    const userId = parseInt(req.params.id);
    const user = users.find(u => u.id === userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    // VULNERABLE: Returns any user's API key
    res.json({ userId, apiKey: user.apiKey, note: 'SENSITIVE: API key exposed via IDOR' });
});

// Admin endpoint (supposed to be protected, but gateway check is weak)
app.get('/admin/users', (req, res) => {
    res.json({ users: users.map(u => ({ ...u, password: '[hashed]' })), total: users.length });
});

app.get('/health', (req, res) => res.json({ service: 'user-service', status: 'healthy', port: PORT }));

app.listen(PORT, '0.0.0.0', () => {
    console.log(`👤 User Service on port ${PORT} - INTENTIONALLY VULNERABLE (IDOR, Privilege Escalation)`);
});

module.exports = app;
