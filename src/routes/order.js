const express = require('express');

const router = express.Router();

function randomDelay(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

router.get('/', (req, res) => {
  setTimeout(() => {
    res.json({
      service: 'order_service',
      businessLine: req.businessLine,
      orders: [
        { id: 1, status: 'pending', amount: 99.99 },
        { id: 2, status: 'shipped', amount: 199.99 }
      ]
    });
  }, randomDelay(50, 200));
});

router.get('/:id', (req, res) => {
  const orderId = req.params.id;
  setTimeout(() => {
    if (orderId === 'error') {
      return res.status(500).json({ error: 'Order processing failed' });
    }
    res.json({
      id: orderId,
      businessLine: req.businessLine,
      status: 'completed',
      amount: 299.99,
      userId: 'user_123'
    });
  }, randomDelay(100, 500));
});

router.post('/', (req, res) => {
  setTimeout(() => {
    const orderId = 'ORD_' + Date.now();
    res.status(201).json({
      id: orderId,
      businessLine: req.businessLine,
      status: 'created',
      ...req.body
    });
  }, randomDelay(200, 800));
});

module.exports = router;
