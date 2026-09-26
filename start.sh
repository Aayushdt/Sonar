#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# start.sh — Sonar Project Launcher
# Starts MongoDB, Express server, and Vite client in one command.
# ─────────────────────────────────────────────────────────────────────────────
#
# USAGE:
#   chmod +x start.sh    (first time only)
#   ./start.sh           (starts everything)
#
# WHAT EACH PART DOES:
#   1. System check       → Fixes Linux file watcher limit for Vite HMR
#   2. mongod             → Ensures MongoDB is running on localhost:27017
#   3. npm run dev        → Starts Express + Socket.io server on localhost:5000
#      (in server/)         Handles REST API, WebSocket signaling, Daily.co rooms
#   4. npm run dev        → Starts Vite React dev server on localhost:5173
#      (in client/)         Serves the frontend with hot module replacement
#
# TO STOP: Press Ctrl+C — all background processes will be killed automatically.
# ─────────────────────────────────────────────────────────────────────────────

# Colors for pretty output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"

echo -e "${CYAN}${BOLD}"
echo "  ╔═══════════════════════════════════════════╗"
echo "  ║        🔊 SONAR — Project Launcher        ║"
echo "  ╚═══════════════════════════════════════════╝"
echo -e "${NC}"

# ─────────────────────────────────────────────────────────────────────────────
# Trap Ctrl+C to kill all background processes on exit
# ─────────────────────────────────────────────────────────────────────────────
PIDS=()
cleanup() {
  echo ""
  echo -e "${YELLOW}⏹  Shutting down Sonar...${NC}"
  for pid in "${PIDS[@]}"; do
    kill "$pid" 2>/dev/null
  done
  for pid in "${PIDS[@]}"; do
    wait "$pid" 2>/dev/null
  done
  echo -e "${GREEN}✓  All processes stopped. Goodbye!${NC}"
  exit 0
}
trap cleanup SIGINT SIGTERM

# ─────────────────────────────────────────────────────────────────────────────
# Step 1: Check prerequisites (Node.js, npm)
# ─────────────────────────────────────────────────────────────────────────────
echo -e "${BOLD}[1/5] Checking prerequisites...${NC}"

if ! command -v node &> /dev/null; then
  echo -e "${RED}  ✗ Node.js not found. Install from https://nodejs.org${NC}"
  exit 1
fi
echo -e "  ${GREEN}✓${NC} Node.js $(node -v)"

if ! command -v npm &> /dev/null; then
  echo -e "${RED}  ✗ npm not found.${NC}"
  exit 1
fi
echo -e "  ${GREEN}✓${NC} npm $(npm -v)"
echo ""

# ─────────────────────────────────────────────────────────────────────────────
# Step 2: Fix Linux inotify file watcher limit (Vite needs this)
#   Vite's HMR watches many files. On Linux the default inotify limit is
#   often too low, causing ENOSPC errors. This bumps it to 524288.
#   Requires sudo — your password will be asked ONCE here.
# ─────────────────────────────────────────────────────────────────────────────
echo -e "${BOLD}[2/5] Checking file watcher limit...${NC}"
CURRENT_WATCHERS=$(cat /proc/sys/fs/inotify/max_user_watches 2>/dev/null || echo "524288")
NEEDED=524288

if [ "$CURRENT_WATCHERS" -lt "$NEEDED" ] 2>/dev/null; then
  echo -e "  ${YELLOW}⚠${NC}  Current limit: $CURRENT_WATCHERS (too low for Vite)"
  echo -e "  ${CYAN}→${NC}  Increasing to $NEEDED (requires your password once)..."
  sudo sysctl -w fs.inotify.max_user_watches=$NEEDED > /dev/null 2>&1
  if [ $? -eq 0 ]; then
    echo -e "  ${GREEN}✓${NC} File watcher limit set to $NEEDED"
  else
    echo -e "  ${RED}✗${NC} Failed to increase. Vite may crash."
    echo -e "    Run manually: ${BOLD}sudo sysctl -w fs.inotify.max_user_watches=524288${NC}"
  fi
else
  echo -e "  ${GREEN}✓${NC} File watcher limit is fine ($CURRENT_WATCHERS)"
fi
echo ""

# ─────────────────────────────────────────────────────────────────────────────
# Step 3: Install dependencies if needed
# ─────────────────────────────────────────────────────────────────────────────
echo -e "${BOLD}[3/5] Checking dependencies...${NC}"

if [ ! -d "$PROJECT_ROOT/server/node_modules" ]; then
  echo -e "  ${CYAN}📦 Installing server dependencies...${NC}"
  npm install --prefix "$PROJECT_ROOT/server"
else
  echo -e "  ${GREEN}✓${NC} Server dependencies installed"
fi

if [ ! -d "$PROJECT_ROOT/client/node_modules" ]; then
  echo -e "  ${CYAN}📦 Installing client dependencies...${NC}"
  npm install --prefix "$PROJECT_ROOT/client"
else
  echo -e "  ${GREEN}✓${NC} Client dependencies installed"
fi
echo ""

# ─────────────────────────────────────────────────────────────────────────────
# Step 4: Ensure MongoDB is running
#   Checks if port 27017 is open. If not, tries to start mongod.
#   If mongod isn't installed either, exits with clear instructions.
# ─────────────────────────────────────────────────────────────────────────────
echo -e "${BOLD}[4/5] Checking MongoDB...${NC}"

mongo_is_running() {
  # Check if anything is listening on port 27017
  (ss -tlnp 2>/dev/null || netstat -tlnp 2>/dev/null) | grep -q ':27017'
}

if mongo_is_running; then
  echo -e "  ${GREEN}✓${NC} MongoDB is running on port 27017"
elif command -v mongod &> /dev/null; then
  echo -e "  ${CYAN}→${NC} Starting MongoDB..."
  mkdir -p /tmp/sonar-mongo
  mongod --dbpath /tmp/sonar-mongo --quiet &
  PIDS+=($!)
  sleep 2
  if mongo_is_running; then
    echo -e "  ${GREEN}✓${NC} MongoDB started (PID: ${PIDS[-1]})"
  else
    echo -e "  ${RED}✗${NC} MongoDB failed to start"
    exit 1
  fi
else
  echo -e "  ${RED}✗ MongoDB is NOT running on port 27017.${NC}"
  echo ""
  echo -e "  ${BOLD}Install MongoDB to continue:${NC}"
  echo ""
  echo -e "  ${CYAN}Ubuntu/Debian:${NC}"
  echo -e "    sudo apt-get install -y gnupg curl"
  echo -e "    curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | sudo gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg"
  echo -e "    echo 'deb [signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse' | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list"
  echo -e "    sudo apt-get update && sudo apt-get install -y mongodb-org"
  echo -e "    sudo systemctl start mongod"
  echo ""
  echo -e "  ${CYAN}Or use MongoDB Atlas (free cloud):${NC}"
  echo -e "    1. Go to https://www.mongodb.com/atlas → Create free cluster"
  echo -e "    2. Copy your connection string"
  echo -e "    3. Edit server/.env → MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/sonar"
  echo -e "    4. Run ./start.sh again"
  echo ""
  exit 1
fi
echo ""

# ─────────────────────────────────────────────────────────────────────────────
# Step 5: Start server + client
# ─────────────────────────────────────────────────────────────────────────────
echo -e "${BOLD}[5/5] Starting services...${NC}"
echo ""

# ── 5a: Express + Socket.io server (port 5000) ──────────────────────────
echo -e "  ${CYAN}🖥️  Backend server${NC}"
echo -e "     Command: npm run dev --prefix server"
echo -e "     URL:     http://localhost:5000"
npm run dev --prefix "$PROJECT_ROOT/server" &
PIDS+=($!)
sleep 3
echo ""

# ── 5b: Vite React client (port 5173) ───────────────────────────────────
echo -e "  ${CYAN}🌐 Frontend client${NC}"
echo -e "     Command: npm run dev --prefix client"
echo -e "     URL:     http://localhost:5173"
npm run dev --prefix "$PROJECT_ROOT/client" &
PIDS+=($!)
sleep 3
echo ""

# ─────────────────────────────────────────────────────────────────────────────
# All running!
# ─────────────────────────────────────────────────────────────────────────────
echo -e "${GREEN}${BOLD}"
echo "  ╔═══════════════════════════════════════════╗"
echo "  ║         🔊 SONAR IS RUNNING!              ║"
echo "  ╠═══════════════════════════════════════════╣"
echo "  ║                                           ║"
echo "  ║  Frontend → http://localhost:5173         ║"
echo "  ║  Backend  → http://localhost:5000         ║"
echo "  ║  MongoDB  → mongodb://127.0.0.1:27017    ║"
echo "  ║                                           ║"
echo "  ║  Press Ctrl+C to stop all services.       ║"
echo "  ╚═══════════════════════════════════════════╝"
echo -e "${NC}"

# Wait for all background processes
wait
