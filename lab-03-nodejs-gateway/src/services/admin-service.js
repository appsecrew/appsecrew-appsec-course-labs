const express = require('express');
require('dotenv').config();

const app = express();
const PORT = process.env.ADMIN_SERVICE_PORT || 3003;

app.use(express.json());

// Mock system statistics
let systemStats = {
    uptime: Date.now(),
    requests_processed: 0,
    active_users: 3,
    database_connections: 5,
    memory_usage: '245MB',
    cpu_usage: '12%',
    last_updated: new Date().toISOString()
};

// Mock configuration data
const systemConfig = {
    database_url: 'postgresql://admin:secret123@internal-db:5432/production',
    api_keys: {
        payment_gateway: 'pk_live_51H7YzxG9h4F5d6g7h8j9k',
        email_service: 'sg.9k8j7h6g5f4d3s2a1z0x9c8v7',
        cloud_storage: 'AKIA1234567890ABCDEF'
    },
    internal_services: {
        user_service: 'http://10.0.0.100:3002',
        auth_service: 'http://10.0.0.101:3001',
        payment_service: 'http://10.0.0.102:4000'
    },
    admin_credentials: {
        username: 'sysadmin',
        password: 'Admin!2024$Secure',
        backup_password: 'backup_admin_pass'
    },
    security_settings: {
        jwt_secret: 'ultra_secret_admin_key_2024',
        encryption_key: 'aes256_master_key_production',
        api_rate_limits: false,
        debug_mode: true
    }
};

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        service: 'admin-service',
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        port: PORT,
        note: 'Internal use only'
    });
});

// VULNERABLE: System statistics endpoint (should be protected)
app.get('/admin/stats', (req, res) => {
    console.log('[ADMIN] System stats accessed');
    
    // Update request counter
    systemStats.requests_processed += 1;
    systemStats.last_updated = new Date().toISOString();
    
    res.json({
        service: 'admin-service',
        stats: systemStats,
        message: 'Internal administrative statistics'
    });
});

// VULNERABLE: Configuration endpoint exposing sensitive data
app.get('/admin/config', (req, res) => {
    console.log('[ADMIN] Configuration accessed - SENSITIVE DATA EXPOSED');
    
    // SECURITY ISSUE: Exposing sensitive configuration including credentials
    res.json({
        service: 'admin-service',
        config: systemConfig,
        warning: 'This endpoint contains sensitive production configuration data'
    });
});

// VULNERABLE: User management endpoint
app.delete('/admin/users/:id', (req, res) => {
    const userId = req.params.id;
    
    console.log(`[ADMIN] User deletion request for ID: ${userId}`);
    
    // SECURITY ISSUE: No authentication check for destructive operation
    res.json({
        success: true,
        message: `User ${userId} has been deleted`,
        deleted_user_id: userId,
        deleted_at: new Date().toISOString()
    });
});

// VULNERABLE: System control endpoints
app.post('/admin/system/restart', (req, res) => {
    console.log('[ADMIN] System restart requested');
    
    res.json({
        success: true,
        message: 'System restart initiated',
        estimated_downtime: '2-3 minutes'
    });
});

app.post('/admin/system/backup', (req, res) => {
    console.log('[ADMIN] Database backup requested');
    
    res.json({
        success: true,
        message: 'Database backup started',
        backup_location: '/backups/db_backup_' + Date.now() + '.sql',
        estimated_completion: '10-15 minutes'
    });
});

// VULNERABLE: Debug endpoint with system information
app.get('/admin/debug', (req, res) => {
    console.log('[ADMIN DEBUG] Debug information requested');
    
    // SECURITY ISSUE: Exposing system internals
    res.json({
        service: 'admin-service',
        environment: process.env,
        process_info: {
            pid: process.pid,
            version: process.version,
            platform: process.platform,
            arch: process.arch,
            memory: process.memoryUsage()
        },
        network_info: {
            hostname: require('os').hostname(),
            network_interfaces: require('os').networkInterfaces()
        },
        file_system: {
            cwd: process.cwd(),
            temp_dir: require('os').tmpdir()
        }
    });
});

// VULNERABLE: Log access endpoint
app.get('/admin/logs', (req, res) => {
    const { lines = 50, service = 'all' } = req.query;
    
    console.log(`[ADMIN] Log access requested - Service: ${service}, Lines: ${lines}`);
    
    // Mock log data with sensitive information
    const mockLogs = [
        '[2024-01-15 10:30:22] INFO: User admin logged in from 192.168.1.100',
        '[2024-01-15 10:31:15] ERROR: Database connection failed - postgres://admin:secret123@db:5432/prod',
        '[2024-01-15 10:32:45] WARN: Failed login attempt for user admin from IP 203.0.113.42',
        '[2024-01-15 10:35:12] INFO: Payment processed - Card ending in 4532, Amount: $1,234.56',
        '[2024-01-15 10:40:33] DEBUG: API Key used: pk_live_51H7YzxG9h4F5d6g7h8j9k',
        '[2024-01-15 10:45:21] ERROR: SSRF attempt detected - Target: http://169.254.169.254/latest/meta-data/',
        '[2024-01-15 10:50:18] INFO: Backup completed successfully to s3://internal-backups/db-backup.sql'
    ];
    
    res.json({
        service: service,
        log_lines: parseInt(lines),
        logs: mockLogs.slice(0, parseInt(lines)),
        warning: 'These logs may contain sensitive information'
    });
});

// Error handling
app.use((error, req, res, next) => {
    console.error('[ADMIN ERROR]', error);
    res.status(500).json({ error: 'Admin service error' });
});

// Start server (only bind to localhost - internal service)
app.listen(PORT, '127.0.0.1', () => {
    console.log(`🔧 Admin Service running on http://127.0.0.1:${PORT}`);
    console.log(`📋 Available endpoints:`);
    console.log(`   GET  /admin/stats     - System statistics`);
    console.log(`   GET  /admin/config    - Configuration (SENSITIVE)`);
    console.log(`   DELETE /admin/users/:id - Delete user`);
    console.log(`   GET  /admin/debug     - Debug information`);
    console.log(`   GET  /admin/logs      - System logs`);
    console.log(`⚠️  CRITICAL: This service should NOT be publicly accessible`);
});

module.exports = app;
