module.exports = {
  apps : [{
    name: 'disk-analyzer',
    script: 'server.js',
    instances: 1, // File scanning is CPU intensive, 1 instance is usually safer for local FS access
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'development',
      PORT: 8888
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 8888
    },
    error_file: 'logs/err.log',
    out_file: 'logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss'
  }]
};
