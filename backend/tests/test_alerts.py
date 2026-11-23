import unittest

from main import evaluate_alerts


def make_forecast(temperature=22, humidity=45, high=25, rain=10, wind=12):
    return {
        "current": {"temperature_2m": temperature, "relative_humidity_2m": humidity},
        "hourly": {"precipitation_probability": [rain], "wind_speed_10m": [wind]},
        "daily": {"temperature_2m_max": [high]},
    }


class AlertRuleTests(unittest.TestCase):
    def test_normal_conditions_produce_no_alerts(self):
        self.assertEqual(evaluate_alerts(make_forecast()), [])

    def test_rain_threshold_produces_rain_alert(self):
        alerts = evaluate_alerts(make_forecast(rain=85))
        self.assertIn("Rain expected soon", [alert["title"] for alert in alerts])

    def test_high_temperature_threshold_produces_heat_alert(self):
        alerts = evaluate_alerts(make_forecast(high=41))
        self.assertIn("High temperature", [alert["title"] for alert in alerts])

    def test_wind_threshold_produces_wind_alert(self):
        alerts = evaluate_alerts(make_forecast(wind=70))
        self.assertIn("Strong winds", [alert["title"] for alert in alerts])

    def test_humidity_threshold_produces_humidity_alert(self):
        alerts = evaluate_alerts(make_forecast(humidity=90))
        self.assertIn("High humidity", [alert["title"] for alert in alerts])


if __name__ == "__main__":
    unittest.main()
