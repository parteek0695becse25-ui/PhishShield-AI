import ScannerPage from '../components/ScannerPage.jsx';
import { api } from '../services/api.js';

const SAMPLES = [
  { name: 'Normal HTTPS site', value: 'https://www.wikipedia.org/wiki/Phishing' },
  { name: 'IP-based address', value: 'http://192.168.10.5/secure/login/verify-account.php' },
  { name: 'Brand in wrong domain', value: 'https://paypal.com.account-verify.xyz/signin' },
  { name: 'Look-alike spelling', value: 'https://www.paypa1.com/login' },
  { name: 'Shortened link', value: 'https://bit.ly/3abcXYZ' },
  { name: 'Invalid URL', value: 'not a real url' },
];

export default function UrlScanner() {
  return (
    <ScannerPage
      title="URL scanner"
      intro="Enter a web address and see which parts of it look risky. The address is only read as text. It is never opened, so scanning a dangerous link is safe."
      label="Web address"
      placeholder="https://example.com/page"
      multiline={false}
      maxLength={2048}
      samples={SAMPLES}
      scan={api.scanUrl}
      note="No live threat database is queried."
    />
  );
}
