const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = process.env.AUTH_SERVICE_PORT || 3001;

app.use(express.json());

// Mock user database
const users = [
    {
        id: 1,
        username: 'admin',
        email: 'admin@secureshop.com',
        password: bcrypt.hashSync('admin123', 10),
        role: 'admin'
    },
    {
        id: 2,
        username: 'user',
        email: 'user@secureshop.com',
        password: bcrypt.hashSync('user123', 10),
        role: 'user'
    },
    {
        id: 3,
        username: 'testuser',
        email: 'test@secureshop.com',
        password: bcrypt.hashSync('test123', 10),
        role: 'user'
    }
];

// JWT secret (insecure for demo)
const JWT_SECRET = process.env.JWT_SECRET || 'vulnerable_secret_key_123';

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        service: 'auth-service',
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        port: PORT
    });
});

// Login endpoint
app.post('/auth/login', async (req, res) => {
    const { username, password } = req.body;

    console.log(`[AUTH] Login attempt for user: ${username}`);

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
    }

    // Find user
    const user = users.find(u => u.username === username || u.email === username);
    if (!user) {
        console.log(`[AUTH] User not found: ${username}`);
        return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isValid = bcrypt.compareSync(password, user.password);
    if (!isValid) {
        console.log(`[AUTH] Invalid password for user: ${username}`);
        return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
        { 
            userId: user.id, 
            username: user.username, 
            email: user.email,
            role: user.role 
        },
        JWT_SECRET,
        { expiresIn: '24h' }
    );

    console.log(`[AUTH] Login successful for user: ${username}`);
    
    res.json({
        success: true,
        token: token,
        user: {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role
        }
    });
});

// Token verification endpoint
app.get('/auth/verify', (req, res) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        console.log(`[AUTH] Token verified for user: ${decoded.username}`);
        
        res.json({
            valid: true,
            user: decoded
        });
    } catch (error) {
        console.log(`[AUTH] Token verification failed: ${error.message}`);
        res.status(401).json({ 
            valid: false, 
            error: 'Invalid token' 
        });
    }
});

// Get current user info
app.get('/auth/me', (req, res) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = users.find(u => u.id === decoded.userId);
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role
        });
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
});

// VULNERABLE: Debug endpoint exposing sensitive information
app.get('/auth/debug', (req, res) => {
    console.log('[AUTH DEBUG] Debug endpoint accessed');
    
    res.json({
        service: 'auth-service',
        jwt_secret: JWT_SECRET, // SECURITY ISSUE: Exposing JWT secret
        users_count: users.length,
        users: users.map(u => ({
            id: u.id,
            username: u.username,
            email: u.email,
            password_hash: u.password, // SECURITY ISSUE: Exposing password hashes
            role: u.role
        }))
    });
});

// VULNERABLE: Admin bypass endpoint
app.post('/auth/admin-bypass', (req, res) => {
    const { secret } = req.body;
    
    console.log(`[AUTH BYPASS] Admin bypass attempt with secret: ${secret}`);
    
    // SECURITY ISSUE: Hardcoded bypass secret
    if (secret === 'admin_backdoor_2024') {
        const adminUser = users.find(u => u.role === 'admin');
        const token = jwt.sign(
            { 
                userId: adminUser.id, 
                username: adminUser.username, 
                email: adminUser.email,
                role: adminUser.role 
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        console.log('[AUTH BYPASS] Admin bypass successful');
        
        return res.json({
            success: true,
            message: 'Admin access granted via bypass',
            token: token,
            user: {
                id: adminUser.id,
                username: adminUser.username,
                email: adminUser.email,
                role: adminUser.role
            }
        });
    }

    res.status(401).json({ error: 'Invalid bypass secret' });
});

// Error handling
app.use((error, req, res, next) => {
    console.error('[AUTH ERROR]', error);
    res.status(500).json({ error: 'Auth service error' });
});

// Start server
app.listen(PORT, '127.0.0.1', () => {
    console.log(`🔐 Auth Service running on http://127.0.0.1:${PORT}`);
    console.log(`📋 Available endpoints:`);
    console.log(`   POST /auth/login      - User authentication`);
    console.log(`   GET  /auth/verify     - Token verification`);
    console.log(`   GET  /auth/me         - Current user info`);
    console.log(`   GET  /auth/debug      - Debug info (VULNERABLE)`);
    console.log(`   POST /auth/admin-bypass - Admin bypass (VULNERABLE)`);
    console.log(`⚠️  WARNING: This service contains intentional vulnerabilities`);
});

module.exports = app;
