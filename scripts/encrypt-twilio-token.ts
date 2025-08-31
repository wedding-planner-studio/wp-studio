// scripts/encrypt-twilio-token.ts
import crypto from 'crypto';
import readline from 'readline';
import dotenv from 'dotenv';

dotenv.config();

const algorithm = 'aes-256-gcm';
const secretKey = process.env.TOKEN_ENCRYPTION_KEY!;
const iv = crypto.randomBytes(16);

function encrypt(text: string): string {
  const cipher = crypto.createCipheriv(algorithm, Buffer.from(secretKey, 'hex'), iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question('Enter Twilio Auth Token to encrypt: ', token => {
  const encrypted = encrypt(token.trim());
  console.log('\n🔐 Encrypted Token:\n', encrypted);
  rl.close();
});
