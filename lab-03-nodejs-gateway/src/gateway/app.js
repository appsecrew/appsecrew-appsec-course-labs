const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const axios = require('axios');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet({
    // Disable some security headers for demonstration purposes
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: false
}));
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
const apiRoutes = require('./routes/api');
const webhookRoutes = require('./routes/webhook');
const proxyRoutes = require('./routes/proxy');

app.use('/api', apiRoutes);
app.use('/api/webhook', webhookRoutes);
app.use('/api/proxy', proxyRoutes);

// Root endpoint - serve HTML UI
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

app.get('/lab-guide', (req, res) => {
    res.sendFile(path.join(__dirname, '..', '..', '..', 'LAB_GUIDE.html'));
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// VULNERABLE: Fetch endpoint with SSRF
app.get('/api/fetch', async (req, res) => {
    const { url } = req.query;
    
    if (!url) {
        return res.status(400).json({ error: 'URL parameter is required' });
    }

    try {
        console.log(`[SSRF ATTEMPT] Fetching URL: ${url}`);
        
        // SECURITY ISSUE: No URL validation - allows internal network access
        const response = await axios.get(url, {
            timeout: 10000,
            maxRedirects: 5
        });

        res.json({
            url: url,
            status: response.status,
            headers: response.headers,
            data: response.data
        });
    } catch (error) {
        console.error(`[SSRF ERROR] Failed to fetch ${url}:`, error.message);
        res.status(500).json({
            error: 'Failed to fetch URL',
            message: error.message,
            url: url
        });
    }
});

// Service discovery endpoint
app.get('/api/services', (req, res) => {
    res.json({
        services: [
            {
                name: 'Auth Service',
                url: 'http://127.0.0.1:3001',
                endpoints: ['/auth/login', '/auth/verify']
            },
            {
                name: 'User Service',
                url: 'http://127.0.0.1:3002',
                endpoints: ['/users', '/users/:id']
            },
            {
                name: 'Admin Service',
                url: 'http://127.0.0.1:3003',
                endpoints: ['/admin/stats', '/admin/config'],
                note: 'Internal use only'
            }
        ]
    });
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('[ERROR]', error);
    res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Not found',
        path: req.originalUrl,
        method: req.method
    });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 API Gateway running on http://0.0.0.0:${PORT}`);
    console.log(`📋 Available endpoints:`);
    console.log(`   GET  /               - Service information`);
    console.log(`   GET  /api/services   - List services`);
    console.log(`   GET  /api/fetch      - Fetch URL (SSRF vuln)`);
    console.log(`   POST /api/webhook    - Webhook notify (SSRF vuln)`);
    console.log(`   GET  /api/proxy/*    - Open proxy (SSRF vuln)`);
    console.log(`⚠️  WARNING: This service contains intentional SSRF vulnerabilities`);
});

module.exports = app;
