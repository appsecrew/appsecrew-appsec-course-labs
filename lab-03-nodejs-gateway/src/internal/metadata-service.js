/**
 * Fake AWS EC2 Instance Metadata Service (IMDS) Simulator
 *
 * This simulates the AWS metadata endpoint at 169.254.169.254 for SSRF training.
 * All credentials here are FAKE/TRAINING ONLY - not real AWS credentials.
 *
 * In a real AWS environment, SSRF to this endpoint could steal IAM credentials.
 *
 * Port: 8169 (simulates 169.254.169.254)
 */
const express = require('express');
const app = express();
const PORT = process.env.METADATA_PORT || 8169;

app.use(express.json());

// Fake training credentials - NOT real AWS credentials
const FAKE_CREDENTIALS = {
    AccessKeyId: 'AKIAIOSFODNN7EXAMPLE',
    SecretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
    Token: 'TRAINING-ONLY-NOT-REAL-AQoXnyc4lcK4w/ILTh//////////wEaoAK1wvxJY12r2IgBiXX+oSCK3hmFux9IHasBx3Bpz',
    Expiration: '2099-12-31T23:59:59Z',
    Type: 'AWS-HMAC',
    Note: 'TRAINING ONLY - These are example credentials from AWS documentation'
};

const FAKE_INSTANCE_ID = 'i-0abc123def456ghij';
const FAKE_ACCOUNT_ID = '123456789012';

// Root metadata listing
app.get('/latest/meta-data/', (req, res) => {
    console.log('[IMDS] Root metadata accessed - SSRF target hit!');
    res.type('text/plain').send([
        'ami-id',
        'ami-launch-index',
        'ami-manifest-path',
        'block-device-mapping/',
        'hostname',
        'iam/',
        'instance-action',
        'instance-id',
        'instance-type',
        'local-hostname',
        'local-ipv4',
        'mac',
        'network/',
        'placement/',
        'profile',
        'public-hostname',
        'public-ipv4',
        'public-keys/',
        'reservation-id',
        'security-groups',
        'services/'
    ].join('\n'));
});

app.get('/latest/meta-data/instance-id', (req, res) => {
    console.log('[IMDS] Instance ID accessed via SSRF');
    res.type('text/plain').send(FAKE_INSTANCE_ID);
});

app.get('/latest/meta-data/instance-type', (req, res) => {
    res.type('text/plain').send('t3.medium');
});

app.get('/latest/meta-data/local-ipv4', (req, res) => {
    res.type('text/plain').send('10.0.1.100');
});

app.get('/latest/meta-data/public-hostname', (req, res) => {
    res.type('text/plain').send('ec2-203-0-113-42.compute-1.amazonaws.com');
});

app.get('/latest/meta-data/security-groups', (req, res) => {
    res.type('text/plain').send('production-web-sg\nproduction-db-sg');
});

app.get('/latest/meta-data/iam/', (req, res) => {
    console.log('[IMDS] IAM directory accessed via SSRF');
    res.type('text/plain').send('info\nsecurity-credentials/');
});

app.get('/latest/meta-data/iam/info', (req, res) => {
    console.log('[IMDS] IAM info accessed via SSRF');
    res.json({
        Code: 'Success',
        LastUpdated: '2024-01-15T10:30:00Z',
        InstanceProfileArn: `arn:aws:iam::${FAKE_ACCOUNT_ID}:instance-profile/production-ec2-role`,
        InstanceProfileId: 'AIPAI3RECOGNITION123456'
    });
});

app.get('/latest/meta-data/iam/security-credentials/', (req, res) => {
    console.log('[IMDS] IAM roles listed via SSRF');
    res.type('text/plain').send('production-ec2-role');
});

// THE MAIN TARGET - IAM credentials endpoint
app.get('/latest/meta-data/iam/security-credentials/:role', (req, res) => {
    console.log(`[IMDS] *** IAM CREDENTIALS ACCESSED VIA SSRF! Role: ${req.params.role} ***`);
    res.json({
        ...FAKE_CREDENTIALS,
        LastUpdated: new Date().toISOString(),
        InstanceProfileArn: `arn:aws:iam::${FAKE_ACCOUNT_ID}:instance-profile/${req.params.role}`
    });
});

app.get('/latest/dynamic/instance-identity/document', (req, res) => {
    console.log('[IMDS] Instance identity document accessed via SSRF');
    res.json({
        accountId: FAKE_ACCOUNT_ID,
        architecture: 'x86_64',
        availabilityZone: 'us-east-1a',
        imageId: 'ami-0abcdef1234567890',
        instanceId: FAKE_INSTANCE_ID,
        instanceType: 't3.medium',
        pendingTime: '2024-01-15T10:00:00Z',
        privateIp: '10.0.1.100',
        region: 'us-east-1',
        version: '2017-09-30',
        note: 'TRAINING ONLY'
    });
});

app.get('/health', (req, res) => {
    res.json({ service: 'metadata-service (FAKE IMDS)', status: 'running', port: PORT });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🎭 Fake AWS Metadata Service (IMDS Simulator) on port ${PORT}`);
    console.log('⚠️  ALL CREDENTIALS ARE FAKE/TRAINING ONLY');
    console.log('📋 Key endpoints:');
    console.log(`   GET /latest/meta-data/`);
    console.log(`   GET /latest/meta-data/iam/security-credentials/`);
    console.log(`   GET /latest/meta-data/iam/security-credentials/production-ec2-role`);
    console.log(`   GET /latest/dynamic/instance-identity/document`);
    console.log('\nSSRF Test: http://127.0.0.1:3000/api/fetch?url=http://127.0.0.1:8169/latest/meta-data/\n');
});

module.exports = app;
