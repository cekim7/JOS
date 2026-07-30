const express = require('express');
const Database = require('better-sqlite3');
const cors = require('cors');

const app = express();
const port = 3000;
const db = new Database('papers.db');

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS papers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    authors TEXT NOT NULL,
    content TEXT NOT NULL,
    status TEXT NOT NULL,
    ai_review_notes TEXT
  );
`);

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// AI Review mock function
function reviewPaper(content) {
  // Simple mock logic: if the paper is too short, reject it.
  // Otherwise, publish it.
  if (!content || content.length < 50) {
    return { status: 'rejected', notes: 'Paper is too short. Does not meet academic standards.' };
  }

  if (content.toLowerCase().includes('plagiarism')) {
    return { status: 'rejected', notes: 'Potential plagiarism detected.' };
  }

  return { status: 'published', notes: 'Paper meets all criteria and is scientifically sound.' };
}

// GET route to fetch all published papers
app.get('/api/papers', (req, res) => {
  try {
    const stmt = db.prepare("SELECT * FROM papers WHERE status = 'published' ORDER BY id DESC");
    const papers = stmt.all();
    res.json(papers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch papers' });
  }
});

// POST route to submit a new paper
app.post('/api/papers', (req, res) => {
  const { title, authors, content } = req.body;

  if (!title || !authors || !content) {
    return res.status(400).json({ error: 'Title, authors, and content are required' });
  }

  // Evaluate paper with AI Agent
  const reviewResult = reviewPaper(content);

  try {
    const stmt = db.prepare(`
      INSERT INTO papers (title, authors, content, status, ai_review_notes)
      VALUES (?, ?, ?, ?, ?)
    `);

    const result = stmt.run(title, authors, content, reviewResult.status, reviewResult.notes);

    res.status(201).json({
      id: result.lastInsertRowid,
      title,
      authors,
      status: reviewResult.status,
      ai_review_notes: reviewResult.notes
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to submit paper' });
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
