const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
    constructor() {
        this.db = null;
    }

    async connect() {
        return new Promise((resolve, reject) => {
            const dbPath = process.env.DATABASE_PATH || './data/gateway.db';
            this.db = new sqlite3.Database(dbPath, (err) => {
                if (err) {
                    console.error('Database connection error:', err);
                    reject(err);
                } else {
                    console.log('Connected to SQLite database');
                    this.initializeTables().then(resolve).catch(reject);
                }
            });
        });
    }

    async initializeTables() {
        return new Promise((resolve, reject) => {
            this.db.serialize(() => {
                // Create logs table
                this.db.run(`
                    CREATE TABLE IF NOT EXISTS request_logs (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                        method TEXT,
                        url TEXT,
                        remote_addr TEXT,
                        user_agent TEXT,
                        response_status INTEGER
                    )
                `, (err) => {
                    if (err) {
                        console.error('Error creating request_logs table:', err);
                        reject(err);
                    }
                });

                // Create webhook_logs table
                this.db.run(`
                    CREATE TABLE IF NOT EXISTS webhook_logs (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                        target_url TEXT,
                        method TEXT,
                        payload TEXT,
                        response_status INTEGER,
                        response_body TEXT,
                        is_ssrf_attempt BOOLEAN DEFAULT FALSE
                    )
                `, (err) => {
                    if (err) {
                        console.error('Error creating webhook_logs table:', err);
                        reject(err);
                    } else {
                        resolve();
                    }
                });
            });
        });
    }

    async logRequest(method, url, remoteAddr, userAgent, responseStatus) {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare(`
                INSERT INTO request_logs (method, url, remote_addr, user_agent, response_status)
                VALUES (?, ?, ?, ?, ?)
            `);
            
            stmt.run([method, url, remoteAddr, userAgent, responseStatus], (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
            
            stmt.finalize();
        });
    }

    async logWebhook(targetUrl, method, payload, responseStatus, responseBody, isSsrfAttempt) {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare(`
                INSERT INTO webhook_logs (target_url, method, payload, response_status, response_body, is_ssrf_attempt)
                VALUES (?, ?, ?, ?, ?, ?)
            `);
            
            stmt.run([targetUrl, method, payload, responseStatus, responseBody, isSsrfAttempt], (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
            
            stmt.finalize();
        });
    }

    async close() {
        return new Promise((resolve) => {
            if (this.db) {
                this.db.close((err) => {
                    if (err) {
                        console.error('Error closing database:', err);
                    } else {
                        console.log('Database connection closed');
                    }
                    resolve();
                });
            } else {
                resolve();
            }
        });
    }
}

// Command line interface for database operations
if (require.main === module) {
    const command = process.argv[2];
    const db = new Database();

    switch (command) {
        case 'init':
            db.connect()
                .then(() => {
                    console.log('Database initialized successfully');
                    return db.close();
                })
                .then(() => process.exit(0))
                .catch((err) => {
                    console.error('Database initialization failed:', err);
                    process.exit(1);
                });
            break;

        case 'reset':
            // Implementation for reset would go here
            console.log('Database reset functionality not implemented yet');
            process.exit(0);
            break;

        case 'seed':
            // Implementation for seeding would go here
            console.log('Database seed functionality not implemented yet');
            process.exit(0);
            break;

        default:
            console.log('Usage: node database.js [init|reset|seed]');
            process.exit(1);
    }
}

module.exports = Database;
