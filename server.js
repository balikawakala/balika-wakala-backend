const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
require('dotenv').config();

// Configuration with your actual credentials
const BOT_TOKEN = process.env.BOT_TOKEN || '7637576419:AAErrm4F2C7jJcHTTt__3sQcKrh9tsqNxlg';
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID || '6949588855';
const PORT = process.env.PORT || 3000;

// Initialize bot and express
const bot = BOT_TOKEN ? new TelegramBot(BOT_TOKEN, { polling: true }) : null;
const app = express();

// Middleware with GitHub Pages CORS
app.use(cors({
  origin: [
    'https://balikawakala.github.io',
    'http://localhost:3000', 
    'http://127.0.0.1:3000',
    'https://localhost:3000'
  ],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// In-memory storage
let users = new Map();
let payments = new Map();
let pendingPayments = new Map();

console.log('🚀 Initializing Balika Wakala Tanzania Backend...');
console.log('👨‍💼 Admin: Abada Bayuyu');
console.log('📞 Payment: 0687537030 (Baraka Laizer)');
console.log('💬 Telegram: 6949588855');
console.log('🌐 GitHub: https://github.com/balikawakala');

// Utility functions
function generatePaymentId() {
  return crypto.randomBytes(6).toString('hex').toUpperCase();
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('sw-TZ').format(amount) + ' TZS';
}

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function formatPhoneNumber(phone) {
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('255')) {
    cleaned = '0' + cleaned.substring(3);
  }
  if (!cleaned.startsWith('0')) {
    cleaned = '0' + cleaned;
  }
  return cleaned;
}

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    status: '🚀 Balika Wakala Tanzania Backend Active!',
    timestamp: new Date().toISOString(),
    botStatus: bot ? '✅ Telegram Bot Active' : '❌ Bot Inactive',
    admin: 'Abada Bayuyu',
    paymentNumber: '0687537030 (Baraka Laizer)',
    github: 'https://github.com/balikawakala',
    frontend: 'https://balikawakala.github.io',
    totalUsers: users.size,
    pendingPayments: pendingPayments.size,
    completedPayments: payments.size,
    version: '1.0.0'
  });
});

// API Test endpoint
app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: '✅ API connection successful!',
    timestamp: new Date().toISOString(),
    server: 'Railway',
    database: 'In-Memory'
  });
});

// User Registration
app.post('/api/register', async (req, res) => {
  try {
    const { fullName, phone, network, password } = req.body;
    
    // Validation
    if (!fullName || !phone || !network || !password) {
      return res.status(400).json({ 
        success: false,
        error: 'Taarifa zote ni lazima' 
      });
    }

    if (fullName.trim().length < 2) {
      return res.status(400).json({ 
        success: false,
        error: 'Jina kamili ni lazima (angalau herufi 2)' 
      });
    }

    const formattedPhone = formatPhoneNumber(phone);
    if (formattedPhone.length !== 10) {
      return res.status(400).json({ 
        success: false,
        error: 'Namba ya simu si sahihi (mfano: 0712345678)' 
      });
    }

    if (password.length < 4) {
      return res.status(400).json({ 
        success: false,
        error: 'Neno la siri lazima liwe na angalau herufi 4' 
      });
    }

    // Check if user exists
    if (users.has(formattedPhone)) {
      return res.status(400).json({ 
        success: false,
        error: 'Mtumiaji tayari yupo na namba hii ya simu' 
      });
    }

    // Create user
    const user = {
      id: crypto.randomUUID(),
      fullName: fullName.trim(),
      phone: formattedPhone,
      network,
      password: hashPassword(password),
      balance: 0,
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString()
    };

    users.set(formattedPhone, user);
    console.log(`✅ New user: ${fullName} (${formattedPhone})`);

    // Notify admin via Telegram
    if (bot && BOT_TOKEN) {
      const welcomeMessage = `
🎉 *MTUMIAJI MPYA AMEJISAJILI*

👤 *Jina:* ${fullName}
📞 *Simu:* ${formattedPhone}
🌐 *Mtandao:* ${network.toUpperCase()}
⏰ *Wakati:* ${new Date().toLocaleString('sw-TZ', { timeZone: 'Africa/Dar_es_Salaam' })}

📊 *Jumla ya Watumiaji:* ${users.size}

🌐 *Tovuti:* https://balikawakala.github.io
      `;

      try {
        await bot.sendMessage(ADMIN_CHAT_ID, welcomeMessage, { parse_mode: 'Markdown' });
      } catch (error) {
        console.error('Telegram notification failed:', error.message);
      }
    }

    res.json({
      success: true,
      message: `Karibu ${fullName}! Umefanikiwa kujisajili. Unaweza kuanza kuweka salio kwa namba 0687537030 (Baraka Laizer).`,
      user: {
        id: user.id,
        fullName: user.fullName,
        phone: user.phone,
        network: user.network,
        balance: user.balance
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Hitilafu ya mfumo. Jaribu tena.' 
    });
  }
});

// User Login
app.post('/api/login', async (req, res) => {
  try {
    const { phone, password } = req.body;
    
    if (!phone || !password) {
      return res.status(400).json({ 
        success: false,
        error: 'Namba ya simu na neno la siri ni lazima' 
      });
    }

    const formattedPhone = formatPhoneNumber(phone);
    const user = users.get(formattedPhone);
    
    if (!user) {
      return res.status(401).json({ 
        success: false,
        error: 'Mtumiaji hajapatikana. Hakikisha namba ya simu ni sahihi au jisajili kwanza.' 
      });
    }

    if (user.password !== hashPassword(password)) {
      return res.status(401).json({ 
        success: false,
        error: 'Neno la siri si sahihi' 
      });
    }

    // Update last login
    user.lastLogin = new Date().toISOString();
    users.set(formattedPhone, user);
    console.log(`✅ Login: ${user.fullName} (${formattedPhone})`);

    res.json({
      success: true,
      message: `Karibu tena ${user.fullName}! Salio lako la sasa ni ${formatCurrency(user.balance)}.`,
      user: {
        id: user.id,
        fullName: user.fullName,
        phone: user.phone,
        network: user.network,
        balance: user.balance
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Hitilafu ya mfumo. Jaribu tena.' 
    });
  }
});

// Submit Payment for Verification
app.post('/api/submit-payment', async (req, res) => {
  try {
    const { userId, amount, paymentPhone, network, userPhone } = req.body;
    
    // Validation
    if (!userId || !amount || !paymentPhone || !network || !userPhone) {
      return res.status(400).json({ 
        success: false,
        error: 'Taarifa zote ni lazima' 
      });
    }

    const user = Array.from(users.values()).find(u => u.id === userId);
    if (!user) {
      return res.status(404).json({ 
        success: false,
        error: 'Mtumiaji hajapatikana' 
      });
    }

    const paymentAmount = parseInt(amount);
    if (isNaN(paymentAmount) || paymentAmount < 1000 || paymentAmount > 10000000) {
      return res.status(400).json({ 
        success: false,
        error: 'Kiasi lazima kiwe kati ya 1,000 na 10,000,000 TZS' 
      });
    }

    const formattedPaymentPhone = formatPhoneNumber(paymentPhone);
    if (formattedPaymentPhone.length !== 10) {
      return res.status(400).json({ 
        success: false,
        error: 'Namba ya malipo si sahihi' 
      });
    }

    // Generate unique payment ID
    const paymentId = generatePaymentId();

    // Create payment record
    const payment = {
      id: paymentId,
      userId,
      userPhone: user.phone,
      userName: user.fullName,
      amount: paymentAmount,
      paymentPhone: formattedPaymentPhone,
      network,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    pendingPayments.set(paymentId, payment);

    // Send notification to admin via Telegram
    if (bot && BOT_TOKEN) {
      const adminMessage = `
🔔 *OMBI JIPYA LA MALIPO*

👤 *Mtumiaji:* ${user.fullName}
📞 *Namba ya Mtumiaji:* ${user.phone}
💰 *Kiasi:* ${formatCurrency(paymentAmount)}
📱 *Namba ya Malipo:* ${formattedPaymentPhone}
🌐 *Mtandao:* ${network.toUpperCase()}
🆔 *Payment ID:* \`${paymentId}\`

💳 *Namba ya Kuwekeza:* 0687537030 (Baraka Laizer)

⏰ *Wakati:* ${new Date().toLocaleString('sw-TZ', {
  timeZone: 'Africa/Dar_es_Salaam',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit'
})}

*Thibitisha malipo haya:*
      `;

      const keyboard = {
        inline_keyboard: [
          [
            { 
              text: '✅ Thibitisha Malipo', 
              callback_data: `approve_${paymentId}` 
            },
            { 
              text: '❌ Kataa Malipo', 
              callback_data: `reject_${paymentId}` 
            }
          ],
          [
            {
              text: '📊 Angalia Takwimu',
              callback_data: `stats_${paymentId}`
            }
          ]
        ]
      };

      try {
        await bot.sendMessage(ADMIN_CHAT_ID, adminMessage, {
          parse_mode: 'Markdown',
          reply_markup: keyboard
        });
        console.log(`📱 Payment notification sent: ${paymentId}`);
      } catch (telegramError) {
        console.error('Telegram error:', telegramError.message);
      }
    }

    console.log(`💰 Payment submitted: ${paymentId} - ${user.fullName} - ${formatCurrency(paymentAmount)}`);

    res.json({
      success: true,
      message: `Ombi la malipo limetumwa kikamilifu!\n\nPayment ID: ${paymentId}\n\nMsimamizi atahakiki malipo yako na utapokea uhakikisho hivi karibuni.`,
      paymentId,
      expectedPaymentNumber: '0687537030',
      expectedPaymentName: 'Baraka Laizer'
    });

  } catch (error) {
    console.error('Payment submission error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Hitilafu ya mfumo. Jaribu tena.' 
    });
  }
});

// Check Payment Status
app.get('/api/payment-status/:paymentId', (req, res) => {
  try {
    const { paymentId } = req.params;
    
    const payment = pendingPayments.get(paymentId) || payments.get(paymentId);
    
    if (!payment) {
      return res.status(404).json({ 
        success: false,
        error: 'Malipo hayajapatikana' 
      });
    }

    res.json({
      success: true,
      payment: {
        id: payment.id,
        amount: payment.amount,
        status: payment.status,
        createdAt: payment.createdAt,
        approvedAt: payment.approvedAt || null,
        rejectedAt: payment.rejectedAt || null
      }
    });

  } catch (error) {
    console.error('Payment status error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Hitilafu ya mfumo' 
    });
  }
});

// Get User Balance
app.get('/api/balance/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = Array.from(users.values()).find(u => u.id === userId);
    if (!user) {
      return res.status(404).json({ 
        success: false,
        error: 'Mtumiaji hajapatikana' 
      });
    }

    res.json({
      success: true,
      balance: user.balance,
      lastUpdated: new Date().toISOString()
    });

  } catch (error) {
    console.error('Balance check error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Hitilafu ya mfumo' 
    });
  }
});

// Bot Commands
if (bot) {
  bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const isAdmin = chatId.toString() === ADMIN_CHAT_ID.toString();
    
    const welcomeMessage = `
🎉 *Karibu Balika Wakala Tanzania Bot!*

${isAdmin ? '👨‍💼 *Karibu Msimamizi Abada Bayuyu!*' : '👤 *Karibu Mtumiaji!*'}

🤖 *Mimi ni bot wa kuthibitisha malipo*

📋 *Kazi yangu:*
• Kupokea taarifa za malipo
• Kutuma uhakikisho kwa msimamizi  
• Kusaidia katika mchakato wa malipo

👨‍💼 *Msimamizi:* Abada Bayuyu
📞 *Simu ya Malipo:* 0687537030 (Baraka Laizer)
📊 *Watumiaji:* ${users.size}
💰 *Malipo yanayosubiri:* ${pendingPayments.size}

🌐 *Tovuti:* https://balikawakala.github.io
🐙 *GitHub:* https://github.com/balikawakala

*Ahsante kwa kutumia huduma zetu!* 🙏
    `;
    
    bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown' });
  });

  bot.onText(/\/help/, (msg) => {
    const chatId = msg.chat.id;
    const helpMessage = `
📚 *Msaada wa Bot - Balika Wakala Tanzania*

*Jinsi ya Kutumia:*
1️⃣ Tembelea: https://balikawakala.github.io
2️⃣ Jisajili kwa kutumia namba yako ya simu
3️⃣ Weka malipo kwa: *0687537030 (Baraka Laizer)*
4️⃣ Jaza fomu kwenye tovuti na malipo yako
5️⃣ Subiri uhakikisho (dakika 1-10)

*Aina za Malipo Zinazokubaliwa:*
💳 Airtel Money
💳 Vodacom M-Pesa  
💳 Tigo Pesa
💳 Halopesa
💳 T-Pesa

*Viwango vya Malipo:*
💰 Kiwango cha chini: 1,000 TZS
💰 Kiwango cha juu: 10,000,000 TZS

*Maswali?*
👨‍💼 Msimamizi: Abada Bayuyu
📞 Simu: 0687537030

*Tovuti:* https://balikawakala.github.io
*GitHub:* https://github.com/balikawakala
    `;
    
    bot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' });
  });

  bot.onText(/\/stats/, (msg) => {
    const chatId = msg.chat.id;
    
    if (chatId.toString() !== ADMIN_CHAT_ID.toString()) {
      bot.sendMessage(chatId, '❌ Huna ruhusa ya kuona takwimu');
      return;
    }

    const totalAmount = Array.from(payments.values())
      .filter(p => p.status === 'approved')
      .reduce((sum, p) => sum + p.amount, 0);

    const statsMessage = `
📊 *TAKWIMU ZA BALIKA WAKALA*

👥 *Watumiaji:* ${users.size}
⏳ *Malipo yanayosubiri:* ${pendingPayments.size}
✅ *Malipo yaliyothibitishwa:* ${Array.from(payments.values()).filter(p => p.status === 'approved').length}
❌ *Malipo yaliyokataliwa:* ${Array.from(payments.values()).filter(p => p.status === 'rejected').length}
💰 *Jumla ya malipo:* ${formatCurrency(totalAmount)}

🌐 *Tovuti:* https://balikawakala.github.io
🐙 *GitHub:* https://github.com/balikawakala

⏰ *Takwimu za:* ${new Date().toLocaleString('sw-TZ', { timeZone: 'Africa/Dar_es_Salaam' })}
    `;

    bot.sendMessage(chatId, statsMessage, { parse_mode: 'Markdown' });
  });

  // Handle admin callback queries
  bot.on('callback_query', async (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id;
    const data = callbackQuery.data;
    const messageId = callbackQuery.message.message_id;
    
    // Only admin can approve/reject
    if (chatId.toString() !== ADMIN_CHAT_ID.toString()) {
      await bot.answerCallbackQuery(callbackQuery.id, {
        text: '❌ Huna ruhusa ya kufanya hili',
        show_alert: true
      });
      return;
    }

    const [action, paymentId] = data.split('_');
    
    if (action === 'stats') {
      const totalUsers = users.size;
      const pendingCount = pendingPayments.size;
      const approvedCount = Array.from(payments.values()).filter(p => p.status === 'approved').length;
      
      await bot.answerCallbackQuery(callbackQuery.id, {
        text: `📊 Watumiaji: ${totalUsers} | Yanayosubiri: ${pendingCount} | Yaliyothibitishwa: ${approvedCount}`,
        show_alert: true
      });
      return;
    }

    const payment = pendingPayments.get(paymentId);

    if (!payment) {
      await bot.answerCallbackQuery(callbackQuery.id, {
        text: '❌ Malipo hayajapatikana au yameshachakatwa',
        show_alert: true
      });
      return;
    }

    try {
      if (action === 'approve') {
        // Approve payment
        payment.status = 'approved';
        payment.approvedAt = new Date().toISOString();

        // Update user balance
        const user = Array.from(users.values()).find(u => u.id === payment.userId);
        if (user) {
          user.balance += payment.amount;
          users.set(user.phone, user);
          console.log(`💰 Balance updated: ${user.fullName} +${formatCurrency(payment.amount)} = ${formatCurrency(user.balance)}`);
        }

        // Move to confirmed payments
        payments.set(paymentId, payment);
        pendingPayments.delete(paymentId);

        // Update message
        const updatedMessage = callbackQuery.message.text + '\n\n✅ *MALIPO YAMETHIBITISHWA KIKAMILIFU*\n👨‍💼 *Imethibitishwa na:* Abada Bayuyu\n📅 *Wakati:* ' + new Date().toLocaleString('sw-TZ', { timeZone: 'Africa/Dar_es_Salaam' });
        
        await bot.editMessageText(updatedMessage, {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: 'Markdown'
        });

        await bot.answerCallbackQuery(callbackQuery.id, {
          text: `✅ Malipo ya ${formatCurrency(payment.amount)} yamethibitishwa!`,
          show_alert: false
        });

      } else if (action === 'reject') {
        // Reject payment
        payment.status = 'rejected';
        payment.rejectedAt = new Date().toISOString();

        // Move to confirmed payments
        payments.set(paymentId, payment);
        pendingPayments.delete(paymentId);

        // Update message
        const updatedMessage = callbackQuery.message.text + '\n\n❌ *MALIPO YAMEKATALIWA*\n👨‍💼 *Imekataliwa na:* Abada Bayuyu\n📅 *Wakati:* ' + new Date().toLocaleString('sw-TZ', { timeZone: 'Africa/Dar_es_Salaam' });
        
        await bot.editMessageText(updatedMessage, {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: 'Markdown'
        });

        await bot.answerCallbackQuery(callbackQuery.id, {
          text: `❌ Malipo ya ${formatCurrency(payment.amount)} yamekataliwa!`,
          show_alert: false
        });
      }

    } catch (error) {
      console.error('Callback handling error:', error);
      await bot.answerCallbackQuery(callbackQuery.id, {
        text: '❌ Hitilafu imetokea. Jaribu tena.',
        show_alert: true
      });
    }
  });

  // Bot error handling
  bot.on('polling_error', (error) => {
    console.error('Bot polling error:', error.message);
  });

  console.log('✅ Telegram bot initialized successfully');
} else {
  console.log('⚠️ Telegram bot not initialized - BOT_TOKEN missing');
}

// Global error handling
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

// Start server
app.listen(PORT, () => {
  console.log('\n🚀===========================================🚀');
  console.log('🎉 BALIKA WAKALA TANZANIA - BACKEND READY!');
  console.log('🚀===========================================🚀');
  console.log(`🌍 Port: ${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🤖 Bot: ${bot ? '✅ Active' : '❌ Inactive'}`);
  console.log(`👨‍💼 Admin: Abada Bayuyu (${ADMIN_CHAT_ID})`);
  console.log(`💳 Payment: 0687537030 (Baraka Laizer)`);
  console.log(`🐙 GitHub: https://github.com/balikawakala`);
  console.log(`🌐 Frontend: https://balikawakala.github.io`);
  console.log(`⏰ Started: ${new Date().toISOString()}`);
  console.log('🚀===========================================🚀\n');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down gracefully...');
  if (bot) {
    bot.stopPolling();
  }
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM, shutting down...');
  if (bot) {
    bot.stopPolling();
  }
  process.exit(0);
});

module.exports = app;const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
require('dotenv').config();

// Configuration
const BOT_TOKEN = process.env.BOT_TOKEN || '7637576419:AAErrm4F2C7jJcHTTt__3sQcKrh9tsqNxlg';
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID || '6949588855';
const PORT = process.env.PORT || 3000;

// Initialize bot and express
const bot = BOT_TOKEN ? new TelegramBot(BOT_TOKEN, { polling: true }) : null;
const app = express();

// Middleware
app.use(cors({
  origin: ['https://balikawakala.github.io', 'http://localhost:3000', 'https://localhost:3000'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// In-memory storage (will be replaced with database in production)
let users = new Map();
let payments = new Map();
let pendingPayments = new Map();

// Initialize with some demo data
console.log('🚀 Initializing Balika Wakala Tanzania Backend...');
console.log('👨‍💼 Admin: Abada Bayuyu');
console.log('📞 Payment Number: 0687537030 (Baraka Laizer)');
console.log('💬 Telegram Chat ID:', ADMIN_CHAT_ID);

// Utility functions
function generatePaymentId() {
  return crypto.randomBytes(6).toString('hex').toUpperCase();
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('sw-TZ').format(amount) + ' TZS';
}

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function formatPhoneNumber(phone) {
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('255')) {
    cleaned = '0' + cleaned.substring(3);
  }
  if (!cleaned.startsWith('0')) {
    cleaned = '0' + cleaned;
  }
  return cleaned;
}

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    status: '🚀 Balika Wakala Tanzania Backend Running!',
    timestamp: new Date().toISOString(),
    botStatus: bot ? '✅ Active' : '❌ Inactive',
    admin: 'Abada Bayuyu',
    paymentNumber: '0687537030 (Baraka Laizer)',
    totalUsers: users.size,
    pendingPayments: pendingPayments.size,
    completedPayments: payments.size,
    version: '1.0.0'
  });
});

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'API is working perfectly!',
    timestamp: new Date().toISOString()
  });
});

// User Registration
app.post('/api/register', async (req, res) => {
  try {
    const { fullName, phone, network, password } = req.body;
    
    // Validation
    if (!fullName || !phone || !network || !password) {
      return res.status(400).json({ 
        success: false,
        error: 'Taarifa zote ni lazima' 
      });
    }

    if (fullName.trim().length < 2) {
      return res.status(400).json({ 
        success: false,
        error: 'Jina kamili ni lazima (angalau herufi 2)' 
      });
    }

    const formattedPhone = formatPhoneNumber(phone);
    if (formattedPhone.length !== 10) {
      return res.status(400).json({ 
        success: false,
        error: 'Namba ya simu si sahihi' 
      });
    }

    if (password.length < 4) {
      return res.status(400).json({ 
        success: false,
        error: 'Neno la siri lazima liwe na angalau herufi 4' 
      });
    }

    // Check if user exists
    if (users.has(formattedPhone)) {
      return res.status(400).json({ 
        success: false,
        error: 'Mtumiaji tayari yupo na namba hii ya simu' 
      });
    }

    // Create user
    const user = {
      id: crypto.randomUUID(),
      fullName: fullName.trim(),
      phone: formattedPhone,
      network,
      password: hashPassword(password),
      balance: 0,
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString()
    };

    users.set(formattedPhone, user);
    console.log(`✅ New user registered: ${fullName} (${formattedPhone})`);

    // Send welcome notification to admin
    if (bot && BOT_TOKEN) {
      const welcomeMessage = `
🎉 *MTUMIAJI MPYA AMEJISAJILI*

👤 *Jina:* ${fullName}
📞 *Simu:* ${formattedPhone}
🌐 *Mtandao:* ${network.toUpperCase()}
⏰ *Wakati:* ${new Date().toLocaleString('sw-TZ', { timeZone: 'Africa/Dar_es_Salaam' })}

📊 *Jumla ya Watumiaji:* ${users.size}
      `;

      try {
        await bot.sendMessage(ADMIN_CHAT_ID, welcomeMessage, { parse_mode: 'Markdown' });
      } catch (error) {
        console.error('Failed to send welcome notification:', error.message);
      }
    }

    res.json({
      success: true,
      message: `Karibu ${fullName}! Umefanikiwa kujisajili. Unaweza kuanza kuweka salio sasa.`,
      user: {
        id: user.id,
        fullName: user.fullName,
        phone: user.phone,
        network: user.network,
        balance: user.balance
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Hitilafu ya mfumo. Jaribu tena.' 
    });
  }
});

// User Login
app.post('/api/login', async (req, res) => {
  try {
    const { phone, password } = req.body;
    
    if (!phone || !password) {
      return res.status(400).json({ 
        success: false,
        error: 'Namba ya simu na neno la siri ni lazima' 
      });
    }

    const formattedPhone = formatPhoneNumber(phone);
    const user = users.get(formattedPhone);
    
    if (!user) {
      return res.status(401).json({ 
        success: false,
        error: 'Mtumiaji hajapatikana. Hakikisha namba ya simu ni sahihi au jisajili kwanza.' 
      });
    }

    if (user.password !== hashPassword(password)) {
      return res.status(401).json({ 
        success: false,
        error: 'Neno la siri si sahihi' 
      });
    }

    // Update last login
    user.lastLogin = new Date().toISOString();
    users.set(formattedPhone, user);
    console.log(`✅ User logged in: ${user.fullName} (${formattedPhone})`);

    res.json({
      success: true,
      message: `Karibu tena ${user.fullName}! Salio lako la sasa ni ${formatCurrency(user.balance)}.`,
      user: {
        id: user.id,
        fullName: user.fullName,
        phone: user.phone,
        network: user.network,
        balance: user.balance
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Hitilafu ya mfumo. Jaribu tena.' 
    });
  }
});

// Submit Payment for Verification
app.post('/api/submit-payment', async (req, res) => {
  try {
    const { userId, amount, paymentPhone, network, userPhone } = req.body;
    
    // Validation
    if (!userId || !amount || !paymentPhone || !network || !userPhone) {
      return res.status(400).json({ 
        success: false,
        error: 'Taarifa zote ni lazima' 
      });
    }

    const user = Array.from(users.values()).find(u => u.id === userId);
    if (!user) {
      return res.status(404).json({ 
        success: false,
        error: 'Mtumiaji hajapatikana' 
      });
    }

    const paymentAmount = parseInt(amount);
    if (isNaN(paymentAmount) || paymentAmount < 1000 || paymentAmount > 10000000) {
      return res.status(400).json({ 
        success: false,
        error: 'Kiasi lazima kiwe kati ya 1,000 na 10,000,000 TZS' 
      });
    }

    const formattedPaymentPhone = formatPhoneNumber(paymentPhone);
    if (formattedPaymentPhone.length !== 10) {
      return res.status(400).json({ 
        success: false,
        error: 'Namba ya malipo si sahihi' 
      });
    }

    // Generate unique payment ID
    const paymentId = generatePaymentId();

    // Create payment record
    const payment = {
      id: paymentId,
      userId,
      userPhone: user.phone,
      userName: user.fullName,
      amount: paymentAmount,
      paymentPhone: formattedPaymentPhone,
      network,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    pendingPayments.set(paymentId, payment);

    // Send notification to admin via Telegram
    if (bot && BOT_TOKEN) {
      const adminMessage = `
🔔 *OMBI JIPYA LA MALIPO*

👤 *Mtumiaji:* ${user.fullName}
📞 *Namba ya Mtumiaji:* ${user.phone}
💰 *Kiasi:* ${formatCurrency(paymentAmount)}
📱 *Namba ya Malipo:* ${formattedPaymentPhone}
🌐 *Mtandao:* ${network.toUpperCase()}
🆔 *Payment ID:* \`${paymentId}\`

💳 *Namba ya Kuwekeza:* 0687537030 (Baraka Laizer)

⏰ *Wakati:* ${new Date().toLocaleString('sw-TZ', {
  timeZone: 'Africa/Dar_es_Salaam',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit'
})}

*Thibitisha malipo haya kwa kubofya vitufe vilivyo hapa chini:*
      `;

      const keyboard = {
        inline_keyboard: [
          [
            { 
              text: '✅ Thibitisha Malipo', 
              callback_data: `approve_${paymentId}` 
            },
            { 
              text: '❌ Kataa Malipo', 
              callback_data: `reject_${paymentId}` 
            }
          ],
          [
            {
              text: '📊 Angalia Takwimu',
              callback_data: `stats_${paymentId}`
            }
          ]
        ]
      };

      try {
        await bot.sendMessage(ADMIN_CHAT_ID, adminMessage, {
          parse_mode: 'Markdown',
          reply_markup: keyboard
        });
        console.log(`📱 Payment notification sent to admin: ${paymentId}`);
      } catch (telegramError) {
        console.error('Telegram notification error:', telegramError.message);
      }
    }

    console.log(`💰 Payment submitted: ${paymentId} by ${user.fullName} - ${formatCurrency(paymentAmount)}`);

    res.json({
      success: true,
      message: `Ombi la malipo limetumwa kikamilifu! Payment ID: ${paymentId}. Msimamizi atahakiki malipo yako na utapokea uhakikisho hivi karibuni.`,
      paymentId,
      expectedPaymentNumber: '0687537030',
      expectedPaymentName: 'Baraka Laizer'
    });

  } catch (error) {
    console.error('Payment submission error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Hitilafu ya mfumo. Jaribu tena.' 
    });
  }
});

// Check Payment Status
app.get('/api/payment-status/:paymentId', (req, res) => {
  try {
    const { paymentId } = req.params;
    
    const payment = pendingPayments.get(paymentId) || payments.get(paymentId);
    
    if (!payment) {
      return res.status(404).json({ 
        success: false,
        error: 'Malipo hayajapatikana' 
      });
    }

    res.json({
      success: true,
      payment: {
        id: payment.id,
        amount: payment.amount,
        status: payment.status,
        createdAt: payment.createdAt,
        approvedAt: payment.approvedAt || null,
        rejectedAt: payment.rejectedAt || null
      }
    });

  } catch (error) {
    console.error('Payment status error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Hitilafu ya mfumo' 
    });
  }
});

// Get User Balance
app.get('/api/balance/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = Array.from(users.values()).find(u => u.id === userId);
    if (!user) {
      return res.status(404).json({ 
        success: false,
        error: 'Mtumiaji hajapatikana' 
      });
    }

    res.json({
      success: true,
      balance: user.balance,
      lastUpdated: new Date().toISOString()
    });

  } catch (error) {
    console.error('Balance check error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Hitilafu ya mfumo' 
    });
  }
});

// Bot Commands
if (bot) {
  bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const isAdmin = chatId.toString() === ADMIN_CHAT_ID.toString();
    
    const welcomeMessage = `
🎉 *Karibu Balika Wakala Tanzania Bot!*

${isAdmin ? '👨‍💼 *Karibu Msimamizi!*' : '👤 *Karibu Mtumiaji!*'}

🤖 *Mimi ni bot wa kuthibitisha malipo*

📋 *Kazi yangu:*
• Kupokea taarifa za malipo
• Kutuma uhakikisho kwa msimamizi  
• Kusaidia katika mchakato wa malipo

👨‍💼 *Msimamizi:* Abada Bayuyu
📞 *Simu ya Malipo:* 0687537030 (Baraka Laizer)
📊 *Watumiaji:* ${users.size}
💰 *Malipo yanayosubiri:* ${pendingPayments.size}

🌐 *Tovuti:* https://balikawakala.github.io

*Ahsante kwa kutumia huduma zetu!* 🙏
    `;
    
    bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown' });
  });

  bot.onText(/\/help/, (msg) => {
    const chatId = msg.chat.id;
    const helpMessage = `
📚 *Msaada wa Bot - Balika Wakala Tanzania*

*Jinsi ya Kutumia:*
1️⃣ Tembelea: https://balikawakala.github.io
2️⃣ Jisajili kwa kutumia namba yako ya simu
3️⃣ Weka malipo kwa: *0687537030 (Baraka Laizer)*
4️⃣ Jaza fomu kwenye tovuti na malipo yako
5️⃣ Subiri uhakikisho (dakika 1-10)

*Aina za Malipo Zinazokubaliwa:*
💳 Airtel Money
💳 Vodacom M-Pesa  
💳 Tigo Pesa
💳 Halopesa
💳 T-Pesa

*Viwango vya Malipo:*
💰 Kiwango cha chini: 1,000 TZS
💰 Kiwango cha juu: 10,000,000 TZS

*Maswali?* Wasiliana na msimamizi: Abada Bayuyu

*Tovuti:* https://balikawakala.github.io
    `;
    
    bot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' });
  });

  bot.onText(/\/stats/, (msg) => {
    const chatId = msg.chat.id;
    
    if (chatId.toString() !== ADMIN_CHAT_ID.toString()) {
      bot.sendMessage(chatId, '❌ Huna ruhusa ya kuona takwimu');
      return;
    }

    const totalAmount = Array.from(payments.values())
      .filter(p => p.status === 'approved')
      .reduce((sum, p) => sum + p.amount, 0);

    const statsMessage = `
📊 *TAKWIMU ZA BALIKA WAKALA*

👥 *Watumiaji:* ${users.size}
⏳ *Malipo yanayosubiri:* ${pendingPayments.size}
✅ *Malipo yaliyothibitishwa:* ${Array.from(payments.values()).filter(p => p.status === 'approved').length}
❌ *Malipo yaliyokataliwa:* ${Array.from(payments.values()).filter(p => p.status === 'rejected').length}
💰 *Jumla ya malipo:* ${formatCurrency(totalAmount)}

⏰ *Takwimu za:* ${new Date().toLocaleString('sw-TZ', { timeZone: 'Africa/Dar_es_Salaam' })}
    `;

    bot.sendMessage(chatId, statsMessage, { parse_mode: 'Markdown' });
  });

  // Handle admin callback queries (approve/reject payments)
  bot.on('callback_query', async (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id;
    const data = callbackQuery.data;
    const messageId = callbackQuery.message.message_id;
    
    // Only admin can approve/reject
    if (chatId.toString() !== ADMIN_CHAT_ID.toString()) {
      await bot.answerCallbackQuery(callbackQuery.id, {
        text: '❌ Huna ruhusa ya kufanya hili',
        show_alert: true
      });
      return;
    }

    const [action, paymentId] = data.split('_');
    
    if (action === 'stats') {
      // Show stats without modifying payment
      const totalUsers = users.size;
      const pendingCount = pendingPayments.size;
      const approvedCount = Array.from(payments.values()).filter(p => p.status === 'approved').length;
      
      await bot.answerCallbackQuery(callbackQuery.id, {
        text: `📊 Watumiaji: ${totalUsers} | Yanayosubiri: ${pendingCount} | Yaliyothibitishwa: ${approvedCount}`,
        show_alert: true
      });
      return;
    }

    const payment = pendingPayments.get(paymentId);

    if (!payment) {
      await bot.answerCallbackQuery(callbackQuery.id, {
        text: '❌ Malipo hayajapatikana au yameshachakatwa',
        show_alert: true
      });
      return;
    }

    try {
      if (action === 'approve') {
        // Approve payment
        payment.status = 'approved';
        payment.approvedAt = new Date().toISOString();

        // Update user balance
        const user = Array.from(users.values()).find(u => u.id === payment.userId);
        if (user) {
          user.balance += payment.amount;
          users.set(user.phone, user);
          console.log(`💰 Balance updated: ${user.fullName} +${formatCurrency(payment.amount)} = ${formatCurrency(user.balance)}`);
        }

        // Move to confirmed payments
        payments.set(paymentId, payment);
        pendingPayments.delete(paymentId);

        // Update message
        const updatedMessage = callbackQuery.message.text + '\n\n✅ *MALIPO YAMETHIBITISHWA KIKAMILIFU*\n📅 *Imethibitishwa:* ' + new Date().toLocaleString('sw-TZ', { timeZone: 'Africa/Dar_es_Salaam' });
        
        await bot.editMessageText(updatedMessage, {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: 'Markdown'
        });

        await bot.answerCallbackQuery(callbackQuery.id, {
          text: `✅ Malipo ya ${formatCurrency(payment.amount)} yamethibitishwa kikamilifu!`,
          show_alert: false
        });

      } else if (action === 'reject') {
        // Reject payment
        payment.status = 'rejected';
        payment.rejectedAt = new Date().toISOString();

        // Move to confirmed payments (for record keeping)
        payments.set(paymentId, payment);
        pendingPayments.delete(paymentId);

        // Update message
        const updatedMessage = callbackQuery.message.text + '\n\n❌ *MALIPO YAMEKATALIWA*\n📅 *Imekataliwa:* ' + new Date().toLocaleString('sw-TZ', { timeZone: 'Africa/Dar_es_Salaam' });
        
        await bot.editMessageText(updatedMessage, {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: 'Markdown'
        });

        await bot.answerCallbackQuery(callbackQuery.id, {
          text: `❌ Malipo ya ${formatCurrency(payment.amount)} yamekataliwa!`,
          show_alert: false
        });
      }

    } catch (error) {
      console.error('Callback handling error:', error);
      await bot.answerCallbackQuery(callbackQuery.id, {
        text: '❌ Hitilafu imetokea. Jaribu tena.',
        show_alert: true
      });
    }
  });

  // Bot error handling
  bot.on('polling_error', (error) => {
    console.error('Bot polling error:', error.message);
  });

  console.log('✅ Telegram bot initialized successfully');
  console.log('🤖 Bot username: @' + (bot.getMe().then(me => console.log('Bot:', me.username))));
} else {
  console.log('⚠️ Telegram bot not initialized - BOT_TOKEN missing');
}

// Global error handling
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

// Start server
app.listen(PORT, () => {
  console.log('\n🚀==================================🚀');
  console.log('🎉 BALIKA WAKALA TANZANIA - BACKEND RUNNING!');
  console.log('🚀==================================🚀');
  console.log(`🌍 Port: ${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🤖 Bot: ${bot ? '✅ Active' : '❌ Inactive'}`);
  console.log(`👨‍💼 Admin: Abada Bayuyu (${ADMIN_CHAT_ID})`);
  console.log(`💳 Payment: 0687537030 (Baraka Laizer)`);
  console.log(`⏰ Started: ${new Date().toISOString()}`);
  console.log('🚀==================================🚀\n');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down gracefully...');
  if (bot) {
    bot.stopPolling();
  }
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM, shutting down...');
  if (bot) {
    bot.stopPolling();
  }
  process.exit(0);
});

module.exports = app;
