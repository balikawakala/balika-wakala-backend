// api/login.js
import { storage, hashPassword, formatPhoneNumber, formatCurrency } from './lib/storage';

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
    const user = storage.users.get(formattedPhone);
    
    console.log(`Login attempt for: ${formattedPhone}`);
    console.log(`Total users in storage: ${storage.users.size}`);
    
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
    storage.users.set(formattedPhone, user);
    
    console.log(`✅ Successful login: ${user.fullName} (${formattedPhone})`);

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
