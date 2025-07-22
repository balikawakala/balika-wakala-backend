// api/submit-payment.js
const TelegramBot = require('node-telegram-bot-api');
import { storage, formatPhoneNumber, formatCurrency, generatePaymentId } from './lib/storage';

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
    const { userId, amount, paymentPhone, network, userPhone } = req.body;
    
    // Validation
    if (!userId || !amount || !paymentPhone || !network || !userPhone) {
      return res.status(400).json({ 
        success: false,
        error: 'Taarifa zote ni lazima' 
      });
    }

    const user = Array.from(storage.users.values()).find(u => u.id === userId);
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

    storage.pendingPayments.set(paymentId, payment);
    console.log(`💰 Payment submitted: ${paymentId} - ${user.fullName} - ${formatCurrency(paymentAmount)}`);

    // Send notification to admin via Telegram
    if (process.env.BOT_TOKEN && process.env.ADMIN_CHAT_ID) {
      try {
        const bot = new TelegramBot(process.env.BOT_TOKEN);
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
            ]
          ]
        };

        await bot.sendMessage(process.env.ADMIN_CHAT_ID, adminMessage, {
          parse_mode: 'Markdown',
          reply_markup: keyboard
        });
      } catch (telegramError) {
        console.error('Telegram error:', telegramError.message);
      }
    }

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
}
