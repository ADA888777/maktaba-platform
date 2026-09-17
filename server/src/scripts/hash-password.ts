/**
 * توليد تجزئة كلمة مرور لوضعها في ADMIN_PASSWORD_HASH.
 * كلمة المرور تُكتب في الطرفية مخفية ولا تُحفظ في أي ملف.
 */
import readline from 'node:readline';
import { hashPassword, validatePasswordStrength } from '../utils/password.js';

function ask(question: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    const out = rl as unknown as { _writeToOutput: (s: string) => void; output: NodeJS.WriteStream };
    out._writeToOutput = (s: string) => {
      if (s.includes(question)) process.stdout.write(s);
      else process.stdout.write('*');
    };
    rl.question(question, (answer) => {
      rl.close();
      process.stdout.write('\n');
      resolve(answer);
    });
  });
}

const password = process.env.PASSWORD ?? (await ask('كلمة المرور: '));
const weak = validatePasswordStrength(password);
if (weak) {
  console.error(weak);
  process.exit(1);
}
const hash = await hashPassword(password);
console.log('\nانسخي السطر التالي إلى ملف .env:\n');
console.log(`ADMIN_PASSWORD_HASH=${hash}`);
