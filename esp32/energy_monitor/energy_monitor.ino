/*
 * ============================================================
 *  IoT Smart Energy Monitor — ESP32 Firmware
 *  Hardware: ESP32 DevKit V1 (30-pin) + PZEM-004T V3/V4
 *  Library:  mandulaj/PZEM-004T-v30
 * 
 *  Wiring:
 *    PZEM TX → ESP32 GPIO16 (RX2)
 *    PZEM RX → ESP32 GPIO17 (TX2)
 *    PZEM VCC → 5V
 *    PZEM GND → GND
 *    CT Clamp → PZEM CT port (clamp around LIVE wire only)
 * 
 *  Setup Arduino IDE:
 *    1. Install "PZEM004Tv30" by mandulaj via Library Manager
 *    2. Install "ArduinoJson" by Benoit Blanchon via Library Manager
 *    3. Select Board: "ESP32 Dev Module"
 *    4. Set your Wi-Fi SSID, PASSWORD, and SERVER_IP below
 * ============================================================
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <PZEM004Tv30.h>

// ── Configuration ─────────────────────────────────────────────
const char* WIFI_SSID     = "OnePlus Nord CE 2 Lite 5G";        // 🔧 Change this
const char* WIFI_PASSWORD = "@d1tya0091";    // 🔧 Change this
const char* PUBLIC_URL    = "http://powermeter-smit.loca.lt"; // 📌 Permanent fixed domain URL
const char* SERVER_IP     = "192.168.0.110";        // 🔧 Local fallback IP
const int   SERVER_PORT   = 5000;
const char* DEVICE_API_KEY = "none";

// ── PZEM-004T on Hardware Serial2 ─────────────────────────────
// GPIO16 = RX2, GPIO17 = TX2
PZEM004Tv30 pzem(Serial2, 16, 17);

// ── Timing ────────────────────────────────────────────────────
const unsigned long SEND_INTERVAL_MS = 5000; // 5 seconds
unsigned long lastSendTime = 0;

// ── LED Indicator ─────────────────────────────────────────────
const int LED_PIN = 2; // Built-in LED on most ESP32 DevKit boards

// ── Helper: Connect to Wi-Fi ───────────────────────────────────
void connectWiFi() {
  Serial.print("Connecting to Wi-Fi: ");
  Serial.println(WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 40) {
    delay(500);
    Serial.print(".");
    digitalWrite(LED_PIN, !digitalRead(LED_PIN)); // Blink during connect
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    digitalWrite(LED_PIN, HIGH);
    Serial.println("\n✅ Wi-Fi Connected!");
    Serial.print("   IP Address: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\n❌ Wi-Fi connection failed! Will retry...");
    digitalWrite(LED_PIN, LOW);
  }
}

// ── Setup ──────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  delay(1000);
  
  pinMode(LED_PIN, OUTPUT);
  
  Serial.println("\n================================================");
  Serial.println("  Smart Energy Monitor — ESP32 Firmware");
  Serial.println("================================================");
  
  // Connect Wi-Fi
  connectWiFi();
  
  // Initialize PZEM Serial2 (GPIO16 RX2, GPIO17 TX2)
  Serial2.begin(9600, SERIAL_8N1, 16, 17);
  Serial.println("✅ PZEM-004T initialized on Serial2 (GPIO16/17)");
  
  Serial.println("🚀 Starting data transmission every 5 seconds...\n");
}

// ── Send Data to Backend ───────────────────────────────────────
bool sendToServer(float voltage, float current, float power, float energy, float frequency, float powerFactor) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("⚠️  Wi-Fi disconnected. Reconnecting...");
    connectWiFi();
    return false;
  }
  
  // Build server URL (uses PUBLIC_URL if set, else falls back to SERVER_IP:PORT)
  String url = (strlen(PUBLIC_URL) > 0) 
               ? String(PUBLIC_URL) + "/api/meter" 
               : "http://" + String(SERVER_IP) + ":" + String(SERVER_PORT) + "/api/meter";
  
  // Build JSON payload
  StaticJsonDocument<256> doc;
  doc["voltage"]     = voltage;
  doc["current"]     = current;
  doc["power"]       = power;
  doc["energy"]      = energy;
  doc["frequency"]   = frequency;
  doc["powerFactor"] = powerFactor;
  
  String jsonBody;
  serializeJson(doc, jsonBody);
  
  // HTTP POST
  HTTPClient http;
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-Key", DEVICE_API_KEY);
  http.setTimeout(8000);
  
  int httpCode = http.POST(jsonBody);
  
  if (httpCode == 201 || httpCode == 200) {
    String response = http.getString();
    Serial.print("✅ Server OK [");
    Serial.print(httpCode);
    Serial.print("] → ");
    Serial.println(response);
    http.end();
    return true;
  } else {
    Serial.print("❌ HTTP Error: ");
    Serial.println(httpCode);
    http.end();
    return false;
  }
}

// ── Main Loop ──────────────────────────────────────────────────
void loop() {
  unsigned long now = millis();
  
  if (now - lastSendTime >= SEND_INTERVAL_MS) {
    lastSendTime = now;
    
    // Read all parameters from PZEM-004T
    float voltage     = pzem.voltage();
    float current     = pzem.current();
    float power       = pzem.power();
    float energy      = pzem.energy();
    float frequency   = pzem.frequency();
    float powerFactor = pzem.pf();
    
    // Check if readings are valid (NaN = no device or CT not connected)
    if (isnan(voltage) || isnan(current) || isnan(power) ||
        isnan(energy)  || isnan(frequency) || isnan(powerFactor)) {
      Serial.println("⚠️  PZEM read error! Check CT clamp and connections.");
      Serial.println("    - CT clamp must be around LIVE wire only");
      Serial.println("    - PZEM VCC=5V, GND=GND, TX→GPIO16, RX→GPIO17");
      
      // Send zeros to indicate power cut / no load
      sendToServer(0.0, 0.0, 0.0, 0.0, 0.0, 0.0);
      return;
    }
    
    // Print to Serial Monitor
    Serial.println("─────────────────────────────────────");
    Serial.print("🔋 Voltage:      "); Serial.print(voltage,     2); Serial.println(" V");
    Serial.print("⚡ Current:      "); Serial.print(current,     3); Serial.println(" A");
    Serial.print("💡 Power:        "); Serial.print(power,       2); Serial.println(" W");
    Serial.print("📊 Energy:       "); Serial.print(energy,      4); Serial.println(" kWh");
    Serial.print("🔄 Frequency:    "); Serial.print(frequency,   2); Serial.println(" Hz");
    Serial.print("📐 Power Factor: "); Serial.print(powerFactor, 4);
    Serial.println();
    
    // Send to backend
    bool ok = sendToServer(voltage, current, power, energy, frequency, powerFactor);
    
    // Blink LED: fast = success, slow = failure
    if (ok) {
      for (int i = 0; i < 3; i++) {
        digitalWrite(LED_PIN, LOW);  delay(80);
        digitalWrite(LED_PIN, HIGH); delay(80);
      }
    } else {
      digitalWrite(LED_PIN, LOW);
      delay(500);
      digitalWrite(LED_PIN, HIGH);
    }
    
    Serial.println("─────────────────────────────────────\n");
  }
  
  // Reconnect Wi-Fi if dropped
  if (WiFi.status() != WL_CONNECTED) {
    static unsigned long lastReconnect = 0;
    if (millis() - lastReconnect > 30000) { // Retry every 30s
      lastReconnect = millis();
      connectWiFi();
    }
  }
}
