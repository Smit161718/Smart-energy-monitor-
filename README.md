# 🔌 IoT Smart Energy Monitor

**Full-stack web app** for real-time electricity monitoring using **ESP32 + PZEM-004T V4** with live bill estimation.

## Tech Stack
- **Frontend**: React.js + Recharts + Vite
- **Backend**: Node.js + Express.js
- **Database**: MySQL
- **Hardware**: ESP32 DevKit V1 (30-pin) + PZEM-004T V4 + 100A CT Clamp

---

## 📁 Project Structure
```
smart-energy-monitor/
├── backend/       → Node.js + Express REST API
├── frontend/      → React.js dashboard
├── database/      → MySQL schema SQL script
├── esp32/         → Arduino sketch for ESP32
└── README.md
```

---

## ⚡ Quick Setup

### Step 1: MySQL Database
```bash
# Open MySQL Workbench or terminal
mysql -u root -p < database/schema.sql
```

### Step 2: Backend
```bash
cd backend

# Copy env file and configure it
copy .env.example .env
# Edit .env → set DB_PASSWORD, DEVICE_API_KEY, etc.

# Install dependencies
npm install

# Start server
npm run dev
# Server runs at http://localhost:5000
```

### Step 3: Frontend
```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
# App runs at http://localhost:5173
```

### Step 4: ESP32 Setup

**Arduino IDE Libraries** (install via Library Manager):
- `PZEM004Tv30` by mandulaj
- `ArduinoJson` by Benoit Blanchon

**Wiring:**
```
PZEM-004T          ESP32 DevKit V1
-----------        ---------------
TX      ────────→  GPIO 16 (RX2)
RX      ←────────  GPIO 17 (TX2)
VCC     ────────→  5V
GND     ────────→  GND

CT Clamp → PZEM CT port (clamp around LIVE wire only)
```

**Configure the sketch** (`esp32/energy_monitor/energy_monitor.ino`):
```cpp
const char* WIFI_SSID      = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD  = "YOUR_WIFI_PASSWORD";
const char* SERVER_IP      = "192.168.x.x";  // Your PC's IP on the same Wi-Fi
const char* DEVICE_API_KEY = "esp32-secret-key-change-this"; // Must match backend .env
```

**Upload** → Select board `ESP32 Dev Module`, upload the sketch, open Serial Monitor at 115200 baud.

---

## 🌐 Pages & Features

| Page | Features |
|------|----------|
| **Login / Register** | JWT auth, forgot password |
| **Dashboard** | 8 live metric cards, 4 real-time charts, bill cards, auto-refresh every 5s |
| **History** | Sortable table, search, pagination, CSV & PDF export |
| **Reports** | Daily / Weekly / Monthly charts + PDF export |
| **Settings** | Tariff config, notification toggles, profile update, password change |

---

## 🔗 REST API Reference

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Login + JWT |
| POST | `/api/auth/forgot-password` | Request reset link |

### Meter (ESP32 Device)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| **POST** | `/api/meter` | `X-Device-Key` | ESP32 posts readings |
| GET | `/api/meter/latest` | JWT | Latest reading |
| GET | `/api/meter/history` | JWT | Paginated history |
| GET | `/api/meter/daily` | JWT | Hourly aggregates |
| GET | `/api/meter/weekly` | JWT | 7-day summary |
| GET | `/api/meter/monthly` | JWT | Monthly summary |
| GET | `/api/meter/bill` | JWT | Bill calculations |
| GET | `/api/meter/chart` | JWT | Last N readings for charts |

### Settings
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/settings` | Get settings |
| PUT | `/api/settings/tariff` | Update tariff |
| PUT | `/api/settings/profile` | Update profile |
| PUT | `/api/settings/password` | Change password |
| PUT | `/api/settings/notifications` | Notification prefs |

---

## 📦 ESP32 JSON Payload
The ESP32 POSTs this JSON to `POST /api/meter` every 5 seconds:
```json
{
  "voltage":     230.5,
  "current":     2.340,
  "power":       538.22,
  "energy":      12.4521,
  "frequency":   50.0,
  "powerFactor": 0.9800
}
```
Header: `X-Device-Key: esp32-secret-key-change-this`

---

## 🔒 Security
- Passwords hashed with **bcryptjs** (10 salt rounds)
- **JWT** tokens for user sessions (7-day expiry)
- **Device API key** protects ESP32 endpoint
- **Rate limiting** on auth routes (20 req/15min)
- **CORS** configured for frontend origin only

---

## 💡 Bill Estimation Formula
```
Bill (₹) = Energy (kWh) × Tariff (₹/kWh)
```
Default tariff: **₹8.00/kWh** (configurable in Settings)

---

## 🛠️ Environment Variables (backend/.env)
```env
PORT=5000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=smart_energy_db
JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRES_IN=7d
DEVICE_API_KEY=esp32-secret-key-change-this
FRONTEND_URL=http://localhost:5173
```

---

## 📸 Screenshots

| Login | Dashboard | History |
|-------|-----------|---------|
| Split-screen auth | 8 live metric cards + 4 charts | Paginated table + CSV/PDF |

---

## 🐛 Troubleshooting

**PZEM reads NaN:**
- Verify wiring: TX→GPIO16, RX→GPIO17
- CT clamp must go around LIVE wire ONLY (not neutral)
- Supply 5V to PZEM, not 3.3V

**ESP32 can't reach server:**
- Ensure PC and ESP32 are on the same Wi-Fi network
- Disable PC firewall for port 5000 temporarily
- Check `SERVER_IP` matches your PC's actual IP (`ipconfig` in Windows)

**HTTP 401 from server:**
- `DEVICE_API_KEY` in sketch must match `DEVICE_API_KEY` in backend `.env`
