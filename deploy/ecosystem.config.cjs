// PM2 keeps the game server running and restarts it if it crashes.
//   pm2 start deploy/ecosystem.config.cjs && pm2 save && pm2 startup
module.exports = {
  apps: [{
    name: 'local-rummy-server',
    cwd: __dirname + '/../apps/server',
    script: 'dist/index.js',
    env: { NODE_ENV: 'production' }, // reads apps/server/.env
    instances: 1, // game tables live in memory: keep ONE instance
    max_memory_restart: '600M',
    time: true,
  }],
};
