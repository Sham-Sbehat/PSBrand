import { spawn } from 'child_process';

const port = process.env.PORT || '5173';

console.log(`Starting server on port ${port}...`);

const serve = spawn('npx', ['serve', '-s', 'dist', '-l', port], {
  stdio: 'inherit',
  shell: true
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

