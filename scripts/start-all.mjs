import { spawn } from 'child_process';

console.log('Iniciando Servidor MariaDB e Aplicação Frontend PDV Murupi...');

const isWindows = process.platform === 'win32';
const npmCmd = isWindows ? 'npm.cmd' : 'npm';

const server = spawn(npmCmd, ['run', 'server'], { stdio: 'inherit', shell: true });
const client = spawn(npmCmd, ['run', 'dev'], { stdio: 'inherit', shell: true });

function shutdown() {
  console.log('\nEncerrando serviços...');
  server.kill();
  client.kill();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
