import requests
import yaml
import os


class LocationService:
    IP_API_URL = "http://ip-api.com/json"

    def __init__(self, config_path=None):
        self.config_path = config_path or self._default_config()
        self._manual = self._load_manual_config()

    def _default_config(self):
        base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        return os.path.join(base, "config.yaml")

    def _load_manual_config(self):
        if os.path.exists(self.config_path):
            with open(self.config_path) as f:
                data = yaml.safe_load(f) or {}
            geo = data.get("geolocation", {})
            if geo.get("latitude") and geo.get("longitude"):
                return {
                    "latitude": float(geo["latitude"]),
                    "longitude": float(geo["longitude"]),
                    "ciudad": geo.get("ciudad", "Desconocida"),
                }
        return None

    def get_location(self):
        if self._manual:
            return self._manual

        try:
            resp = requests.get(self.IP_API_URL, timeout=5)
            resp.raise_for_status()
            data = resp.json()
            if data.get("status") == "success":
                return {
                    "latitude": data["lat"],
                    "longitude": data["lon"],
                    "ciudad": data.get("city", "Desconocida"),
                }
        except Exception:
            pass

        return {
            "latitude": 40.4168,
            "longitude": -3.7038,
            "ciudad": "Madrid",
        }