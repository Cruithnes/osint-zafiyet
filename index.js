const express = require('express');
const app = express();
const path = require('path');
const session = require('express-session'); //Broken Access Control
const methodOverride = require('method-override');

const { Pool } = require('pg');
const fs = require('fs');

require('dotenv').config();

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true
})); //Broken Access Control

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

console.log('Database URL:', process.env.DATABASE_URL);

app.set('view engine', 'ejs');

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(methodOverride('_method'));

app.set('views', path.join(__dirname, 'views'));

app.get('/vault', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM cats');
        const cats = result.rows;
        res.render('vault', { cats });
    } catch (err) {
        console.error('Error fetching cats:', err);
        res.status(500).send('Server error');
    }
});


app.get('/vault/new', (req, res) => {
    res.render('new');
});

app.post('/cats', async (req, res) => {
    const { title, imageurl, description } = req.body;

    try {
        await pool.query(
            'INSERT INTO cats (title, imageurl, description) VALUES ($1, $2, $3)',
            [title, imageurl, description]
        );
        res.redirect('/vault');
    } catch (err) {
        console.error('Error creating cat:', err);
        res.status(500).send('Server error');
    }
});

app.post('/login', async (req, res) => {
    const { username, password } = await req.body;
    // const sql = `SELECT * FROM users WHERE username = '${username}' AND password = '${password}'`;
    const sql = 'select * from users where username = $1 and password = $2'
    try {
        const result = await pool.query(sql, [username, password]);
        if (result.rows.length > 0) {
            req.session.authenticated = true;
            req.session.username = username;
            return res.redirect('/vault');
        } else {
            res.send('Login failed');
        }
    } catch (err) {
        res.send('Error: ' + err.message);
    }
})

app.get('/vault/:id/edit', async (req, res) => {
  const catId = parseInt(req.params.id, 10);
  if (isNaN(catId)) return res.status(400).send('Invalid cat ID');

  try {
    const result = await pool.query('SELECT * FROM cats WHERE id = $1', [catId]);
    const cat = result.rows[0];
    if (!cat) return res.status(404).send('Cat not found');

    res.render('edit', { cat });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

app.put('/vault/:id', async (req, res) => {
  const catId = parseInt(req.params.id, 10);
  const { title, imageurl, description } = req.body;

  if (isNaN(catId)) return res.status(400).send('Invalid cat ID');

  try {
    await pool.query(
      'UPDATE cats SET title = $1, imageurl = $2, description = $3 WHERE id = $4',
      [title, imageurl, description, catId]
    );
    res.redirect(`/vault/${catId}`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});


app.get('/vault/:id', async (req, res) => {
    const id = req.params.id;
    try {
        const result = await pool.query('SELECT * FROM cats WHERE id = $1', [id]);
        const cat = result.rows[0];
        if (!cat) {
            return res.status(404).send('Cat not found');
        }
        res.render('show', { cat });
    } catch (err) {
        console.error('Error fetching cat:', err);
        res.status(500).send('Server error');
    }
});

app.delete('/cat/:id', async (req, res) => {
  const catId = parseInt(req.params.id, 10);
  if (isNaN(catId)) return res.status(400).send('Invalid cat ID');

  try {
    await pool.query('DELETE FROM cats WHERE id = $1', [catId]);
    res.redirect('/vault');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

app.get('/', (req, res) => {
    res.render('index');
});
app.listen(3000, () => {
    console.log('Jorking it');
});