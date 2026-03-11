/**
 * CloudCorp Project Service — INTENTIONALLY VULNERABLE
 *
 * Vulnerabilities:
 * - IDOR-002: Any user can access any project (no membership check)
 * - IDOR-003: Any user can modify/delete any project
 */
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3002;
app.use(express.json());

let projects = [
    {
        id: 1, name: 'Project Alpha', ownerId: 1, members: [1],
        data: 'CONFIDENTIAL: Q4 revenue target $12M. Acquisition strategy for CompetitorX. Layoff plan for 50 employees.',
        isPrivate: true, createdAt: '2024-01-01'
    },
    {
        id: 2, name: 'Project Beta', ownerId: 2, members: [2],
        data: 'SECRET: New product launch strategy. Partnership talks with BigTech. Pre-IPO valuation $500M.',
        isPrivate: true, createdAt: '2024-01-15'
    },
    {
        id: 3, name: 'Project Gamma', ownerId: 3, members: [1, 2, 3],
        data: 'CLASSIFIED: Security audit results. Known vulnerabilities in production. Incident response plan.',
        isPrivate: true, createdAt: '2024-02-01'
    },
    {
        id: 4, name: 'Public Wiki', ownerId: 1, members: [1, 2, 3],
        data: 'Company onboarding guide. Public information.',
        isPrivate: false, createdAt: '2024-01-05'
    }
];

// VULNERABLE: Returns ALL projects, not just user's projects
app.get('/projects', (req, res) => {
    const requesterId = parseInt(req.headers['x-user-id'] || '0');
    console.log(`[PROJECT] GET /projects - user ${requesterId} getting ALL projects (should only see their own)`);
    // VULNERABLE: Should filter: projects.filter(p => p.members.includes(requesterId))
    res.json({ projects, total: projects.length, note: 'VULNERABLE: returning all projects including private ones' });
});

// VULNERABLE: IDOR - returns any project without membership check
app.get('/projects/:id', (req, res) => {
    const projectId = parseInt(req.params.id);
    const requesterId = parseInt(req.headers['x-user-id'] || '0');
    console.log(`[PROJECT] GET /projects/${projectId} - user ${requesterId} - IDOR vulnerability`);
    // VULNERABLE: Should check: if (!project.members.includes(requesterId)) return 403

    const project = projects.find(p => p.id === projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    res.json(project);
});

app.post('/projects', (req, res) => {
    const requesterId = parseInt(req.headers['x-user-id'] || '0');
    const { name, data, isPrivate = true } = req.body;
    const newProject = {
        id: projects.length + 1, name, ownerId: requesterId,
        members: [requesterId], data, isPrivate, createdAt: new Date().toISOString()
    };
    projects.push(newProject);
    res.status(201).json(newProject);
});

// VULNERABLE: Any user can update any project (IDOR)
app.put('/projects/:id', (req, res) => {
    const projectId = parseInt(req.params.id);
    const requesterId = parseInt(req.headers['x-user-id'] || '0');
    console.log(`[PROJECT] PUT /projects/${projectId} - user ${requesterId} modifying project they may not own`);
    // VULNERABLE: Should check ownerId === requesterId

    const idx = projects.findIndex(p => p.id === projectId);
    if (idx === -1) return res.status(404).json({ error: 'Project not found' });

    const { name, data } = req.body;
    if (name) projects[idx].name = name;
    if (data) projects[idx].data = data;
    res.json({ success: true, project: projects[idx] });
});

// VULNERABLE: Any user can delete any project (IDOR)
app.delete('/projects/:id', (req, res) => {
    const projectId = parseInt(req.params.id);
    const requesterId = parseInt(req.headers['x-user-id'] || '0');
    console.log(`[PROJECT] DELETE /projects/${projectId} - user ${requesterId} deleting project`);
    const idx = projects.findIndex(p => p.id === projectId);
    if (idx === -1) return res.status(404).json({ error: 'Project not found' });
    const deleted = projects.splice(idx, 1)[0];
    res.json({ success: true, deleted });
});

app.get('/health', (req, res) => res.json({ service: 'project-service', status: 'healthy', port: PORT }));

app.listen(PORT, '0.0.0.0', () => {
    console.log(`📁 Project Service on port ${PORT} - INTENTIONALLY VULNERABLE (IDOR)`);
});

module.exports = app;
