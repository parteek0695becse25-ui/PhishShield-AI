"""Run with:  python -m unittest discover -s tests   (from the ai-engine folder)"""
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from detector import analyze_message          # noqa: E402
from url_analyzer import analyze_url, InvalidUrlError  # noqa: E402


class MessageTests(unittest.TestCase):
    def test_harmless(self):
        r = analyze_message("Hi! Are we still meeting for lunch tomorrow at 1pm? I'll book the table.")
        self.assertEqual(r["risk_level"], "LOW")
        self.assertEqual(r["risk_score"], 0)

    def test_legit_otp_notice_is_not_flagged(self):
        r = analyze_message("Your OTP is 482913. Do not share this code with anyone. Valid for 10 minutes.")
        self.assertEqual(r["risk_level"], "LOW", r)

    def test_fake_prize(self):
        r = analyze_message("Congratulations! You have won Rs 25,00,000 in the KBC lucky draw. "
                            "Click http://bit.ly/claim-now to claim your prize. Pay Rs 999 processing fee.")
        self.assertIn(r["risk_level"], ("HIGH", "CRITICAL"))
        names = [i["name"] for i in r["indicators"]]
        self.assertIn("Fake prize or lottery claim", names)
        self.assertIn("Payment, fee or money transfer demand", names)

    def test_urgent_account_warning(self):
        r = analyze_message("URGENT: Your SBI account will be blocked within 24 hours. "
                            "Complete KYC now: http://sbi-kyc-update.xyz/login")
        self.assertEqual(r["risk_level"], "CRITICAL", r["risk_score"])

    def test_otp_request(self):
        r = analyze_message("Dear customer, please share your OTP to avoid suspension.")
        self.assertIn("Request for OTP, PIN or CVV", [i["name"] for i in r["indicators"]])

    def test_hinglish(self):
        r = analyze_message("Aapka account band ho jayega. Turant KYC update karein aur OTP bhejein.")
        self.assertGreaterEqual(r["risk_score"], 50)

    def test_score_capped(self):
        text = ("URGENT final notice!!!! You have won lottery. Share your OTP and password. "
                "Pay Rs 500 processing fee. Install AnyDesk. Police arrest warrant. "
                "SBI account blocked. http://192.168.1.5/login do not tell anyone")
        r = analyze_message(text)
        self.assertLessEqual(r["risk_score"], 100)
        self.assertEqual(r["risk_level"], "CRITICAL")

    def test_indicator_structure(self):
        r = analyze_message("Your account will be suspended. Verify your account now.")
        for ind in r["indicators"]:
            for key in ("name", "severity", "explanation", "evidence", "recommendation"):
                self.assertTrue(ind[key])
        self.assertFalse(r["engine"]["machine_learning"])
        self.assertIn("false positives", r["disclaimer"].lower())


class UrlTests(unittest.TestCase):
    def test_normal_https(self):
        r = analyze_url("https://www.google.com/search?q=weather")
        self.assertEqual(r["risk_level"], "LOW")
        self.assertEqual(r["risk_score"], 0)

    def test_ip_url(self):
        r = analyze_url("http://192.168.10.5/secure/login/verify-account.php")
        self.assertIn(r["risk_level"], ("HIGH", "CRITICAL"))
        self.assertIn("Address is an IP number", [i["name"] for i in r["indicators"]])

    def test_brand_in_wrong_domain(self):
        r = analyze_url("https://paypal.com.account-verify.xyz/signin")
        self.assertEqual(r["risk_level"], "CRITICAL", r["risk_score"])

    def test_lookalike(self):
        r = analyze_url("https://www.paypa1.com/login")
        self.assertIn("Look-alike of a known brand", [i["name"] for i in r["indicators"]])

    def test_real_brand_domain_ok(self):
        r = analyze_url("https://www.amazon.in/gp/help")
        self.assertEqual(r["risk_level"], "LOW")
        self.assertEqual(r["risk_score"], 0)

    def test_shortener(self):
        r = analyze_url("https://bit.ly/3abcXYZ")
        self.assertIn("Shortened link", [i["name"] for i in r["indicators"]])

    def test_at_trick(self):
        r = analyze_url("https://www.sbi.co.in@evil-site.top/login")
        self.assertIn("'@' hides the real destination", [i["name"] for i in r["indicators"]])

    def test_missing_scheme_is_accepted(self):
        r = analyze_url("example.com/page")
        self.assertTrue(r["url_details"]["scheme_added"])

    def test_invalid_urls(self):
        for bad in ["", "   ", "not a url", "hello", "http://", "http://exa mple.com", "https://-bad-.com",
                    "http://localhost", "ftp2://x.com", "http://a.b.c1"]:
            with self.assertRaises(InvalidUrlError, msg=bad):
                analyze_url(bad)

    def test_dangerous_scheme(self):
        r = analyze_url("javascript:alert(1)")
        self.assertEqual(r["risk_level"], "CRITICAL")

    def test_too_long(self):
        with self.assertRaises(InvalidUrlError):
            analyze_url("https://example.com/" + "a" * 3000)

    def test_score_never_exceeds_100(self):
        r = analyze_url("http://192.168.0.1:8080/login/verify/account/update/secure/password/kyc/bonus.exe?redirect=http://x.com")
        self.assertLessEqual(r["risk_score"], 100)


if __name__ == "__main__":
    unittest.main()
