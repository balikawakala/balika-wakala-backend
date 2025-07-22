const TelegramBot = require('node-telegram-bot-api');
const crypto = require('crypto');

// Simple in-memory storage (replace with database for production)
const users = new Map();

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

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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

    // Notify admin via Telegram
    if (process.env.BOT_TOKEN) {
      try {
        const bot = new TelegramBot(process.env.BOT_TOKEN);
        const welcomeMessage = `
🎉 *MTUMIAJI MPYA AMEJISAJILI*

👤 *Jina:* ${fullName}
📞 *Simu:* ${formattedPhone}
🌐 *Mtandao:* ${network.toUpperCase()}
⏰ *Wakati:* ${new Date().toLocaleString('sw-TZ', { timeZone: 'Africa/Dar_es_Salaam' })}

📊 *Jumla ya Watumiaji:* ${users.size}

🌐 *Tovuti:* https://balikawakala.github.io
        `;

        await bot.sendMessage(process.env.ADMIN_CHAT_ID, welcomeMessage, { parse_mode: 'Markdown' });
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
}
