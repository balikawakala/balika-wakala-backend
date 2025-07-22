// api/index.js
import { storage } from './lib/storage';

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  res.json({
    status: '🚀 Balika Wakala Tanzania Backend Active!',
    timestamp: new Date().toISOString(),
    botStatus: process.env.BOT_TOKEN ? '✅ Telegram Bot Active' : '❌ Bot Inactive',
    admin: 'Abada Bayuyu',
    paymentNumber: '0687537030 (Baraka Laizer)',
    github: 'https://github.com/balikawakala',
    frontend: 'https://balikawakala.github.io',
    totalUsers: storage.users.size,
    pendingPayments: storage.pendingPayments.size,
    completedPayments: storage.payments.size,
    version: '1.0.0',
    platform: 'Vercel Serverless'
  });
}
