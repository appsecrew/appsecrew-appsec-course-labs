/**
 * CloudCorp API Gateway - INTENTIONALLY VULNERABLE
 *
 * Vulnerabilities:
 * - MSEC-001: JWT signature not verified (accepts any base64 payload)
 * - MSEC-002: Admin routes accessible with just a header
 * - MSEC-003: No rate limiting
 * - AUTHZ-003: Inconsistent authorization across services
 */
const express = require('express');
const axios = require('axios');
const path = require('path');
const cors = require('cors');
const morgan = require('morgan');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

const USER_SERVICE    = process.env.USER_SERVICE    || 'http://localhost:3001';
const PROJECT_SERVICE = process.env.PROJECT_SERVICE || 'http://localhost:3002';
const FILE_SERVICE    = process.env.FILE_SERVICE    || 'http://localhost:3003';
const BILLING_SERVICE = process.env.BILLING_SERVICE || 'http://localhost:3004';
const JWT_SECRET      = process.env.JWT_SECRET      || 'super-secret-jwt-key-for-training-only';

app.use(cors());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─── VULNERABLE JWT Middleware ────────────────────────────────────────────────
/**
 * MSEC-002: Weak JWT verification
 * - Accepts tokens with algorithm "none" (no signature verification)
 * - Only decodes the payload without validating the signature
 */
function verifyTokenWeak(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
    }
    const token = authHeader.substring(7);
    try {
        // VULNERABLE: Using jwt.decode() instead of jwt.verify() skips signature check
        const decoded = jwt.decode(token);
        if (!decoded) throw new Error('Invalid token format');

        // VULNERABLE: Also accept manually crafted base64 tokens (no library)
        req.user = decoded;
        next();
    } catch (e) {
        return res.status(401).json({ error: 'Invalid token', message: e.message });
    }
}

// Helper: proxy to a service
async function proxyTo(serviceUrl, req, res, extraHeaders = {}) {
    try {
        const response = await axios({
            method: req.method,
            url: `${serviceUrl}${req.path}`,
            data: req.body,
            params: req.query,
            headers: {
                'Content-Type': 'application/json',
                'X-User-Id': req.user?.userId || req.user?.id || '',
                'X-User-Role': req.user?.role || '',
                ...extraHeaders
            },
            timeout: 10000
        });
        res.status(response.status).json(response.data);
    } catch (error) {
        res.status(error.response?.status || 500).json(error.response?.data || { error: error.message });
    }
}

// ─── Frontend ─────────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ─── Auth Routes (public) ─────────────────────────────────────────────────────
app.post('/api/auth/login',    async (req, res) => proxyTo(USER_SERVICE, {...req, path: '/auth/login'},    res));
app.post('/api/auth/register', async (req, res) => proxyTo(USER_SERVICE, {...req, path: '/auth/register'}, res));

// ─── User Routes (authenticated) ─────────────────────────────────────────────
// VULNERABLE: Any logged-in user can access any user's data (IDOR)
app.get('/api/users',        verifyTokenWeak, async (req, res) => proxyTo(USER_SERVICE, req, res));
app.get('/api/users/:id',    verifyTokenWeak, async (req, res) => proxyTo(USER_SERVICE, req, res));
app.put('/api/users/:id',    verifyTokenWeak, async (req, res) => proxyTo(USER_SERVICE, req, res));
app.put('/api/users/:id/role', verifyTokenWeak, async (req, res) => proxyTo(USER_SERVICE, req, res));
app.get('/api/users/:id/apikey', verifyTokenWeak, async (req, res) => proxyTo(USER_SERVICE, req, res));

// ─── Project Routes (authenticated) ──────────────────────────────────────────
// VULNERABLE: No project membership check at gateway level (IDOR)
app.get('/api/projects',        verifyTokenWeak, async (req, res) => proxyTo(PROJECT_SERVICE, req, res));
app.post('/api/projects',       verifyTokenWeak, async (req, res) => proxyTo(PROJECT_SERVICE, req, res));
app.get('/api/projects/:id',    verifyTokenWeak, async (req, res) => proxyTo(PROJECT_SERVICE, req, res));
app.put('/api/projects/:id',    verifyTokenWeak, async (req, res) => proxyTo(PROJECT_SERVICE, req, res));
app.delete('/api/projects/:id', verifyTokenWeak, async (req, res) => proxyTo(PROJECT_SERVICE, req, res));

// ─── File Routes (authenticated) ─────────────────────────────────────────────
// VULNERABLE: No file ownership check (IDOR)
app.get('/api/files',        verifyTokenWeak, async (req, res) => proxyTo(FILE_SERVICE, req, res));
app.get('/api/files/:id',    verifyTokenWeak, async (req, res) => proxyTo(FILE_SERVICE, req, res));
app.post('/api/files',       verifyTokenWeak, async (req, res) => proxyTo(FILE_SERVICE, req, res));
app.delete('/api/files/:id', verifyTokenWeak, async (req, res) => proxyTo(FILE_SERVICE, req, res));

// ─── Billing Routes (authenticated) ──────────────────────────────────────────
app.get('/api/billing/invoices',     verifyTokenWeak, async (req, res) => proxyTo(BILLING_SERVICE, req, res));
app.get('/api/billing/invoices/:id', verifyTokenWeak, async (req, res) => proxyTo(BILLING_SERVICE, req, res));
app.put('/api/billing/plan',         verifyTokenWeak, async (req, res) => proxyTo(BILLING_SERVICE, req, res));

// ─── Admin Routes ─────────────────────────────────────────────────────────────
// VULNERABLE: Only checks a header, not actual role from JWT
app.get('/api/admin/users', verifyTokenWeak, async (req, res) => {
    const adminKey = req.headers['x-admin-key'];
    // SECURITY ISSUE: Simple header check instead of verifying JWT role
    if (adminKey === 'admin-secret-key' || req.user?.role === 'admin') {
        return proxyTo(USER_SERVICE, { ...req, path: '/admin/users', method: 'GET' }, res);
    }
    res.status(403).json({ error: 'Admin access required' });
});

app.get('/api/admin/billing', verifyTokenWeak, async (req, res) => {
    return proxyTo(BILLING_SERVICE, { ...req, path: '/billing/admin/all', method: 'GET' }, res);
});

// Health check
app.get('/health', (req, res) => {
    res.json({ service: 'gateway', status: 'healthy', timestamp: new Date().toISOString() });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚪 CloudCorp API Gateway running on http://0.0.0.0:${PORT}`);
    console.log('⚠️  INTENTIONAL VULNERABILITIES: IDOR, Weak JWT, Missing Authorization');
    console.log(`🌐 Web UI: http://localhost:${PORT}`);
});

module.exports = app;
