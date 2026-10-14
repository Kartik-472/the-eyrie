const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// SQLite Database Setup
const dbFile = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbFile, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to SQLite database.');
        initDb();
    }
});

function initDb() {
    db.run(`CREATE TABLE IF NOT EXISTS budgets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        total_amount REAL,
        priorities TEXT,
        optimized_plan TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS chat_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        question TEXT,
        answer TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
}

// API Routes
// 1. Save and optimize budget
app.post('/api/budget', (req, res) => {
    const { total, priorities } = req.body;
    if (!total || !priorities || !Array.isArray(priorities) || priorities.length === 0) {
        return res.status(400).json({ error: 'Invalid input data' });
    }

    // Smart allocation algorithm (e.g., Savings/Investments get a baseline, rest split proportionally)
    const count = priorities.length;
    const share = total / count;
    const plan = {};
    priorities.forEach(p => {
        plan[p] = Number(share.toFixed(2));
    });

    const planJson = JSON.stringify(plan);
    const prioritiesJson = JSON.stringify(priorities);

    db.run(
        `INSERT INTO budgets (total_amount, priorities, optimized_plan) VALUES (?, ?, ?)`,
        [total, prioritiesJson, planJson],
        function (err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json({
                id: this.lastID,
                total,
                priorities,
                plan
            });
        }
    );
});

// 2. Get past saved budgets
app.get('/api/budgets', (req, res) => {
    db.all(`SELECT * FROM budgets ORDER BY id DESC LIMIT 5`, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

// 3. AI Financial Assistant Endpoint
app.post('/api/chat', (req, res) => {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'Message is required' });

    const q = message.toLowerCase();
    let reply = "That's a great financial question! As a rule of thumb, always prioritize clearing high-interest debt and building a 3-month emergency fund before diving into individual stocks.";

    if (q.includes('save') || q.includes('saving')) {
        reply = "Try following the 50/30/20 rule: Allocate 50% of your income to Needs, 30% to Wants, and 20% straight into Savings & Investments.";
    } else if (q.includes('stock') || q.includes('invest')) {
        reply = "For beginners, index funds (like S&P 500 ETFs) are generally safer and less volatile than picking individual stocks because they offer instant market diversification.";
    } else if (q.includes('debt') || q.includes('loan')) {
        reply = "Consider the 'Debt Avalanche' method (paying off highest interest rate first) or 'Debt Snowball' method (paying off smallest balance first) to stay motivated.";
    } else if (q.includes('hello') || q.includes('hi')) {
        reply = "Hello! I am your AI Financial Assistant. Ask me anything about budgeting, saving, or investing!";
    }

    // Log chat interaction in database
    db.run(`INSERT INTO chat_logs (question, answer) VALUES (?, ?)`, [message, reply]);

    res.json({ reply });
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});