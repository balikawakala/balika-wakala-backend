const crypto = require('crypto');

// Import users storage (in production, use a database)
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

function formatCurrency(amount) {
  return new Intl.NumberFormat('sw-TZ').format(amount) + ' TZS';
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
}
