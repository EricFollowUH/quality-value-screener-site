import importlib.util
import unittest
from pathlib import Path


MODULE_PATH = Path(__file__).resolve().parents[1] / "scripts" / "build_us_market_snapshot.py"
SPEC = importlib.util.spec_from_file_location("build_us_market_snapshot", MODULE_PATH)
MODULE = importlib.util.module_from_spec(SPEC)
assert SPEC and SPEC.loader
SPEC.loader.exec_module(MODULE)


class ValuationModelTests(unittest.TestCase):
    def test_snapshot_deducts_software_and_applies_microcap_gate(self):
        facts = {MODULE.ANNUAL_FRAMES[0]: {k: {"value": v, "end": "2025-12-31"} for k, v in {
            "revenue": 11.3e6, "netIncome": 6.8e6, "grossProfit": 9.2e6,
            "operatingIncome": 3.25e6, "operatingCashflow": 4.073e6,
            "capex": 12000, "capitalizedSoftware": 1.1e6}.items()}}
        result = MODULE.score_stock({"ticker": "TEST", "name": "Test Games", "exchange": "Nasdaq"}, {"sector": "Technology", "industry": "Video Games", "marketCap": 19e6, "lastsale": 4.2}, {}, facts, "2026-11-09T00:00:00Z")
        self.assertAlmostEqual(result["metrics"]["freeCashflow"], 2.961e6)
        self.assertFalse(result["highQualityEligible"])
        self.assertEqual(result["risk"], 1)
        self.assertIsNone(result["metrics"]["trailingPE"])
        self.assertIsNotNone(result["metrics"]["annualPE"])

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
    def test_health_name_does_not_turn_an_insurer_into_a_hospital(self):
        self.assertEqual(MODULE.classify_template('Finance','Accident & Health Insurance','OSCR','Oscar Health Inc.'),'Insurance')

    def test_healthcare_business_overrides_bad_exchange_sector(self):
        self.assertEqual(MODULE.classify_template('Consumer Discretionary','Business Services','NUTX','Nutex Health Inc.'), 'Healthcare services / hospitals')

    def test_games_are_not_enterprise_saas(self):
        self.assertEqual(MODULE.classify_template("Technology", "Computer Software: Prepackaged Software", "MSGM", "Motorsport Games Inc."), "Games / interactive entertainment")

    def test_loss_to_profit_is_not_a_normal_growth_rate(self):
        self.assertIsNone(MODULE.growth_rate(100, -50))

    def test_technology_sector_falls_back_to_ai_cloud(self):
        self.assertEqual(
            MODULE.classify_template("Technology", "EDP Services"),
            "AI / cloud / platform technology",
        )

    def test_health_care_sector_falls_back_to_healthcare(self):
        self.assertEqual(
            MODULE.classify_template("Health Care", "Medical/Nursing Services"),
            "Healthcare services / hospitals",
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
