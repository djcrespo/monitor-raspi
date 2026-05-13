import requests
from datetime import datetime


class WeatherService:
    BASE_URL = "https://api.open-meteo.com/v1/forecast"
    CURRENT_URL = "https://api.open-meteo.com/v1/forecast"

    def __init__(self, latitude=None, longitude=None):
        self.lat = latitude
        self.lon = longitude
        self._cached = None

    def get_weather(self):
        if not self.lat or not self.lon:
            return None

        params = {
            "latitude": self.lat,
            "longitude": self.lon,
            "current": "temperature_2m,apparent_temperature,weather_code",
            "daily": "temperature_2m_max,temperature_2m_min,weather_code",
            "timezone": "auto",
            "forecast_days": 5,
        }

        try:
            resp = requests.get(self.CURRENT_URL, params=params, timeout=10)
            resp.raise_for_status()
            data = resp.json()
        except Exception:
            return self._cached

        result = self._parse(data)
        self._cached = result
        return result

    def _parse(self, data):
        current = data.get("current", {})
        daily = data.get("daily", {})

        days = daily.get("time", [])
        max_temps = daily.get("temperature_2m_max", [])
        min_temps = daily.get("temperature_2m_min", [])
        codes = daily.get("weather_code", [])

        forecast = []
        for i, day in enumerate(days):
            forecast.append({
                "fecha": day,
                "max": round(max_temps[i], 1),
                "min": round(min_temps[i], 1),
                "codigo": codes[i],
                "icono": self._weather_icon(codes[i]),
            })

        return {
            "temp": round(current.get("temperature_2m", 0), 1),
            "sensacion": round(current.get("apparent_temperature", 0), 1),
            "codigo": current.get("weather_code", 0),
            "icono": self._weather_icon(current.get("weather_code", 0)),
            "pronostico": forecast,
        }

    def _weather_icon(self, code):
        mapping = {
            0: "soleado",
            1: "mayormente_soleado",
            2: "parcialmente_nublado",
            3: "nublado",
            45: "niebla",
            48: "niebla",
            51: "llovizna",
            53: "llovizna",
            55: "llovizna",
            61: "lluvia",
            63: "lluvia",
            65: "lluvia",
            66: "lluvia_congelante",
            67: "lluvia_congelante",
            71: "nieve",
            73: "nieve",
            75: "nieve",
            77: "granos",
            80: "chubascos",
            81: "chubascos",
            82: "chubascos",
            85: "chubascos_nieve",
            86: "chubascos_nieve",
            95: "tormenta",
            96: "tormenta",
            99: "tormenta",
        }
        return mapping.get(code, "desconocido")