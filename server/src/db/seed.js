import db from './database.js';

const sampleActivities = [
  {
    timestamp: new Date(Date.now() - 45 * 60000).toISOString(),
    website: 'github.com/facebook/react',
    domain: 'github.com',
    activity: 'Inspecting React Fiber Architecture source code',
    category: 'Coding',
    confidence: 0.98,
    summary: 'Developer is reading open-source code and reviewing pull requests on GitHub.',
    sensitive_content: 0,
    productivity_score: 1
  },
  {
    timestamp: new Date(Date.now() - 35 * 60000).toISOString(),
    website: 'chatgpt.com',
    domain: 'chatgpt.com',
    activity: 'Querying AI for SQL Index Optimization advice',
    category: 'Learning',
    confidence: 0.95,
    summary: 'Prompting LLM for performance recommendations on SQLite WAL mode.',
    sensitive_content: 0,
    productivity_score: 1
  },
  {
    timestamp: new Date(Date.now() - 25 * 60000).toISOString(),
    website: 'youtube.com/watch?v=demo',
    domain: 'youtube.com',
    activity: 'Watching Visual AI Agent Chrome Extension Architecture Tutorial',
    category: 'Learning',
    confidence: 0.92,
    summary: 'Watching technical tutorial on Chrome Extension Manifest V3 background workers.',
    sensitive_content: 0,
    productivity_score: 1
  },
  {
    timestamp: new Date(Date.now() - 15 * 60000).toISOString(),
    website: 'twitter.com/home',
    domain: 'twitter.com',
    activity: 'Scrolling tech Twitter feed',
    category: 'Distractions',
    confidence: 0.89,
    summary: 'Browsing social media feed for AI news.',
    sensitive_content: 0,
    productivity_score: -1
  },
  {
    timestamp: new Date(Date.now() - 5 * 60000).toISOString(),
    website: 'localhost:5000/dashboard',
    domain: 'localhost',
    activity: 'Testing VisionPulse Personal Productivity Timeline Dashboard',
    category: 'Coding',
    confidence: 0.99,
    summary: 'Reviewing active session metrics and analytics dashboard UI.',
    sensitive_content: 0,
    productivity_score: 1
  }
];

export function seedDatabase() {
  console.log('Seeding initial demonstration database activities...');
  const stmt = db.prepare(`
    INSERT INTO activities (
      timestamp, website, domain, activity, category, confidence,
      summary, sensitive_content, productivity_score, image_url
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const act of sampleActivities) {
    stmt.run(
      act.timestamp,
      act.website,
      act.domain,
      act.activity,
      act.category,
      act.confidence,
      act.summary,
      act.sensitive_content,
      act.productivity_score,
      null
    );
  }
  console.log(`Successfully seeded ${sampleActivities.length} demonstration activities.`);
}

if (process.argv[1]?.includes('seed.js')) {
  seedDatabase();
}
