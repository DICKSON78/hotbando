// controllers/adminController.js - KAMILI 100% - IMEBORESHEWA - KILA KITU KIPO
const db = require('../config/database');
const mikrotikService = require('../utils/mikrotik');
const path = require('path');
const fs = require('fs');

class AdminController {
  // ==================== UTILITY: STATIC METHODS ====================
  static formatTimeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Sasa hivi';
    if (diffMins < 60) return `Dakika ${diffMins} zilizopita`;
    if (diffHours < 24) return `Saa ${diffHours} zilizopita`;
    if (diffDays === 1) return 'Jana';
    return `Siku ${diffDays} zilizopita`;
  }

  static async getDashboardData(req) {
    try {
      console.log('Inapakia takwimu za dashboard...');

      // 1. TOTAL VIEWS - Last 30 days
      const [totalViewsResult] = await db.execute(`
        SELECT COUNT(*) as count FROM ad_views 
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      `);
      const totalViews = totalViewsResult[0]?.count || 0;

      // 2. ACTIVE ADS
      const [activeAdsResult] = await db.execute(
        'SELECT COUNT(*) as count FROM ads WHERE approved = 1 AND is_active = 1'
      );
      const activeAds = activeAdsResult[0]?.count || 0;

      // 3. DATA DISTRIBUTED (in GB)
      const [dataDistributedResult] = await db.execute(`
        SELECT COALESCE(SUM(free_bytes), 0) / (1024 * 1024 * 1024) as total_gb 
        FROM users WHERE role = "customer"
      `);
      const dataDistributed = parseFloat(dataDistributedResult[0]?.total_gb || 0).toFixed(2);

      // 4. COMPLETION RATE
      const [completionResult] = await db.execute(`
        SELECT
          CASE
            WHEN COUNT(*) = 0 THEN 0
            ELSE ROUND(AVG(CASE WHEN av.watched_duration >= a.duration THEN 1 ELSE 0 END) * 100, 2)
          END as rate
        FROM ad_views av
        JOIN ads a ON av.ad_id = a.id
        WHERE av.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      `);
      const completionRate = completionResult[0]?.rate || 0;

      // 5. VIEWS TREND - Last 7 days
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

      // 6. ACTIVE ADS LIST
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

      // 7. PENDING APPROVALS
      const [pendingApprovalsResult] = await db.execute(`
        SELECT a.id, a.title, u.name as sponsor_name, a.video_url, a.created_at
        FROM ads a
        LEFT JOIN users u ON a.sponsor_id = u.id
        WHERE a.approved = 0
        ORDER BY a.created_at DESC
        LIMIT 5
      `);
      const pendingApprovals = pendingApprovalsResult || [];

      // 8. RECENT ACTIVITY
      const recentActivity = [];
      
      const [recentViews] = await db.execute(`
        SELECT av.created_at, a.title, u.name as user_name
        FROM ad_views av
        JOIN ads a ON av.ad_id = a.id
        JOIN users u ON av.user_id = u.id
        ORDER BY av.created_at DESC
        LIMIT 3
      `);
      recentViews.forEach(view => {
        recentActivity.push({
          icon: 'eye',
          description: `${view.user_name} ametazama "${view.title}"`,
          time: AdminController.formatTimeAgo(view.created_at)
        });
      });

      const [recentVouchers] = await db.execute(`
        SELECT v.used_at, p.name as package_name, u.name as user_name
        FROM vouchers v
        JOIN packages p ON v.package_id = p.id
        JOIN users u ON v.used_by = u.id
        WHERE v.is_used = 1
        ORDER BY v.used_at DESC
        LIMIT 2
      `);
      recentVouchers.forEach(voucher => {
        recentActivity.push({
          icon: 'money-bill-wave',
          description: `${voucher.user_name} ametumia voucher ya ${voucher.package_name}`,
          time: AdminController.formatTimeAgo(voucher.used_at)
        });
      });

      // 9. CHART DATA
      const chartData = {
        labels: viewsTrend.map(item => {
          const date = new Date(item.date);
          return date.toLocaleDateString('sw-TZ', { day: 'numeric', month: 'short' });
        }),
        data: viewsTrend.map(item => item.total)
      };

      // 10. ROUTER STATS (for sidebar)
      const [routerStats] = await db.execute(`
        SELECT
          COUNT(*) as total_routers,
          SUM(CASE WHEN status = 'online' THEN 1 ELSE 0 END) as online_routers
        FROM mikrotiks WHERE is_active = 1
      `);
      const onlineRouters = routerStats[0]?.online_routers || 0;
      const totalRouters = routerStats[0]?.total_routers || 0;

      // 11. ACTIVE USERS (users currently using the system)
      const [activeUsersResult] = await db.execute(`
        SELECT COUNT(*) as count FROM users
        WHERE role = 'customer' AND usage_until > NOW() AND is_active = 1
      `);
      const activeUsers = activeUsersResult[0]?.count || 0;

      // 12. TOTAL USERS
      const [totalUsersResult] = await db.execute(`
        SELECT COUNT(*) as count FROM users WHERE role = 'customer'
      `);
      const totalUsers = totalUsersResult[0]?.count || 0;

      console.log('Takwimu zimepakuliwa kikamilifu');
      return {
        totalViews,
        activeAds,
        dataDistributed,
        completionRate,
        viewsTrend,
        activeAdsList,
        pendingApprovals,
        recentActivity,
        chartData,
        online_routers: onlineRouters,
        total_routers: totalRouters,
        active_users: activeUsers,
        total_users: totalUsers
      };
    } catch (error) {
      console.error('Hitilafu katika dashboard stats:', error);
      return {
        totalViews: 0,
        activeAds: 0,
        dataDistributed: 0,
        completionRate: 0,
        viewsTrend: Array.from({ length: 7 }, (_, i) => ({
          date: new Date(Date.now() - (6 - i) * 86400000).toISOString().split('T')[0],
          total: 0
        })),
        activeAdsList: [],
        pendingApprovals: [],
        recentActivity: [
          { icon: 'info-circle', description: 'Mfumo upo tayari', time: 'Sasa hivi' }
        ],
        chartData: {
          labels: ['Leo', 'Jana', 'Juzi', '3', '4', '5', '6'],
          data: [0, 0, 0, 0, 0, 0, 0]
        },
        online_routers: 0,
        total_routers: 0,
        active_users: 0,
        total_users: 0
      };
    }
  }

  // ==================== DASHBOARD METHODS ====================
  async dashboardStats(req, res) {
    try {
      const data = await AdminController.getDashboardData(req);
      return res.json({ success: true, ...data });
    } catch (error) {
      console.error('Hitilafu katika dashboard stats API:', error);
      return res.status(500).json({
        success: false,
        message: 'Hitilafu katika kupakua takwimu',
        error: error.message
      });
    }
  }

  async renderDashboardPage(req, res) {
    try {
      const data = await AdminController.getDashboardData(req);
      return res.render('admin/dashboard', {
        title: 'Dashibodi',
        activePage: 'dashboard',
        userName: req.session.admin_user?.name || 'Admin',
        ...data
      });
    } catch (error) {
      console.error('Hitilafu katika render dashboard:', error);
      return res.render('admin/dashboard', {
        title: 'Dashibodi',
        activePage: 'dashboard',
        userName: req.session.admin_user?.name || 'Admin',
        error: 'Imeshindikana kupakia data ya dashboard'
      });
    }
  }

  // ==================== VIDEO UPLOAD METHODS ====================
  async renderUploadVideoPage(req, res) {
    try {
      const [sponsors] = await db.execute('SELECT id, name FROM users WHERE role = "sponsor"');
      return res.render('admin/upload-video', {
        title: 'Pakia Video',
        activePage: 'upload-video',
        userName: req.session.admin_user?.name || 'Admin',
        sponsors: sponsors || []
      });
    } catch (error) {
      console.error('Hitilafu wakati wa kupakia ukurasa wa upload:', error);
      return res.render('admin/upload-video', {
        title: 'Pakia Video',
        activePage: 'upload-video',
        userName: req.session.admin_user?.name || 'Admin',
        sponsors: [],
        error: 'Imeshindikana kupakia ukurasa'
      });
    }
  }

  async uploadVideo(req, res) {
    try {
      console.log('Kupakia video mpya...');
      
      if (!req.files || !req.files.video) {
        return res.status(400).json({
          success: false,
          message: 'Tafadhali chagua faili ya video'
        });
      }

      const videoFile = req.files.video;
      const { title, description, sponsor_id, duration, reward_bytes, is_active } = req.body;

      if (!title || !description || !sponsor_id) {
        return res.status(400).json({
          success: false,
          message: 'Jina, maelezo na mdhamini vinahitajika'
        });
      }

      const allowedMimeTypes = ['video/mp4', 'video/mkv', 'video/avi', 'video/mov', 'video/wmv'];
      if (!allowedMimeTypes.includes(videoFile.mimetype)) {
        return res.status(400).json({
          success: false,
          message: 'Tafadhali chagua faili ya video sahihi (MP4, MKV, AVI, MOV, WMV)'
        });
      }

      const maxSize = 100 * 1024 * 1024;
      if (videoFile.size > maxSize) {
        return res.status(400).json({
          success: false,
          message: 'Faili ni kubwa sana. Ukubwa upewa ni 100MB pekee'
        });
      }

      const fileExtension = path.extname(videoFile.name);
      const fileName = `ad_${Date.now()}${fileExtension}`;
      const uploadPath = path.join(__dirname, '../public/uploads/videos', fileName);
      const uploadDir = path.dirname(uploadPath);

      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      await videoFile.mv(uploadPath);
      const videoUrl = `/uploads/videos/${fileName}`;
      const rewardBytes = parseInt(reward_bytes) * 1024 * 1024;

      const [result] = await db.execute(
        `INSERT INTO ads
        (title, description, image_url, video_url, duration, reward_bytes, sponsor_id, approved, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          title,
          description,
          '/images/default-ad-thumbnail.jpg',
          videoUrl,
          duration || 30,
          rewardBytes || 10485760,
          sponsor_id,
          1,
          is_active ? 1 : 1
        ]
      );

      console.log('Video imepakiwa kikamilifu:', { title, videoUrl, adId: result.insertId });
      return res.json({
        success: true,
        message: 'Video imepakiwa kikamilifu na imeongezwa kwenye matangazo',
        data: { id: result.insertId, title, video_url: videoUrl }
      });
    } catch (error) {
      console.error('Hitilafu wakati wa kupakia video:', error);
      return res.status(500).json({
        success: false,
        message: 'Imeshindikana kupakia video',
        error: error.message
      });
    }
  }

  // ==================== VIDEO ADS METHODS ====================
  async getVideoAds(req, res) {
    try {
      const [ads] = await db.execute(`
        SELECT a.*, u.name as sponsor_name,
               COUNT(av.id) as views_count,
               COALESCE(SUM(av.data_earned), 0) as total_data_distributed
        FROM ads a
        LEFT JOIN users u ON a.sponsor_id = u.id
        LEFT JOIN ad_views av ON a.id = av.ad_id
        WHERE a.video_url IS NOT NULL AND a.video_url != ''
        GROUP BY a.id
        ORDER BY a.created_at DESC
      `);
      return res.json({ success: true, data: ads, count: ads.length });
    } catch (error) {
      console.error('Hitilafu wakati wa kupata matangazo ya video:', error);
      return res.status(500).json({ success: false, message: 'Imeshindikana kupata matangazo', error: error.message });
    }
  }

  // ==================== PACKAGES METHODS ====================
  async getPackages(req, res) {
    try {
      console.log('Inapakia vifurushi kutoka database...');
      const [packages] = await db.execute(`
        SELECT id, name, description, duration_hours, price, is_active
        FROM packages
        WHERE is_active = 1
        ORDER BY price ASC
      `);
      console.log('Vifurushi vilivyopatikana:', packages.length);
      return res.json({ success: true, data: packages, count: packages.length });
    } catch (error) {
      console.error('Hitilafu katika kupata vifurushi:', error);
      return res.status(500).json({ success: false, message: 'Imeshindikana kupata vifurushi', error: error.message });
    }
  }

  // ==================== VOUCHER METHODS ====================
  async generateVoucher(req, res) {
    try {
      const { issuedto, vouchers } = req.body;
      console.log('Voucher generation request:', { issuedto, vouchers });

      if (!issuedto || !issuedto.trim()) {
        return res.status(400).json({ success: false, message: 'Tafadhali ingiza jina la mtoa huduma' });
      }
      if (!vouchers || Object.keys(vouchers).length === 0) {
        return res.status(400).json({ success: false, message: 'Tafadhali chagua angalau kifurushi kimoja' });
      }

      let totalVouchersRequested = 0;
      for (const [pkg, count] of Object.entries(vouchers)) {
        const quantity = parseInt(count);
        if (isNaN(quantity) || quantity < 0) {
          return res.status(400).json({ success: false, message: `Idadi ya ${pkg} si sahihi` });
        }
        totalVouchersRequested += quantity;
      }
      if (totalVouchersRequested === 0) {
        return res.status(400).json({ success: false, message: 'Tafadhali ingiza idadi ya vouchers' });
      }
      if (totalVouchersRequested > 50000) {
        return res.status(400).json({ success: false, message: 'Idadi ya jumla ya vouchers haizidi 50,000 kwa mara moja' });
      }

      const [batches] = await db.execute('SELECT MAX(id) as maxId FROM voucher_batches');
      const nextBatchNumber = (batches[0].maxId || 0) + 1;
      const batchName = `BATCH-${new Date().toLocaleString('en-US', { month: 'short' }).toUpperCase()}-${nextBatchNumber.toString().padStart(3, '0')}`;

      const packageValues = {
        'MASAA 6': { id: 1, price: 500 },
        'MASAA 24': { id: 2, price: 1000 },
        'WIKI 1': { id: 3, price: 6000 },
        'MWEEZI 1': { id: 4, price: 20000 },
      };

      const [batchResult] = await db.execute(
        'INSERT INTO voucher_batches (batch_name, issued_to, total_vouchers, total_value, created_by) VALUES (?, ?, ?, ?, ?)',
        [batchName, issuedto.trim(), 0, 0, req.session.admin_user?.id || 3]
      );
      const batchId = batchResult.insertId;

      const allVouchers = [];
      let totalVouchersGenerated = 0;
      let totalValue = 0;

      for (const [pkg, count] of Object.entries(vouchers)) {
        const quantity = parseInt(count);
        if (quantity === 0 || !packageValues[pkg]) continue;
        console.log(`Generating ${quantity} vouchers for ${pkg}`);
        for (let i = 0; i < quantity; i++) {
          const code = await adminController.generateUniqueVoucher();
          const packageInfo = packageValues[pkg];
          const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
          allVouchers.push([
            code,
            packageInfo.id,
            packageInfo.price,
            0, null, null,
            batchId,
            expiresAt
          ]);
          totalVouchersGenerated++;
          totalValue += packageInfo.price;
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
          [totalVouchersGenerated, totalValue, batchId]
        );
      }

      console.log(`Vouchers zimeundwa kikamilifu: ${totalVouchersGenerated} vouchers, Jumla: TSH ${totalValue.toLocaleString()}`);
      return res.json({
        success: true,
        message: `Vouchers ${totalVouchersGenerated.toLocaleString()} zimeundwa kikamilifu!`,
        batchId, count: totalVouchersGenerated, totalValue, batchName
      });
    } catch (error) {
      console.error('Hitilafu katika kuunda vouchers:', error);
      return res.status(500).json({ success: false, message: 'Imeshindikana kuunda vouchers', error: error.message });
    }
  }

  async generateUniqueVoucher() {
    let code;
    let exists = true;
    let attempts = 0;
    while (exists && attempts < 10) {
      code = 'HOT' + Math.floor(100000 + Math.random() * 900000).toString();
      const [vouchers] = await db.execute('SELECT id FROM vouchers WHERE voucher_code = ?', [code]);
      exists = vouchers.length > 0;
      attempts++;
    }
    if (exists) {
      code = 'HOT' + Date.now().toString().slice(-8);
    }
    return code;
  }

  async getBatches(req, res) {
    try {
      console.log('Inapakia batches kutoka database...');
      const [batches] = await db.execute(`
        SELECT vb.*, u.name as created_by_name,
               DATE_FORMAT(vb.created_at, '%Y-%m-%d %H:%i:%s') as formatted_date
        FROM voucher_batches vb
        LEFT JOIN users u ON vb.created_by = u.id
        ORDER BY vb.created_at DESC
        LIMIT 50
      `);
      console.log('Batches zilizopatikana:', batches.length);
      return res.json({ success: true, data: batches, count: batches.length });
    } catch (error) {
      console.error('Hitilafu katika kupata batches:', error);
      return res.status(500).json({ success: false, message: 'Imeshindikana kupata batches', error: error.message });
    }
  }

  async getVoucherReport(req, res) {
    try {
      const { startDate, endDate, limit = 100 } = req.query;
      let query = `
        SELECT v.voucher_code, p.name as package_name, v.price, v.is_used, v.used_at,
               u.name as used_by_name, u.phone_number, vb.batch_name, vb.issued_to, vb.created_at as batch_date
        FROM vouchers v
        LEFT JOIN packages p ON v.package_id = p.id
        LEFT JOIN users u ON v.used_by = u.id
        LEFT JOIN voucher_batches vb ON v.batch_id = vb.id
        WHERE 1=1
      `;
      let params = [];
      if (startDate && endDate) {
        query += ' AND DATE(vb.created_at) BETWEEN ? AND ?';
          params.push(startDate, endDate);
      }
      query += ` ORDER BY v.created_at DESC LIMIT ${parseInt(limit)}`;
      const [vouchers] = await db.execute(query, params);
      return res.json({ success: true, data: vouchers, count: vouchers.length });
    } catch (error) {
      console.error('Hitilafu katika voucher report:', error);
      return res.status(500).json({ success: false, message: 'Imeshindikana kupata ripoti ya vouchers', error: error.message });
    }
  }

  async getVouchersByBatch(req, res) {
    try {
      const { batchId } = req.params;
      const [vouchers] = await db.execute(`
        SELECT v.voucher_code, p.name as package_name, v.price, v.is_used, v.used_at,
               u.name as used_by_name, u.phone_number
        FROM vouchers v
        LEFT JOIN packages p ON v.package_id = p.id
        LEFT JOIN users u ON v.used_by = u.id
        WHERE v.batch_id = ?
        ORDER BY v.id DESC
      `, [batchId]);
      const [batchInfo] = await db.execute(`
        SELECT batch_name, issued_to, total_vouchers, total_value, created_at
        FROM voucher_batches WHERE id = ?
      `, [batchId]);
      return res.json({
        success: true,
        data: vouchers,
        count: vouchers.length,
        batchInfo: batchInfo[0] || null
      });
    } catch (error) {
      console.error('Hitilafu katika kupata vouchers za batch:', error);
      return res.status(500).json({ success: false, message: 'Imeshindikana kupata vouchers', error: error.message });
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
      const [activeSubs] = await db.execute('SELECT COUNT(*) as count FROM users WHERE usage_until > NOW() AND role = "customer"');
      const [totalRevenue] = await db.execute('SELECT COALESCE(SUM(price), 0) as total FROM vouchers WHERE is_used = 1');

      const salesTrend = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const [daily] = await db.execute(
          `SELECT COALESCE(SUM(price), 0) as total FROM vouchers WHERE is_used = 1 AND DATE(used_at) = ?`,
          [dateStr]
        );
        salesTrend.push({ date: dateStr, total: parseFloat(daily[0].total) || 0 });
      }

      return res.json({
        success: true,
        todaySales: parseFloat(todaySales[0].total) || 0,
        totalUsers: totalUsers[0].count || 0,
        activeSubscriptions: activeSubs[0].count || 0,
        totalRevenue: parseFloat(totalRevenue[0].total) || 0,
        trend: salesTrend
      });
    } catch (error) {
      console.error('Hitilafu katika sales summary:', error);
      return res.status(500).json({ success: false, message: 'Imeshindikana kupata muhtasari wa mauzo', error: error.message });
    }
  }

  async getVoucherStats(req, res) {
    try {
      console.log('Inapakia takwimu za vouchers...');
      const today = new Date().toISOString().split('T')[0];
      const [usedTodayResult] = await db.execute(
        `SELECT COUNT(*) as count FROM vouchers WHERE is_used = 1 AND DATE(used_at) = ?`,
        [today]
      );
      const [availableResult] = await db.execute('SELECT COUNT(*) as count FROM vouchers WHERE is_used = 0');
      const usedToday = usedTodayResult[0]?.count || 0;
      const available = availableResult[0]?.count || 0;
      console.log('Takwimu za vouchers:', { usedToday, available });
      return res.json({ success: true, usedToday, availableVouchers: available });
    } catch (error) {
      console.error('Hitilafu katika kupata takwimu za vouchers:', error);
      return res.status(500).json({ success: false, message: 'Imeshindikana kupata takwimu za vouchers', error: error.message });
    }
  }

  // ==================== ANALYTICS METHODS ====================
  async renderAnalyticsPage(req, res) {
    try {
      const [totalViews] = await db.execute(`
        SELECT COUNT(*) as count FROM ad_views
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      `);
      const [completion] = await db.execute(`
        SELECT
          CASE
            WHEN COUNT(*) = 0 THEN 0
            ELSE ROUND(AVG(CASE WHEN av.watched_duration >= a.duration THEN 1 ELSE 0 END) * 100, 2)
          END as rate
        FROM ad_views av
        JOIN ads a ON av.ad_id = a.id
        WHERE av.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      `);
      const [avgWatchTime] = await db.execute(`
        SELECT COALESCE(AVG(watched_duration), 0) as avgTime
        FROM ad_views
        WHERE watched_duration > 0
        AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
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
          total: parseFloat(daily[0].total) || 0
        });
      }

      const [popularPackages] = await db.execute(`
        SELECT p.name, COUNT(*) as count,
               ROUND((COUNT(*) / (SELECT COUNT(*) FROM vouchers WHERE is_used = 1) * 100), 2) as percentage
        FROM vouchers v
        JOIN packages p ON v.package_id = p.id
        WHERE v.is_used = 1
        GROUP BY p.name
        ORDER BY count DESC
        LIMIT 5
      `);

      const [viewsByLocation] = await db.execute(`
        SELECT u.location, COUNT(av.id) as count,
               ROUND((COUNT(av.id) / (SELECT COUNT(*) FROM ad_views) * 100), 2) as percentage
        FROM ad_views av
        JOIN users u ON av.user_id = u.id
        WHERE av.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        GROUP BY u.location
        ORDER BY count DESC
        LIMIT 5
      `);

      return res.render('admin/analytics', {
        title: 'Takwimu za Matangazo',
        activePage: 'analytics',
        userName: req.session.admin_user?.name,
        totalViews: totalViews[0].count || 0,
        completionRate: completion[0].rate || 0,
        avgWatchTime: Math.round(avgWatchTime[0].avgTime || 0),
        salesTrend,
        popularPackages: popularPackages || [],
        viewsByLocation: viewsByLocation || []
      });
    } catch (error) {
      console.error('Hitilafu katika analytics page:', error);
      return res.render('admin/analytics', {
        title: 'Takwimu za Matangazo',
        activePage: 'analytics',
        userName: req.session.admin_user?.name,
        error: 'Imeshindikana kupakia data ya takwimu'
      });
    }
  }
  async getAnalyticsStats(req, res) {
    try {
        const [totalViews] = await db.execute(`
            SELECT COUNT(*) as count FROM ad_views 
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        `);
        
        const [completion] = await db.execute(`
            SELECT
                CASE
                    WHEN COUNT(*) = 0 THEN 0
                    ELSE ROUND(AVG(CASE WHEN av.watched_duration >= a.duration THEN 1 ELSE 0 END) * 100, 2)
                END as rate
            FROM ad_views av
            JOIN ads a ON av.ad_id = a.id
            WHERE av.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        `);
        
        const [avgWatchTime] = await db.execute(`
            SELECT COALESCE(AVG(watched_duration), 0) as avgTime
            FROM ad_views
            WHERE watched_duration > 0
            AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        `);

        const [totalClicks] = await db.execute(`
            SELECT COUNT(*) as count FROM ad_views 
            WHERE watched_duration >= 10
            AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        `);

        const [uniqueViewers] = await db.execute(`
            SELECT COUNT(DISTINCT user_id) as count FROM ad_views 
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        `);

        return res.json({
            success: true,
            totalViews: totalViews[0].count || 0,
            completionRate: completion[0].rate || 0,
            avgWatchTime: Math.round(avgWatchTime[0].avgTime || 0),
            totalClicks: totalClicks[0].count || 0,
            uniqueViewers: uniqueViewers[0].count || 0
        });
    } catch (error) {
        console.error('Hitilafu katika analytics stats:', error);
        return res.status(500).json({
            success: false,
            message: 'Imeshindikana kupata takwimu za analytics',
            error: error.message
        });
    }
}

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
            ELSE ROUND(AVG(CASE WHEN av.watched_duration >= a.duration THEN 1 ELSE 0 END) * 100, 2)
          END as rate
        FROM ad_views av
        JOIN ads a ON av.ad_id = a.id
        WHERE av.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      `);
      const [avgWatchTime] = await db.execute(`
        SELECT COALESCE(AVG(watched_duration), 0) as avgTime
        FROM ad_views
        WHERE watched_duration > 0
        AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
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
          total: parseFloat(daily[0].total) || 0
        });
      }

      const [popularPackages] = await db.execute(`
        SELECT p.name, COUNT(*) as count,
               ROUND((COUNT(*) / (SELECT COUNT(*) FROM vouchers WHERE is_used = 1) * 100), 2) as percentage
        FROM vouchers v
        JOIN packages p ON v.package_id = p.id
        WHERE v.is_used = 1
        GROUP BY p.name
        ORDER BY count DESC
        LIMIT 5
      `);

      const [viewsByLocation] = await db.execute(`
        SELECT u.location, COUNT(av.id) as count,
               ROUND((COUNT(av.id) / (SELECT COUNT(*) FROM ad_views) * 100), 2) as percentage
        FROM ad_views av
        JOIN users u ON av.user_id = u.id
        WHERE av.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        GROUP BY u.location
        ORDER BY count DESC
        LIMIT 5
      `);

      return res.json({
        success: true,
        totalViews: totalViews[0].count || 0,
        completionRate: completion[0].rate || 0,
        avgWatchTime: Math.round(avgWatchTime[0].avgTime || 0),
        salesTrend,
        popularPackages: popularPackages || [],
        viewsByLocation: viewsByLocation || []
      });
    } catch (error) {
      console.error('Hitilafu katika analytics:', error);
      return res.status(500).json({
        success: false,
        message: 'Imeshindikana kupata takwimu',
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
      const [pendingApprovals] = await db.execute(
        'SELECT COUNT(*) as count FROM ads WHERE approved = 0'
      );
      return res.json({
        success: true,
        totalAdViews: totalAdViews[0].count || 0,
        newUsers: newUsers[0].count || 0,
        pendingApprovals: pendingApprovals[0].count || 0
      });
    } catch (error) {
      console.error('Hitilafu katika reports data:', error);
      return res.status(500).json({
        success: false,
        message: 'Imeshindikana kupata data ya ripoti',
        error: error.message
      });
    }
  }


  async getAnalyticsData(req, res) {
    try {
        console.log('📊 Inapakia data halisi ya analytics...');
        
        // 1. TOTAL VIEWS - Last 30 days
        const [totalViewsResult] = await db.execute(`
            SELECT COUNT(*) as count FROM ad_views 
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        `);
        const totalViews = totalViewsResult[0]?.count || 0;

        // 2. COMPLETION RATE
        const [completionResult] = await db.execute(`
            SELECT
                CASE
                    WHEN COUNT(*) = 0 THEN 0
                    ELSE ROUND(AVG(CASE WHEN av.watched_duration >= a.duration THEN 1 ELSE 0 END) * 100, 2)
                END as rate
            FROM ad_views av
            JOIN ads a ON av.ad_id = a.id
            WHERE av.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        `);
        const completionRate = completionResult[0]?.rate || 0;

        // 3. AVERAGE WATCH TIME
        const [avgWatchTimeResult] = await db.execute(`
            SELECT COALESCE(AVG(watched_duration), 0) as avgTime
            FROM ad_views
            WHERE watched_duration > 0
            AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        `);
        const avgWatchTime = Math.round(avgWatchTimeResult[0]?.avgTime || 0);

        // 4. TOTAL CLICKS (estimated from views with good watch time)
        const [totalClicksResult] = await db.execute(`
            SELECT COUNT(*) as count FROM ad_views 
            WHERE watched_duration >= 10
            AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        `);
        const totalClicks = totalClicksResult[0]?.count || 0;

        // 5. UNIQUE VIEWERS
        const [uniqueViewersResult] = await db.execute(`
            SELECT COUNT(DISTINCT user_id) as count FROM ad_views 
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        `);
        const uniqueViewers = uniqueViewersResult[0]?.count || 0;

        // 6. VIEWS TREND - Last 7 days
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

        console.log('✅ Data ya analytics imepakuliwa:', {
            totalViews,
            completionRate,
            avgWatchTime,
            totalClicks,
            uniqueViewers
        });

        return res.json({
            success: true,
            data: {
                totalViews,
                completionRate,
                avgWatchTime,
                totalClicks,
                uniqueViewers,
                viewsTrend
            }
        });

    } catch (error) {
        console.error('❌ Hitilafu katika kupata data ya analytics:', error);
        return res.status(500).json({
            success: false,
            message: 'Imeshindikana kupata data ya analytics',
            error: error.message
        });
    }
}

async getAdViewsForAnalytics(req, res) {
    try {
        console.log('📈 Inapakia data ya maonyesho ya matangazo...');
        
        const [adViews] = await db.execute(`
            SELECT 
                av.id,
                av.ad_id,
                av.user_id,
                av.watched_duration,
                av.data_earned,
                av.created_at,
                a.title,
                a.duration as ad_duration,
                u.name as user_name,
                u.location
            FROM ad_views av
            JOIN ads a ON av.ad_id = a.id
            JOIN users u ON av.user_id = u.id
            WHERE av.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            ORDER BY av.created_at DESC
            LIMIT 1000
        `);

        console.log(`✅ ${adViews.length} records za ad views zimepatikana`);

        return res.json({
            success: true,
            data: adViews,
            count: adViews.length
        });

    } catch (error) {
        console.error('❌ Hitilafu katika kupata ad views:', error);
        return res.status(500).json({
            success: false,
            message: 'Imeshindikana kupata data ya maonyesho',
            error: error.message
        });
    }
}

  // ==================== USER/CUSTOMER METHODS ====================
  async getCustomers(req, res) {
    try {
      const { search, page = 1, limit = 50 } = req.query;
      const offset = (page - 1) * limit;
      let query = `
        SELECT
          id, name, phone_number, package, location,
          moneyspent, usage_start, usage_until,
          free_bytes / (1024*1024) as free_mb,
          mac_address, last_router_id, is_active,
          created_at, updated_at
        FROM users
        WHERE role = 'customer'
      `;
      let params = [];
      if (search) {
        query += ' AND (phone_number LIKE ? OR name LIKE ? OR mac_address LIKE ? OR location LIKE ?)';
        params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
      }
      query += ` ORDER BY id DESC LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`;
      const [customers] = await db.execute(query, params);

      let countQuery = 'SELECT COUNT(*) as total FROM users WHERE role = "customer"';
      if (search) {
        countQuery += ' AND (phone_number LIKE ? OR name LIKE ? OR mac_address LIKE ? OR location LIKE ?)';
      }
      const [totalResult] = await db.execute(
        countQuery,
        search ? [`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`] : []
      );

      return res.json({
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
      console.error('Hitilafu katika kupata customers:', error);
      return res.status(500).json({ success: false, message: 'Imeshindikana kupata wateja', error: error.message });
    }
  }

  async getOnlineCustomers(req, res) {
    try {
      const [onlineCustomers] = await db.execute(`
        SELECT
          u.id, u.name, u.phone_number, u.mac_address,
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
      return res.json({
        success: true,
        data: onlineCustomers,
        count: onlineCustomers.length
      });
    } catch (error) {
      console.error('Hitilafu katika kupata online customers:', error);
      return res.status(500).json({ success: false, message: 'Imeshindikana kupata wateja walio online', error: error.message });
    }
  }

  async suspendCustomer(req, res) {
    try {
      const { id } = req.params;
      const { reason, suspended_until, is_permanent } = req.body;

      const [users] = await db.execute('SELECT id, name FROM users WHERE id = ? AND role = "customer"', [id]);
      if (users.length === 0) {
        return res.status(404).json({ success: false, message: 'Mtumiaji hakupatikana' });
      }

      await db.execute(
        'INSERT INTO user_suspensions (user_id, reason, suspended_by, suspended_until, is_permanent) VALUES (?, ?, ?, ?, ?)',
        [id, reason || 'Imesimamishwa na msimamizi', req.session.admin_user.id, is_permanent ? null : (suspended_until || null), is_permanent || 0]
      );
      await db.execute(
        'UPDATE users SET usage_until = NOW(), is_active = 0 WHERE id = ?',
        [id]
      );

      return res.json({ success: true, message: 'Mtumiaji amesimamishwa kikamilifu' });
    } catch (error) {
      console.error('Hitilafu katika kusimamisha mtumiaji:', error);
      return res.status(500).json({ success: false, message: 'Imeshindikana kusimamisha mtumiaji', error: error.message });
    }
  }

  async unsuspendCustomer(req, res) {
    try {
      const { id } = req.params;
      await db.execute('UPDATE users SET is_active = 1 WHERE id = ?', [id]);
      return res.json({ success: true, message: 'Mtumiaji amerejeshwa kikamilifu' });
    } catch (error) {
      console.error('Hitilafu katika kurejesha mtumiaji:', error);
      return res.status(500).json({ success: false, message: 'Imeshindikana kurejesha mtumiaji', error: error.message });
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

      return res.json({ success: true, message: 'Usajili wa mtumiaji umeongezewa muda kikamilifu' });
    } catch (error) {
      console.error('Hitilafu katika kurekebisha usajili:', error);
      return res.status(500).json({ success: false, message: 'Imeshindikana kurekebisha usajili', error: error.message });
    }
  }

  async deleteCustomer(req, res) {
    try {
      const { id } = req.params;
      const [result] = await db.execute('DELETE FROM users WHERE id = ? AND role = "customer"', [id]);
      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, message: 'Mtumiaji hakupatikana' });
      }
      return res.json({ success: true, message: 'Mtumiaji amefutwa kikamilifu', deletedId: id });
    } catch (error) {
      console.error('Hitilafu katika kufuta mtumiaji:', error);
      return res.status(500).json({ success: false, message: 'Imeshindikana kufuta mtumiaji', error: error.message });
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
        ORDER BY a.created_at DESC
      `);
      return res.json({ success: true, data: ads, count: ads.length });
    } catch (error) {
      console.error('Hitilafu katika kupata matangazo ya kuidhinisha:', error);
      return res.status(500).json({ success: false, message: 'Imeshindikana kupata matangazo', error: error.message });
    }
  }

  async approveAd(req, res) {
    try {
      const { id } = req.params;
      const [ads] = await db.execute('SELECT id FROM ads WHERE id = ?', [id]);
      if (ads.length === 0) {
        return res.status(404).json({ success: false, message: 'Tangazo hakupatikana' });
      }
      await db.execute('UPDATE ads SET approved = 1, updated_at = NOW() WHERE id = ?', [id]);
      return res.json({ success: true, message: 'Tangazo limeidhinishwa kikamilifu' });
    } catch (error) {
      console.error('Hitilafu katika kuidhinisha tangazo:', error);
      return res.status(500).json({ success: false, message: 'Imeshindikana kuidhinisha tangazo', error: error.message });
    }
  }

  async declineAd(req, res) {
    try {
      const { id } = req.params;
      const [ads] = await db.execute('SELECT id FROM ads WHERE id = ?', [id]);
      if (ads.length === 0) {
        return res.status(404).json({ success: false, message: 'Tangazo hakupatikana' });
      }
      await db.execute('DELETE FROM ads WHERE id = ?', [id]);
      return res.json({ success: true, message: 'Tangazo limekataliwa kikamilifu' });
    } catch (error) {
      console.error('Hitilafu katika kukataa tangazo:', error);
      return res.status(500).json({ success: false, message: 'Imeshindikana kukataa tangazo', error: error.message });
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
      return res.json({ success: true, data: ads, count: ads.length });
    } catch (error) {
      console.error('Hitilafu katika kupata matangazo yangu:', error);
      return res.status(500).json({ success: false, message: 'Imeshindikana kupata matangazo', error: error.message });
    }
  }
  async getMyAdsAPI(req, res) {
  try {
    console.log('🔍 API: Fetching ads for user:', req.session.admin_user?.id);
    
    if (!req.session.admin_user || !req.session.admin_user.id) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized - Please login first'
      });
    }

    const [ads] = await db.execute(`
      SELECT 
        a.id,
        a.title,
        a.description,
        a.video_url,
        a.duration,
        a.reward_bytes,
        a.sponsor_id,
        a.approved,
        a.is_active,
        a.created_at,
        a.updated_at,
        COUNT(av.id) as views_count,
        COALESCE(SUM(av.data_earned), 0) as total_data_earned
      FROM ads a
      LEFT JOIN ad_views av ON a.id = av.ad_id
      WHERE a.sponsor_id = ?
      GROUP BY a.id
      ORDER BY a.created_at DESC
    `, [req.session.admin_user.id]);

    console.log('✅ API: Ads found:', ads.length);

    return res.json({
      success: true,
      data: ads || [],
      count: ads.length
    });
  } catch (error) {
    console.error('❌ Hitilafu katika API my-ads:', error);
    return res.status(500).json({
      success: false,
      message: 'Imeshindikana kupakia matangazo',
      error: error.message
    });
  }
}

  async createAd(req, res) {
    try {
      const { title, description, image_url, video_url, duration, reward_bytes, sponsor_id } = req.body;
      if (!title || !description) {
        return res.status(400).json({ success: false, message: 'Jina na maelezo yanahitajika' });
      }
      await db.execute(
        'INSERT INTO ads (title, description, image_url, video_url, duration, reward_bytes, sponsor_id, approved, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())',
        [title, description, image_url, video_url, duration || 30, reward_bytes || 10485760, sponsor_id, 1, 1]
      );
      return res.json({ success: true, message: 'Tangazo limeundwa kikamilifu' });
    } catch (error) {
      console.error('Hitilafu katika kuunda tangazo:', error);
      return res.status(500).json({ success: false, message: 'Imeshindikana kuunda tangazo', error: error.message });
    }
  }

  async updateAd(req, res) {
    try {
      const { id } = req.params;
      const { title, description, image_url, video_url, duration, reward_bytes, is_active } = req.body;
      const [ads] = await db.execute('SELECT id FROM ads WHERE id = ?', [id]);
      if (ads.length === 0) {
        return res.status(404).json({ success: false, message: 'Tangazo hakupatikana' });
      }
      await db.execute(
        'UPDATE ads SET title = ?, description = ?, image_url = ?, video_url = ?, duration = ?, reward_bytes = ?, is_active = ?, updated_at = NOW() WHERE id = ?',
        [title, description, image_url, video_url, duration, reward_bytes, is_active, id]
      );
      return res.json({ success: true, message: 'Tangazo limebadilishwa kikamilifu' });
    } catch (error) {
      console.error('Hitilafu katika kubadilisha tangazo:', error);
      return res.status(500).json({ success: false, message: 'Imeshindikana kubadilisha tangazo', error: error.message });
    }
  }

  // ==================== MIKROTIK ROUTER METHODS ====================
  async getRouters(req, res) {
    try {
      const [routers] = await db.execute(`
        SELECT m.*, l.name as location_name, l.city
        FROM mikrotiks m
        LEFT JOIN locations l ON m.location_id = l.id
        ORDER BY m.id DESC
      `);
      return res.json({ success: true, routers: routers, data: routers, count: routers.length });
    } catch (error) {
      console.error('Hitilafu katika kupata routers:', error);
      return res.status(500).json({ success: false, message: 'Imeshindikana kupata routers', error: error.message });
    }
  }

  async getRouterHealth(req, res) {
    try {
      const { routerID } = req.query;
      const health = await mikrotikService.getRouterHealth(routerID || 'router-default');
      return res.json({ success: true, data: health });
    } catch (error) {
      console.error('Hitilafu katika kupata hali ya router:', error);
      return res.status(500).json({ success: false, message: 'Imeshindikana kupata hali ya router', error: error.message });
    }
  }

  async addRouter(req, res) {
    try {
      const { router_id, router_name, host, user, password, port, location_id, ssid, model, serial_number } = req.body;
      if (!router_id || !router_name || !host || !user || !password) {
        return res.status(400).json({ success: false, message: 'Taarifa zote za msingi zinahitajika' });
      }
      await db.execute(
        `INSERT INTO mikrotiks (router_id, router_name, host, user, password, port, location_id, ssid, model, serial_number, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, "offline", NOW(), NOW())`,
        [router_id, router_name, host, user, password, port || 8728, location_id || null, ssid || null, model || null, serial_number || null]
      );
      return res.json({ success: true, message: 'Router imeongezwa kikamilifu' });
    } catch (error) {
      console.error('Hitilafu katika kuongeza router:', error);
      return res.status(500).json({ success: false, message: 'Imeshindikana kuongeza router', error: error.message });
    }
  }

  async updateRouter(req, res) {
    try {
      const { id } = req.params;
      const { router_name, host, user, password, port, location, ssid, status } = req.body;
      const [routers] = await db.execute('SELECT id FROM mikrotiks WHERE id = ?', [id]);
      if (routers.length === 0) {
        return res.status(404).json({ success: false, message: 'Router hakupatikana' });
      }
      await db.execute(
        'UPDATE mikrotiks SET router_name = ?, host = ?, user = ?, password = ?, port = ?, ssid = ?, status = ?, updated_at = NOW() WHERE id = ?',
        [router_name, host, user, password, port, ssid, status, id]
      );
      return res.json({ success: true, message: 'Router imebadilishwa kikamilifu' });
    } catch (error) {
      console.error('Hitilafu katika kubadilisha router:', error);
      return res.status(500).json({ success: false, message: 'Imeshindikana kubadilisha router', error: error.message });
    }
  }

  async getRouterSessions(req, res) {
    try {
      const { routerID } = req.params;
      const sessions = await mikrotikService.getHotspotUsers(routerID);
      return res.json({ success: true, data: sessions, count: sessions.length });
    } catch (error) {
      console.error('Hitilafu katika kupata sessions za router:', error);
      return res.status(500).json({ success: false, message: 'Imeshindikana kupata sessions', error: error.message });
    }
  }

  async rebootRouter(req, res) {
    try {
      const { routerID } = req.params;
      const result = await mikrotikService.rebootRouter(routerID);
      return res.json({
        success: result.success !== false,
        message: result.success !== false ? 'Router imeanzishwa upya' : 'Imeshindikana kuanzisha upya router'
      });
    } catch (error) {
      console.error('Hitilafu katika kuanzisha upya router:', error);
      return res.status(500).json({ success: false, message: 'Imeshindikana kuanzisha upya router', error: error.message });
    }
  }

  async getRouterById(req, res) {
    try {
      const { id } = req.params;
      const [routers] = await db.execute('SELECT * FROM mikrotiks WHERE id = ? OR router_id = ?', [id, id]);
      if (routers.length === 0) {
        return res.status(404).json({ success: false, message: 'Router hakupatikana' });
      }
      return res.json({ success: true, router: routers[0] });
    } catch (error) {
      console.error('Hitilafu katika kupata router:', error);
      return res.status(500).json({ success: false, message: 'Imeshindikana kupata router', error: error.message });
    }
  }

  async getAllRoutersStatus(req, res) {
    try {
      const [routers] = await db.execute('SELECT router_id, router_name FROM mikrotiks');
      const statusPromises = routers.map(async (router) => {
        try {
          const health = await mikrotikService.getRouterHealth(router.router_id);
          return {
            routerId: router.router_id,
            routerName: router.router_name,
            isOnline: health.status === 'online',
            activeUsers: health.connectedUsers || 0,
            cpu: health.cpu || 0,
            memory: health.memory || 0,
            uptime: health.uptime || 'N/A'
          };
        } catch (e) {
          return {
            routerId: router.router_id,
            routerName: router.router_name,
            isOnline: false,
            activeUsers: 0,
            cpu: 0,
            memory: 0,
            uptime: 'N/A'
          };
        }
      });
      const routers_status = await Promise.all(statusPromises);
      return res.json({ success: true, routers: routers_status });
    } catch (error) {
      console.error('Hitilafu katika kupata status za routers:', error);
      return res.status(500).json({ success: false, message: 'Imeshindikana kupata status', error: error.message });
    }
  }

  async getRouterLiveStatus(req, res) {
    try {
      const { routerID } = req.params;
      const status = await mikrotikService.getFullRouterStatus(routerID);
      return res.json({ success: true, status: status.status || status });
    } catch (error) {
      console.error('Hitilafu katika kupata status ya router:', error);
      return res.status(500).json({ success: false, message: 'Imeshindikana kupata status', error: error.message });
    }
  }

  async getRouterHotspotSessions(req, res) {
    try {
      const { routerID } = req.params;
      const result = await mikrotikService.getActiveHotspotSessions(routerID);
      return res.json({ success: true, sessions: result.sessions || [], count: result.count || 0 });
    } catch (error) {
      console.error('Hitilafu katika kupata hotspot sessions:', error);
      return res.status(500).json({ success: false, message: 'Imeshindikana kupata sessions', error: error.message });
    }
  }

  async getRouterHotspotUsers(req, res) {
    try {
      const { routerID } = req.params;
      const result = await mikrotikService.getHotspotUsersList(routerID);
      return res.json({ success: true, users: result.users || [] });
    } catch (error) {
      console.error('Hitilafu katika kupata hotspot users:', error);
      return res.status(500).json({ success: false, message: 'Imeshindikana kupata users', error: error.message });
    }
  }

  async kickHotspotUser(req, res) {
    try {
      const { routerID } = req.params;
      const { sessionId } = req.body;
      if (!sessionId) {
        return res.status(400).json({ success: false, message: 'Session ID inahitajika' });
      }
      const result = await mikrotikService.kickHotspotUser(routerID, sessionId);
      return res.json(result);
    } catch (error) {
      console.error('Hitilafu katika kumfukuza mtumiaji:', error);
      return res.status(500).json({ success: false, message: 'Imeshindikana kumfukuza mtumiaji', error: error.message });
    }
  }

  async getRouterBindings(req, res) {
    try {
      const { routerID } = req.params;
      const result = await mikrotikService.getIpBindings(routerID);
      return res.json({ success: true, bindings: result.bindings || [] });
    } catch (error) {
      console.error('Hitilafu katika kupata bindings:', error);
      return res.status(500).json({ success: false, message: 'Imeshindikana kupata bindings', error: error.message });
    }
  }

  async getRouterInterfaces(req, res) {
    try {
      const { routerID } = req.params;
      const result = await mikrotikService.getInterfaces(routerID);
      return res.json({ success: true, interfaces: result.interfaces || [] });
    } catch (error) {
      console.error('Hitilafu katika kupata interfaces:', error);
      return res.status(500).json({ success: false, message: 'Imeshindikana kupata interfaces', error: error.message });
    }
  }

  async getRouterLogs(req, res) {
    try {
      const { routerID } = req.params;
      const limit = parseInt(req.query.limit) || 50;
      const result = await mikrotikService.getSystemLogs(routerID, limit);
      return res.json({ success: true, logs: result.logs || [] });
    } catch (error) {
      console.error('Hitilafu katika kupata logs:', error);
      return res.status(500).json({ success: false, message: 'Imeshindikana kupata logs', error: error.message });
    }
  }

  async deleteRouter(req, res) {
    try {
      const { id } = req.params;
      const [result] = await db.execute('DELETE FROM mikrotiks WHERE id = ? OR router_id = ?', [id, id]);
      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, message: 'Router hakupatikana' });
      }
      return res.json({ success: true, message: 'Router imefutwa kikamilifu' });
    } catch (error) {
      console.error('Hitilafu katika kufuta router:', error);
      return res.status(500).json({ success: false, message: 'Imeshindikana kufuta router', error: error.message });
    }
  }

  // Get active users on a specific router with subscription details
  async getRouterActiveUsers(req, res) {
    try {
      const { routerID } = req.params;

      // Get router info with location and owner details
      const [routerInfo] = await db.execute(`
        SELECT m.*,
               l.name as location_name, l.city, l.region,
               fo.name as owner_name, fo.phone_number as owner_phone, fo.email as owner_email
        FROM mikrotiks m
        LEFT JOIN locations l ON m.location_id = l.id
        LEFT JOIN users fo ON l.franchise_owner_id = fo.id
        WHERE m.router_id = ?
      `, [routerID]);

      if (routerInfo.length === 0) {
        return res.status(404).json({ success: false, message: 'Router hakupatikana' });
      }

      // Get active users on this router
      const [activeUsers] = await db.execute(`
        SELECT
          u.id, u.name, u.phone_number, u.mac_address,
          u.package, u.usage_start, u.usage_until,
          u.free_bytes / (1024*1024) as free_mb,
          u.moneyspent,
          TIMESTAMPDIFF(SECOND, NOW(), u.usage_until) as seconds_remaining,
          CASE
            WHEN u.package IS NULL OR u.package = '' THEN 'ads'
            WHEN u.moneyspent > 0 THEN 'paid'
            ELSE 'ads'
          END as subscription_type,
          CASE
            WHEN u.usage_until <= NOW() THEN 0
            WHEN u.usage_start IS NULL THEN 0
            ELSE ROUND(
              (TIMESTAMPDIFF(SECOND, u.usage_start, NOW()) /
               TIMESTAMPDIFF(SECOND, u.usage_start, u.usage_until)) * 100
            )
          END as usage_progress_percent
        FROM users u
        WHERE u.last_router_id = ?
        AND u.usage_until > NOW()
        AND u.role = 'customer'
        ORDER BY u.usage_until ASC
      `, [routerID]);

      // Calculate summary stats
      const totalUsers = activeUsers.length;
      const paidUsers = activeUsers.filter(u => u.subscription_type === 'paid').length;
      const adsUsers = activeUsers.filter(u => u.subscription_type === 'ads').length;
      const totalRevenue = activeUsers.reduce((sum, u) => sum + (parseFloat(u.moneyspent) || 0), 0);

      return res.json({
        success: true,
        router: routerInfo[0],
        activeUsers,
        stats: {
          totalUsers,
          paidUsers,
          adsUsers,
          totalRevenue
        }
      });
    } catch (error) {
      console.error('Hitilafu katika kupata watumiaji wa router:', error);
      return res.status(500).json({ success: false, message: 'Imeshindikana kupata watumiaji', error: error.message });
    }
  }

  // Get detailed router info with owner and coverage area
  async getRouterDetails(req, res) {
    try {
      const { routerID } = req.params;

      const [router] = await db.execute(`
        SELECT m.*,
               l.name as location_name, l.city, l.region, l.address as location_address,
               l.latitude, l.longitude, l.location_type,
               fo.name as owner_name, fo.phone_number as owner_phone, fo.email as owner_email,
               (SELECT COUNT(*) FROM users WHERE last_router_id = m.router_id AND usage_until > NOW() AND role = 'customer') as active_users_count,
               (SELECT COUNT(*) FROM users WHERE last_router_id = m.router_id AND role = 'customer') as total_users_count,
               (SELECT COALESCE(SUM(moneyspent), 0) FROM users WHERE last_router_id = m.router_id AND role = 'customer') as total_revenue
        FROM mikrotiks m
        LEFT JOIN locations l ON m.location_id = l.id
        LEFT JOIN users fo ON l.franchise_owner_id = fo.id
        WHERE m.router_id = ?
      `, [routerID]);

      if (router.length === 0) {
        return res.status(404).json({ success: false, message: 'Router hakupatikana' });
      }

      return res.json({
        success: true,
        router: router[0]
      });
    } catch (error) {
      console.error('Hitilafu katika kupata taarifa za router:', error);
      return res.status(500).json({ success: false, message: 'Imeshindikana kupata taarifa', error: error.message });
    }
  }

  // ==================== SYSTEM SETTINGS METHODS ====================
  async getSystemSettings(req, res) {
    try {
      const [settings] = await db.execute('SELECT * FROM system_settings');
      return res.json({ success: true, data: settings, count: settings.length });
    } catch (error) {
      console.error('Hitilafu katika kupata mipangilio ya mfumo:', error);
      return res.status(500).json({ success: false, message: 'Imeshindikana kupata mipangilio', error: error.message });
    }
  }

  async updateSystemSettings(req, res) {
    try {
      const { settings } = req.body;
      if (!settings || Object.keys(settings).length === 0) {
        return res.status(400).json({ success: false, message: 'Hakuna mipangilio iliyowasilishwa' });
      }
      for (const [key, value] of Object.entries(settings)) {
        await db.execute(
          'UPDATE system_settings SET setting_value = ?, updated_at = NOW() WHERE setting_key = ?',
          [value, key]
        );
      }
      return res.json({ success: true, message: 'Mipangilio ya mfumo imesasishwa kikamilifu' });
    } catch (error) {
      console.error('Hitilafu katika kusasisha mipangilio:', error);
      return res.status(500).json({ success: false, message: 'Imeshindikana kusasisha mipangilio', error: error.message });
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
      return res.json({ success: true, data: notifications, count: notifications.length });
    } catch (error) {
      console.error('Hitilafu katika kupata arifa:', error);
      return res.status(500).json({ success: false, message: 'Imeshindikana kupata arifa', error: error.message });
    }
  }

  async markNotificationRead(req, res) {
    try {
      const { id } = req.params;
      const [notifications] = await db.execute('SELECT id FROM notifications WHERE id = ?', [id]);
      if (notifications.length === 0) {
        return res.status(404).json({ success: false, message: 'Arifa hakupatikana' });
      }
      await db.execute('UPDATE notifications SET is_read = 1 WHERE id = ?', [id]);
      return res.json({ success: true, message: 'Arifa imesomwa' });
    } catch (error) {
      console.error('Hitilafu katika kuweka arifa kama ilivyosomwa:', error);
      return res.status(500).json({ success: false, message: 'Imeshindikana kuweka arifa kama ilivyosomwa', error: error.message });
    }
  }

  // ==================== UTILITY METHODS ====================
  async getAdViewsData(req, res) {
    try {
      const { startDate, endDate, limit = 100 } = req.query;
      let query = `
        SELECT
          a.title, a.duration, av.watched_duration, av.created_at,
          u.name as user_name, u.location, av.data_earned
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
      query += ` ORDER BY av.created_at DESC LIMIT ${parseInt(limit)}`;
      const [views] = await db.execute(query, params);
      return res.json({ success: true, data: views, count: views.length });
    } catch (error) {
      console.error('Hitilafu katika kupata data ya maonyesho:', error);
      return res.status(500).json({ success: false, message: 'Imeshindikana kupata data ya maonyesho', error: error.message });
    }
  }

  async getSponsors(req, res) {
    try {
      const [sponsors] = await db.execute('SELECT id, name, email FROM users WHERE role = "sponsor"');
      return res.json({ success: true, data: sponsors, count: sponsors.length });
    } catch (error) {
      console.error('Hitilafu katika kupata wadhamini:', error);
      return res.status(500).json({ success: false, message: 'Imeshindikana kupata wadhamini', error: error.message });
    }
  }

  async setUnlimitedStatus(req, res) {
    try {
      const { user_id, is_unlimited } = req.body;
      const [users] = await db.execute('SELECT id, name FROM users WHERE id = ?', [user_id]);
      if (users.length === 0) {
        return res.status(404).json({ success: false, message: 'Mtumiaji hakupatikana' });
      }
      const now = new Date();
      if (is_unlimited) {
        await db.execute(
          `UPDATE users SET package = 'UNLIMITED', usage_start = ?,
           usage_until = '2030-12-31 23:59:59', updated_at = ? WHERE id = ?`,
          [now, now, user_id]
        );
        return res.json({ success: true, message: 'Mtumiaji amepewa ufikiaji usio na kikomo hadi 2030' });
      } else {
        await db.execute(
          `UPDATE users SET package = 'HAKUNA KIFURUSHI', usage_start = ?,
           usage_until = ?, updated_at = ? WHERE id = ?`,
          [now, now, now, user_id]
        );
        return res.json({ success: true, message: 'Ufikiaji usio na kikomo umeondolewa kwa mtumiaji' });
      }
    } catch (error) {
      console.error('Hitilafu katika kuweka hali ya ufikiaji usio na kikomo:', error);
      return res.status(500).json({ success: false, message: 'Imeshindikana kuweka hali ya mtumiaji', error: error.message });
    }
  }

  async deleteUser(req, res) {
    try {
      const { id } = req.params;
      const [result] = await db.execute('DELETE FROM users WHERE id = ?', [id]);
      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, message: 'Mtumiaji hakupatikana' });
      }
      return res.json({ success: true, message: 'Mtumiaji amefutwa kikamilifu', deletedId: id });
    } catch (error) {
      console.error('Hitilafu katika kufuta mtumiaji:', error);
      return res.status(500).json({ success: false, message: 'Imeshindikana kufuta mtumiaji', error: error.message });
    }
  }

  async getUserStats(req, res) {
    try {
      const [totalUsers] = await db.execute('SELECT COUNT(*) as count FROM users WHERE role = "customer"');
      const [activeUsers] = await db.execute('SELECT COUNT(*) as count FROM users WHERE usage_until > NOW() AND role = "customer"');
      const [newUsersToday] = await db.execute('SELECT COUNT(*) as count FROM users WHERE DATE(created_at) = CURDATE() AND role = "customer"');
      const [totalRevenue] = await db.execute('SELECT COALESCE(SUM(moneyspent), 0) as total FROM users WHERE role = "customer"');
      return res.json({
        success: true,
        data: {
          totalUsers: totalUsers[0].count || 0,
          activeUsers: activeUsers[0].count || 0,
          newUsersToday: newUsersToday[0].count || 0,
          totalRevenue: parseFloat(totalRevenue[0].total) || 0
        }
      });
    } catch (error) {
      console.error('Hitilafu katika takwimu za watumiaji:', error);
      return res.status(500).json({ success: false, message: 'Imeshindikana kupata takwimu za watumiaji', error: error.message });
    }
  }

  // ==================== RENDER PAGE METHODS ====================
  async renderVideoAdsPage(req, res) {
    try {
      return res.render('admin/video-ads', {
        title: 'Matangazo ya Video',
        activePage: 'video-ads',
        userName: req.session.admin_user?.name || 'Admin'
      });
    } catch (error) {
      console.error('Hitilafu katika video ads page:', error);
      return res.render('admin/video-ads', {
        title: 'Matangazo ya Video',
        activePage: 'video-ads',
        userName: req.session.admin_user?.name || 'Admin',
        error: 'Imeshindikana kupakia ukurasa'
      });
    }
  }

  async renderVouchersPage(req, res) {
    try {
      return res.render('admin/vouchers', {
        title: 'Usimamizi wa Vouchers',
        activePage: 'vouchers',
        userName: req.session.admin_user?.name || 'Admin'
      });
    } catch (error) {
      console.error('Hitilafu katika vouchers page:', error);
      return res.render('admin/vouchers', {
        title: 'Usimamizi wa Vouchers',
        activePage: 'vouchers',
        userName: req.session.admin_user?.name || 'Admin',
        error: 'Imeshindikana kupakia ukurasa'
      });
    }
  }

  async renderUsersPage(req, res) {
    try {
      return res.render('admin/users', {
        title: 'Usimamizi wa Watumiaji',
        activePage: 'users',
        userName: req.session.admin_user?.name || 'Admin'
      });
    } catch (error) {
      console.error('Hitilafu katika users page:', error);
      return res.render('admin/users', {
        title: 'Usimamizi wa Watumiaji',
        activePage: 'users',
        userName: req.session.admin_user?.name || 'Admin',
        error: 'Imeshindikana kupakia ukurasa'
      });
    }
  }

  async renderReportsPage(req, res) {
    try {
      return res.render('admin/reports', {
        title: 'Ripoti za Mfumo',
        activePage: 'reports',
        userName: req.session.admin_user?.name || 'Admin'
      });
    } catch (error) {
      console.error('Hitilafu katika reports page:', error);
      return res.render('admin/reports', {
        title: 'Ripoti za Mfumo',
        activePage: 'reports',
        userName: req.session.admin_user?.name || 'Admin',
        error: 'Imeshindikana kupakia ukurasa'
      });
    }
  }

  async renderSettingsPage(req, res) {
    try {
      return res.render('admin/settings', {
        title: 'Mipangilio ya Mfumo',
        activePage: 'settings',
        userName: req.session.admin_user?.name || 'Admin'
      });
    } catch (error) {
      console.error('Hitilafu katika settings page:', error);
      return res.render('admin/settings', {
        title: 'Mipangilio ya Mfumo',
        activePage: 'settings',
        userName: req.session.admin_user?.name || 'Admin',
        error: 'Imeshindikana kupakia ukurasa'
      });
    }
  }

  async renderMyAdsPage(req, res) {
    try {
      const [ads] = await db.execute(`
        SELECT a.*,
               COUNT(av.id) as views_count,
               COALESCE(SUM(av.data_earned), 0) as total_data_earned
        FROM ads a
        LEFT JOIN ad_views av ON a.id = av.ad_id
        WHERE a.sponsor_id = ?
        GROUP BY a.id
        ORDER BY a.created_at DESC
      `, [req.session.admin_user.id]);

      return res.render('admin/my-ads', {
        title: 'Matangazo Yangu',
        activePage: 'my-ads',
        userName: req.session.admin_user?.name || 'Admin',
        myAdsList: ads || []
      });
    } catch (error) {
      console.error('Hitilafu katika render my-ads:', error);
      return res.render('admin/my-ads', {
        title: 'Matangazo Yangu',
        activePage: 'my-ads',
        userName: req.session.admin_user?.name || 'Admin',
        myAdsList: [],
        error: 'Imeshindikana kupakia matangazo yako'
      });
    }
  }

  async getMyAdsAPI(req, res) {
    try {
      const [ads] = await db.execute(`
        SELECT a.*,
               COUNT(av.id) as views_count,
               COALESCE(SUM(av.data_earned), 0) as total_data_earned
        FROM ads a
        LEFT JOIN ad_views av ON a.id = av.ad_id
        WHERE a.sponsor_id = ?
        GROUP BY a.id
        ORDER BY a.created_at DESC
      `, [req.session.admin_user.id]);

      return res.json({
        success: true,
        data: ads || [],
        count: ads.length
      });
    } catch (error) {
      console.error('Hitilafu katika API my-ads:', error);
      return res.status(500).json({
        success: false,
        message: 'Imeshindikana kupakia matangazo',
        error: error.message
      });
    }
  }

  // Get recent activity for reports page
  async getRecentActivity(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 20;

      // Get different types of activities and combine them
      const activities = [];

      // 1. Recent user registrations
      const [users] = await db.execute(`
        SELECT id, name, phone_number, role, created_at
        FROM users
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        ORDER BY created_at DESC
        LIMIT ${limit}
      `);

      users.forEach(user => {
        activities.push({
          created_at: user.created_at,
          description: 'Mtumiaji mpya amejiunga',
          user_name: user.name || user.phone_number,
          status_text: user.role === 'sponsor' ? 'Sponsor' : user.role === 'agent' ? 'Agent' : 'Customer',
          status_class: user.role === 'sponsor' ? 'bg-purple-100 text-purple-800' :
                       user.role === 'agent' ? 'bg-blue-100 text-blue-800' :
                       'bg-green-100 text-green-800'
        });
      });

      // 2. Recent ad views
      const [adViews] = await db.execute(`
        SELECT av.created_at, u.name, u.phone_number, a.title
        FROM ad_views av
        JOIN users u ON av.user_id = u.id
        JOIN ads a ON av.ad_id = a.id
        WHERE av.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        ORDER BY av.created_at DESC
        LIMIT ${limit}
      `);

      adViews.forEach(view => {
        activities.push({
          created_at: view.created_at,
          description: `Ameangalia tangazo: ${view.title}`,
          user_name: view.name || view.phone_number,
          status_text: 'Ad View',
          status_class: 'bg-yellow-100 text-yellow-800'
        });
      });

      // 3. Recent payments
      const [payments] = await db.execute(`
        SELECT p.created_at, u.name, u.phone_number, p.amount, p.status
        FROM payments p
        JOIN users u ON p.user_id = u.id
        WHERE p.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        ORDER BY p.created_at DESC
        LIMIT ${limit}
      `);

      payments.forEach(payment => {
        activities.push({
          created_at: payment.created_at,
          description: `Malipo: TZS ${payment.amount.toLocaleString()}`,
          user_name: payment.name || payment.phone_number,
          status_text: payment.status === 'completed' ? 'Imekamilika' : payment.status === 'pending' ? 'Inasubiri' : 'Imefeli',
          status_class: payment.status === 'completed' ? 'bg-green-100 text-green-800' :
                       payment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                       'bg-red-100 text-red-800'
        });
      });

      // Sort all activities by date and limit
      activities.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      const limitedActivities = activities.slice(0, limit);

      return res.json({
        success: true,
        activities: limitedActivities,
        count: limitedActivities.length
      });
    } catch (error) {
      console.error('Hitilafu katika kupakia shughuli:', error);
      return res.status(500).json({
        success: false,
        message: 'Imeshindikana kupakia shughuli',
        error: error.message
      });
    }
  }

  // Download report
  async downloadReport(req, res) {
    try {
      const { format, startDate, endDate, reportType } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: 'Tarehe za kuanzia na mwisho zinahitajika'
        });
      }

      // Get data based on report type
      let data = [];
      let headers = [];

      if (reportType === 'all' || reportType === 'users') {
        const [users] = await db.execute(`
          SELECT id, name, phone, email, role, created_at, free_bytes
          FROM users
          WHERE created_at BETWEEN ? AND ?
          ORDER BY created_at DESC
        `, [startDate, endDate]);

        if (reportType === 'users') {
          data = users;
          headers = ['ID', 'Jina', 'Simu', 'Email', 'Role', 'Tarehe', 'Data (MB)'];
        }
      }

      if (reportType === 'all' || reportType === 'ads') {
        const [ads] = await db.execute(`
          SELECT a.id, a.title, a.duration, a.reward_bytes,
                 COUNT(av.id) as views, a.created_at
          FROM ads a
          LEFT JOIN ad_views av ON a.id = av.ad_id
          WHERE a.created_at BETWEEN ? AND ?
          GROUP BY a.id
          ORDER BY a.created_at DESC
        `, [startDate, endDate]);

        if (reportType === 'ads') {
          data = ads;
          headers = ['ID', 'Jina', 'Muda (sec)', 'Zawadi (bytes)', 'Views', 'Tarehe'];
        }
      }

      if (reportType === 'all' || reportType === 'revenue') {
        const [payments] = await db.execute(`
          SELECT p.id, u.name, p.amount, p.payment_method, p.status, p.created_at
          FROM payments p
          JOIN users u ON p.user_id = u.id
          WHERE p.created_at BETWEEN ? AND ?
          ORDER BY p.created_at DESC
        `, [startDate, endDate]);

        if (reportType === 'revenue') {
          data = payments;
          headers = ['ID', 'Mtumiaji', 'Kiasi', 'Njia', 'Hali', 'Tarehe'];
        }
      }

      if (reportType === 'all' || reportType === 'campaigns') {
        const [campaigns] = await db.execute(`
          SELECT c.id, c.name, c.type, c.budget, c.data_reward, c.status, c.created_at
          FROM campaigns c
          WHERE c.created_at BETWEEN ? AND ?
          ORDER BY c.created_at DESC
        `, [startDate, endDate]);

        if (reportType === 'campaigns') {
          data = campaigns;
          headers = ['ID', 'Jina', 'Aina', 'Bajeti', 'Zawadi', 'Hali', 'Tarehe'];
        }
      }

      // Generate report based on format
      if (format === 'csv') {
        // Generate CSV
        let csv = headers.join(',') + '\n';
        data.forEach(row => {
          const values = Object.values(row).map(val => {
            if (val === null || val === undefined) return '';
           return `"${String(val).replace(/"/g, '""')}"`;
          });
          csv += values.join(',') + '\n';
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=hotbando_ripoti_${reportType}_${startDate}_to_${endDate}.csv`);
        return res.send(csv);

      } else if (format === 'excel') {
        // Simple TSV format (can be opened in Excel)
        let tsv = headers.join('\t') + '\n';
        data.forEach(row => {
          const values = Object.values(row).map(val => val === null || val === undefined ? '' : String(val));
          tsv += values.join('\t') + '\n';
        });

        res.setHeader('Content-Type', 'application/vnd.ms-excel');
        res.setHeader('Content-Disposition', `attachment; filename=hotbando_ripoti_${reportType}_${startDate}_to_${endDate}.xls`);
        return res.send(tsv);

      } else if (format === 'pdf') {
        // Simple HTML that can be saved as PDF
        let html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>HotBando Ripoti</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    h1 { color: #FF7A30; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th { background: #FF7A30; color: white; padding: 10px; text-align: left; }
    td { border: 1px solid #ddd; padding: 8px; }
    tr:nth-child(even) { background-color: #f9f9f9; }
  </style>
</head>
<body>
  <h1>HotBando Ripoti - ${reportType.toUpperCase()}</h1>
  <p><strong>Kipindi:</strong> ${startDate} hadi ${endDate}</p>
  <p><strong>Tarehe ya Uchapisho:</strong> ${new Date().toLocaleDateString('sw-TZ')}</p>
  <table>
    <thead>
      <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
    </thead>
    <tbody>
      ${data.map(row => `<tr>${Object.values(row).map(val => `<td>${val === null || val === undefined ? '' : val}</td>`).join('')}</tr>`).join('')}
    </tbody>
  </table>
  <script>window.print();</script>
</body>
</html>`;

        res.setHeader('Content-Type', 'text/html');
        return res.send(html);
      }

      return res.status(400).json({
        success: false,
        message: 'Format si sahihi'
      });

    } catch (error) {
      console.error('Hitilafu katika kupakua ripoti:', error);
      return res.status(500).json({
        success: false,
        message: 'Imeshindikana kupakua ripoti',
        error: error.message
      });
    }
  }

  // ==================== WIREGUARD METHODS ====================

  /**
   * Get all WireGuard peers (routers with WireGuard configured)
   */
  async getWireGuardPeers(req, res) {
    try {
      const wireguardService = require('../utils/wireguard');
      const result = await wireguardService.getWireGuardPeers();
      return res.json(result);
    } catch (error) {
      console.error('Error getting WireGuard peers:', error);
      return res.status(500).json({
        success: false,
        message: 'Imeshindwa kupata WireGuard peers',
        error: error.message
      });
    }
  }

  /**
   * Generate WireGuard server config
   */
  async getWireGuardServerConfig(req, res) {
    try {
      const wireguardService = require('../utils/wireguard');
      const peersResult = await wireguardService.getWireGuardPeers();
      const config = wireguardService.generateServerConfig(peersResult.peers || []);

      return res.json({
        success: true,
        config,
        serverInfo: {
          publicIp: wireguardService.vpsConfig.publicIp,
          port: wireguardService.vpsConfig.listenPort,
          network: wireguardService.vpsConfig.networkCidr
        }
      });
    } catch (error) {
      console.error('Error generating server config:', error);
      return res.status(500).json({
        success: false,
        message: 'Imeshindwa kutengeneza server config',
        error: error.message
      });
    }
  }

  /**
   * Generate WireGuard configuration for a router
   */
  async generateWireGuardConfig(req, res) {
    try {
      const { routerID } = req.params;
      const wireguardService = require('../utils/wireguard');

      const result = await wireguardService.generateRouterConfig(routerID);

      if (result.success) {
        return res.json(result);
      } else {
        return res.status(400).json(result);
      }
    } catch (error) {
      console.error('Error generating WireGuard config:', error);
      return res.status(500).json({
        success: false,
        message: 'Imeshindwa kutengeneza WireGuard config',
        error: error.message
      });
    }
  }

  /**
   * Get VPS setup guide
   */
  async getVpsSetupGuide(req, res) {
    try {
      const wireguardService = require('../utils/wireguard');
      const guide = wireguardService.getVpsSetupGuide();

      return res.json({
        success: true,
        guide
      });
    } catch (error) {
      console.error('Error getting VPS guide:', error);
      return res.status(500).json({
        success: false,
        message: 'Imeshindwa kupata VPS guide',
        error: error.message
      });
    }
  }
}

// ==================== EXPORT INSTANCE ====================
const adminController = new AdminController();
module.exports = adminController;