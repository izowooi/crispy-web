// pm2 config for the self-hosted deployment (Mac mini, behind Cloudflare Tunnel).
// Secrets live in .env.local next to this file (loaded by Next.js, never committed).
// Single fork instance on purpose: metadata.json writes are serialized in-process.
module.exports = {
  apps: [
    {
      name: 'clipplay',
      cwd: __dirname,
      script: 'node_modules/next/dist/bin/next',
      args: 'start -H 127.0.0.1 -p 5110',
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      restart_delay: 3000,
      time: true,
      env: {
        NODE_ENV: 'production',
        FFMPEG_PATH: '/opt/homebrew/bin/ffmpeg',
      },
    },
  ],
};
