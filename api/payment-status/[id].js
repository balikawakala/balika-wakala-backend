const pendingPayments = new Map();
const payments = new Map();

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { id: paymentId } = req.query;
    
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
}
