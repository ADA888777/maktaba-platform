// تشغيل الخادم والواجهة معًا أثناء التطوير دون الحاجة لحزم إضافية
import { spawn } from 'node:child_process';

const isWin = process.platform === 'win32';
const npm = isWin ? 'npm.cmd' : 'npm';
const procs = [
  spawn(npm, ['run', 'dev', '--prefix', 'server'], { stdio: 'inherit', shell: isWin }),
  spawn(npm, ['run', 'dev', '--prefix', 'client'], { stdio: 'inherit', shell: isWin }),
];
const stop = () => procs.forEach((p) => p.kill());
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
procs.forEach((p) => p.on('exit', (code) => { if (code) { stop(); process.exit(code); } }));
