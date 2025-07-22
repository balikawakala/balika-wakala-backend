// api/balance/[userId].js
import { storage } from '../lib/storage';

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { userId } = req.query;
    
    const user = Array.from(storage.users.values()).find(u => u.id === userId);
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
}
