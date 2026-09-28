import importlib.util
import unittest
from pathlib import Path


MODULE_PATH = Path(__file__).resolve().parents[1] / "scripts" / "build_us_market_snapshot.py"
SPEC = importlib.util.spec_from_file_location("build_us_market_snapshot", MODULE_PATH)
MODULE = importlib.util.module_from_spec(SPEC)
assert SPEC and SPEC.loader
SPEC.loader.exec_module(MODULE)


class ValuationModelTests(unittest.TestCase):
    def test_forward_pe_is_primary(self):
        attractive = MODULE.score_valuation("General quality/value", 16, 25, 0.04, None, 100)
        expensive = MODULE.score_valuation("General quality/value", 45, 25, 0.04, None, 100)
        self.assertEqual(attractive, 4)
        self.assertEqual(expensive, 2)

    def test_ttm_and_fcf_are_auditable_fallbacks(self):
        self.assertEqual(
            MODULE.score_valuation("General quality/value", None, 18, 0.06, None, 100),
            4,
        )

    def test_banks_use_price_to_book(self):
        self.assertEqual(MODULE.score_valuation("Banks", 10, 14, None, 0.9, 100), 5)
        self.assertEqual(MODULE.score_valuation("Banks", 20, 22, None, 3, 100), 1)

    def test_reits_stay_neutral_without_pffo(self):
        self.assertEqual(MODULE.score_valuation("REITs", 11, 12, 0.1, None, 100), 3)

    def test_negative_forward_pe_is_not_treated_as_missing(self):
        self.assertEqual(
            MODULE.score_valuation("Biotech / drug development", -6.4, 6.2, 0.14, None, 100),
            2,
        )


class IndustryClassificationTests(unittest.TestCase):
    def test_technology_sector_falls_back_to_ai_cloud(self):
        self.assertEqual(
            MODULE.classify_template("Technology", "EDP Services"),
            "AI / cloud / platform technology",
        )

    def test_health_care_sector_falls_back_to_healthcare(self):
        self.assertEqual(
            MODULE.classify_template("Health Care", "Medical/Nursing Services"),
            "Healthcare",
        )

    def test_payment_and_platform_company_names_override_broad_industries(self):
        self.assertEqual(
            MODULE.classify_template("Consumer Discretionary", "Business Services Visa Inc."),
            "Payment networks / financial infrastructure",
        )
        self.assertEqual(
            MODULE.classify_template(
                "Technology",
                "Computer Software: Programming Data Processing GOOGL Alphabet Inc.",
            ),
            "AI / cloud / platform technology",
        )


if __name__ == "__main__":
    unittest.main()
