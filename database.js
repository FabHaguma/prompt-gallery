const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'snippets.db');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database ' + dbPath + ': ' + err.message);
    } else {
        console.log('Connected to the SQLite database.');
        initDb();
    }
});

function initDb() {
    db.run(`CREATE TABLE IF NOT EXISTS snippets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        category TEXT,
        tags TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_copied DATETIME
    )`, (err) => {
        if (err) {
            console.error('Error creating table:', err.message);
        } else {
            console.log(' snippets table initialized.');
            
            // Migration: Check if 'pinned' column exists, if not add it
            db.all("PRAGMA table_info(snippets)", (err, columns) => {
                if (!err) {
                   const hasPinned = columns.some(col => col.name === 'pinned');
                   if (!hasPinned) {
                       db.run("ALTER TABLE snippets ADD COLUMN pinned INTEGER DEFAULT 0", (err) => {
                           if (err) console.error("Error adding pinned column:", err);
                           else console.log("Added pinned column to snippets");
                       });
                   }
                }
            });

            // Seed some data if empty
            db.get("SELECT count(*) as count FROM snippets", (err, row) => {
                if (row.count === 0) {
                    insertSeedData();
                }
            });
        }
    });
}

function insertSeedData() {
    const seeds = [
        {
            title: "Production API Key",
            content: `{"key": "sk-production-2025", "exp": "2025-12-31"}`,
            category: "Work",
            tags: "api-key react-hooks production"
        },
        {
            title: "Daily Standup Template",
            content: `*Yesterday: ... \n*Today: ... \nBlocked: ...`,
            category: "Work",
            tags: "email-templates"
        },
        {
            title: "React useEffect Hook",
            content: `useEffect(() => {
  // effect
  return () => {
    // cleanup
  };
}, [input]);`,
            category: "Dev",
            tags: "react-hooks"
        },
         {
            title: "Project Alpha Figma Link",
            content: `https://figma.com/project-alpha-design-specs`,
            category: "Dev",
            tags: "urls"
        }
    ];

    const stmt = db.prepare("INSERT INTO snippets (title, content, category, tags, created_at) VALUES (?, ?, ?, ?, datetime('now'))");
    seeds.forEach(seed => {
        stmt.run(seed.title, seed.content, seed.category, seed.tags);
    });
    stmt.finalize();
    console.log("Seed data inserted");
}

module.exports = db;
