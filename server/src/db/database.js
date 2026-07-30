import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'visionpulse.json');

// Initialize persistent JSON store if not present
if (!fs.existsSync(dbPath)) {
  fs.writeFileSync(dbPath, JSON.stringify({ activities: [] }, null, 2), 'utf-8');
}

/**
 * Pure JS Persistent Database Store providing SQLite-like query interface
 */
class JSONDatabase {
  constructor(filePath) {
    this.filePath = filePath;
    this.data = this.read();
  }

  read() {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (err) {
      console.error('Error reading JSON DB:', err.message);
    }
    return { activities: [] };
  }

  write() {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error writing JSON DB:', err.message);
    }
  }

  prepare(sql) {
    const db = this;

    return {
      run(...params) {
        db.data = db.read();
        
        if (sql.includes('INSERT INTO activities')) {
          const [timestamp, website, domain, activity, category, confidence, summary, sensitive_content, productivity_score, image_url, raw_metadata] = params;
          const id = db.data.activities.length > 0 ? Math.max(...db.data.activities.map(a => a.id || 0)) + 1 : 1;
          
          const record = {
            id,
            timestamp: timestamp || new Date().toISOString(),
            website,
            domain,
            activity,
            category,
            confidence: Number(confidence) || 0.9,
            summary: summary || '',
            sensitive_content: Number(sensitive_content) || 0,
            productivity_score: Number(productivity_score) || 0,
            image_url: image_url || null,
            raw_metadata: raw_metadata || null,
            created_at: new Date().toISOString()
          };
          
          db.data.activities.push(record);
          db.write();
          return { lastInsertRowid: id, changes: 1 };
        }

        if (sql.includes('DELETE FROM activities')) {
          db.data.activities = [];
          db.write();
          return { changes: 1 };
        }

        return { changes: 0 };
      },

      all(...params) {
        db.data = db.read();
        let list = [...db.data.activities];

        if (sql.includes('GROUP BY category')) {
          const map = {};
          for (const item of list) {
            const cat = item.category || 'Other';
            if (!map[cat]) map[cat] = { category: cat, count: 0, category_score: 0 };
            map[cat].count += 1;
            map[cat].category_score += (item.productivity_score || 0);
          }
          return Object.values(map);
        }

        if (sql.includes('GROUP BY domain')) {
          const map = {};
          for (const item of list) {
            const dom = item.domain || 'unknown';
            if (!map[dom]) map[dom] = { domain: dom, count: 0, category: item.category };
            map[dom].count += 1;
          }
          let arr = Object.values(map).sort((a, b) => b.count - a.count);
          if (sql.includes('LIMIT 5')) arr = arr.slice(0, 5);
          return arr;
        }

        // Filters
        if (params.length > 0) {
          if (sql.includes('category = ?')) {
            const catParam = params.shift();
            list = list.filter(a => a.category === catParam);
          }
          if (sql.includes('domain LIKE ?')) {
            const domParam = params.shift().replace(/%/g, '');
            list = list.filter(a => a.domain && a.domain.includes(domParam));
          }
          if (sql.includes('activity LIKE ?')) {
            const searchParam = params.shift().replace(/%/g, '').toLowerCase();
            params.shift(); // skip duplicate params for summary & website
            params.shift();
            list = list.filter(a => 
              (a.activity && a.activity.toLowerCase().includes(searchParam)) ||
              (a.summary && a.summary.toLowerCase().includes(searchParam)) ||
              (a.website && a.website.toLowerCase().includes(searchParam))
            );
          }
        }

        // Sorting
        list.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        // Pagination
        if (sql.includes('LIMIT ? OFFSET ?')) {
          const offset = Number(params.pop());
          const limit = Number(params.pop());
          return list.slice(offset, offset + limit);
        }

        if (sql.includes('LIMIT 30')) {
          return list.slice(0, 30);
        }

        return list;
      },

      get(...params) {
        db.data = db.read();
        if (sql.includes('COUNT(*) as total') || sql.includes('COUNT(*) as count')) {
          return { total: db.data.activities.length, count: db.data.activities.length };
        }
        if (sql.includes('SUM(productivity_score) as sum')) {
          const sum = db.data.activities.reduce((acc, curr) => acc + (curr.productivity_score || 0), 0);
          return { sum };
        }
        return null;
      }
    };
  }
}

const db = new JSONDatabase(dbPath);
console.log('Persistent JSON Database engine initialized at:', dbPath);

export default db;
