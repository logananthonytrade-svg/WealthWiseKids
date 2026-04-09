"""
bot_service.py — WealthWise Kids Bot Service
=============================================
Wraps V5_0.py (MCLRS v5.0) and publishes signals + trades to Supabase
so the mobile app can display them in the Trading Room (School 5).

Architecture:
  - Runs as a standalone Python service on Railway (separate from Node.js backend)
  - Imports the bot from Future_Bot/Futures/FutureV1.03/V5_0.py
  - After each scan cycle, writes to three Supabase tables:
      bot_signals  — every setup that passes gates 1-5 (± gate 6 ML)
      bot_trades   — entries, exits, P&L
      bot_status   — heartbeat: last_scan, watchlist, mode (paper/live)
  - The Node.js backend exposes these tables via /trading/* routes

Environment variables (set in Railway):
  SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY
  DATA_SOURCE        (csv | yfinance | tradovate)
  WATCHLIST          (comma-separated symbols, or FULL)
  PAPER_MODE         (true | false)
  BOT_SCAN_INTERVAL  (seconds between scans, default 60)
"""

import os
import sys
import json
import logging
import time
from datetime import datetime, timezone

from supabase import create_client, Client

# ---------------------------------------------------------------------------
# PATH — allow import of V5_0 from the Future_Bot repo
# When deployed on Railway both repos are present in the container.
# Adjust this path to match where you mount/clone the Future_Bot repo.
# ---------------------------------------------------------------------------
BOT_REPO_PATH = os.environ.get(
    "BOT_REPO_PATH",
    os.path.join(os.path.dirname(__file__), "..", "..", "Future_Bot",
                 "Futures", "FutureV1.03")
)
if BOT_REPO_PATH not in sys.path:
    sys.path.insert(0, BOT_REPO_PATH)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Supabase client
# ---------------------------------------------------------------------------
SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
db: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

SCAN_INTERVAL = int(os.environ.get("BOT_SCAN_INTERVAL", 60))


def publish_signal(signal: dict) -> None:
    """Write a gate-passing signal to bot_signals table."""
    row = {
        "symbol":       signal.get("symbol"),
        "direction":    signal.get("direction"),
        "pattern":      signal.get("pattern"),
        "entry_tf":     signal.get("entry_tf"),
        "entry_price":  signal.get("entry_price"),
        "stop":         signal.get("stop"),
        "target":       signal.get("target"),
        "rr":           signal.get("rr"),
        "ml_score":     signal.get("ml_score"),
        "gates_passed": signal.get("gates_passed", 5),
        "created_at":   datetime.now(timezone.utc).isoformat(),
    }
    db.table("bot_signals").insert(row).execute()


def publish_trade(trade: dict) -> None:
    """Write an opened or closed trade to bot_trades table."""
    db.table("bot_trades").upsert(trade, on_conflict="trade_id").execute()


def publish_status(watchlist: list, mode: str, last_scan: str) -> None:
    """Upsert a single heartbeat row to bot_status."""
    db.table("bot_status").upsert({
        "id":          1,
        "mode":        mode,
        "watchlist":   json.dumps(watchlist),
        "last_scan":   last_scan,
        "updated_at":  datetime.now(timezone.utc).isoformat(),
    }, on_conflict="id").execute()


def run_loop() -> None:
    """Main service loop — import bot, run scan, publish results."""
    try:
        from V5_0 import load_config, run_scan_cycle   # type: ignore
    except ImportError as e:
        logger.error("Cannot import V5_0: %s — check BOT_REPO_PATH", e)
        raise

    config = load_config()
    mode = "paper" if config.get("paper_mode", True) else "live"
    logger.info("Bot service starting — mode=%s watchlist=%s", mode, config["watchlist"])

    while True:
        try:
            signals, trades = run_scan_cycle(config)

            for sig in signals:
                publish_signal(sig)
                logger.info("Signal published: %s %s %s", sig["symbol"], sig["direction"], sig["pattern"])

            for trade in trades:
                publish_trade(trade)

            publish_status(
                watchlist=config["watchlist"],
                mode=mode,
                last_scan=datetime.now(timezone.utc).isoformat()
            )

        except Exception as e:
            logger.exception("Scan cycle error: %s", e)

        time.sleep(SCAN_INTERVAL)


if __name__ == "__main__":
    run_loop()
