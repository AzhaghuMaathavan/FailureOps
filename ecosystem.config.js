module.exports = {
  apps: [
    {
      name: 'failureops-backend',
      cwd: '/home/ubuntu/failureops/rag',
      script: '/home/ubuntu/failureops/rag/venv/bin/uvicorn',
      args: 'app.main:app --host 127.0.0.1 --port 8000 --workers 2',
      interpreter: 'none',
      env: {
        NODE_ENV: 'production',
      },
      restart_delay: 2000,
      max_restarts: 10,
    },
    {
      name: 'failureops-frontend',
      cwd: '/home/ubuntu/failureops/frontend',
      script: 'npm',
      args: 'run start',
      env: {
        NODE_ENV: 'production',
        PORT: '3000',
      },
      restart_delay: 2000,
      max_restarts: 10,
    },

  ],
};
