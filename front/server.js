import { spawn } from 'child_process';

const port = process.env.PORT || '5173';
console.log(`Starting server on port ${port}...`);

// Use npx serve with explicit port
const serve = spawn('npx', ['serve', '-s', 'dist', '-l', port], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, PORT: port }
});

serve.on('error', (error) => {
  console.error('Error starting server:', error);
  process.exit(1);
});

serve.on('exit', (code) => {
  if (code !== null && code !== 0) {
    console.error(`Server exited with code ${code}`);
    process.exit(code);
  }
});

process.on('SIGTERM', () => {
  serve.kill('SIGTERM');
});

process.on('SIGINT', () => {
  serve.kill('SIGINT');
  process.exit(0);
});

