const express = require('express');
const { monitoringMiddleware, metricsEndpoint } = require('./middleware/monitoring');
const { businessLabelMiddleware, requireBusinessLine } = require('./middleware/businessLabel');
const orderRoutes = require('./routes/order');
const userRoutes = require('./routes/user');
const paymentRoutes = require('./routes/payment');
const inventoryRoutes = require('./routes/inventory');
const marketingRoutes = require('./routes/marketing');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.use(businessLabelMiddleware);
app.use(monitoringMiddleware);

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

app.get('/metrics', metricsEndpoint);

app.use('/api/order', requireBusinessLine, orderRoutes);
app.use('/api/user', requireBusinessLine, userRoutes);
app.use('/api/payment', requireBusinessLine, paymentRoutes);
app.use('/api/inventory', requireBusinessLine, inventoryRoutes);
app.use('/api/marketing', requireBusinessLine, marketingRoutes);

app.get('/', (req, res) => {
  res.json({
    message: 'Express Monitoring API with Business Labels',
    endpoints: {
      health: '/health',
      metrics: '/metrics',
      apis: {
        order: '/api/order',
        user: '/api/user',
        payment: '/api/payment',
        inventory: '/api/inventory',
        marketing: '/api/marketing'
      }
    },
    businessLine: req.businessLine,
    howToUse: {
      header: 'Set x-business-line header (e.g., order_service, user_service)',
      queryParam: 'Use ?business_line=order_service query param',
      autoDetection: 'Routes with /api/order, /api/user etc. prefixes are auto-detected'
    }
  });
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    businessLine: req.businessLine
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Metrics endpoint: http://localhost:${PORT}/metrics`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});

module.exports = app;
