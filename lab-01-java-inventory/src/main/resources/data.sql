-- =============================================================
-- LAB 01 - Seed Data
-- VULNERABLE: Plaintext passwords stored in database
-- =============================================================

-- Users (passwords in plaintext - intentional vulnerability)
INSERT INTO users (username, password, email, role, enabled) VALUES
('admin',    'admin123',    'admin@secureshop.com',    'ADMIN', TRUE),
('john',     'password123', 'john@secureshop.com',     'USER',  TRUE),
('jane',     'secret',      'jane@secureshop.com',     'USER',  TRUE),
('manager',  'manager2024', 'manager@secureshop.com',  'MANAGER', TRUE);

-- Suppliers
INSERT INTO suppliers (name, contact_email, phone, address, is_active) VALUES
('TechParts Inc.',    'orders@techparts.com',   '555-0101', '123 Industrial Ave, Tech City, CA 94000', TRUE),
('Office Supplies Co', 'sales@officesupco.com',  '555-0202', '456 Commerce Blvd, Supply Town, NY 10001', TRUE),
('Global Electronics', 'contact@globalelec.com', '555-0303', '789 Import Rd, Trade Port, TX 75001', TRUE),
('Local Warehouse',    'info@localwh.com',        '555-0404', '321 Storage Dr, Warehouse District, IL 60601', TRUE);

-- Products
INSERT INTO products (name, description, price, category, quantity, supplier_id) VALUES
('Laptop 15"',          'High-performance business laptop, Intel i7, 16GB RAM, 512GB SSD', 1299.99, 'Electronics', 45, 3),
('Wireless Mouse',      'Ergonomic wireless mouse with 2.4GHz connectivity, 12-month battery', 29.99,  'Electronics', 150, 1),
('USB-C Hub 7-port',    'Multiport adapter: HDMI, USB-A x3, USB-C PD, SD Card, Ethernet', 49.99,  'Electronics', 80,  3),
('Office Chair Pro',    'Ergonomic mesh chair, lumbar support, adjustable armrests', 399.99, 'Furniture',   25,  4),
('Standing Desk',       'Electric height-adjustable desk, 60"x30", dual-motor', 899.99, 'Furniture',   10,  4),
('Printer Paper A4',    'Premium 80gsm A4 paper, 500 sheets/ream, acid-free', 12.99,  'Stationery',  200, 2),
('Ballpoint Pens x12',  'Smooth writing blue ballpoint pens, medium tip, refillable', 5.99,   'Stationery',  500, 2),
('Monitor 27"',         '4K IPS display, 60Hz, USB-C, HDR400, VESA compatible', 549.99, 'Electronics', 30,  3),
('Webcam 1080p',        'Full HD webcam with noise-cancelling mic, auto light correction', 79.99,  'Electronics', 60,  1),
('Label Maker',         'Professional label printer, Bluetooth, 180dpi, tape width 6-24mm', 89.99,  'Stationery',  40,  2);

-- Inventory transactions
INSERT INTO inventory_transactions (product_id, quantity_change, transaction_type, notes, user_id) VALUES
(1, 50,  'IN',     'Initial stock purchase from Global Electronics', 1),
(1, -5,  'OUT',    'Sold to customer order #1001',                   2),
(2, 200, 'IN',     'Bulk purchase - Q4 restock',                     1),
(2, -50, 'OUT',    'Department allocation - IT team',                 3),
(3, 100, 'IN',     'New product arrival',                            1),
(4, 30,  'IN',     'Office renovation purchase',                     1),
(4, -5,  'OUT',    'New employee onboarding',                        4),
(5, 15,  'IN',     'Ergonomics initiative - 15 units',               1),
(6, 500, 'IN',     'Annual stationery order',                        2),
(7, 1000,'IN',     'Bulk pen order - annual supply',                 2);
