const db = require('../config/database');

const hqController = {

  // ==================== BRANCHES ====================

  async getRegions(req, res) {
    try {
      const [rows] = await db.execute(`
        SELECT r.*, u.name AS manager_name,
          (SELECT COUNT(*) FROM districts d WHERE d.region_id = r.id) AS district_count,
          (SELECT COUNT(*) FROM branches b
            JOIN districts d2 ON b.district_id = d2.id
            WHERE d2.region_id = r.id) AS branch_count
        FROM regions r
        LEFT JOIN users u ON r.manager_id = u.id
        ORDER BY r.name
      `);
      res.json({ success: true, data: rows });
    } catch (error) {
      console.error('getRegions error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async createRegion(req, res) {
    try {
      const { name, code, manager_id, description } = req.body;
      const [result] = await db.execute(
        'INSERT INTO regions (name, code, manager_id, description, created_at) VALUES (?, ?, ?, ?, NOW())',
        [name, code, manager_id || null, description || null]
      );
      res.json({ success: true, data: { id: result.insertId, message: 'Region created' } });
    } catch (error) {
      console.error('createRegion error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async updateRegion(req, res) {
    try {
      const { id } = req.params;
      const { name, code, manager_id, description } = req.body;
      await db.execute(
        'UPDATE regions SET name = ?, code = ?, manager_id = ?, description = ? WHERE id = ?',
        [name, code, manager_id || null, description || null, id]
      );
      res.json({ success: true, data: { message: 'Region updated' } });
    } catch (error) {
      console.error('updateRegion error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async getDistricts(req, res) {
    try {
      const { region_id } = req.query;
      let sql = `
        SELECT d.*, r.name AS region_name,
          (SELECT COUNT(*) FROM branches b WHERE b.district_id = d.id) AS branch_count
        FROM districts d
        LEFT JOIN regions r ON d.region_id = r.id
      `;
      const params = [];
      if (region_id) {
        sql += ' WHERE d.region_id = ?';
        params.push(region_id);
      }
      sql += ' ORDER BY d.name';
      const [rows] = await db.execute(sql, params);
      res.json({ success: true, data: rows });
    } catch (error) {
      console.error('getDistricts error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async createDistrict(req, res) {
    try {
      const { name, code, region_id, description } = req.body;
      const [result] = await db.execute(
        'INSERT INTO districts (name, code, region_id, description, created_at) VALUES (?, ?, ?, ?, NOW())',
        [name, code, region_id, description || null]
      );
      res.json({ success: true, data: { id: result.insertId, message: 'District created' } });
    } catch (error) {
      console.error('createDistrict error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async updateDistrict(req, res) {
    try {
      const { id } = req.params;
      const { name, code, region_id, description } = req.body;
      await db.execute(
        'UPDATE districts SET name = ?, code = ?, region_id = ?, description = ? WHERE id = ?',
        [name, code, region_id, description || null, id]
      );
      res.json({ success: true, data: { message: 'District updated' } });
    } catch (error) {
      console.error('updateDistrict error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async getBranches(req, res) {
    try {
      const { search, district_id, page = 1, limit = 20 } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);
      let whereClauses = [];
      let params = [];

      if (search) {
        whereClauses.push('(b.name LIKE ? OR b.code LIKE ?)');
        params.push(`%${search}%`, `%${search}%`);
      }
      if (district_id) {
        whereClauses.push('b.district_id = ?');
        params.push(district_id);
      }

      const whereSQL = whereClauses.length ? 'WHERE ' + whereClauses.join(' AND ') : '';

      const [countResult] = await db.execute(
        `SELECT COUNT(*) AS total FROM branches b ${whereSQL}`, params
      );
      const total = countResult[0].total;

      const [rows] = await db.execute(
        `SELECT b.*, d.name AS district_name, r.name AS region_name,
          u.name AS manager_name,
          (SELECT COUNT(*) FROM staff s WHERE s.branch_id = b.id) AS staff_count,
          (SELECT COUNT(*) FROM mikrotiks m WHERE m.is_active = 1) AS router_count
        FROM branches b
        LEFT JOIN districts d ON b.district_id = d.id
        LEFT JOIN regions r ON d.region_id = r.id
        LEFT JOIN users u ON b.manager_id = u.id
        ${whereSQL}
        ORDER BY b.name
        LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`,
        params
      );
      res.json({ success: true, data: { branches: rows, total, page: parseInt(page), limit: parseInt(limit) } });
    } catch (error) {
      console.error('getBranches error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async createBranch(req, res) {
    try {
      const { name, code, district_id, manager_id, address, phone, email, latitude, longitude } = req.body;
      const [result] = await db.execute(
        `INSERT INTO branches (name, code, district_id, manager_id, address, phone, email, latitude, longitude, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [name, code, district_id, manager_id || null, address || null, phone || null, email || null, latitude || null, longitude || null]
      );
      res.json({ success: true, data: { id: result.insertId, message: 'Branch created' } });
    } catch (error) {
      console.error('createBranch error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async updateBranch(req, res) {
    try {
      const { id } = req.params;
      const { name, code, district_id, manager_id, address, phone, email, latitude, longitude, is_active } = req.body;
      await db.execute(
        `UPDATE branches SET name = ?, code = ?, district_id = ?, manager_id = ?,
         address = ?, phone = ?, email = ?, latitude = ?, longitude = ?, is_active = ? WHERE id = ?`,
        [name, code, district_id, manager_id || null, address || null, phone || null, email || null, latitude || null, longitude || null, is_active !== undefined ? is_active : 1, id]
      );
      res.json({ success: true, data: { message: 'Branch updated' } });
    } catch (error) {
      console.error('updateBranch error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async getBranchDetails(req, res) {
    try {
      const { id } = req.params;
      const [rows] = await db.execute(
        `SELECT b.*, d.name AS district_name, r.name AS region_name,
          u.name AS manager_name
        FROM branches b
        LEFT JOIN districts d ON b.district_id = d.id
        LEFT JOIN regions r ON d.region_id = r.id
        LEFT JOIN users u ON b.manager_id = u.id
        WHERE b.id = ?`,
        [id]
      );
      if (!rows.length) return res.status(404).json({ success: false, error: 'Branch not found' });

      const [staffCount] = await db.execute('SELECT COUNT(*) AS count FROM staff WHERE branch_id = ?', [id]);
      const [routerCount] = await db.execute('SELECT COUNT(*) AS count FROM mikrotiks WHERE branch_id = ?', [id]);
      const [expenseResult] = await db.execute('SELECT COALESCE(SUM(amount), 0) AS total FROM expenses WHERE branch_id = ? AND status = ?', [id, 'approved']);

      const branch = rows[0];
      branch.staff_count = staffCount[0].count;
      branch.router_count = routerCount[0].count;
      branch.total_expenses = expenseResult[0].total;

      res.json({ success: true, data: branch });
    } catch (error) {
      console.error('getBranchDetails error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // ==================== STAFF / HR ====================

  async getStaff(req, res) {
    try {
      const { search, branch_id, department, page = 1, limit = 20 } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);
      let whereClauses = [];
      let params = [];

      if (search) {
        whereClauses.push('(u.name LIKE ? OR s.employee_id LIKE ? OR u.email LIKE ?)');
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
      }
      if (branch_id) {
        whereClauses.push('s.branch_id = ?');
        params.push(branch_id);
      }
      if (department) {
        whereClauses.push('s.department = ?');
        params.push(department);
      }

      const whereSQL = whereClauses.length ? 'WHERE ' + whereClauses.join(' AND ') : '';

      const [countResult] = await db.execute(
        `SELECT COUNT(*) AS total FROM staff s JOIN users u ON s.user_id = u.id ${whereSQL}`, params
      );
      const total = countResult[0].total;

      const [rows] = await db.execute(
        `SELECT s.*, u.name, u.email, u.phone_number, u.is_active AS user_active,
          b.name AS branch_name, d.name AS district_name, r.name AS region_name
        FROM staff s
        JOIN users u ON s.user_id = u.id
        LEFT JOIN branches b ON s.branch_id = b.id
        LEFT JOIN districts d ON b.district_id = d.id
        LEFT JOIN regions r ON d.region_id = r.id
        ${whereSQL}
        ORDER BY u.name
        LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`,
        params
      );
      res.json({ success: true, data: { staff: rows, total, page: parseInt(page), limit: parseInt(limit) } });
    } catch (error) {
      console.error('getStaff error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async createStaff(req, res) {
    try {
      const { name, email, phone, branch_id, department, job_title, employee_id, salary, hire_date } = req.body;

      const crypto = require('crypto');
      const bcrypt = require('bcryptjs');
      const tempPassword = crypto.randomBytes(8).toString('hex');
      const hashedPassword = await bcrypt.hash(tempPassword, 12);

      const [userResult] = await db.execute(
        `INSERT INTO users (name, email, phone_number, password, role, is_active, created_at)
         VALUES (?, ?, ?, ?, 'admin', 1, NOW())`,
        [name, email, phone || null, hashedPassword]
      );
      const userId = userResult.insertId;

      const [staffResult] = await db.execute(
        `INSERT INTO staff (user_id, employee_id, branch_id, department, job_title, salary, hire_date, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
        [userId, employee_id, branch_id || null, department || null, job_title || null, salary || null, hire_date || null]
      );

      res.json({ success: true, data: { id: staffResult.insertId, user_id: userId, temp_password: tempPassword, message: 'Staff created' } });
    } catch (error) {
      console.error('createStaff error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async updateStaff(req, res) {
    try {
      const { id } = req.params;
      const { name, email, phone, branch_id, department, job_title, salary, is_active } = req.body;

      const [staff] = await db.execute('SELECT user_id FROM staff WHERE id = ?', [id]);
      if (!staff.length) return res.status(404).json({ success: false, error: 'Staff not found' });

      await db.execute('UPDATE users SET name = ?, email = ?, phone_number = ?, is_active = ? WHERE id = ?',
        [name, email, phone || null, is_active !== undefined ? is_active : 1, staff[0].user_id]);
      await db.execute('UPDATE staff SET branch_id = ?, department = ?, job_title = ?, salary = ? WHERE id = ?',
        [branch_id || null, department || null, job_title || null, salary || null, id]);

      res.json({ success: true, data: { message: 'Staff updated' } });
    } catch (error) {
      console.error('updateStaff error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async getAttendance(req, res) {
    try {
      const { branch_id, staff_id, date_from, date_to, page = 1, limit = 20 } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);
      let whereClauses = [];
      let params = [];

      if (branch_id) { whereClauses.push('s.branch_id = ?'); params.push(branch_id); }
      if (staff_id) { whereClauses.push('a.staff_id = ?'); params.push(staff_id); }
      if (date_from) { whereClauses.push('a.attendance_date >= ?'); params.push(date_from); }
      if (date_to) { whereClauses.push('a.attendance_date <= ?'); params.push(date_to); }

      const whereSQL = whereClauses.length ? 'WHERE ' + whereClauses.join(' AND ') : '';

      const [countResult] = await db.execute(
        `SELECT COUNT(*) AS total FROM attendance a JOIN staff s ON a.staff_id = s.id ${whereSQL}`, params
      );

      const [rows] = await db.execute(
        `SELECT a.*, s.employee_id, u.name AS staff_name, b.name AS branch_name
        FROM attendance a
        JOIN staff s ON a.staff_id = s.id
        JOIN users u ON s.user_id = u.id
        LEFT JOIN branches b ON s.branch_id = b.id
        ${whereSQL}
        ORDER BY a.attendance_date DESC, u.name
        LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`,
        params
      );
      res.json({ success: true, data: { attendance: rows, total: countResult[0].total, page: parseInt(page), limit: parseInt(limit) } });
    } catch (error) {
      console.error('getAttendance error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async markAttendance(req, res) {
    try {
      const { staff_id, date, status, check_in, check_out, notes } = req.body;
      const [existing] = await db.execute(
        'SELECT id FROM attendance WHERE staff_id = ? AND attendance_date = ?', [staff_id, date]
      );

      if (existing.length) {
        await db.execute(
          'UPDATE attendance SET status = ?, check_in = ?, check_out = ?, notes = ? WHERE id = ?',
          [status, check_in || null, check_out || null, notes || null, existing[0].id]
        );
        res.json({ success: true, data: { message: 'Attendance updated' } });
      } else {
        const [result] = await db.execute(
          'INSERT INTO attendance (staff_id, attendance_date, status, check_in, check_out, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())',
          [staff_id, date, status, check_in || null, check_out || null, notes || null]
        );
        res.json({ success: true, data: { id: result.insertId, message: 'Attendance marked' } });
      }
    } catch (error) {
      console.error('markAttendance error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async getLeaveRequests(req, res) {
    try {
      const { status, staff_id, page = 1, limit = 20 } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);
      let whereClauses = [];
      let params = [];

      if (status) { whereClauses.push('lr.status = ?'); params.push(status); }
      if (staff_id) { whereClauses.push('lr.staff_id = ?'); params.push(staff_id); }

      const whereSQL = whereClauses.length ? 'WHERE ' + whereClauses.join(' AND ') : '';

      const [countResult] = await db.execute(`SELECT COUNT(*) AS total FROM leave_requests lr ${whereSQL}`, params);

      const [rows] = await db.execute(
        `SELECT lr.*, s.employee_id, u.name AS staff_name, b.name AS branch_name,
          approver.name AS approved_by_name
        FROM leave_requests lr
        JOIN staff s ON lr.staff_id = s.id
        JOIN users u ON s.user_id = u.id
        LEFT JOIN branches b ON s.branch_id = b.id
        LEFT JOIN users approver ON lr.approved_by = approver.id
        ${whereSQL}
        ORDER BY lr.created_at DESC
        LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`,
        params
      );
      res.json({ success: true, data: { requests: rows, total: countResult[0].total, page: parseInt(page), limit: parseInt(limit) } });
    } catch (error) {
      console.error('getLeaveRequests error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async updateLeaveStatus(req, res) {
    try {
      const { id } = req.params;
      const { status, notes } = req.body;
      const approvedBy = req.session.admin_user?.id || null;

      await db.execute(
        'UPDATE leave_requests SET status = ?, approved_by = ?, notes = ?, updated_at = NOW() WHERE id = ?',
        [status, approvedBy, notes || null, id]
      );
      res.json({ success: true, data: { message: `Leave ${status}` } });
    } catch (error) {
      console.error('updateLeaveStatus error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // ==================== FINANCE ====================

  async getExpenses(req, res) {
    try {
      const { branch_id, category_id, date_from, date_to, page = 1, limit = 20 } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);
      let whereClauses = [];
      let params = [];

      if (branch_id) { whereClauses.push('e.branch_id = ?'); params.push(branch_id); }
      if (category_id) { whereClauses.push('e.category_id = ?'); params.push(category_id); }
      if (date_from) { whereClauses.push('e.expense_date >= ?'); params.push(date_from); }
      if (date_to) { whereClauses.push('e.expense_date <= ?'); params.push(date_to); }

      const whereSQL = whereClauses.length ? 'WHERE ' + whereClauses.join(' AND ') : '';

      const [countResult] = await db.execute(`SELECT COUNT(*) AS total FROM expenses e ${whereSQL}`, params);

      const [rows] = await db.execute(
        `SELECT e.*, ec.name AS category_name, b.name AS branch_name, u.name AS submitted_by_name
        FROM expenses e
        LEFT JOIN expense_categories ec ON e.category_id = ec.id
        LEFT JOIN branches b ON e.branch_id = b.id
        LEFT JOIN users u ON e.submitted_by = u.id
        ${whereSQL}
        ORDER BY e.expense_date DESC
        LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`,
        params
      );
      res.json({ success: true, data: { expenses: rows, total: countResult[0].total, page: parseInt(page), limit: parseInt(limit) } });
    } catch (error) {
      console.error('getExpenses error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async createExpense(req, res) {
    try {
      const { title, description, amount, category_id, branch_id, expense_date, payment_method, receipt_url, notes } = req.body;
      const createdBy = req.session.admin_user?.id || null;
      const [result] = await db.execute(
        `INSERT INTO expenses (title, description, amount, category_id, branch_id, expense_date, payment_method, receipt_url, notes, submitted_by, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW())`,
        [title || description, description || null, amount, category_id, branch_id || null, expense_date, payment_method || 'cash', receipt_url || null, notes || null, createdBy]
      );
      res.json({ success: true, data: { id: result.insertId, message: 'Expense created' } });
    } catch (error) {
      console.error('createExpense error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async approveExpense(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const approvedBy = req.session.admin_user?.id || null;
      await db.execute(
        'UPDATE expenses SET status = ?, approved_by = ?, approved_at = NOW() WHERE id = ?',
        [status, approvedBy, id]
      );
      res.json({ success: true, data: { message: `Expense ${status}` } });
    } catch (error) {
      console.error('approveExpense error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async getExpenseCategories(req, res) {
    try {
      const [rows] = await db.execute(
        `SELECT ec.*,
          (SELECT COUNT(*) FROM expenses e WHERE e.category_id = ec.id) AS expense_count,
          (SELECT COALESCE(SUM(e.amount), 0) FROM expenses e WHERE e.category_id = ec.id AND e.status = 'approved') AS total_spent
        FROM expense_categories ec
        ORDER BY ec.name`
      );
      res.json({ success: true, data: rows });
    } catch (error) {
      console.error('getExpenseCategories error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async createExpenseCategory(req, res) {
    try {
      const { name, description } = req.body;
      const [result] = await db.execute(
        'INSERT INTO expense_categories (name, description, created_at) VALUES (?, ?, NOW())',
        [name, description || null]
      );
      res.json({ success: true, data: { id: result.insertId, message: 'Category created' } });
    } catch (error) {
      console.error('createExpenseCategory error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async getBudgets(req, res) {
    try {
      const { branch_id, status } = req.query;
      let whereClauses = [];
      let params = [];

      if (branch_id) { whereClauses.push('bt.branch_id = ?'); params.push(branch_id); }
      if (status) { whereClauses.push('bt.status = ?'); params.push(status); }

      const whereSQL = whereClauses.length ? 'WHERE ' + whereClauses.join(' AND ') : '';

      const [rows] = await db.execute(
        `SELECT bt.*, ec.name AS category_name, br.name AS branch_name
        FROM budgets bt
        LEFT JOIN expense_categories ec ON bt.category_id = ec.id
        LEFT JOIN branches br ON bt.branch_id = br.id
        ${whereSQL}
        ORDER BY bt.created_at DESC`,
        params
      );
      res.json({ success: true, data: rows });
    } catch (error) {
      console.error('getBudgets error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async createBudget(req, res) {
    try {
      const { category_id, branch_id, name, budget_type, amount, period_start, period_end, notes } = req.body;
      const [result] = await db.execute(
        `INSERT INTO budgets (category_id, branch_id, name, budget_type, amount, period_start, period_end, notes, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [category_id || null, branch_id || null, name, budget_type || 'operational', amount, period_start, period_end || null, notes || null]
      );
      res.json({ success: true, data: { id: result.insertId, message: 'Budget created' } });
    } catch (error) {
      console.error('createBudget error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async getProfitLoss(req, res) {
    try {
      const { year } = req.query;
      const yr = year || new Date().getFullYear();

      const [revenue] = await db.execute(
        `SELECT MONTH(t.created_at) AS month, COALESCE(SUM(t.amount), 0) AS total
         FROM transactions t
         WHERE YEAR(t.created_at) = ? AND t.transaction_type = 'revenue_share'
         GROUP BY MONTH(t.created_at)
         ORDER BY month`, [yr]
      );

      const [expenses] = await db.execute(
        `SELECT MONTH(e.expense_date) AS month, COALESCE(SUM(e.amount), 0) AS total
         FROM expenses e
         WHERE YEAR(e.expense_date) = ? AND e.status = 'approved'
         GROUP BY MONTH(e.expense_date)
         ORDER BY month`, [yr]
      );

      const months = Array.from({ length: 12 }, (_, i) => i + 1);
      const pl = months.map(m => {
        const rev = revenue.find(r => r.month === m)?.total || 0;
        const exp = expenses.find(e => e.month === m)?.total || 0;
        return { month: m, revenue: rev, expenses: exp, profit: rev - exp };
      });

      const totalRevenue = pl.reduce((s, r) => s + r.revenue, 0);
      const totalExpenses = pl.reduce((s, r) => s + r.expenses, 0);

      res.json({ success: true, data: { year: parseInt(yr), months: pl, total_revenue: totalRevenue, total_expenses: totalExpenses, net_profit: totalRevenue - totalExpenses } });
    } catch (error) {
      console.error('getProfitLoss error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async getFinancialDashboard(req, res) {
    try {
      const [revResult] = await db.execute("SELECT COALESCE(SUM(amount), 0) AS total FROM transactions WHERE transaction_type = 'revenue_share'");
      const [expResult] = await db.execute("SELECT COALESCE(SUM(amount), 0) AS total FROM expenses WHERE status = 'approved'");
      const [budgetResult] = await db.execute("SELECT COALESCE(SUM(amount), 0) AS total FROM budgets");
      const [budgetSpent] = await db.execute(
        `SELECT COALESCE(SUM(e.amount), 0) AS total FROM expenses e
         WHERE e.status = 'approved'`
      );

      const totalRevenue = revResult[0].total;
      const totalExpenses = expResult[0].total;
      const budgetTotal = budgetResult[0].total;
      const budgetUsed = budgetSpent[0].total;

      res.json({
        success: true,
        data: {
          total_revenue: totalRevenue,
          total_expenses: totalExpenses,
          net_profit: totalRevenue - totalExpenses,
          budget_allocated: budgetTotal,
          budget_used: budgetUsed,
          budget_utilization: budgetTotal > 0 ? Math.round((budgetUsed / budgetTotal) * 100) : 0
        }
      });
    } catch (error) {
      console.error('getFinancialDashboard error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // ==================== ASSETS / INVENTORY ====================

  async getAssets(req, res) {
    try {
      const { search, category_id, branch_id, warranty_status, page = 1, limit = 20 } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);
      let whereClauses = [];
      let params = [];

      if (search) {
        whereClauses.push('(a.name LIKE ? OR a.asset_tag LIKE ?)');
        params.push(`%${search}%`, `%${search}%`);
      }
      if (category_id) { whereClauses.push('a.category_id = ?'); params.push(category_id); }
      if (branch_id) { whereClauses.push('a.branch_id = ?'); params.push(branch_id); }
      if (warranty_status === 'expired') {
        whereClauses.push('a.warranty_expiry < NOW()');
      } else if (warranty_status === 'active') {
        whereClauses.push('a.warranty_expiry >= NOW()');
      }

      const whereSQL = whereClauses.length ? 'WHERE ' + whereClauses.join(' AND ') : '';

      const [countResult] = await db.execute(`SELECT COUNT(*) AS total FROM assets a ${whereSQL}`, params);

      const [rows] = await db.execute(
        `SELECT a.*, ac.name AS category_name, b.name AS branch_name,
          CASE WHEN a.warranty_expiry < NOW() THEN 'expired' ELSE 'active' END AS warranty_status
        FROM assets a
        LEFT JOIN asset_categories ac ON a.category_id = ac.id
        LEFT JOIN branches b ON a.branch_id = b.id
        ${whereSQL}
        ORDER BY a.name
        LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`,
        params
      );
      res.json({ success: true, data: { assets: rows, total: countResult[0].total, page: parseInt(page), limit: parseInt(limit) } });
    } catch (error) {
      console.error('getAssets error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async createAsset(req, res) {
    try {
      const { name, asset_tag, category_id, branch_id, purchase_date, purchase_cost, warranty_expiry, serial_number, notes } = req.body;
      const [result] = await db.execute(
        `INSERT INTO assets (name, asset_tag, category_id, branch_id, purchase_date, purchase_cost, warranty_expiry, serial_number, notes, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [name, asset_tag, category_id || null, branch_id || null, purchase_date || null, purchase_cost || null, warranty_expiry || null, serial_number || null, notes || null]
      );
      res.json({ success: true, data: { id: result.insertId, message: 'Asset created' } });
    } catch (error) {
      console.error('createAsset error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async updateAsset(req, res) {
    try {
      const { id } = req.params;
      const { name, asset_tag, category_id, branch_id, purchase_date, purchase_cost, warranty_expiry, serial_number, notes, status } = req.body;
      await db.execute(
        `UPDATE assets SET name = ?, asset_tag = ?, category_id = ?, branch_id = ?, purchase_date = ?,
         purchase_cost = ?, warranty_expiry = ?, serial_number = ?, notes = ?, status = ? WHERE id = ?`,
        [name, asset_tag, category_id || null, branch_id || null, purchase_date || null, purchase_cost || null, warranty_expiry || null, serial_number || null, notes || null, status || 'active', id]
      );
      res.json({ success: true, data: { message: 'Asset updated' } });
    } catch (error) {
      console.error('updateAsset error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async getAssetCategories(req, res) {
    try {
      const [rows] = await db.execute(
        `SELECT ac.*,
          (SELECT COUNT(*) FROM assets a WHERE a.category_id = ac.id) AS asset_count
        FROM asset_categories ac
        ORDER BY ac.name`
      );
      res.json({ success: true, data: rows });
    } catch (error) {
      console.error('getAssetCategories error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async createAssetCategory(req, res) {
    try {
      const { name, description } = req.body;
      const [result] = await db.execute(
        'INSERT INTO asset_categories (name, description, created_at) VALUES (?, ?, NOW())',
        [name, description || null]
      );
      res.json({ success: true, data: { id: result.insertId, message: 'Asset category created' } });
    } catch (error) {
      console.error('createAssetCategory error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async getPurchaseOrders(req, res) {
    try {
      const { status, branch_id, page = 1, limit = 20 } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);
      let whereClauses = [];
      let params = [];

      if (status) { whereClauses.push('po.status = ?'); params.push(status); }
      if (branch_id) { whereClauses.push('po.branch_id = ?'); params.push(branch_id); }

      const whereSQL = whereClauses.length ? 'WHERE ' + whereClauses.join(' AND ') : '';

      const [countResult] = await db.execute(`SELECT COUNT(*) AS total FROM purchase_orders po ${whereSQL}`, params);

      const [rows] = await db.execute(
        `SELECT po.*, b.name AS branch_name, u.name AS requested_by_name
        FROM purchase_orders po
        LEFT JOIN branches b ON po.branch_id = b.id
        LEFT JOIN users u ON po.requested_by = u.id
        ${whereSQL}
        ORDER BY po.created_at DESC
        LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`,
        params
      );

      for (const po of rows) {
        const [items] = await db.execute('SELECT * FROM purchase_order_items WHERE po_id = ?', [po.id]);
        po.items = items;
      }

      res.json({ success: true, data: { purchase_orders: rows, total: countResult[0].total, page: parseInt(page), limit: parseInt(limit) } });
    } catch (error) {
      console.error('getPurchaseOrders error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async createPurchaseOrder(req, res) {
    try {
      const { branch_id, supplier_name, items, notes } = req.body;
      const requestedBy = req.session.admin_user?.id || null;
      const totalAmount = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
      const yr = new Date().getFullYear();
      const [poCount] = await db.execute("SELECT COUNT(*) AS c FROM purchase_orders WHERE order_number LIKE ?", [`PO-${yr}-%`]);
      const seq = String((poCount[0].c || 0) + 1).padStart(4, '0');
      const orderNumber = `PO-${yr}-${seq}`;

      const [poResult] = await db.execute(
        `INSERT INTO purchase_orders (order_number, branch_id, supplier_name, total_amount, notes, requested_by, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 'draft', NOW())`,
        [orderNumber, branch_id || null, supplier_name, totalAmount, notes || null, requestedBy]
      );
      const poId = poResult.insertId;

      for (const item of items) {
        await db.execute(
          'INSERT INTO purchase_order_items (po_id, item_name, quantity, unit_price, total_price) VALUES (?, ?, ?, ?, ?)',
          [poId, item.item_name, item.quantity, item.unit_price, item.quantity * item.unit_price]
        );
      }

      res.json({ success: true, data: { id: poId, message: 'Purchase order created' } });
    } catch (error) {
      console.error('createPurchaseOrder error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async updatePOStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      await db.execute('UPDATE purchase_orders SET status = ?, updated_at = NOW() WHERE id = ?', [status, id]);
      res.json({ success: true, data: { message: 'PO status updated' } });
    } catch (error) {
      console.error('updatePOStatus error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // ==================== TICKETS ====================

  async getTickets(req, res) {
    try {
      const { status, priority, branch_id, category_id, assignee_id, page = 1, limit = 20 } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);
      let whereClauses = [];
      let params = [];

      if (status) { whereClauses.push('t.status = ?'); params.push(status); }
      if (priority) { whereClauses.push('t.priority = ?'); params.push(priority); }
      if (branch_id) { whereClauses.push('t.branch_id = ?'); params.push(branch_id); }
      if (category_id) { whereClauses.push('t.category_id = ?'); params.push(category_id); }
      if (assignee_id) { whereClauses.push('t.assigned_to = ?'); params.push(assignee_id); }

      const whereSQL = whereClauses.length ? 'WHERE ' + whereClauses.join(' AND ') : '';

      const [countResult] = await db.execute(`SELECT COUNT(*) AS total FROM support_tickets t ${whereSQL}`, params);

      const [rows] = await db.execute(
        `SELECT t.*, tc.name AS category_name, b.name AS branch_name,
          u.name AS customer_name, a.name AS assignee_name
        FROM support_tickets t
        LEFT JOIN ticket_categories tc ON t.category_id = tc.id
        LEFT JOIN branches b ON t.branch_id = b.id
        LEFT JOIN users u ON t.submitted_by = u.id
        LEFT JOIN users a ON t.assigned_to = a.id
        ${whereSQL}
        ORDER BY
          CASE t.priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'normal' THEN 3 ELSE 4 END,
          t.created_at DESC
        LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`,
        params
      );
      res.json({ success: true, data: { tickets: rows, total: countResult[0].total, page: parseInt(page), limit: parseInt(limit) } });
    } catch (error) {
      console.error('getTickets error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async getTicketDetail(req, res) {
    try {
      const { id } = req.params;
      const [rows] = await db.execute(
        `SELECT t.*, tc.name AS category_name, b.name AS branch_name,
          u.name AS customer_name, a.name AS assignee_name
        FROM support_tickets t
        LEFT JOIN ticket_categories tc ON t.category_id = tc.id
        LEFT JOIN branches b ON t.branch_id = b.id
        LEFT JOIN users u ON t.submitted_by = u.id
        LEFT JOIN users a ON t.assigned_to = a.id
        WHERE t.id = ?`, [id]
      );
      if (!rows.length) return res.status(404).json({ success: false, error: 'Ticket not found' });

      const [replies] = await db.execute(
        `SELECT tr.*, u.name AS author_name
        FROM ticket_replies tr
        LEFT JOIN users u ON tr.user_id = u.id
        WHERE tr.ticket_id = ?
        ORDER BY tr.created_at ASC`, [id]
      );

      const ticket = rows[0];
      ticket.replies = replies;
      res.json({ success: true, data: ticket });
    } catch (error) {
      console.error('getTicketDetail error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async createTicket(req, res) {
    try {
      const { subject, description, submitted_by, branch_id, category_id, priority, assigned_to } = req.body;
      const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const [countResult] = await db.execute(
        "SELECT COUNT(*) AS c FROM support_tickets WHERE ticket_number LIKE ?", [`TKT-${today}-%`]
      );
      const seq = String((countResult[0].c || 0) + 1).padStart(4, '0');
      const ticketNumber = `TKT-${today}-${seq}`;

      const [result] = await db.execute(
        `INSERT INTO support_tickets (ticket_number, subject, description, submitted_by, branch_id, category_id, priority, assigned_to, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'open', NOW())`,
        [ticketNumber, subject, description || null, submitted_by, branch_id || null, category_id || null, priority || 'normal', assigned_to || null]
      );
      res.json({ success: true, data: { id: result.insertId, ticket_number: ticketNumber, message: 'Ticket created' } });
    } catch (error) {
      console.error('createTicket error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async updateTicket(req, res) {
    try {
      const { id } = req.params;
      const { status, assigned_to, priority, category_id } = req.body;
      const fields = [];
      const params = [];

      if (status) { fields.push('status = ?'); params.push(status); }
      if (assigned_to !== undefined) { fields.push('assigned_to = ?'); params.push(assigned_to || null); }
      if (priority) { fields.push('priority = ?'); params.push(priority); }
      if (category_id) { fields.push('category_id = ?'); params.push(category_id); }
      if (status === 'resolved') { fields.push('resolved_at = NOW()'); }
      if (status === 'closed') { fields.push('closed_at = NOW()'); }
      fields.push('updated_at = NOW()');

      params.push(id);
      await db.execute(`UPDATE support_tickets SET ${fields.join(', ')} WHERE id = ?`, params);
      res.json({ success: true, data: { message: 'Ticket updated' } });
    } catch (error) {
      console.error('updateTicket error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async addTicketReply(req, res) {
    try {
      const { id } = req.params;
      const { message } = req.body;
      const userId = req.session.admin_user?.id || null;
      const [result] = await db.execute(
        'INSERT INTO ticket_replies (ticket_id, user_id, message, created_at) VALUES (?, ?, ?, NOW())',
        [id, userId, message]
      );
      await db.execute('UPDATE support_tickets SET updated_at = NOW() WHERE id = ?', [id]);
      res.json({ success: true, data: { id: result.insertId, message: 'Reply added' } });
    } catch (error) {
      console.error('addTicketReply error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async getTicketCategories(req, res) {
    try {
      const [rows] = await db.execute(
        `SELECT tc.*,
          (SELECT COUNT(*) FROM support_tickets t WHERE t.category_id = tc.id) AS ticket_count
        FROM ticket_categories tc
        ORDER BY tc.name`
      );
      res.json({ success: true, data: rows });
    } catch (error) {
      console.error('getTicketCategories error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async getTicketStats(req, res) {
    try {
      const [byStatus] = await db.execute(
        'SELECT status, COUNT(*) AS count FROM support_tickets GROUP BY status'
      );
      const [byPriority] = await db.execute(
        'SELECT priority, COUNT(*) AS count FROM support_tickets GROUP BY priority'
      );
      const [slaBreaches] = await db.execute(
        `SELECT COUNT(*) AS count FROM support_tickets
         WHERE sla_deadline IS NOT NULL AND sla_deadline < NOW() AND status NOT IN ('resolved', 'closed')`
      );
      const [total] = await db.execute('SELECT COUNT(*) AS count FROM support_tickets');

      res.json({
        success: true,
        data: {
          total: total[0].count,
          by_status: byStatus,
          by_priority: byPriority,
          sla_breaches: slaBreaches[0].count
        }
      });
    } catch (error) {
      console.error('getTicketStats error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // ==================== AUDIT TRAIL ====================

  async getAuditTrail(req, res) {
    try {
      const { module: mod, action, user_id, date_from, date_to, page = 1, limit = 50 } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);
      let whereClauses = [];
      let params = [];

      if (mod) { whereClauses.push('al.entity_type = ?'); params.push(mod); }
      if (action) { whereClauses.push('al.action = ?'); params.push(action); }
      if (user_id) { whereClauses.push('al.user_id = ?'); params.push(user_id); }
      if (date_from) { whereClauses.push('al.created_at >= ?'); params.push(date_from); }
      if (date_to) { whereClauses.push('al.created_at <= ?'); params.push(date_to + ' 23:59:59'); }

      const whereSQL = whereClauses.length ? 'WHERE ' + whereClauses.join(' AND ') : '';

      const [countResult] = await db.execute(`SELECT COUNT(*) AS total FROM audit_trail al ${whereSQL}`, params);

      const [rows] = await db.execute(
        `SELECT al.*, u.name AS user_name
        FROM audit_trail al
        LEFT JOIN users u ON al.user_id = u.id
        ${whereSQL}
        ORDER BY al.created_at DESC
        LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`,
        params
      );

      if (req.query.stats === 'true') {
        const [total] = await db.execute('SELECT COUNT(*) AS count FROM audit_trail');
        const [todayCount] = await db.execute("SELECT COUNT(*) AS count FROM audit_trail WHERE DATE(created_at) = CURDATE()");
        const [uniqueUsers] = await db.execute('SELECT COUNT(DISTINCT user_id) AS count FROM audit_trail');
        const [byAction] = await db.execute('SELECT action, COUNT(*) AS count FROM audit_trail GROUP BY action ORDER BY count DESC LIMIT 10');

        return res.json({
          success: true,
          data: { records: rows, total: countResult[0].total, page: parseInt(page), limit: parseInt(limit),
            stats: { total: total[0].count, today: todayCount[0].count, unique_users: uniqueUsers[0].count, by_action: byAction }
          }
        });
      }

      res.json({ success: true, data: { records: rows, total: countResult[0].total, page: parseInt(page), limit: parseInt(limit) } });
    } catch (error) {
      console.error('getAuditTrail error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async logAudit(entityType, action, entityId, description, userId) {
    try {
      await db.execute(
        'INSERT INTO audit_trail (entity_type, action, entity_id, description, user_id, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
        [entityType, action, entityId || null, description || null, userId || null]
      );
    } catch (error) {
      console.error('logAudit error:', error);
    }
  },

  // ==================== CONTRACTS ====================

  async getContracts(req, res) {
    try {
      const { status, type, branch_id, page = 1, limit = 20 } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);
      let whereClauses = [];
      let params = [];

      if (status) { whereClauses.push('c.status = ?'); params.push(status); }
      if (type) { whereClauses.push('c.contract_type = ?'); params.push(type); }
      if (branch_id) { whereClauses.push('c.branch_id = ?'); params.push(branch_id); }

      const whereSQL = whereClauses.length ? 'WHERE ' + whereClauses.join(' AND ') : '';

      const [countResult] = await db.execute(`SELECT COUNT(*) AS total FROM contracts c ${whereSQL}`, params);

      const [rows] = await db.execute(
        `SELECT c.*, b.name AS branch_name, u.name AS created_by_name
        FROM contracts c
        LEFT JOIN branches b ON c.branch_id = b.id
        LEFT JOIN users u ON c.created_by = u.id
        ${whereSQL}
        ORDER BY c.end_date ASC
        LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`,
        params
      );
      res.json({ success: true, data: { contracts: rows, total: countResult[0].total, page: parseInt(page), limit: parseInt(limit) } });
    } catch (error) {
      console.error('getContracts error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async getContractDetail(req, res) {
    try {
      const { id } = req.params;
      const [rows] = await db.execute(
        `SELECT c.*, b.name AS branch_name, u.name AS created_by_name
        FROM contracts c
        LEFT JOIN branches b ON c.branch_id = b.id
        LEFT JOIN users u ON c.created_by = u.id
        WHERE c.id = ?`, [id]
      );
      if (!rows.length) return res.status(404).json({ success: false, error: 'Contract not found' });
      res.json({ success: true, data: rows[0] });
    } catch (error) {
      console.error('getContractDetail error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async createContract(req, res) {
    try {
      const { title, contract_type, party_name, party_contact, branch_id, start_date, end_date, value, terms, document_url } = req.body;
      const createdBy = req.session.admin_user?.id || null;
      const yr = new Date().getFullYear();
      const [countResult] = await db.execute("SELECT COUNT(*) AS c FROM contracts WHERE contract_number LIKE ?", [`CTR-${yr}-%`]);
      const seq = String((countResult[0].c || 0) + 1).padStart(4, '0');
      const contractNumber = `CTR-${yr}-${seq}`;

      const [result] = await db.execute(
        `INSERT INTO contracts (contract_number, title, contract_type, party_name, party_contact, branch_id,
         start_date, end_date, value, terms, document_url, created_by, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', NOW())`,
        [contractNumber, title, contract_type || null, party_name || null, party_contact || null, branch_id || null,
         start_date || null, end_date || null, value || null, terms || null, document_url || null, createdBy]
      );
      res.json({ success: true, data: { id: result.insertId, contract_number: contractNumber, message: 'Contract created' } });
    } catch (error) {
      console.error('createContract error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async updateContract(req, res) {
    try {
      const { id } = req.params;
      const { title, contract_type, party_name, party_contact, start_date, end_date, value, terms, status } = req.body;
      await db.execute(
        `UPDATE contracts SET title = ?, contract_type = ?, party_name = ?, party_contact = ?,
         start_date = ?, end_date = ?, value = ?, terms = ?, status = ?, updated_at = NOW() WHERE id = ?`,
        [title, contract_type || null, party_name || null, party_contact || null, start_date || null, end_date || null, value || null, terms || null, status || 'active', id]
      );
      res.json({ success: true, data: { message: 'Contract updated' } });
    } catch (error) {
      console.error('updateContract error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async getLicenses(req, res) {
    try {
      const { branch_id, status, page = 1, limit = 20 } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);
      let whereClauses = [];
      let params = [];

      if (branch_id) { whereClauses.push('l.branch_id = ?'); params.push(branch_id); }
      if (status === 'expiring') { whereClauses.push('l.expiry_date BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 30 DAY)'); }
      else if (status === 'expired') { whereClauses.push('l.expiry_date < NOW()'); }
      else if (status) { whereClauses.push('l.status = ?'); params.push(status); }

      const whereSQL = whereClauses.length ? 'WHERE ' + whereClauses.join(' AND ') : '';

      const [countResult] = await db.execute(`SELECT COUNT(*) AS total FROM licenses_permits l ${whereSQL}`, params);

      const [rows] = await db.execute(
        `SELECT l.*, b.name AS branch_name,
          CASE WHEN l.expiry_date < NOW() THEN 'expired'
               WHEN l.expiry_date BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 30 DAY) THEN 'expiring'
               ELSE 'active' END AS license_status
        FROM licenses_permits l
        LEFT JOIN branches b ON l.branch_id = b.id
        ${whereSQL}
        ORDER BY l.expiry_date ASC
        LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`,
        params
      );
      res.json({ success: true, data: { licenses: rows, total: countResult[0].total, page: parseInt(page), limit: parseInt(limit) } });
    } catch (error) {
      console.error('getLicenses error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async getLicenseDetail(req, res) {
    try {
      const { id } = req.params;
      const [rows] = await db.execute(
        `SELECT l.*, b.name AS branch_name,
          CASE WHEN l.expiry_date < NOW() THEN 'expired'
               WHEN l.expiry_date BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 30 DAY) THEN 'expiring'
               ELSE 'active' END AS license_status
        FROM licenses_permits l
        LEFT JOIN branches b ON l.branch_id = b.id
        WHERE l.id = ?`, [id]
      );
      if (!rows.length) return res.status(404).json({ success: false, error: 'License not found' });
      res.json({ success: true, data: rows[0] });
    } catch (error) {
      console.error('getLicenseDetail error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async createLicense(req, res) {
    try {
      const { title, license_number, license_type, branch_id, issuing_authority, issue_date, expiry_date, cost, notes } = req.body;
      const [result] = await db.execute(
        `INSERT INTO licenses_permits (license_number, title, license_type, branch_id, issuing_authority, issue_date, expiry_date, cost, notes, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [license_number, title, license_type || 'other', branch_id || null, issuing_authority, issue_date, expiry_date, cost || 0, notes || null]
      );
      res.json({ success: true, data: { id: result.insertId, message: 'License created' } });
    } catch (error) {
      console.error('createLicense error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async updateLicense(req, res) {
    try {
      const { id } = req.params;
      const { title, license_number, license_type, branch_id, issuing_authority, issue_date, expiry_date, cost, notes, status } = req.body;
      await db.execute(
        `UPDATE licenses_permits SET title = ?, license_number = ?, license_type = ?, branch_id = ?,
         issuing_authority = ?, issue_date = ?, expiry_date = ?, cost = ?, notes = ?, status = ?, updated_at = NOW() WHERE id = ?`,
        [title, license_number, license_type || 'other', branch_id || null, issuing_authority, issue_date, expiry_date, cost || 0, notes || null, status || 'active', id]
      );
      res.json({ success: true, data: { message: 'License updated' } });
    } catch (error) {
      console.error('updateLicense error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async getComplianceDashboard(req, res) {
    try {
      const [expiringContracts] = await db.execute(
        `SELECT COUNT(*) AS count FROM contracts
         WHERE status = 'active' AND end_date BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 30 DAY)`
      );
      const [expiredContracts] = await db.execute(
        `SELECT COUNT(*) AS count FROM contracts WHERE status = 'active' AND end_date < NOW()`
      );
      const [expiringLicenses] = await db.execute(
        `SELECT COUNT(*) AS count FROM licenses_permits
         WHERE expiry_date BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 30 DAY)`
      );
      const [expiredLicenses] = await db.execute(
        'SELECT COUNT(*) AS count FROM licenses_permits WHERE expiry_date < NOW()'
      );
      const [slaBreaches] = await db.execute(
        `SELECT COUNT(*) AS count FROM support_tickets
         WHERE sla_deadline IS NOT NULL AND sla_deadline < NOW() AND status NOT IN ('resolved', 'closed')`
      );

      res.json({
        success: true,
        data: {
          expiring_contracts: expiringContracts[0].count,
          expired_contracts: expiredContracts[0].count,
          expiring_licenses: expiringLicenses[0].count,
          expired_licenses: expiredLicenses[0].count,
          sla_breaches: slaBreaches[0].count
        }
      });
    } catch (error) {
      console.error('getComplianceDashboard error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // ==================== MARKETING ====================

  async getMarketingCampaigns(req, res) {
    try {
      const { status, page = 1, limit = 20 } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);
      let whereClauses = [];
      let params = [];

      if (status) { whereClauses.push('mc.status = ?'); params.push(status); }

      const whereSQL = whereClauses.length ? 'WHERE ' + whereClauses.join(' AND ') : '';

      const [countResult] = await db.execute(`SELECT COUNT(*) AS total FROM marketing_campaigns mc ${whereSQL}`, params);

      const [rows] = await db.execute(
        `SELECT mc.*, u.name AS managed_by_name
        FROM marketing_campaigns mc
        LEFT JOIN users u ON mc.managed_by = u.id
        ${whereSQL}
        ORDER BY mc.created_at DESC
        LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`,
        params
      );
      res.json({ success: true, data: { campaigns: rows, total: countResult[0].total, page: parseInt(page), limit: parseInt(limit) } });
    } catch (error) {
      console.error('getMarketingCampaigns error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async createMarketingCampaign(req, res) {
    try {
      const { name, campaign_type, description, start_date, end_date, budget, target_audience, notes } = req.body;
      const createdBy = req.session.admin_user?.id || null;
      const [result] = await db.execute(
        `INSERT INTO marketing_campaigns (campaign_name, campaign_type, description, start_date, end_date, budget, target_audience, notes, managed_by, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', NOW())`,
        [name, campaign_type || 'other', description || null, start_date || null, end_date || null, budget || null, target_audience || null, notes || null, createdBy]
      );
      res.json({ success: true, data: { id: result.insertId, message: 'Campaign created' } });
    } catch (error) {
      console.error('createMarketingCampaign error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async updateMarketingCampaign(req, res) {
    try {
      const { id } = req.params;
      const { name, campaign_type, description, start_date, end_date, budget, target_audience, notes, status } = req.body;
      await db.execute(
        `UPDATE marketing_campaigns SET campaign_name = ?, campaign_type = ?, description = ?, start_date = ?, end_date = ?,
         budget = ?, target_audience = ?, notes = ?, status = ?, updated_at = NOW() WHERE id = ?`,
        [name, campaign_type || 'other', description || null, start_date || null, end_date || null, budget || null, target_audience || null, notes || null, status || 'draft', id]
      );
      res.json({ success: true, data: { message: 'Campaign updated' } });
    } catch (error) {
      console.error('updateMarketingCampaign error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async getBranchAllocations(req, res) {
    try {
      const { campaign_id } = req.query;
      const [rows] = await db.execute(
        `SELECT cba.*, b.name AS branch_name, mc.name AS campaign_name
        FROM campaign_branch_allocations cba
        LEFT JOIN branches b ON cba.branch_id = b.id
        LEFT JOIN marketing_campaigns mc ON cba.campaign_id = mc.id
        WHERE cba.campaign_id = ?
        ORDER BY b.name`,
        [campaign_id]
      );
      res.json({ success: true, data: rows });
    } catch (error) {
      console.error('getBranchAllocations error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // ==================== REPORTS ====================

  async getReportTemplates(req, res) {
    try {
      const [rows] = await db.execute(
        `SELECT rt.*, u.name AS created_by_name
        FROM report_templates rt
        LEFT JOIN users u ON rt.created_by = u.id
        ORDER BY rt.name`
      );
      res.json({ success: true, data: rows });
    } catch (error) {
      console.error('getReportTemplates error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async createReportTemplate(req, res) {
    try {
      const { name, description, report_type, category, sql_query } = req.body;
      const createdBy = req.session.admin_user?.id || null;
      const [result] = await db.execute(
        `INSERT INTO report_templates (name, description, report_type, category, sql_query, created_by, created_at)
         VALUES (?, ?, ?, ?, ?, ?, NOW())`,
        [name, description || null, report_type, category || 'other', sql_query || null, createdBy]
      );
      res.json({ success: true, data: { id: result.insertId, message: 'Template created' } });
    } catch (error) {
      console.error('createReportTemplate error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async getReportRuns(req, res) {
    try {
      const { template_id, page = 1, limit = 20 } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);
      let whereClauses = [];
      let params = [];

      if (template_id) { whereClauses.push('rr.template_id = ?'); params.push(template_id); }

      const whereSQL = whereClauses.length ? 'WHERE ' + whereClauses.join(' AND ') : '';

      const [countResult] = await db.execute(`SELECT COUNT(*) AS total FROM report_runs rr ${whereSQL}`, params);

      const [rows] = await db.execute(
        `SELECT rr.*, rt.name AS template_name, u.name AS generated_by_name
        FROM report_runs rr
        LEFT JOIN report_templates rt ON rr.template_id = rt.id
        LEFT JOIN users u ON rr.generated_by = u.id
        ${whereSQL}
        ORDER BY rr.generated_at DESC
        LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`,
        params
      );
      res.json({ success: true, data: { runs: rows, total: countResult[0].total, page: parseInt(page), limit: parseInt(limit) } });
    } catch (error) {
      console.error('getReportRuns error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async generateReport(req, res) {
    try {
      const { template_id, parameters } = req.body;
      const generatedBy = req.session.admin_user?.id || null;

      const [tpl] = await db.execute('SELECT name FROM report_templates WHERE id = ?', [template_id]);
      const reportName = tpl.length ? tpl[0].name : 'Ad-hoc Report';

      const [result] = await db.execute(
        `INSERT INTO report_runs (template_id, report_name, generated_by, status, generated_at)
         VALUES (?, ?, ?, 'pending', NOW())`,
        [template_id, reportName, generatedBy]
      );
      res.json({ success: true, data: { id: result.insertId, status: 'pending', message: 'Report generation started' } });
    } catch (error) {
      console.error('generateReport error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

module.exports = hqController;
