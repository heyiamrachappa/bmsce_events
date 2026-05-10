import { createWorker } from 'tesseract.js';

export interface ExtractedPaymentData {
  amount?: number;
  utr?: string;
  payerName?: string;
  app?: string;
  rawText: string;
}

export const preprocessImage = async (file: File): Promise<string> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }

        canvas.width = img.width;
        canvas.height = img.height;

        // Grayscale + High Contrast
        ctx.filter = 'grayscale(100%) contrast(150%)';
        ctx.drawImage(img, 0, 0);

        resolve(canvas.toDataURL('image/png'));
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
};

export const extractPaymentDetails = async (
  file: File,
  onProgress?: (progress: number) => void
): Promise<ExtractedPaymentData> => {
  const processedImage = await preprocessImage(file);
  const worker = await createWorker('eng', 1, {
    logger: (m) => {
      if (m.status === 'recognizing text' && onProgress) {
        onProgress(m.progress);
      }
    },
  });

  const { data: { text } } = await worker.recognize(processedImage);
  await worker.terminate();

  const data: ExtractedPaymentData = {
    rawText: text,
  };

  // Detection Logic
  const textLower = text.toLowerCase();

  // App Detection
  if (textLower.includes('google pay') || textLower.includes('gpay')) data.app = 'Google Pay';
  else if (textLower.includes('phonepe')) data.app = 'PhonePe';
  else if (textLower.includes('paytm')) data.app = 'Paytm';
  else if (textLower.includes('amazon pay')) data.app = 'Amazon Pay';

  // Amount Extraction (e.g. ₹ 500.00, Rs. 500, Total 500)
  const amountRegex = /(?:₹|rs\.?|total|amount)[\s]*([\d,]+(?:\.\d{2})?)/i;
  const amountMatch = text.match(amountRegex);
  if (amountMatch) {
    data.amount = parseFloat(amountMatch[1].replace(/,/g, ''));
  }

  // UTR / Transaction ID Extraction (12 digit standard for UPI)
  const utrRegex = /(?:utr|transaction id|txn id|upi ref no|ref no)[\s:]*(\d{12})/i;
  const utrMatch = text.match(utrRegex);
  if (utrMatch) {
    data.utr = utrMatch[1];
  } else {
    // Fallback: look for any 12 digit number
    const genericUtrRegex = /\b\d{12}\b/;
    const genericMatch = text.match(genericUtrRegex);
    if (genericMatch) data.utr = genericMatch[0];
  }

  // Payer Name Extraction (Hardest part)
  // Look for "From:", "Paid by:", or text near top/bottom depending on app
  const nameRegexes = [
    /(?:from|paid by|sender)[:\s]*([a-zA-Z\s]{3,30})/i,
    /([a-zA-Z\s]{3,30})\s*(?:paid|sent)/i,
  ];

  for (const regex of nameRegexes) {
    const match = text.match(regex);
    if (match && match[1]) {
      const name = match[1].trim();
      if (name.length > 3 && !['amount', 'total', 'transaction'].includes(name.toLowerCase())) {
        data.payerName = name;
        break;
      }
    }
  }

  return data;
};
