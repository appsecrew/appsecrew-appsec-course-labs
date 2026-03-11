const express = require('express');
const axios = require('axios');
const router = express.Router();

// VULNERABLE: Open proxy endpoint with SSRF
router.get('/*', async (req, res) => {
    // Extract the target URL from the path
    const targetUrl = req.params[0];
    
    if (!targetUrl) {
        return res.status(400).json({ error: 'Target URL is required' });
    }

    // Add protocol if missing
    let fullUrl = targetUrl;
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
        fullUrl = 'http://' + targetUrl;
    }

    try {
        console.log(`[PROXY SSRF] Proxying request to: ${fullUrl}`);
        console.log(`[PROXY SSRF] Original request headers:`, req.headers);
        
        // SECURITY ISSUE: No URL validation - acts as open proxy
        const config = {
            method: req.method,
            url: fullUrl,
            timeout: 20000,
            headers: {
                // Forward some original headers but filter sensitive ones
                'User-Agent': req.headers['user-agent'] || 'Gateway-Proxy/1.0',
                'Accept': req.headers.accept,
                'Accept-Language': req.headers['accept-language']
            },
            params: req.query
        };

        // Forward body for POST/PUT requests
        if (['POST', 'PUT', 'PATCH'].includes(req.method.toUpperCase())) {
            config.data = req.body;
            config.headers['Content-Type'] = req.headers['content-type'] || 'application/json';
        }

        const response = await axios(config);
        
        // SECURITY ISSUE: Forwards internal service responses to external users
        res.status(response.status);
        
        // Forward response headers (filtered)
        const allowedHeaders = ['content-type', 'content-length', 'cache-control', 'expires'];
        for (const [key, value] of Object.entries(response.headers)) {
            if (allowedHeaders.includes(key.toLowerCase())) {
                res.set(key, value);
            }
        }
        
        res.send(response.data);

    } catch (error) {
        console.error(`[PROXY ERROR] Failed to proxy to ${fullUrl}:`, error.message);
        
        if (error.response) {
            // SECURITY ISSUE: Forwards error responses that may contain internal information
            res.status(error.response.status);
            res.json({
                proxy_error: true,
                target_url: fullUrl,
                status: error.response.status,
                error_data: error.response.data
            });
        } else {
            // SECURITY ISSUE: Network error details may reveal internal network topology
            res.status(500).json({
                proxy_error: true,
                target_url: fullUrl,
                error: error.message,
                error_code: error.code,
                network_error: true
            });
        }
    }
});

// VULNERABLE: POST proxy for form data and JSON
router.post('/*', async (req, res) => {
    const targetUrl = req.params[0];
    
    if (!targetUrl) {
        return res.status(400).json({ error: 'Target URL is required' });
    }

    let fullUrl = targetUrl;
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
        fullUrl = 'http://' + targetUrl;
    }

    try {
        console.log(`[POST PROXY] Forwarding POST to: ${fullUrl}`);
        console.log(`[POST PROXY] Request body:`, req.body);
        
        // SECURITY ISSUE: No validation of target URLs or request bodies
        const response = await axios.post(fullUrl, req.body, {
            timeout: 15000,
            headers: {
                'Content-Type': req.headers['content-type'] || 'application/json',
                'User-Agent': 'Gateway-POST-Proxy/1.0'
            }
        });

        res.status(response.status).json({
            proxied: true,
            target_url: fullUrl,
            response_status: response.status,
            response_data: response.data
        });

    } catch (error) {
        console.error(`[POST PROXY ERROR] Failed to POST to ${fullUrl}:`, error.message);
        res.status(error.response?.status || 500).json({
            proxy_error: true,
            target_url: fullUrl,
            error: error.message,
            response_data: error.response?.data
        });
    }
});

// VULNERABLE: Batch proxy endpoint
router.post('/batch', async (req, res) => {
    const { requests } = req.body;
    
    if (!Array.isArray(requests)) {
        return res.status(400).json({ error: 'Requests must be an array' });
    }

    const results = [];
    
    // SECURITY ISSUE: No rate limiting on batch requests
    for (const request of requests) {
        try {
            console.log(`[BATCH PROXY] Processing: ${request.url}`);
            
            const response = await axios({
                method: request.method || 'GET',
                url: request.url,
                data: request.data,
                headers: request.headers || {},
                timeout: 10000
            });

            results.push({
                url: request.url,
                success: true,
                status: response.status,
                data: response.data
            });

        } catch (error) {
            results.push({
                url: request.url,
                success: false,
                error: error.message,
                status: error.response?.status,
                data: error.response?.data
            });
        }
    }

    res.json({
        processed: requests.length,
        results: results
    });
});

module.exports = router;
