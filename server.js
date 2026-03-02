const express = require("express");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static("uploads"));

if (!fs.existsSync("./uploads")) {
  fs.mkdirSync("./uploads");
}

const db = new sqlite3.Database("./blog.db");

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT,
      content TEXT,
      image_path TEXT,
      archived INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER,
      author TEXT,
      content TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
});

const storage = multer.diskStorage({
  destination: "./uploads",
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

/* CREATE POST */
app.post("/posts", upload.single("image"), (req, res) => {
  const { title, content } = req.body;
  const imagePath = req.file ? `/uploads/${req.file.filename}` : null;

  db.run(
    "INSERT INTO posts (title, content, image_path) VALUES (?, ?, ?)",
    [title, content, imagePath],
    function (err) {
      if (err) return res.status(500).json(err);
      res.json({ id: this.lastID });
    }
  );
});

/* GET ALL POSTS */
app.get("/posts", (req, res) => {
  db.all("SELECT * FROM posts WHERE archived = 0 ORDER BY created_at DESC", (err, rows) => {
    if (err) return res.status(500).json(err);
    res.json(rows);
  });
});

/* GET SINGLE POST */
app.get("/posts/:id", (req, res) => {
  db.get("SELECT * FROM posts WHERE id = ?", [req.params.id], (err, row) => {
    if (err) return res.status(500).json(err);
    res.json(row);
  });
});

/* EDIT POST */
app.put("/posts/:id", (req, res) => {
  const { title, content } = req.body;

  db.run(
    "UPDATE posts SET title = ?, content = ? WHERE id = ?",
    [title, content, req.params.id],
    function (err) {
      if (err) return res.status(500).json(err);
      res.json({ updated: this.changes });
    }
  );
});

/* ARCHIVE POST */
app.patch("/posts/:id/archive", (req, res) => {
  db.run(
    "UPDATE posts SET archived = 1 WHERE id = ?",
    [req.params.id],
    function (err) {
      if (err) return res.status(500).json(err);
      res.json({ archived: true });
    }
  );
});

/* ADD COMMENT */
app.post("/posts/:id/comments", (req, res) => {
  const { author, content } = req.body;

  db.run(
    "INSERT INTO comments (post_id, author, content) VALUES (?, ?, ?)",
    [req.params.id, author, content],
    function (err) {
      if (err) return res.status(500).json(err);
      res.json({ id: this.lastID });
    }
  );
});

/* GET COMMENTS */
app.get("/posts/:id/comments", (req, res) => {
  db.all(
    "SELECT * FROM comments WHERE post_id = ? ORDER BY created_at ASC",
    [req.params.id],
    (err, rows) => {
      if (err) return res.status(500).json(err);
      res.json(rows);
    }
  );
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});