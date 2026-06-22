const client = require('prom-client');

const register = new client.Registry();

client.collectDefaultMetrics({ register });

const httpRequestDurationMicroseconds = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code', 'business_line'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
});

const httpRequestTotal = new client.Counter({
  name: 'http_request_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code', 'business_line']
});

const httpRequestErrorsTotal = new client.Counter({
  name: 'http_request_errors_total',
  help: 'Total number of HTTP request errors',
  labelNames: ['method', 'route', 'status_code', 'business_line']
});

const httpRequestInProgress = new client.Gauge({
  name: 'http_requests_in_progress',
  help: 'Number of HTTP requests in progress',
  labelNames: ['method', 'business_line']
});

register.registerMetric(httpRequestDurationMicroseconds);
register.registerMetric(httpRequestTotal);
register.registerMetric(httpRequestErrorsTotal);
register.registerMetric(httpRequestInProgress);

function monitoringMiddleware(req, res, next) {
  const startEpoch = Date.now();
  const initialRoute = (req.originalUrl || req.url).split('?')[0];
  const method = req.method;
  const startBusinessLine = req.businessLine || 'unknown';

  httpRequestInProgress.inc({ method, business_line: startBusinessLine });

  res.on('finish', () => {
    const businessLine = req.businessLine || startBusinessLine;
    const route = req.route ? req.baseUrl + req.route.path : initialRoute;
    const responseTimeInMs = Date.now() - startEpoch;
    const statusCode = res.statusCode;

    httpRequestInProgress.dec({ method, business_line: businessLine });

    const labels = {
      method,
      route,
      status_code: statusCode.toString(),
      business_line: businessLine
    };

    httpRequestTotal.inc(labels);
    httpRequestDurationMicroseconds.observe(labels, responseTimeInMs / 1000);

    if (statusCode >= 400) {
      httpRequestErrorsTotal.inc(labels);
    }
  });

  next();
}

async function metricsEndpoint(req, res) {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (err) {
    res.status(500).end(err.message);
  }
}

module.exports = {
  monitoringMiddleware,
  metricsEndpoint,
  register,
  httpRequestDurationMicroseconds,
  httpRequestTotal,
  httpRequestErrorsTotal,
  httpRequestInProgress
};
