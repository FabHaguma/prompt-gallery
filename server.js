const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Fetch snippets with search/filter
app.get('/api/snippets', (req, res) => {
    const { search, category, tag, sort } = req.query;
    let sql = "SELECT * FROM snippets WHERE 1=1";
    const params = [];

    if (search) {
        sql += " AND (title LIKE ? OR tags LIKE ? OR content LIKE ?)";
        const term = `%${search}%`;
        params.push(term, term, term);
    }
    
    if (category) {
        sql += " AND category = ?";
        params.push(category);
    }

    if (tag) {
        sql += " AND tags LIKE ?";
        params.push(`%${tag}%`);
    }

    if (sort === 'most_used') {
        sql += " ORDER BY pinned DESC, last_copied DESC NULLS LAST, created_at DESC";
    } else {
        // Default: Newest, but pinned first
        sql += " ORDER BY pinned DESC, created_at DESC";
    }

    db.all(sql, params, (err, rows) => {
        if (err) {
            res.status(400).json({ error: err.message });
            return;
        }
        res.json({
            message: "success",
            data: rows
        });
    });
});

// Create new snippet
app.post('/api/snippets', (req, res) => {
    const { title, content, category, tags } = req.body;
    const sql = 'INSERT INTO snippets (title, content, category, tags, created_at) VALUES (?,?,?,?, datetime("now"))';
    const params = [title, content, category, tags];
    db.run(sql, params, function (err, result) {
        if (err) {
            res.status(400).json({ error: err.message });
            return;
        }
        res.json({
            message: "success",
            data: { id: this.lastID, ...req.body }
        });
    });
});

// Update snippet
app.put('/api/snippets/:id', (req, res) => {
    const { title, content, category, tags } = req.body;
    const sql = 'UPDATE snippets SET title = ?, content = ?, category = ?, tags = ? WHERE id = ?';
    const params = [title, content, category, tags, req.params.id];
    db.run(sql, params, function(err) {
        if (err) {
            res.status(400).json({ error: err.message });
            return;
        }
        res.json({ message: "success", data: req.body });
    });
});

// Toggle Pin
app.put('/api/snippets/:id/pin', (req, res) => {
    const { pinned } = req.body; // Expects true/false or 1/0
    const val = pinned ? 1 : 0;
    const sql = 'UPDATE snippets SET pinned = ? WHERE id = ?';
    db.run(sql, [val, req.params.id], function(err) {
        if (err) return res.status(400).json({ error: err.message });
        res.json({ message: "success", pinned: val });
    });
});

// Export all
app.get('/api/export', (req, res) => {
    const sql = "SELECT * FROM snippets ORDER BY created_at DESC";
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(400).json({ error: err.message });
        res.header('Content-Type', 'application/json');
        res.attachment('copypastor-export.json');
        res.send(JSON.stringify(rows, null, 2));
    });
});

// Update usage timestamp
app.patch('/api/snippets/:id/usage', (req, res) => {
    const sql = 'UPDATE snippets SET last_copied = datetime("now") WHERE id = ?';
    db.run(sql, req.params.id, function(err) {
        if (err) {
            res.status(400).json({ error: err.message });
            return;
        }
        res.json({ message: "success" });
    });
});

// Delete snippet
app.delete('/api/snippets/:id', (req, res) => {
    const sql = 'DELETE FROM snippets WHERE id = ?';
    db.run(sql, req.params.id, function(err) {
        if (err) {
            res.status(400).json({ error: err.message });
            return;
        }
        res.json({ message: "success" });
    });
});

// Get all unique tags and categories for the sidebar
app.get('/api/meta', (req, res) => {
    const sqlTags = "SELECT tags FROM snippets";
    const sqlCats = "SELECT DISTINCT category FROM snippets WHERE category IS NOT NULL";
    
    db.all(sqlTags, [], (err, tagRows) => {
        if (err) return res.status(500).json({error: err.message});
        
        const allTags = new Set();
        tagRows.forEach(row => {
            if(row.tags) {
                // handle space or comma separated
                row.tags.split(/[\s,]+/).filter(Boolean).forEach(t => allTags.add(t));
            }
        });

        db.all(sqlCats, [], (err, catRows) => {
            if (err) return res.status(500).json({error: err.message});
            
            res.json({
                tags: Array.from(allTags),
                categories: catRows.map(c => c.category)
            });
        });
    });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
