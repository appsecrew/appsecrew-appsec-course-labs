const express = require('express');
const axios = require('axios');
const router = express.Router();

// VULNERABLE: Webhook notification endpoint with SSRF
router.post('/notify', async (req, res) => {
    const { url, data, method = 'POST' } = req.body;
    
    if (!url) {
        return res.status(400).json({ error: 'URL is required' });
    }

    try {
        console.log(`[WEBHOOK SSRF] Sending ${method} to: ${url}`);
        console.log(`[WEBHOOK SSRF] Payload:`, data);
        
        // SECURITY ISSUE: No URL validation - allows targeting internal services
        const config = {
            method: method.toLowerCase(),
            url: url,
            timeout: 15000,
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Gateway-Webhook/1.0'
            }
        };

        if (method.toUpperCase() === 'POST' && data) {
            config.data = data;
        }

        const response = await axios(config);
        
        // SECURITY ISSUE: Returns internal service responses to external users
        res.json({
            success: true,
            webhook_url: url,
            status: response.status,
            response_headers: response.headers,
            response_data: response.data,
            message: 'Webhook delivered successfully'
        });

    } catch (error) {
        console.error(`[WEBHOOK ERROR] Failed to deliver webhook to ${url}:`, error.message);
        
        // SECURITY ISSUE: Error messages may leak internal network information
        res.status(500).json({
            success: false,
            webhook_url: url,
            error: error.message,
            error_code: error.code,
            error_response: error.response ? {
                status: error.response.status,
                data: error.response.data
            } : null
        });
    }
});

// VULNERABLE: Batch webhook endpoint
router.post('/batch', async (req, res) => {
    const { webhooks } = req.body;
    
    if (!Array.isArray(webhooks)) {
        return res.status(400).json({ error: 'Webhooks must be an array' });
    }

    const results = [];
    
    for (const webhook of webhooks) {
        try {
            console.log(`[BATCH WEBHOOK] Processing: ${webhook.url}`);
            
            // SECURITY ISSUE: No rate limiting or URL validation for batch requests
            const response = await axios({
                method: webhook.method || 'POST',
                url: webhook.url,
                data: webhook.data,
                timeout: 10000
            });

            results.push({
                url: webhook.url,
                success: true,
                status: response.status,
                response: response.data
            });

        } catch (error) {
            results.push({
                url: webhook.url,
                success: false,
                error: error.message,
                status: error.response?.status || null
            });
        }
    }

    res.json({
        processed: webhooks.length,
        results: results
    });
});

// VULNERABLE: Webhook test endpoint
router.get('/test', async (req, res) => {
    const { target } = req.query;
    
    if (!target) {
        return res.status(400).json({ error: 'Target URL required' });
    }

    try {
        console.log(`[WEBHOOK TEST] Testing connectivity to: ${target}`);
        
        // SECURITY ISSUE: Allows probing internal services
        const response = await axios.get(target, {
            timeout: 5000,
            headers: {
                'User-Agent': 'Gateway-Webhook-Test/1.0'
            }
        });

        res.json({
            target: target,
            reachable: true,
            status: response.status,
            response_time: Date.now(),
            headers: response.headers
        });

    } catch (error) {
        res.json({
            target: target,
            reachable: false,
            error: error.message,
            error_code: error.code
        });
    }
});

module.exports = router;
