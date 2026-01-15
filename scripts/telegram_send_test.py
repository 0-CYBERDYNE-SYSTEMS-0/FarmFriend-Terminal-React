#!/usr/bin/env python3
import json
import os
import sys
import urllib.request

CONFIG_PATH = os.path.expanduser("~/Library/Application Support/ff-terminal/config.json")


def load_config():
    with open(CONFIG_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def resolve_chat_id(cfg, override):
    if override:
        return int(override)
    allow_from = cfg.get("telegram", {}).get("allow_from", [])
    for entry in allow_from:
        try:
            value = int(str(entry).strip())
        except ValueError:
            continue
        # Prefer chat-sized ids if present.
        if value > 1000000:
            return value
    raise SystemExit("No chat_id provided and none found in telegram.allow_from")


def main():
    if len(sys.argv) < 2:
        raise SystemExit("Usage: python scripts/telegram_send_test.py \"message\" [chat_id]")
    message = sys.argv[1]
    chat_id = sys.argv[2] if len(sys.argv) > 2 else None
    cfg = load_config()
    token = cfg.get("telegram", {}).get("token")
    if not token:
        raise SystemExit("Telegram token missing in config.json")
    chat_id = resolve_chat_id(cfg, chat_id)
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    payload = json.dumps({"chat_id": chat_id, "text": message}).encode("utf-8")
    req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=10) as res:
        body = res.read().decode("utf-8")
    print(body)


if __name__ == "__main__":
    main()
