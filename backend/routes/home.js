// routes/home.js
const express = require('express');
const router = express.Router();
const Subject = require('../models/subjects');

// GET / -> Home Page with Branch & Semester Selectors
router.get('/', (req, res) => {
  const branches = ['CSE', 'AIML', 'AIDS', 'COMMON'];
  const semesters = [1, 2, 3, 4, 5, 6, 7, 8];
  res.render('index', { branches, semesters });
});

module.exports = router;