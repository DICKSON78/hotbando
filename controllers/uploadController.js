// controllers/uploadController.js - SASHA URIASISHI KAMILI
const db = require('../config/database');
const path = require('path');
const fs = require('fs');

class UploadController {
    async uploadVideo(req, res) {
        try {
            console.log('📤 Kupakia video mpya...');
            
            // Hakikisha kuna video iliyopakiwa
            if (!req.files || !req.files.video) {
                return res.status(400).json({
                    success: false,
                    message: 'Tafadhali chagua faili ya video'
                });
            }

            const videoFile = req.files.video;
            const { title, description, sponsor_id, duration, reward_bytes, is_active } = req.body;

            // Hakikisha data zote muhimu zipo
            if (!title || !description || !sponsor_id) {
                return res.status(400).json({
                    success: false,
                    message: 'Jina, maelezo na mdhamini vinahitajika'
                });
            }

            // Hakikisha faili ni video
            const allowedMimeTypes = ['video/mp4', 'video/mkv', 'video/avi', 'video/mov', 'video/wmv'];
            if (!allowedMimeTypes.includes(videoFile.mimetype)) {
                return res.status(400).json({
                    success: false,
                    message: 'Tafadhali chagua faili ya video sahihi (MP4, MKV, AVI, MOV, WMV)'
                });
            }

            // Hakikisha faili si kubwa sana (max 100MB)
            const maxSize = 100 * 1024 * 1024; // 100MB
            if (videoFile.size > maxSize) {
                return res.status(400).json({
                    success: false,
                    message: 'Faili ni kubwa sana. Ukubwa upewa ni 100MB pekee'
                });
            }

            // Unda jina la kipekee la faili
            const fileExtension = path.extname(videoFile.name);
            const fileName = `ad_${Date.now()}${fileExtension}`;
            const uploadPath = path.join(__dirname, '../public/uploads/videos', fileName);

            // Hakikisha folda la upload lipo
            const uploadDir = path.dirname(uploadPath);
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }

            // Hifadhi faili ya video
            await videoFile.mv(uploadPath);

            // Tengeneza URL ya video
            const videoUrl = `/uploads/videos/${fileName}`;

            // Hifadhi rekodi kwenye database
            const [result] = await db.execute(
                `INSERT INTO ads 
                (title, description, image_url, video_url, duration, reward_bytes, sponsor_id, approved, is_active, created_at, updated_at) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
                [
                    title,
                    description,
                    '/images/default-ad-thumbnail.jpg', // Thumbnail default
                    videoUrl,
                    duration || 30,
                    reward_bytes || 10485760, // 10MB default
                    sponsor_id,
                    1, // Auto-approve for admin/sponsor
                    is_active ? 1 : 1
                ]
            );

            console.log('✅ Video imepakiwa kikamilifu:', {
                title: title,
                videoUrl: videoUrl,
                adId: result.insertId
            });

            res.json({
                success: true,
                message: 'Video imepakiwa kikamilifu na imeongezwa kwenye matangazo',
                data: {
                    id: result.insertId,
                    title: title,
                    video_url: videoUrl
                }
            });

        } catch (error) {
            console.error('❌ Hitilafu wakati wa kupakia video:', error);
            res.status(500).json({
                success: false,
                message: 'Imeshindikana kupakia video',
                error: error.message
            });
        }
    }

    // Method ya kupata matangazo yote ya video
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

            res.json({
                success: true,
                data: ads,
                count: ads.length
            });

        } catch (error) {
            console.error('❌ Hitilafu wakati wa kupata matangazo ya video:', error);
            res.status(500).json({
                success: false,
                message: 'Imeshindikana kupata matangazo',
                error: error.message
            });
        }
    }
}

module.exports = new UploadController();