module.exports = {
  apps: [
    {
      name: 'failureops-backend',
      cwd: '/home/ubuntu/failureops/agentic-rag-main',
      script: '/home/ubuntu/failureops/agentic-rag-main/venv/bin/uvicorn',
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
      cwd: '/home/ubuntu/failureops',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3000',
      env: {
        NODE_ENV: 'production',
        PORT: '3000',
      },
      restart_delay: 2000,
      max_restarts: 10,
    },
  ],
};
