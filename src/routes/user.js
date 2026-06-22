const express = require('express');

const router = express.Router();

function randomDelay(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

router.get('/', (req, res) => {
  setTimeout(() => {
    res.json({
      service: 'user_service',
      businessLine: req.businessLine,
      users: [
        { id: 1, name: 'Alice', email: 'alice@example.com' },
        { id: 2, name: 'Bob', email: 'bob@example.com' }
      ]
    });
  }, randomDelay(30, 150));
});

router.get('/:id', (req, res) => {
  const userId = req.params.id;
  setTimeout(() => {
    if (userId === '404') {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({
      id: userId,
      businessLine: req.businessLine,
      name: 'John Doe',
      email: 'john@example.com',
      createdAt: '2024-01-01T00:00:00Z'
    });
  }, randomDelay(80, 300));
});

router.post('/', (req, res) => {
  setTimeout(() => {
    const userId = 'USER_' + Date.now();
    res.status(201).json({
      id: userId,
      businessLine: req.businessLine,
      ...req.body
    });
  }, randomDelay(150, 600));
});

module.exports = router;
