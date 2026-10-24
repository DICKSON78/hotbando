-- Seed data for HotBando HQ Management System
-- Run: docker exec hotbando-db-1 mysql -u hotbando -pL9ClXPF8coYdT-Uy hotbando < /tmp/seed-hq.sql

-- ==================== REGIONS (4 major regions of Tanzania) ====================
INSERT INTO regions (name, code, description, is_active, created_at) VALUES
('Kaskazini', 'KASK', 'Northern Region - Arusha, Kilimanjaro, Manyara, Tanga', 1, NOW()),
('Kati', 'KATI', 'Central Region - Dodoma, Singida, Tabora, Kigoma', 1, NOW()),
('Kusini', 'KUSI', 'Southern Region - Mbea, Lindi, Mtwara, Ruvuma', 1, NOW()),
('Magharibi', 'MAGH', 'Western Region - Mwanza, Kagera, Mara, Simiyu, Geita', 1, NOW()),
('Pwani', 'PWAN', 'Coastal Region - Dar es Salaam, Pwani, Morogoro', 1, NOW());

-- ==================== DISTRICTS (2-3 per region) ====================
INSERT INTO districts (region_id, name, code, description, is_active, created_at) VALUES
-- Kaskazini
(1, 'Arusha City', 'ARC', 'Arusha City Council', 1, NOW()),
(1, 'Moshi City', 'MOS', 'Moshi City Council', 1, NOW()),
(1, 'Tanga City', 'TAN', 'Tanga City Council', 1, NOW()),
-- Kati
(2, 'Dodoma City', 'DOC', 'Dodoma City Council', 1, NOW()),
(2, 'Singida City', 'SIN', 'Singida City Council', 1, NOW()),
-- Kusini
(3, 'Mbea City', 'MBC', 'Mbea City Council', 1, NOW()),
(3, 'Mtwara City', 'MTC', 'Mtwara City Council', 1, NOW()),
-- Magharibi
(4, 'Mwanza City', 'MWC', 'Mwanza City Council', 1, NOW()),
(4, 'Bukoba City', 'BKC', 'Bukoba City Council', 1, NOW()),
-- Pwani
(5, 'Dar es Salaam City', 'DAR', 'Dar es Salaam City Council', 1, NOW()),
(5, 'Temeke', 'TEM', 'Temeke District', 1, NOW()),
(5, 'Kinondoni', 'KIN', 'Kinondoni District', 1, NOW());

-- ==================== BRANCHES (2 per district) ====================
INSERT INTO branches (district_id, name, code, address, city, phone, email, latitude, longitude, is_active, created_at) VALUES
-- Arusha
(1, 'Arusha CBD Branch', 'ARB-001', 'Sokoine Road', 'Arusha', '+255754000001', 'arusha-cbd@hotbando.com', -3.3869, 36.6830, 1, NOW()),
(1, 'Arusha Sakina Branch', 'ARB-002', 'Sakina Area', 'Arusha', '+255754000002', 'arusha-sakina@hotbando.com', -3.3700, 36.6900, 1, NOW()),
-- Moshi
(2, 'Moshi CBD Branch', 'MOS-001', 'Kenyatta Road', 'Moshi', '+255754000003', 'moshi-cbd@hotbando.com', -3.3340, 37.3390, 1, NOW()),
(2, 'Moshi Soweto Branch', 'MOS-002', 'Soweto Area', 'Moshi', '+255754000004', 'moshi-soweto@hotbando.com', -3.3400, 37.3300, 1, NOW()),
-- Tanga
(3, 'Tanga City Branch', 'TAN-001', 'Amboni Road', 'Tanga', '+255754000005', 'tanga-city@hotbando.com', -5.0689, 39.0986, 1, NOW()),
-- Dodoma
(4, 'Dodoma CBD Branch', 'DOC-001', 'Nyerere Road', 'Dodoma', '+255754000006', 'dodoma-cbd@hotbando.com', -6.1630, 35.7516, 1, NOW()),
(4, 'Dodoma Chang''ombe Branch', 'DOC-002', 'Chang''ombe Area', 'Dodoma', '+255754000007', 'dodoma-changombe@hotbando.com', -6.1700, 35.7400, 1, NOW()),
-- Mwanza
(8, 'Mwanza CBD Branch', 'MWC-001', 'Kenyatta Road', 'Mwanza', '+255754000008', 'mwanza-cbd@hotbando.com', -2.5164, 32.9175, 1, NOW()),
(8, 'Mwanza Kirumba Branch', 'MWC-002', 'Kirumba Area', 'Mwanza', '+255754000009', 'mwanza-kirumba@hotbando.com', -2.5200, 32.9200, 1, NOW()),
-- Dar es Salaam
(10, 'Dar es Salaam CBD Branch', 'DAR-001', 'Garden Avenue', 'Dar es Salaam', '+255754000010', 'dar-cbd@hotbando.com', -6.7924, 39.2083, 1, NOW()),
(10, 'Dar es Salaam Kariakoo Branch', 'DAR-002', 'Kariakoo Market Area', 'Dar es Salaam', '+255754000011', 'dar-kariakoo@hotbando.com', -6.8100, 39.2700, 1, NOW()),
(11, 'Temeke Branch', 'TEM-001', 'Temeke Centre', 'Dar es Salaam', '+255754000012', 'temeke@hotbando.com', -6.8800, 39.2800, 1, NOW()),
(12, 'Kinondoni Branch', 'KIN-001', 'Sinza Area', 'Dar es Salaam', '+255754000013', 'kinondoni@hotbando.com', -6.7700, 39.2300, 1, NOW());

-- ==================== STAFF (admin user already exists as user_id=1) ====================
-- Create staff entries (admin is user_id=1)
INSERT INTO staff (user_id, employee_id, branch_id, department, job_title, employment_type, hire_date, salary, status, created_at) VALUES
(1, 'EMP-0001', 1, 'Management', 'Country Manager', 'full_time', '2024-01-01', 2500000, 'active', NOW());

-- ==================== TICKET CATEGORIES ====================
INSERT INTO ticket_categories (name, description) VALUES
('Technical', 'Technical issues with routers, WiFi, connectivity'),
('Billing', 'Payment and billing related issues'),
('Account', 'Account access, password reset, registration'),
('Complaint', 'General complaints and feedback'),
('Request', 'Service requests, upgrades, new connections');

-- ==================== EXPENSE CATEGORIES ====================
INSERT INTO expense_categories (name, description, created_at) VALUES
('Internet Bandwidth', 'Monthly ISP bandwidth costs', NOW()),
('Equipment Purchase', 'Routers, switches, cables, APs', NOW()),
('Rent & Utilities', 'Office and branch rent, electricity, water', NOW()),
('Staff Salaries', 'Monthly payroll', NOW()),
('Marketing', 'Advertising and promotions', NOW()),
('Transport', 'Staff transport and logistics', NOW()),
('Maintenance', 'Equipment maintenance and repairs', NOW()),
('License & Permits', 'Government licenses and permits', NOW());

-- ==================== ASSET CATEGORIES ====================
INSERT INTO asset_categories (name, description, created_at) VALUES
('Network Equipment', 'Routers, switches, access points, antennas', NOW()),
('Computer Hardware', 'Laptops, desktops, monitors, printers', NOW()),
('Furniture', 'Desks, chairs, cabinets, shelving', NOW()),
('Vehicles', 'Company vehicles and motorcycles', NOW()),
('Office Equipment', 'Copiers, projectors, phones', NOW());

-- ==================== SEED SOME USERS (various roles) ====================
-- Passwords are bcrypt hashed 'Admin@123'
INSERT INTO users (name, phone_number, email, password, role, is_active, created_at) VALUES
('John Mwangi', '+255711000001', 'john.mwangi@hotbando.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', 1, NOW()),
('Fatima Hassan', '+255711000002', 'fatima.hassan@hotbando.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'sponsor', 1, NOW()),
('Bank of Tanzania', '+255711000003', 'bof@hotbando.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'bank_partner', 1, NOW()),
('Franchise Owner', '+255711000004', 'franchise@hotbando.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'franchise_owner', 1, NOW()),
('Test Reseller', '+255711000005', 'reseller@hotbando.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'franchise_owner', 1, NOW()),
('Test Investor', '+255711000006', 'investor@hotbando.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', 1, NOW());

-- Add staff for branches
INSERT INTO staff (user_id, employee_id, branch_id, department, job_title, employment_type, hire_date, salary, status, created_at) VALUES
(2, 'EMP-0002', 1, 'Operations', 'Branch Manager', 'full_time', '2024-03-15', 1500000, 'active', NOW()),
(3, 'EMP-0003', 5, 'Finance', 'Accountant', 'full_time', '2024-06-01', 1200000, 'active', NOW()),
(4, 'EMP-0004', 8, 'Technical', 'Network Engineer', 'full_time', '2024-04-01', 1800000, 'active', NOW()),
(5, 'EMP-0005', 10, 'Sales', 'Sales Representative', 'full_time', '2025-01-10', 900000, 'active', NOW()),
(6, 'EMP-0006', 11, 'Technical', 'IT Support', 'contract', '2025-02-01', 750000, 'active', NOW());

-- ==================== SAMPLE EXPENSES ====================
INSERT INTO expenses (title, description, amount, category_id, branch_id, expense_date, payment_method, status, submitted_by, created_at) VALUES
('MikroTik RB4011 Purchase', '10 units for Arusha branches', 4500000, 2, 1, '2026-01-15', 'bank_transfer', 'approved', 1, NOW()),
('January Office Rent', 'Arusha CBD office rent', 800000, 3, 1, '2026-01-01', 'mobile_money', 'approved', 1, NOW()),
('Internet Bandwidth - January', 'TZTelecom 100Mbps line', 3500000, 1, 10, '2026-01-05', 'bank_transfer', 'approved', 1, NOW()),
('Marketing Flyers', '1000 flyers for Dar es Salaam campaign', 250000, 5, 10, '2026-02-10', 'cash', 'pending', 1, NOW()),
('Staff Training', 'MikroTik certification for 3 engineers', 2100000, 6, 1, '2026-02-20', 'bank_transfer', 'pending', 1, NOW());

-- ==================== SAMPLE BUDGETS ====================
INSERT INTO budgets (category_id, branch_id, name, budget_type, amount, spent, period_start, period_end, status, created_at) VALUES
(1, NULL, 'National Bandwidth Budget Q1 2026', 'operational', 15000000, 10500000, '2026-01-01', '2026-03-31', 'active', NOW()),
(2, 1, 'Arusha Equipment Budget', 'capital', 8000000, 4500000, '2026-01-01', '2026-06-30', 'active', NOW()),
(4, NULL, 'National Payroll Budget Q1', 'personnel', 25000000, 24000000, '2026-01-01', '2026-03-31', 'active', NOW()),
(5, NULL, 'Marketing Budget 2026', 'marketing', 10000000, 2250000, '2026-01-01', '2026-12-31', 'active', NOW());

-- ==================== SAMPLE ASSETS ====================
INSERT INTO assets (category_id, branch_id, asset_tag, name, description, serial_number, purchase_date, purchase_cost, warranty_expiry, condition_status, status, created_at) VALUES
(1, 1, 'AST-NET-0001', 'MikroTik RB4011', 'Main router for Arusha CBD', 'MT-2024-001', '2024-01-15', 1200000, '2026-01-15', 'good', 'active', NOW()),
(1, 1, 'AST-NET-0002', 'Ubiquiti UniFi AP', 'WiFi access point Arusha CBD', 'UB-2024-001', '2024-01-15', 350000, '2026-01-15', 'good', 'active', NOW()),
(1, 10, 'AST-NET-0003', 'MikroTik CCR1036', 'Core router Dar es Salaam', 'MT-2024-002', '2024-03-01', 2800000, '2026-03-01', 'good', 'active', NOW()),
(2, 1, 'AST-CMP-0001', 'Dell Latitude 5520', 'Branch manager laptop', 'DL-2024-001', '2024-02-01', 1800000, '2027-02-01', 'new', 'active', NOW()),
(2, 10, 'AST-CMP-0002', 'HP LaserJet Pro', 'Office printer Dar HQ', 'HP-2024-001', '2024-03-01', 450000, '2026-03-01', 'good', 'active', NOW()),
(3, 1, 'AST-FRN-0001', 'Office Desk & Chair Set', 'Reception desk', NULL, '2024-01-10', 250000, NULL, 'good', 'active', NOW()),
(4, NULL, 'AST-VEH-0001', 'Toyota Hilux', 'Service vehicle', 'TZ-2024-HILUX', '2024-06-01', 45000000, '2029-06-01', 'new', 'active', NOW());

-- ==================== SAMPLE MARKETING CAMPAIGNS ====================
INSERT INTO marketing_campaigns (campaign_name, campaign_type, description, target_audience, budget, spent, start_date, end_date, status, leads_generated, conversions, managed_by, created_at) VALUES
('Dar es Salaam Launch', 'social_media', 'WiFi service launch campaign in Dar es Salaam', 'Youth 18-35 in Dar es Salaam', 5000000, 3200000, '2026-01-01', '2026-03-31', 'completed', 1250, 380, 1, NOW()),
('Mwanza Student Promo', 'sms', 'Student WiFi discount campaign', 'University students in Mwanza', 2000000, 1800000, '2026-02-01', '2026-04-30', 'active', 800, 220, 1, NOW()),
('National Referral Program', 'referral', 'Refer a friend get free data', 'All existing customers', 3000000, 500000, '2026-03-01', '2026-06-30', 'active', 0, 0, 1, NOW());

-- ==================== SAMPLE CONTRACTS ====================
INSERT INTO contracts (contract_number, title, contract_type, party_name, party_contact, start_date, end_date, value, terms, status, created_by, created_at) VALUES
('CTR-2026-0001', 'ISP Bandwidth Agreement - TZTelecom', 'service', 'TZTelecom Ltd', '+25522123456', '2025-01-01', '2027-12-31', 126000000, '100Mbps dedicated line, 99.9% uptime SLA', 'active', 1, NOW()),
('CTR-2026-0002', 'Office Lease - Dar es Salaam HQ', 'lease', 'Umoja Properties Ltd', '+255754987654', '2024-06-01', '2026-05-31', 36000000, 'Monthly rent TZS 1,500,000', 'expired', 1, NOW()),
('CTR-2026-0003', 'MikroTik Distribution Agreement', 'vendor', 'MikroTik East Africa', '+255712345678', '2025-07-01', '2026-06-30', 50000000, 'Preferred pricing on bulk orders', 'active', 1, NOW());

-- ==================== SAMPLE LICENSES ====================
INSERT INTO licenses_permits (license_number, title, license_type, branch_id, issuing_authority, issue_date, expiry_date, cost, status, created_at) VALUES
('TCRA/ISP/2025/0001', 'ISP License - Tanzania', 'telecom', NULL, 'TCRA', '2025-01-01', '2027-12-31', 5000000, 'active', NOW()),
('BRELA/2024/HOTBANDO', 'Business Registration Certificate', 'business', NULL, 'BRELA', '2024-01-15', '2026-01-14', 150000, 'expired', NOW()),
('Taxes/TIN/2024', 'Tax Identification Number', 'tax', NULL, 'TRA', '2024-01-01', '2099-12-31', 0, 'active', NOW()),
('TFDA/FW/2025/001', 'Fire Safety Certificate', 'safety', 10, 'TFDA', '2025-03-01', '2026-03-01', 200000, 'active', NOW());
