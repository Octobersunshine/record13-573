const client = require('prom-client');
const { sanitizeLabelValue } = require('./businessLabel');

const register = new client.Registry();

const MAX_ROUTE_LENGTH = 128;

client.collectDefaultMetrics({ register });

function sanitizeMethod(value) {
  if (!value) return 'UNKNOWN';
  const str = String(value).toUpperCase();
  const valid = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD', 'UNKNOWN'];
  return valid.includes(str) ? str : 'UNKNOWN';
}

function sanitizeRoute(value) {
  if (!value) return '/';
  let str = String(value).split('?')[0];
  str = str.replace(/[\x00-\x1F\x7F "']/g, '');
  str = str.replace(/[^a-zA-Z0-9_\-.:/{}]/g, '_');
  if (str.length > MAX_ROUTE_LENGTH) {
    str = str.substring(0, MAX_ROUTE_LENGTH);
  }
  return str || '/';
}

function sanitizeStatusCode(value) {
  const code = parseInt(value, 10);
  if (isNaN(code) || code < 100 || code > 599) {
    return '0';
  }
  return String(code);
}

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
  const initialRoute = sanitizeRoute((req.originalUrl || req.url));
  const method = sanitizeMethod(req.method);
  const startBusinessLine = sanitizeLabelValue(req.businessLine);

  httpRequestInProgress.inc({ method, business_line: startBusinessLine });

  res.on('finish', () => {
    const businessLine = sanitizeLabelValue(req.businessLine || startBusinessLine);
    const rawRoute = req.route ? req.baseUrl + req.route.path : initialRoute;
    const route = sanitizeRoute(rawRoute);
    const responseTimeInMs = Date.now() - startEpoch;
    const statusCode = sanitizeStatusCode(res.statusCode);

    httpRequestInProgress.dec({ method, business_line: businessLine });

    const labels = {
      method,
      route,
      status_code: statusCode,
      business_line: businessLine
    };

    httpRequestTotal.inc(labels);
    httpRequestDurationMicroseconds.observe(labels, responseTimeInMs / 1000);

    if (parseInt(statusCode, 10) >= 400) {
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
