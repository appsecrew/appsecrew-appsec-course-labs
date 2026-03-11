const express = require('express');
const axios = require('axios');
const router = express.Router();

// Service endpoints
const AUTH_SERVICE = process.env.AUTH_SERVICE_URL || 'http://127.0.0.1:3001';
const USER_SERVICE = process.env.USER_SERVICE_URL || 'http://127.0.0.1:3002';
const ADMIN_SERVICE = process.env.ADMIN_SERVICE_URL || 'http://127.0.0.1:3003';

// Authentication routes (proxy to auth service)
router.post('/auth/login', async (req, res) => {
    try {
        const response = await axios.post(`${AUTH_SERVICE}/auth/login`, req.body);
        res.json(response.data);
    } catch (error) {
        res.status(error.response?.status || 500).json({
            error: error.response?.data || error.message
        });
    }
});

router.get('/auth/verify', async (req, res) => {
    try {
        const response = await axios.get(`${AUTH_SERVICE}/auth/verify`, {
            headers: { 'Authorization': req.headers.authorization }
        });
        res.json(response.data);
    } catch (error) {
        res.status(error.response?.status || 500).json({
            error: error.response?.data || error.message
        });
    }
});

// User management routes (proxy to user service)
router.get('/users', async (req, res) => {
    try {
        const response = await axios.get(`${USER_SERVICE}/users`);
        res.json(response.data);
    } catch (error) {
        res.status(error.response?.status || 500).json({
            error: error.response?.data || error.message
        });
    }
});

router.post('/users', async (req, res) => {
    try {
        const response = await axios.post(`${USER_SERVICE}/users`, req.body);
        res.json(response.data);
    } catch (error) {
        res.status(error.response?.status || 500).json({
            error: error.response?.data || error.message
        });
    }
});

router.get('/users/:id', async (req, res) => {
    try {
        const response = await axios.get(`${USER_SERVICE}/users/${req.params.id}`);
        res.json(response.data);
    } catch (error) {
        res.status(error.response?.status || 500).json({
            error: error.response?.data || error.message
        });
    }
});

// VULNERABLE: Admin routes accessible through gateway
router.get('/admin/stats', async (req, res) => {
    try {
        console.log('[ADMIN ACCESS] Stats endpoint accessed via gateway');
        const response = await axios.get(`${ADMIN_SERVICE}/admin/stats`);
        res.json(response.data);
    } catch (error) {
        res.status(error.response?.status || 500).json({
            error: error.response?.data || error.message
        });
    }
});

router.get('/admin/config', async (req, res) => {
    try {
        console.log('[ADMIN ACCESS] Config endpoint accessed via gateway');
        const response = await axios.get(`${ADMIN_SERVICE}/admin/config`);
        res.json(response.data);
    } catch (error) {
        res.status(error.response?.status || 500).json({
            error: error.response?.data || error.message
        });
    }
});

// Health check for all services
router.get('/health/all', async (req, res) => {
    const services = [
        { name: 'Auth Service', url: `${AUTH_SERVICE}/health` },
        { name: 'User Service', url: `${USER_SERVICE}/health` },
        { name: 'Admin Service', url: `${ADMIN_SERVICE}/health` }
    ];

    const results = {};

    for (const service of services) {
        try {
            const response = await axios.get(service.url, { timeout: 5000 });
            results[service.name] = {
                status: 'healthy',
                response_time: Date.now(),
                data: response.data
            };
        } catch (error) {
            results[service.name] = {
                status: 'unhealthy',
                error: error.message
            };
        }
    }

    res.json({
        gateway: 'healthy',
        services: results
    });
});

// VULNERABLE: Internal network scanner
router.get('/scan/internal', async (req, res) => {
    const { range = '127.0.0.1', ports = '3000,3001,3002,3003,22,80,443' } = req.query;
    
    console.log(`[INTERNAL SCAN] Scanning ${range} for ports: ${ports}`);
    
    const portList = ports.split(',').map(p => parseInt(p.trim()));
    const results = [];

    for (const port of portList) {
        try {
            // SECURITY ISSUE: Allows internal network scanning
            const response = await axios.get(`http://${range}:${port}/`, { 
                timeout: 2000 
            });
            
            results.push({
                host: range,
                port: port,
                status: 'open',
                service: 'http',
                response_code: response.status
            });
        } catch (error) {
            if (error.code === 'ECONNREFUSED') {
                results.push({
                    host: range,
                    port: port,
                    status: 'closed'
                });
            } else if (error.code === 'ETIMEDOUT') {
                results.push({
                    host: range,
                    port: port,
                    status: 'filtered'
                });
            } else {
                results.push({
                    host: range,
                    port: port,
                    status: 'unknown',
                    error: error.message
                });
            }
        }
    }

    res.json({
        scan_target: range,
        ports_scanned: portList,
        results: results
    });
});

module.exports = router;
