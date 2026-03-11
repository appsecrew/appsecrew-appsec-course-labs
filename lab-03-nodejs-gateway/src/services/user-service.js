const express = require('express');
require('dotenv').config();

const app = express();
const PORT = process.env.USER_SERVICE_PORT || 3002;

app.use(express.json());

// Mock user database
let users = [
    {
        id: 1,
        username: 'admin',
        email: 'admin@secureshop.com',
        firstName: 'System',
        lastName: 'Administrator',
        role: 'admin',
        created_at: '2024-01-01T00:00:00Z',
        last_login: '2024-01-15T10:30:22Z'
    },
    {
        id: 2,
        username: 'user',
        email: 'user@secureshop.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'user',
        created_at: '2024-01-02T00:00:00Z',
        last_login: '2024-01-14T15:45:33Z'
    },
    {
        id: 3,
        username: 'testuser',
        email: 'test@secureshop.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'user',
        created_at: '2024-01-03T00:00:00Z',
        last_login: '2024-01-13T09:12:45Z'
    }
];

let nextUserId = 4;

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        service: 'user-service',
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        port: PORT,
        users_count: users.length
    });
});

// Get all users
app.get('/users', (req, res) => {
    const { limit = 10, offset = 0 } = req.query;
    
    console.log(`[USER] Fetching users - Limit: ${limit}, Offset: ${offset}`);
    
    const startIndex = parseInt(offset);
    const endIndex = startIndex + parseInt(limit);
    const paginatedUsers = users.slice(startIndex, endIndex);
    
    res.json({
        users: paginatedUsers,
        total: users.length,
        limit: parseInt(limit),
        offset: parseInt(offset)
    });
});

// Get user by ID
app.get('/users/:id', (req, res) => {
    const userId = parseInt(req.params.id);
    
    console.log(`[USER] Fetching user by ID: ${userId}`);
    
    const user = users.find(u => u.id === userId);
    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user);
});

// Create new user
app.post('/users', (req, res) => {
    const { username, email, firstName, lastName, role = 'user' } = req.body;
    
    console.log(`[USER] Creating new user: ${username}`);
    
    if (!username || !email) {
        return res.status(400).json({ error: 'Username and email are required' });
    }
    
    // Check if user already exists
    const existingUser = users.find(u => u.username === username || u.email === email);
    if (existingUser) {
        return res.status(409).json({ error: 'User already exists' });
    }
    
    const newUser = {
        id: nextUserId++,
        username,
        email,
        firstName: firstName || '',
        lastName: lastName || '',
        role,
        created_at: new Date().toISOString(),
        last_login: null
    };
    
    users.push(newUser);
    
    res.status(201).json({
        success: true,
        user: newUser
    });
});

// Update user
app.put('/users/:id', (req, res) => {
    const userId = parseInt(req.params.id);
    const { username, email, firstName, lastName, role } = req.body;
    
    console.log(`[USER] Updating user ID: ${userId}`);
    
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex === -1) {
        return res.status(404).json({ error: 'User not found' });
    }
    
    // Update user fields
    if (username) users[userIndex].username = username;
    if (email) users[userIndex].email = email;
    if (firstName) users[userIndex].firstName = firstName;
    if (lastName) users[userIndex].lastName = lastName;
    if (role) users[userIndex].role = role;
    
    res.json({
        success: true,
        user: users[userIndex]
    });
});

// Delete user
app.delete('/users/:id', (req, res) => {
    const userId = parseInt(req.params.id);
    
    console.log(`[USER] Deleting user ID: ${userId}`);
    
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex === -1) {
        return res.status(404).json({ error: 'User not found' });
    }
    
    const deletedUser = users.splice(userIndex, 1)[0];
    
    res.json({
        success: true,
        message: `User ${deletedUser.username} deleted successfully`,
        deleted_user: deletedUser
    });
});

// VULNERABLE: Search users endpoint with potential injection
app.get('/users/search/:query', (req, res) => {
    const query = req.params.query;
    
    console.log(`[USER SEARCH] Searching for: ${query}`);
    
    // SECURITY ISSUE: Basic string matching (could be vulnerable in real DB)
    const results = users.filter(user => 
        user.username.toLowerCase().includes(query.toLowerCase()) ||
        user.email.toLowerCase().includes(query.toLowerCase()) ||
        user.firstName.toLowerCase().includes(query.toLowerCase()) ||
        user.lastName.toLowerCase().includes(query.toLowerCase())
    );
    
    res.json({
        query: query,
        results: results,
        total_found: results.length
    });
});

// VULNERABLE: Export user data endpoint
app.get('/users/export/csv', (req, res) => {
    console.log('[USER EXPORT] CSV export requested');
    
    // SECURITY ISSUE: No access control on sensitive data export
    let csvContent = 'id,username,email,firstName,lastName,role,created_at,last_login\n';
    
    users.forEach(user => {
        csvContent += `${user.id},${user.username},${user.email},${user.firstName},${user.lastName},${user.role},${user.created_at},${user.last_login}\n`;
    });
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=users_export.csv');
    res.send(csvContent);
});

// VULNERABLE: User statistics endpoint
app.get('/users/stats', (req, res) => {
    console.log('[USER STATS] Statistics requested');
    
    const stats = {
        total_users: users.length,
        admin_users: users.filter(u => u.role === 'admin').length,
        regular_users: users.filter(u => u.role === 'user').length,
        users_by_domain: {},
        recent_registrations: users.filter(u => {
            const created = new Date(u.created_at);
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            return created > thirtyDaysAgo;
        }).length
    };
    
    // Group users by email domain
    users.forEach(user => {
        const domain = user.email.split('@')[1];
        stats.users_by_domain[domain] = (stats.users_by_domain[domain] || 0) + 1;
    });
    
    res.json(stats);
});

// Error handling
app.use((error, req, res, next) => {
    console.error('[USER ERROR]', error);
    res.status(500).json({ error: 'User service error' });
});

// Start server
app.listen(PORT, '127.0.0.1', () => {
    console.log(`👥 User Service running on http://127.0.0.1:${PORT}`);
    console.log(`📋 Available endpoints:`);
    console.log(`   GET  /users           - List users`);
    console.log(`   POST /users           - Create user`);
    console.log(`   GET  /users/:id       - Get user by ID`);
    console.log(`   PUT  /users/:id       - Update user`);
    console.log(`   DELETE /users/:id     - Delete user`);
    console.log(`   GET  /users/search/:query - Search users`);
    console.log(`   GET  /users/export/csv - Export users (VULNERABLE)`);
    console.log(`   GET  /users/stats     - User statistics`);
    console.log(`⚠️  WARNING: This service contains intentional vulnerabilities`);
});

module.exports = app;
