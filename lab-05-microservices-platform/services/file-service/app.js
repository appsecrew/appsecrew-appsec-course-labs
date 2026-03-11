/**
 * CloudCorp File Service — INTENTIONALLY VULNERABLE
 *
 * Vulnerabilities:
 * - IDOR-003: Any user can download any file without ownership check
 * - IDOR-004: Any user can delete any file
 */
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3003;
app.use(express.json());

let files = [
    {
        id: 1, name: 'alice-employment-contract.pdf', ownerId: 1,
        content: 'CONFIDENTIAL EMPLOYMENT CONTRACT\n\nEmployee: Alice Smith\nSalary: $95,000/year\nStart date: 2023-03-01\nBonus: 15% target\nEquity: 0.5% options\n[Document continues...]',
        mimeType: 'application/pdf', size: 24576, isPrivate: true, createdAt: '2024-01-10'
    },
    {
        id: 2, name: 'bob-salary-review.xlsx', ownerId: 2,
        content: 'CONFIDENTIAL SALARY REVIEW\n\nEmployee: Bob Jones\nCurrent: $87,000\nProposed: $95,000\nRating: Good\nComments: Strong performer, recommend promotion\n[Spreadsheet data...]',
        mimeType: 'application/vnd.ms-excel', size: 18432, isPrivate: true, createdAt: '2024-01-20'
    },
    {
        id: 3, name: 'admin-production-keys.txt', ownerId: 3,
        content: 'SUPER SENSITIVE - PRODUCTION CREDENTIALS\n\nAWS Production:\n  AccessKey: AKIAPRODUCTION1234567\n  Secret: xyzProductionSecretKey987654\n\nDatabase:\n  postgres://admin:Pr0d#Passw0rd!@prod-db.cloudcorp.com:5432/production\n\nStripe: sk_live_abcdefghijklmnop1234567\nTwilio: SKxxxxxxxx\n\nDO NOT SHARE OUTSIDE ADMIN TEAM',
        mimeType: 'text/plain', size: 1024, isPrivate: true, createdAt: '2024-02-01'
    },
    {
        id: 4, name: 'company-logo.png', ownerId: 1,
        content: '[Binary PNG data - company logo]',
        mimeType: 'image/png', size: 8192, isPrivate: false, createdAt: '2024-01-01'
    }
];

// VULNERABLE: Returns ALL files to any user
app.get('/files', (req, res) => {
    const requesterId = parseInt(req.headers['x-user-id'] || '0');
    console.log(`[FILE] GET /files - user ${requesterId} listing ALL files`);
    // VULNERABLE: Should filter by ownerId === requesterId
    res.json({ files: files.map(f => ({ ...f, content: f.content.substring(0, 50) + '...' })), total: files.length });
});

// VULNERABLE: IDOR - any user can download any file content
app.get('/files/:id', (req, res) => {
    const fileId = parseInt(req.params.id);
    const requesterId = parseInt(req.headers['x-user-id'] || '0');
    console.log(`[FILE] GET /files/${fileId} - user ${requesterId} - IDOR: no ownership check!`);
    // VULNERABLE: Should check file.ownerId === requesterId

    const file = files.find(f => f.id === fileId);
    if (!file) return res.status(404).json({ error: 'File not found' });
    res.json({ ...file, downloadedBy: requesterId, warning: 'IDOR: file accessed without ownership verification' });
});

app.post('/files', (req, res) => {
    const requesterId = parseInt(req.headers['x-user-id'] || '0');
    const { name, content, mimeType = 'text/plain', isPrivate = true } = req.body;
    const newFile = {
        id: files.length + 1, name, content, mimeType, isPrivate,
        ownerId: requesterId, size: (content || '').length, createdAt: new Date().toISOString()
    };
    files.push(newFile);
    res.status(201).json(newFile);
});

// VULNERABLE: Any user can delete any file
app.delete('/files/:id', (req, res) => {
    const fileId = parseInt(req.params.id);
    const requesterId = parseInt(req.headers['x-user-id'] || '0');
    console.log(`[FILE] DELETE /files/${fileId} - user ${requesterId} - IDOR delete`);
    const idx = files.findIndex(f => f.id === fileId);
    if (idx === -1) return res.status(404).json({ error: 'File not found' });
    const deleted = files.splice(idx, 1)[0];
    res.json({ success: true, deletedFile: deleted.name });
});

app.get('/health', (req, res) => res.json({ service: 'file-service', status: 'healthy', port: PORT }));

app.listen(PORT, '0.0.0.0', () => {
    console.log(`📄 File Service on port ${PORT} - INTENTIONALLY VULNERABLE (IDOR)`);
});

module.exports = app;
