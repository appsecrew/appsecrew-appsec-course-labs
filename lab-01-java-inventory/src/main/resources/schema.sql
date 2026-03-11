-- =============================================================
-- LAB 01 - SQL Injection Training Lab - Database Schema
-- =============================================================

DROP TABLE IF EXISTS inventory_transactions;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS suppliers;
DROP TABLE IF EXISTS users;

-- Users table (intentionally stores plaintext passwords)
CREATE TABLE users (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    username    VARCHAR(50) UNIQUE NOT NULL,
    password    VARCHAR(100) NOT NULL,   -- VULNERABLE: plaintext passwords
    email       VARCHAR(100) UNIQUE NOT NULL,
    role        VARCHAR(20) NOT NULL DEFAULT 'USER',
    enabled     BOOLEAN NOT NULL DEFAULT TRUE,
    last_login  TIMESTAMP NULL
);

-- Suppliers table
CREATE TABLE suppliers (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    name          VARCHAR(100) NOT NULL,
    contact_email VARCHAR(100),
    phone         VARCHAR(30),
    address       TEXT,
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Products table
CREATE TABLE products (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    description TEXT,
    price       DECIMAL(10,2) NOT NULL,
    category    VARCHAR(50),
    quantity    INT NOT NULL DEFAULT 0,
    supplier_id INT,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
);

-- Inventory transactions
CREATE TABLE inventory_transactions (
    id               INT AUTO_INCREMENT PRIMARY KEY,
    product_id       INT NOT NULL,
    quantity_change  INT NOT NULL,
    transaction_type VARCHAR(20) NOT NULL,  -- 'IN' / 'OUT' / 'ADJUST'
    notes            TEXT,
    user_id          INT,
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (user_id)    REFERENCES users(id)
);
