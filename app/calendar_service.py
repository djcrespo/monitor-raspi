import os
import time
import yaml
import requests
from datetime import datetime, timedelta, date

from icalendar import Calendar
import recurring_ical_events


class CalendarService:
    """Consume un feed ICS (Apple Calendar, Google Calendar, etc.)
    y devuelve los próximos eventos para mostrar en el kiosk.
    """

    def __init__(self, config_path=None):
        base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        self.config_path = config_path or os.path.join(base, "config.yaml")
        self._load_config()
        self._cached_events = None
        self._last_fetch = 0

    def _load_config(self):
        defaults = {
            "enabled": False,
            "url": "",
            "refresh_interval": 3600,
            "max_events": 7,
            "days_ahead": 14,
        }
        self.config = defaults.copy()

        if os.path.exists(self.config_path):
            with open(self.config_path, encoding="utf-8") as f:
                data = yaml.safe_load(f) or {}
            cal = data.get("calendar", {})
            for key in defaults:
                if key in cal:
                    self.config[key] = cal[key]

    def _normalize_url(self, url):
        if not url:
            return ""
        url = str(url).strip()
        if url.startswith("webcal://"):
            url = "https://" + url[9:]
        return url

    def _fetch_ics(self):
        url = self._normalize_url(self.config["url"])
        if not url or not self.config["enabled"]:
            return None
        try:
            resp = requests.get(url, timeout=20)
            resp.raise_for_status()
            return resp.text
        except Exception:
            return None

    def _parse_events(self, ics_text):
        try:
            cal = Calendar.from_ical(ics_text)
        except Exception:
            return []

        now = datetime.now().astimezone()
        end = now + timedelta(days=int(self.config["days_ahead"]))

        events = []
        try:
            for event in recurring_ical_events.of(cal).between(now, end):
                summary = str(event.get("summary", "Sin título")).strip()
                dtstart = event.get("dtstart")
                if dtstart is None:
                    continue

                dt = dtstart.dt
                if isinstance(dt, date) and not isinstance(dt, datetime):
                    dt = datetime.combine(dt, datetime.min.time())
                    dt = dt.replace(tzinfo=now.tzinfo)
                elif dt.tzinfo is None:
                    dt = dt.replace(tzinfo=now.tzinfo)

                events.append({
                    "titulo": summary,
                    "fecha": dt.isoformat(),
                    "fecha_dia": dt.strftime("%Y-%m-%d"),
                    "hora": dt.strftime("%H:%M") if (dt.hour or dt.minute) else "",
                    "dia_semana": self._dia_semana(dt),
                })
        except Exception:
            return []

        events.sort(key=lambda e: e["fecha"])
        return events[: int(self.config["max_events"])]

    def _dia_semana(self, dt):
        dias = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]
        return dias[dt.weekday()]

    def get_events(self):
        if not self.config["enabled"]:
            return {"enabled": False, "eventos": []}

        now = time.time()
        cache_ttl = int(self.config["refresh_interval"])
        if self._cached_events is not None and (now - self._last_fetch) < cache_ttl:
            return {"enabled": True, "eventos": self._cached_events}

        ics_text = self._fetch_ics()
        if ics_text is None:
            return {"enabled": True, "eventos": self._cached_events or []}

        events = self._parse_events(ics_text)
        self._cached_events = events
        self._last_fetch = now
        return {"enabled": True, "eventos": events}
