// controllers/adminController.js - SASHA URIASISHI KAMILI
const db = require('../config/database');
const mikrotikService = require('../utils/mikrotik');
class AdminController {
  // ==================== DASHBOARD METHODS - SASHA URIASISHI ====================
  async getDashboardData(req) {
    try {
      console.log('📊 Inapakia takwimu za dashboard...');
      // 1. TOTAL VIEWS - Hakikisha inarudi 0 kama hakuna data
      const [totalViewsResult] = await db.execute(`
        SELECT COUNT(*) as count FROM ad_views
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      `);
      const totalViews = totalViewsResult[0]?.count || 0;

      // 2. ACTIVE ADS - Hakikisha inarudi 0 kama hakuna data
      const [activeAdsResult] = await db.execute(
        'SELECT COUNT(*) as count FROM ads WHERE approved = 1 AND is_active = 1'
      );
      const activeAds = activeAdsResult[0]?.count || 0;

      // 3. DATA DISTRIBUTED - Hakikisha inarudi 0 kama hakuna data
      const [dataDistributedResult] = await db.execute(
        'SELECT COALESCE(SUM(free_bytes), 0) / (1024 * 1024 * 1024) as total FROM users'
      );
      const dataDistributed = Math.round(dataDistributedResult[0]?.total || 0);

      // 4. COMPLETION RATE - Hakikisha inarudi 0 kama hakuna data
      const [completionResult] = await db.execute(`
        SELECT
          CASE
            WHEN COUNT(*) = 0 THEN 0
            ELSE AVG(CASE WHEN av.watched_duration >= a.duration THEN 1 ELSE 0 END) * 100
          END as rate
        FROM ad_views av
        JOIN ads a ON av.ad_id = a.id
        WHERE av.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      `);
      const completionRate = Math.round(completionResult[0]?.rate || 0);

      // 5. VIEWS TREND - Hakikisha kila siku ina data
      const viewsTrend = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const [dailyResult] = await db.execute(
          `SELECT COUNT(*) as total FROM ad_views WHERE DATE(created_at) = ?`,
          [dateStr]
        );
        viewsTrend.push({
          date: dateStr,
          total: dailyResult[0]?.total || 0
        });
      }

      // 6. ACTIVE ADS LIST - Hakikisha inarudi array tupu kama hakuna data
      const [activeAdsListResult] = await db.execute(`
        SELECT a.id, a.title, a.approved, COUNT(av.id) as views, a.created_at
        FROM ads a
        LEFT JOIN ad_views av ON a.id = av.ad_id
        WHERE a.approved = 1 AND a.is_active = 1
        GROUP BY a.id
        ORDER BY a.created_at DESC
        LIMIT 5
      `);
      const activeAdsList = activeAdsListResult || [];

      // 7. PENDING APPROVALS - Hakikisha inarudi array tupu kama hakuna data
      const [pendingApprovalsResult] = await db.execute(`
        SELECT a.id, a.title, u.name as sponsor_name, a.video_url, a.created_at
        FROM ads a
        LEFT JOIN users u ON a.sponsor_id = u.id
        WHERE a.approved = 0
        ORDER BY a.created_at DESC
        LIMIT 5
      `);
      const pendingApprovals = pendingApprovalsResult || [];

      // 8. RECENT ACTIVITY - Data maalum kwa ajili ya demo
      const recentActivity = [
        {
          icon: 'user-plus',
          description: 'Mtumiaji mpya amesajiliwa',
          time: '2 dakika zilizopita'
        },
        {
          icon: 'ad',
          description: 'Tangazo jipya limepakiwa',
          time: '5 dakika zilizopita'
        },
        {
          icon: 'money-bill-wave',
          description: 'Voucher imetumika',
          time: '10 dakika zilizopita'
        }
      ];

      // 9. ADDITIONAL STATS FOR CHART - Hakikisha chart ina data
      const chartData = {
        labels: viewsTrend.map(item => {
          const date = new Date(item.date);
          return date.toLocaleDateString('sw-TZ', { day: 'numeric', month: 'short' });
        }),
        data: viewsTrend.map(item => item.total)
      };

      console.log('✅ Takwimu zimepakuliwa kikamilifu:', {
        totalViews,
        activeAds,
        dataDistributed,
        completionRate,
        viewsTrendLength: viewsTrend.length,
        activeAdsCount: activeAdsList.length,
        pendingCount: pendingApprovals.length
      });

      return {
        totalViews: totalViews,
        activeAds: activeAds,
        dataDistributed: dataDistributed,
        completionRate: completionRate,
        viewsTrend: viewsTrend,
        activeAdsList: activeAdsList,
        pendingApprovals: pendingApprovals,
        recentActivity: recentActivity,
        chartData: chartData
      };
    } catch (error) {
      console.error('❌ Hitilafu katika dashboard stats:', error);
      // RUDI DATA ZA FALLBACK WAKATI WA HITILAFU
      return {
        totalViews: 0,
        activeAds: 0,
        dataDistributed: 0,
        completionRate: 0,
        viewsTrend: [
          { date: new Date().toISOString().split('T')[0], total: 0 },
          { date: new Date(Date.now() - 86400000).toISOString().split('T')[0], total: 0 },
          { date: new Date(Date.now() - 172800000).toISOString().split('T')[0], total: 0 },
          { date: new Date(Date.now() - 259200000).toISOString().split('T')[0], total: 0 },
          { date: new Date(Date.now() - 345600000).toISOString().split('T')[0], total: 0 },
          { date: new Date(Date.now() - 432000000).toISOString().split('T')[0], total: 0 },
          { date: new Date(Date.now() - 518400000).toISOString().split('T')[0], total: 0 }
        ],
        activeAdsList: [],
        pendingApprovals: [],
        recentActivity: [
          { icon: 'info-circle', description: 'Mfumo upo tayari', time: 'Sasa hivi' }
        ],
        chartData: {
          labels: ['Leo', 'Jana', 'Juzi', '3', '4', '5', '6'],
          data: [0, 0, 0, 0, 0, 0, 0]
        }
      };
    }
  }

  async dashboardStats(req, res) {
    const data = await this.getDashboardData(req);
    res.json({ success: true, ...data });
  }

  async renderDashboardPage(req, res) {
    const data = await this.getDashboardData(req);
    res.render('admin/dashboard', {
      title: 'Dashibodi',
      activePage: 'dashboard',
      userName: req.session.admin_user?.name || 'Admin',
      ...data
    });
  }

  // ==================== VOUCHER & SALES METHODS ====================
  async generateVoucher(req, res) {
    try {
      const { issuedto, vouchers } = req.body;
      const [batches] = await db.execute('SELECT MAX(id) as maxId FROM voucher_batches');
      const nextBatchNumber = (batches[0].maxId || 0) + 1;
      const batchName = `BATCH-OCT-${nextBatchNumber.toString().padStart(3, '0')}`;

      const [batchResult] = await db.execute(
        'INSERT INTO voucher_batches (batch_name, issued_to, total_vouchers, total_value, created_by) VALUES (?, ?, ?, ?, ?)',
        [batchName, issuedto, 0, 0, req.session.admin_user.id]
      );

      const packageValues = {
        'MASAA 6': { id: 1, price: 500 },
        'MASAA 24': { id: 2, price: 1000 },
        'WIKI 1': { id: 3, price: 6000 },
        'MWEEZI 1': { id: 4, price: 20000 },
      };

      const allVouchers = [];
      let totalVouchers = 0;
      let totalValue = 0;

      for (const [pkg, count] of Object.entries(vouchers)) {
        if (!packageValues[pkg]) continue;
        for (let i = 0; i < count; i++) {
          const code = await this.generateUniqueVoucher();
          allVouchers.push([
            code,
            packageValues[pkg].id,
            packageValues[pkg].price,
            0,
            null,
            null,
            batchResult.insertId,
            new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
          ]);
          totalVouchers++;
          totalValue += packageValues[pkg].price;
        }
      }

      if (allVouchers.length > 0) {
        const placeholders = allVouchers.map(() => '(?, ?, ?, ?, ?, ?, ?, ?)').join(',');
        const values = allVouchers.flat();
        await db.execute(
          `INSERT INTO vouchers (voucher_code, package_id, price, is_used, used_at, used_by, batch_id, expires_at) VALUES ${placeholders}`,
          values
        );
        await db.execute(
          'UPDATE voucher_batches SET total_vouchers = ?, total_value = ? WHERE id = ?',
          [totalVouchers, totalValue, batchResult.insertId]
        );
      }

      res.json({
        success: true,
        message: 'Vouchers generated successfully',
        batchId: batchResult.insertId,
        count: allVouchers.length,
        totalValue: totalValue
      });
    } catch (error) {
      console.error('Voucher generation error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate vouchers',
        error: error.message
      });
    }
  }

  async generateUniqueVoucher() {
    let code;
    let exists = true;
    while (exists) {
      code = 'HOT' + Math.floor(100000 + Math.random() * 900000).toString();
      const [vouchers] = await db.execute(
        'SELECT SELECT id FROM vouchers WHERE voucher_code = ?',
        [code]
      );
      exists = vouchers.length > 0;
    }
    return code;
  }

  async getBatches(req, res) {
    try {
      const [batches] = await db.execute(`
        SELECT vb.*, u.name as created_by_name
        FROM voucher_batches vb
        LEFT JOIN users u ON vb.created_by = u.id
        ORDER BY vb.id DESC
      `);
      res.json({
        success: true,
        data: batches,
        count: batches.length
      });
    } catch (error) {
      console.error('Get batches error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch batches',
        error: error.message
      });
    }
  }

  async getVoucherReport(req, res) {
    try {
      const { startDate, endDate } = req.query;
      let query = `
        SELECT v.voucher_code, p.name as package_name, v.price, v.used_at,
               u.name as used_by_name, u.phone_number,
               vb.batch_name, vb.issued_to
        FROM vouchers v
        LEFT JOIN packages p ON v.package_id = p.id
        LEFT JOIN users u ON v.used_by = u.id
        LEFT JOIN voucher_batches vb ON v.batch_id = vb.id
        WHERE v.is_used = 1
      `;
      let params = [];
      if (startDate && endDate) {
        query += ' AND DATE(v.used_at) BETWEEN ? AND ?';
        params.push(startDate, endDate);
      }
      query += ' ORDER BY v.used_at DESC LIMIT 100';
      const [vouchers] = await db.execute(query, params);
      res.json({
        success: true,
        data: vouchers,
        count: vouchers.length
      });
    } catch (error) {
      console.error('Voucher report error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch voucher report',
        error: error.message
      });
    }
  }

  async getVouchersByBatch(req, res) {
    try {
      const { batchId } = req.params;
      const [vouchers] = await db.execute(`
        SELECT v.voucher_code, p.name as package_name, v.price, v.is_used, v.used_at,
               u.name as used_by_name
        FROM vouchers v
        LEFT JOIN packages p ON v.package_id = p.id
        LEFT JOIN users u ON v.used_by = u.id
        WHERE v.batch_id = ?
        ORDER BY v.id DESC
      `, [batchId]);
      res.json({
        success: true,
        data: vouchers,
        count: vouchers.length,
        batchId: batchId
      });
    } catch (error) {
      console.error('Get vouchers error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch vouchers',
        error: error.message
      });
    }
  }

  async getSalesSummary(req, res) {
    try {
      const today = new Date().toISOString().split('T')[0];
      const [todaySales] = await db.execute(
        `SELECT COALESCE(SUM(price), 0) as total FROM vouchers WHERE is_used = 1 AND DATE(used_at) = ?`,
        [today]
      );
      const [totalUsers] = await db.execute('SELECT COUNT(*) as count FROM users WHERE role = "customer"');
      const [activeSubs] = await db.execute(
        'SELECT COUNT(*) as count FROM users WHERE usage_until > NOW() AND role = "customer"'
      );
      const [totalRevenue] = await db.execute('SELECT COALESCE(SUM(moneyspent), 0) as total FROM users WHERE role = "customer"');
      const salesTrend = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const [daily] = await db.execute(
          `SELECT COALESCE(SUM(price), 0) as total FROM vouchers WHERE is_used = 1 AND DATE(used_at) = ?`,
          [dateStr]
        );
        salesTrend.push({
          date: dateStr,
          total: daily[0].total || 0
        });
      }
      res.json({
        success: true,
        todaySales: todaySales[0].total || 0,
        totalUsers: totalUsers[0].count || 0,
        activeSubscriptions: activeSubs[0].count || 0,
        totalRevenue: totalRevenue[0].total || 0,
        trend: salesTrend
      });
    } catch (error) {
      console.error('Sales summary error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate sales summary',
        error: error.message
      });
    }
  }

  // ==================== RENDER ANALYTICS PAGE ====================
  async renderAnalyticsPage(req, res) {
    try {
      const analytics = await this.adminAnalytics(req, res);
      res.render('admin/analytics', {
        title: 'Takwimu za Matangazo',
        activePage: 'analytics',
        userName: req.session.admin_user?.name,
        ...analytics
      });
    } catch (error) {
      res.render('admin/analytics', {
        title: 'Takwimu za Matangazo',
        activePage: 'analytics',
        userName: req.session.admin_user?.name,
        error: 'Failed to load analytics data'
      });
    }
  }

  // ==================== USER/CUSTOMER METHODS ====================
  async getCustomers(req, res) {
    try {
      const { search, page = 1, limit = 50 } = req.query;
      const offset = (page - 1) * limit;
      let query = `
        SELECT id, name, phone_number, package, location,
               moneyspent, usage_start, usage_until,
               free_bytes / (1024*1024) as free_mb,
               mac_address, last_router_id, is_active,
               created_at, updated_at
        FROM users
        WHERE role = 'customer'
      `;
      let params = [];
      if (search) {
        query += ' AND (phone_number LIKE ? OR name LIKE ? OR mac_address LIKE ?)';
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
      }
      query += ' ORDER BY id DESC LIMIT ? OFFSET ?';
      params.push(parseInt(limit), offset);

      const [customers] = await db.execute(query, params);

      let countQuery = 'SELECT COUNT(*) as total FROM users WHERE role = "customer"';
      if (search) {
        countQuery += ' AND (phone_number LIKE ? OR name LIKE ? OR mac_address LIKE ?)';
      }
      const [totalResult] = await db.execute(
        countQuery,
        search ? [`%${search}%`, `%${search}%`, `%${search}%`] : []
      );

      res.json({
        success: true,
        data: customers,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalResult[0].total,
          pages: Math.ceil(totalResult[0].total / limit)
        }
      });
    } catch (error) {
      console.error('Get customers error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch customers',
        error: error.message
      });
    }
  }

  async getOnlineCustomers(req, res) {
    try {
      const [onlineCustomers] = await db.execute(`
        SELECT u.id, u.name, u.phone_number, u.mac_address,
               u.location, u.last_router_id, u.usage_until,
               TIMESTAMPDIFF(MINUTE, u.updated_at, NOW()) as minutes_ago,
               m.router_name, m.status as router_status
        FROM users u
        LEFT JOIN mikrotiks m ON u.last_router_id = m.router_id
        WHERE u.usage_until > NOW()
        AND u.updated_at > DATE_SUB(NOW(), INTERVAL 10 MINUTE)
        AND u.role = 'customer'
        ORDER BY u.updated_at DESC
      `);
      res.json({
        success: true,
        data: onlineCustomers,
        count: onlineCustomers.length
      });
    } catch (error) {
      console.error('Get online customers error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch online customers',
        error: error.message
      });
    }
  }

  async suspendCustomer(req, res) {
    try {
      const { id } = req.params;
      const { reason, suspended_until, is_permanent } = req.body;
      await db.execute(
        'INSERT INTO user_suspensions (user_id, reason, suspended_by, suspended_until, is_permanent) VALUES (?, ?, ?, ?, ?)',
        [id, reason, req.session.admin_user.id, suspended_until, is_permanent || 0]
      );
      await db.execute(
        'UPDATE users SET usage_until = NOW(), is_active = 0 WHERE id = ?',
        [id]
      );
      res.json({
        success: true,
        message: 'Customer suspended successfully'
      });
    } catch (error) {
      console.error('Suspend customer error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to suspend customer',
        error: error.message
      });
    }
  }

  async unsuspendCustomer(req, res) {
    try {
      const { id } = req.params;
      await db.execute(
        'UPDATE users SET is_active = 1 WHERE id = ?',
        [id]
      );
      res.json({
        success: true,
        message: 'Customer unsuspended successfully'
      });
    } catch (error) {
      console.error('Unsuspend customer error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to unsuspend customer',
        error: error.message
      });
    }
  }

  async adjustCustomerSubscription(req, res) {
    try {
      const { id } = req.params;
      const { usage_until, package_name, free_bytes } = req.body;
      const updateFields = [];
      const params = [];
      if (usage_until) {
        updateFields.push('usage_until = ?');
        params.push(usage_until);
      }
      if (package_name) {
        updateFields.push('package = ?');
        params.push(package_name);
      }
      if (free_bytes !== undefined) {
        updateFields.push('free_bytes = ?');
        params.push(free_bytes);
      }
      updateFields.push('updated_at = NOW()');
      params.push(id);
      await db.execute(
        `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`,
        params
      );
      res.json({
        success: true,
        message: 'Customer subscription adjusted successfully'
      });
    } catch (error) {
      console.error('Adjust subscription error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to adjust subscription',
        error: error.message
      });
    }
  }

  async deleteCustomer(req, res) {
    try {
      const { id } = req.params;
      const [result] = await db.execute('DELETE FROM users WHERE id = ? AND role = "customer"', [id]);
      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: 'Customer not found'
        });
      }
      res.json({
        success: true,
        message: 'Customer deleted successfully',
        deletedId: id
      });
    } catch (error) {
      console.error('Delete customer error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete customer',
        error: error.message
      });
    }
  }

  // ==================== ADVERTISEMENT METHODS ====================
  async getAdsToApprove(req, res) {
    try {
      const [ads] = await db.execute(`
        SELECT a.*, u.name as sponsor_name
        FROM ads a
        LEFT JOIN users u ON a.sponsor_id = u.id
        WHERE a.approved = 0
      `);
      res.json({ success: true, data: ads });
    } catch (error) {
      console.error('Get ads to approve error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch ads for approval',
        error: error.message
      });
    }
  }

  async approveAd(req, res) {
    try {
      const { id } = req.params;
      await db.execute('UPDATE ads SET approved = 1, updated_at = NOW() WHERE id = ?', [id]);
      res.json({
        success: true,
        message: 'Ad approved successfully'
      });
    } catch (error) {
      console.error('Approve ad error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to approve ad',
        error: error.message
      });
    }
  }

  async declineAd(req, res) {
    try {
      const { id } = req.params;
      await db.execute('DELETE FROM ads WHERE id = ?', [id]);
      res.json({
        success: true,
        message: 'Ad declined successfully'
      });
    } catch (error) {
      console.error('Decline ad error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to decline ad',
        error: error.message
      });
    }
  }

  async getMyAds(req, res) {
    try {
      const adminId = req.session.admin_user.id;
      const [ads] = await db.execute(`
        SELECT a.*, COUNT(av.id) as views_count,
               COALESCE(SUM(av.data_earned), 0) as total_data_earned
        FROM ads a
        LEFT JOIN ad_views av ON a.id = av.ad_id
        WHERE a.sponsor_id = ?
        GROUP BY a.id
        ORDER BY a.created_at DESC
      `, [adminId]);
      res.json({ success: true, data: ads });
    } catch (error) {
      console.error('Get my ads error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch ads',
        error: error.message
      });
    }
  }

  async createAd(req, res) {
    try {
      const { title, description, image_url, video_url, duration, reward_bytes, sponsor_id } = req.body;
      await db.execute(
        'INSERT INTO ads (title, description, image_url, video_url, duration, reward_bytes, sponsor_id, approved, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [title, description, image_url, video_url, duration || 30, reward_bytes || 10485760, sponsor_id, 1, 1]
      );
      res.json({
        success: true,
        message: 'Ad created successfully'
      });
    } catch (error) {
      console.error('Create ad error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create ad',
        error: error.message
      });
    }
  }

  async updateAd(req, res) {
    try {
      const { id } = req.params;
      const { title, description, image_url, video_url, duration, reward_bytes, is_active } = req.body;
      await db.execute(
        'UPDATE ads SET title = ?, description = ?, image_url = ?, video_url = ?, duration = ?, reward_bytes = ?, is_active = ?, updated_at = NOW() WHERE id = ?',
        [title, description, image_url, video_url, duration, reward_bytes, is_active, id]
      );
      res.json({
        success: true,
        message: 'Ad updated successfully'
      });
    } catch (error) {
      console.error('Update ad error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update ad',
        error: error.message
      });
    }
  }

  // ==================== ANALYTICS & DASHBOARD METHODS ====================
  async adminAnalytics(req, res) {
    try {
      const [totalViews] = await db.execute(`
        SELECT COUNT(*) as count FROM ad_views
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      `);
      const [completion] = await db.execute(`
        SELECT
          CASE
            WHEN COUNT(*) = 0 THEN 0
            ELSE AVG(CASE WHEN av.watched_duration >= a.duration THEN 1 ELSE 0 END) * 100
          END as rate
        FROM ad_views av
        JOIN ads a ON av.ad_id = a.id
      `);
      const [avgWatchTime] = await db.execute(`
        SELECT COALESCE(AVG(watched_duration), 0) as avgTime
        FROM ad_views
        WHERE watched_duration > 0
      `);
      const salesTrend = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const [daily] = await db.execute(
          `SELECT COALESCE(SUM(price), 0) as total FROM vouchers WHERE is_used = 1 AND DATE(used_at) = ?`,
          [dateStr]
        );
        salesTrend.push({
          date: dateStr,
          total: daily[0].total || 0
        });
      }
      const [popularPackages] = await db.execute(`
        SELECT p.name, COUNT(*) as count,
               (COUNT(*) / (SELECT COUNT(*) FROM vouchers WHERE is_used = 1) * 100) as percentage
        FROM vouchers v
        JOIN packages p ON v.package_id = p.id
        WHERE v.is_used = 1
        GROUP BY p.name
        ORDER BY count DESC
        LIMIT 5
      `);
      const [viewsByLocation] = await db.execute(`
        SELECT u.location, COUNT(av.id) as count,
               (COUNT(av.id) / (SELECT COUNT(*) FROM ad_views) * 100) as percentage
        FROM ad_views av
        JOIN users u ON av.user_id = u.id
        GROUP BY u.location
        ORDER BY count DESC
        LIMIT 5
      `);
      res.json({
        success: true,
        totalViews: totalViews[0].count || 0,
        completionRate: Math.round(completion[0].rate || 0),
        avgWatchTime: Math.round(avgWatchTime[0].avgTime || 0),
        salesTrend,
        popularPackages: popularPackages || [],
        viewsByLocation: viewsByLocation || []
      });
    } catch (error) {
      console.error('Analytics error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch analytics',
        error: error.message
      });
    }
  }

  async reportsData(req, res) {
    try {
      const [totalAdViews] = await db.execute(`
        SELECT COUNT(*) as count FROM ad_views
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      `);
      const [newUsers] = await db.execute(`
        SELECT COUNT(*) as count FROM users
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) AND role = "customer"
      `);
      const [pendingApprovals] = await db.execute('SELECT COUNT(*) as count FROM ads WHERE approved = 0');
      res.json({
        success: true,
        totalAdViews: totalAdViews[0].count || 0,
        newUsers: newUsers[0].count || 0,
        pendingApprovals: pendingApprovals[0].count || 0
      });
    } catch (error) {
      console.error('Reports data error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch reports data',
        error: error.message
      });
    }
  }

  // ==================== MIKROTIK ROUTER METHODS ====================
  async getRouters(req, res) {
    try {
      const [routers] = await db.execute('SELECT * FROM mikrotiks ORDER BY id DESC');
      res.json({
        success: true,
        data: routers
      });
    } catch (error) {
      console.error('Get routers error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch routers',
        error: error.message
      });
    }
  }

  async getRouterHealth(req, res) {
    try {
      const { routerID } = req.query;
      const health = await mikrotikService.getRouterHealth(routerID || 'router-default');
      res.json({
        success: true,
        data: health
      });
    } catch (error) {
      console.error('Get router health error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch router health',
        error: error.message
      });
    }
  }

  async addRouter(req, res) {
    try {
      const { router_id, router_name, host, user, password, port, location, ssid } = req.body;
      await db.execute(
        'INSERT INTO mikrotiks (router_id, router_name, host, user, password, port, location, ssid, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, "online")',
        [router_id, router_name, host, user, password, port || 8728, location, ssid]
      );
      res.json({
        success: true,
        message: 'Router added successfully'
      });
    } catch (error) {
      console.error('Add router error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to add router',
        error: error.message
      });
    }
  }

  async updateRouter(req, res) {
    try {
      const { id } = req.params;
      const { router_name, host, user, password, port, location, ssid, status } = req.body;
      await db.execute(
        'UPDATE mikrotiks SET router_name = ?, host = ?, user = ?, password = ?, port = ?, location = ?, ssid = ?, status = ?, updated_at = NOW() WHERE id = ?',
        [router_name, host, user, password, port, location, ssid, status, id]
      );
      res.json({
        success: true,
        message: 'Router updated successfully'
      });
    } catch (error) {
      console.error('Update router error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update router',
        error: error.message
      });
    }
  }

  async getRouterSessions(req, res) {
    try {
      const { routerID } = req.params;
      const sessions = await mikrotikService.getHotspotUsers(routerID);
      res.json({
        success: true,
        data: sessions,
        count: sessions.length
      });
    } catch (error) {
      console.error('Get router sessions error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch router sessions',
        error: error.message
      });
    }
  }

  async rebootRouter(req, res) {
    try {
      const { routerID } = req.params;
      const success = await mikrotikService.rebootRouter(routerID);
      res.json({
        success: success,
        message: success ? 'Router reboot initiated' : 'Failed to reboot router'
      });
    } catch (error) {
      console.error('Reboot router error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to reboot router',
        error: error.message
      });
    }
  }

  // ==================== SYSTEM SETTINGS METHODS ====================
  async getSystemSettings(req, res) {
    try {
      const [settings] = await db.execute('SELECT * FROM system_settings');
      res.json({ success: true, data: settings });
    } catch (error) {
      console.error('Get system settings error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch system settings',
        error: error.message
      });
    }
  }

  async updateSystemSettings(req, res) {
    try {
      const { settings } = req.body;
      for (const [key, value] of Object.entries(settings)) {
        await db.execute(
          'UPDATE system_settings SET setting_value = ?, updated_at = NOW() WHERE setting_key = ?',
          [value, key]
        );
      }
      res.json({
        success: true,
        message: 'System settings updated successfully'
      });
    } catch (error) {
      console.error('Update system settings error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update system settings',
        error: error.message
      });
    }
  }

  // ==================== NOTIFICATION METHODS ====================
  async getNotifications(req, res) {
    try {
      const [notifications] = await db.execute(`
        SELECT n.*, u.name as user_name
        FROM notifications n
        LEFT JOIN users u ON n.user_id = u.id
        WHERE n.is_read = 0
        ORDER BY n.created_at DESC
        LIMIT 50
      `);
      res.json({ success: true, data: notifications });
    } catch (error) {
      console.error('Get notifications error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch notifications',
        error: error.message
      });
    }
  }

  async markNotificationRead(req, res) {
    try {
      const { id } = req.params;
      await db.execute('UPDATE notifications SET is_read = 1 WHERE id = ?', [id]);
      res.json({
        success: true,
        message: 'Notification marked as read'
      });
    } catch (error) {
      console.error('Mark notification read error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to mark notification as read',
        error: error.message
      });
    }
  }

  // ==================== EJS COMPATIBILITY METHODS ====================
  async getAdViewsData(req, res) {
    try {
      const { startDate, endDate } = req.query;
      let query = `
        SELECT a.title, a.duration, av.watched_duration, av.created_at,
               u.name as user_name, u.location
        FROM ad_views av
        JOIN ads a ON av.ad_id = a.id
        JOIN users u ON av.user_id = u.id
        WHERE 1=1
      `;
      let params = [];
      if (startDate && endDate) {
        query += ' AND DATE(av.created_at) BETWEEN ? AND ?';
        params.push(startDate, endDate);
      }
      query += ' ORDER BY av.created_at DESC LIMIT 100';
      const [views] = await db.execute(query, params);
      res.json({
        success: true,
        data: views,
        count: views.length
      });
    } catch (error) {
      console.error('Get ad views error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch ad views',
        error: error.message
      });
    }
  }

  async getSponsors(req, res) {
    try {
      const [sponsors] = await db.execute('SELECT id, name, email FROM users WHERE role = "sponsor"');
      res.json({ success: true, data: sponsors });
    } catch (error) {
      console.error('Get sponsors error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch sponsors',
        error: error.message
      });
    }
  }

  async getPackages(req, res) {
    try {
      const [packages] = await db.execute('SELECT * FROM packages WHERE is_active = 1');
      res.json({ success: true, data: packages });
    } catch (error) {
      console.error('Get packages error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch packages',
        error: error.message
      });
    }
  }

  // ==================== LEGACY/UTILITY METHODS ====================
  async setUnlimitedStatus(req, res) {
    try {
      const { user_id, is_unlimited } = req.body;
      const [users] = await db.execute('SELECT id FROM users WHERE id = ?', [user_id]);
      if (users.length === 0) {
        return res.json({
          success: false,
          message: 'User not found'
        });
      }
      const now = new Date();
      if (is_unlimited) {
        await db.execute(
          `UPDATE users SET package = 'UNLIMITED', usage_start = ?,
           usage_until = '2030-12-31 23:59:59', updated_at = ? WHERE id = ?`,
          [now, now, user_id]
        );
        res.json({
          success: true,
          message: 'User granted unlimited access until 2030'
        });
      } else {
        await db.execute(
          `UPDATE users SET package = 'NO PACKAGE', usage_start = ?,
           usage_until = ?, updated_at = ? WHERE id = ?`,
          [now, now, now, user_id]
        );
        res.json({
          success: true,
          message: 'User unlimited access removed'
        });
      }
    } catch (error) {
      console.error('Unlimited status error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update user status',
        error: error.message
      });
    }
  }

  async deleteUser(req, res) {
    try {
      const { id } = req.params;
      const [result] = await db.execute('DELETE FROM users WHERE id = ?', [id]);
      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      res.json({
        success: true,
        message: 'User deleted successfully',
        deletedId: id
      });
    } catch (error) {
      console.error('Delete user error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete user',
        error: error.message
      });
    }
  }

  async getUserStats(req, res) {
    try {
      const [totalUsers] = await db.execute('SELECT COUNT(*) as count FROM users WHERE role = "customer"');
      const [activeUsers] = await db.execute('SELECT COUNT(*) as count FROM users WHERE usage_until > NOW() AND role = "customer"');
      const [newUsersToday] = await db.execute('SELECT COUNT(*) as count FROM users WHERE DATE(created_at) = CURDATE() AND role = "customer"');
      const [totalRevenue] = await db.execute('SELECT COALESCE(SUM(moneyspent), 0) as total FROM users WHERE role = "customer"');
      res.json({
        success: true,
        data: {
          totalUsers: totalUsers[0].count || 0,
          activeUsers: activeUsers[0].count || 0,
          newUsersToday: newUsersToday[0].count || 0,
          totalRevenue: totalRevenue[0].total || 0
        }
      });
    } catch (error) {
      console.error('User stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch user statistics',
        error: error.message
      });
    }
  }
}

module.exports = new AdminController();