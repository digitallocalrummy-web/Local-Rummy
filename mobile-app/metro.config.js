// Expo's default Metro config, plus one fix for tunnels.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

/**
 * Through ngrok/Cloudflare, requests can arrive with headers like "x-forwarded-proto: https, http".
 * Metro builds a URL from them and fails with "TypeError: Invalid URL", which can stop the phone
 * from loading the app. Keep only the first value, and turn any still-unreadable request into a
 * plain 400 instead of an error.
 */
const enhance = config.server?.enhanceMiddleware;
config.server = {
  ...config.server,
  enhanceMiddleware: (middleware, server) => {
    const next = enhance ? enhance(middleware, server) : middleware;
    return (req, res, done) => {
      for (const h of ['x-forwarded-proto', 'x-forwarded-host', 'host']) {
        const v = req.headers[h];
        if (typeof v === 'string' && v.includes(',')) req.headers[h] = v.split(',')[0].trim();
      }
      try {
        const proto = req.headers['x-forwarded-proto'] || 'http';
        new URL(req.url || '/', `${proto}://${req.headers['x-forwarded-host'] || req.headers.host || 'localhost'}`);
      } catch {
        res.statusCode = 400;
        res.end();
        return;
      }
      return next(req, res, done);
    };
  },
};

module.exports = config;
