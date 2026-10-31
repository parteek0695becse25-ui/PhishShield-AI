import ScannerPage from '../components/ScannerPage.jsx';
import { api } from '../services/api.js';

const SAMPLES = [
  { name: 'Harmless chat', value: "Hi! Are we still meeting for lunch tomorrow at 1pm? I'll book the table near the office." },
  {
    name: 'Fake prize',
    value: 'Congratulations! You have won Rs 25,00,000 in the KBC lucky draw. Click http://bit.ly/claim-now to claim your prize. Pay Rs 999 processing fee today.',
  },
  {
    name: 'Urgent account warning',
    value: 'URGENT: Your SBI account will be blocked within 24 hours. Complete KYC now at http://sbi-kyc-update.xyz/login and share your OTP to avoid suspension.',
  },
  { name: 'Genuine OTP notice', value: 'Your OTP is 482913. Do not share this code with anyone. Valid for 10 minutes.' },
  { name: 'Hinglish scam', value: 'Aapka account band ho jayega. Turant KYC update karein aur OTP bhejein.' },
];

export default function MessageScanner() {
  return (
    <ScannerPage
      title="Message scanner"
      intro="Paste an SMS, WhatsApp message or email. The scanner looks for prize bait, account threats, OTP and password requests, payment demands, pressure tactics and risky links."
      label="Message text"
      placeholder="Paste the message you received here"
      multiline
      maxLength={5000}
      samples={SAMPLES}
      scan={api.scanMessage}
      note="Press Ctrl+Enter to scan."
    />
  );
}
