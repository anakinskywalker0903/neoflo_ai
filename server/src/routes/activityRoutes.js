import express from 'express';
import db from '../db/database.js';
import { analyzeScreenshot } from '../services/visionService.js';
import { processPrivacySafety, isDomainSensitive } from '../services/privacyService.js';
import { GoogleGenerativeAI } from '@google/generative-ai';

const router = express.Router();
const apiKey = process.env.GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

/**
 * POST /api/activity/analyze
 * Analyzes screenshot payload from extension and saves structured record
 */
router.post('/activity/analyze', async (req, res) => {
  try {
    const { image, pageUrl = '', pageTitle = '', timestamp = new Date().toISOString() } = req.body;

    if (isDomainSensitive(pageUrl)) {
      return res.status(200).json({
        skipped: true,
        reason: 'Domain flagged as sensitive for privacy protection',
        website: pageUrl
      });
    }

    // 1. Run Vision AI / Context analysis
    const rawAnalysis = await analyzeScreenshot(image, { pageUrl, pageTitle });

    // 2. Apply privacy sanitization
    const sanitizedRecord = processPrivacySafety({
      ...rawAnalysis,
      timestamp,
      image_url: req.body.storeImage ? image : null
    });

    // 3. Save to database
    const stmt = db.prepare(`
      INSERT INTO activities (
        timestamp, website, domain, activity, category, confidence,
        summary, sensitive_content, productivity_score, image_url, raw_metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      sanitizedRecord.timestamp,
      sanitizedRecord.website,
      sanitizedRecord.domain,
      sanitizedRecord.activity,
      sanitizedRecord.category,
      sanitizedRecord.confidence,
      sanitizedRecord.summary,
      sanitizedRecord.sensitive_content,
      sanitizedRecord.productivity_score,
      sanitizedRecord.image_url,
      JSON.stringify({ pageTitle, pageUrl })
    );

    const savedRecord = {
      id: result.lastInsertRowid,
      ...sanitizedRecord
    };

    res.status(201).json({
      success: true,
      activity: savedRecord
    });
  } catch (error) {
    console.error('[API Error /activity/analyze]:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/activity
 * Direct insert endpoint
 */
router.post('/activity', (req, res) => {
  try {
    const activity = processPrivacySafety(req.body);
    const stmt = db.prepare(`
      INSERT INTO activities (
        timestamp, website, domain, activity, category, confidence,
        summary, sensitive_content, productivity_score, image_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      activity.timestamp || new Date().toISOString(),
      activity.website || 'unknown',
      activity.domain || 'unknown',
      activity.activity || 'Browser Activity',
      activity.category || 'Other',
      activity.confidence || 0.9,
      activity.summary || '',
      activity.sensitive_content || 0,
      activity.productivity_score || 0,
      activity.image_url || null
    );

    res.status(201).json({ success: true, id: result.lastInsertRowid });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/activities
 * Query timeline activities with filtering & pagination
 */
router.get('/activities', (req, res) => {
  try {
    const { limit = 50, offset = 0, category, search, domain } = req.query;

    let query = 'SELECT * FROM activities WHERE 1=1';
    const params = [];

    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }

    if (domain) {
      query += ' AND domain LIKE ?';
      params.push(`%${domain}%`);
    }

    if (search) {
      query += ' AND (activity LIKE ? OR summary LIKE ? OR website LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY timestamp DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), Number(offset));

    const activities = db.prepare(query).all(...params);
    const countQuery = db.prepare('SELECT COUNT(*) as total FROM activities').get();

    res.json({
      success: true,
      total: countQuery.total,
      activities
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/stats
 * Aggregate productivity metrics and category distribution
 */
router.get('/stats', (req, res) => {
  try {
    const categoryStats = db.prepare(`
      SELECT category, COUNT(*) as count, SUM(productivity_score) as category_score
      FROM activities
      GROUP BY category
    `).all();

    const topDomains = db.prepare(`
      SELECT domain, COUNT(*) as count, category
      FROM activities
      GROUP BY domain
      ORDER BY count DESC
      LIMIT 5
    `).all();

    const totalCount = db.prepare('SELECT COUNT(*) as count FROM activities').get().count;
    const productivitySum = db.prepare('SELECT SUM(productivity_score) as sum FROM activities').get().sum || 0;

    let productivityScore = 75; // baseline neutral/good
    if (totalCount > 0) {
      const avg = productivitySum / totalCount; // range [-1, 1]
      productivityScore = Math.round(50 + avg * 50); // normalize to [0, 100]
    }

    res.json({
      success: true,
      totalActivities: totalCount,
      productivityScore,
      categories: categoryStats,
      topDomains
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/summary/daily
 * AI-generated daily productivity summary
 */
router.get('/summary/daily', async (req, res) => {
  try {
    const recentActivities = db.prepare(`
      SELECT website, domain, activity, category, summary, timestamp
      FROM activities
      ORDER BY timestamp DESC
      LIMIT 30
    `).all();

    if (recentActivities.length === 0) {
      return res.json({
        success: true,
        summary: "No activity recorded yet today. Start browsing with the VisionPulse extension active!"
      });
    }

    const activityListText = recentActivities
      .map(a => `- [${new Date(a.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}] ${a.category}: ${a.activity} on ${a.domain}`)
      .join('\n');

    if (genAI && apiKey) {
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const prompt = `
You are an executive AI assistant summarizing a user's work session based on browser activity logs:

Activity Log:
${activityListText}

Write a clear, encouraging, structured 3-bullet point executive summary titled "What I Worked On Today".
Break down key focus areas (e.g. Coding, Research, Collaboration, Distractions) and provide actionable productivity insights.
Keep it professional, engaging, and concise.
      `;
      const result = await model.generateContent(prompt);
      return res.json({
        success: true,
        summary: result.response.text()
      });
    }

    // Heuristic Summary if AI key is missing
    const codingCount = recentActivities.filter(a => a.category === 'Coding').length;
    const learningCount = recentActivities.filter(a => a.category === 'Learning').length;
    const distractionCount = recentActivities.filter(a => a.category === 'Distractions').length;

    const fallbackSummary = `### What I Worked On Today 🚀\n\n` +
      `- **Coding & Development**: Spent significant focus on ${codingCount} engineering activities.\n` +
      `- **Learning & AI Research**: Conducted ${learningCount} research/knowledge sessions.\n` +
      `- **Focus & Balance**: Recorded ${distractionCount} recreational breaks. Overall focus remains high.`;

    res.json({
      success: true,
      summary: fallbackSummary
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/activities
 * Clear activity history (privacy compliance)
 */
router.delete('/activities', (req, res) => {
  try {
    db.prepare('DELETE FROM activities').run();
    res.json({ success: true, message: 'All activity records cleared successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
