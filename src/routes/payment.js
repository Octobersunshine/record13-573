const express = require('express');

const router = express.Router();

function randomDelay(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

router.get('/:orderId', (req, res) => {
  setTimeout(() => {
    res.json({
      service: 'payment_service',
      businessLine: req.businessLine,
      orderId: req.params.orderId,
      status: 'paid',
      amount: 199.99,
      method: 'credit_card'
    });
  }, randomDelay(100, 400));
});

router.post('/', (req, res) => {
  setTimeout(() => {
    if (req.body.amount > 10000) {
      return res.status(402).json({ error: 'Payment limit exceeded' });
    }
    const paymentId = 'PAY_' + Date.now();
    res.status(201).json({
      id: paymentId,
      businessLine: req.businessLine,
      status: 'processed',
      ...req.body
    });
  }, randomDelay(300, 1200));
});

module.exports = router;
