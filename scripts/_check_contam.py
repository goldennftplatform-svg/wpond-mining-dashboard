#!/usr/bin/env python3
import json
import urllib.request
import re

def get(url):
    req = urllib.request.Request(url, headers={"user-agent": "mdb-contam-check"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read().decode("utf-8", "ignore")

print("=== Geoff market ===")
try:
    html = get("https://g-eight-psi.vercel.app/market.html")
    print("market.html bytes", len(html))
    print("has manifesto el", 'id="manifesto"' in html or "manifesto" in html.lower())
    print("has wpond", "wpond" in html.lower())
except Exception as e:
    print("market.html err", e)

for path in ["/api/market", "/api/intel", "/api/status"]:
    try:
        body = get(f"https://g-eight-psi.vercel.app{path}")
        low = body.lower()
        print(path, "bytes", len(body), "manifesto", "manifesto" in low, "wpond", "wpond" in low)
        if path == "/api/market":
            d = json.loads(body)
            m = d.get("manifesto") or {}
            print("  manifesto title:", m.get("title"))
            print("  keys:", list(d.keys())[:15])
    except Exception as e:
        print(path, "err", e)

print("\n=== MDB live ===")
try:
    html = get("https://wpond-mining-dashboard.vercel.app/")
    hits = re.findall(r"(?i)manifesto|geoff\.ai|stacknet|thermometer|market-scrape", html)
    print("html hits", hits[:10] or "none")
except Exception as e:
    print("mdb html err", e)

for path in [
    "/working-mining-data.json",
    "/band-claims-archive.json",
    "/recent-claims-live.json",
]:
    try:
        body = get(f"https://wpond-mining-dashboard.vercel.app{path}")
        low = body.lower()
        bad = [k for k in ("manifesto", "geoff.ai", "stacknet", "openai", "copilot") if k in low]
        print(path, "bytes", len(body), "contam_keys", bad or "clean")
    except Exception as e:
        print(path, "err", e)
