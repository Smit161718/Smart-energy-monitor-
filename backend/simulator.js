const URL = 'http://localhost:5000/api/meter';

console.log('⚡ Starting ESP32 PZEM-004T Smart Energy Simulator...');
console.log(`📡 Simulating readings being POSTed to ${URL} every 5 seconds...`);

// Initial values
let energyKwh = 12.4; // starting cumulative energy
const tariff = 0.15;  // cost per kWh
let bill = energyKwh * tariff;

// Base load states to make it look dynamic
// We simulate different activities (e.g., normal idle, turning on a kettle, running a microwave)
const loads = [
  { name: 'Idle standby', minCurrent: 0.3, maxCurrent: 0.6 },
  { name: 'Laptop + TV running', minCurrent: 1.2, maxCurrent: 1.8 },
  { name: 'Vacuum cleaner active', minCurrent: 4.5, maxCurrent: 5.5 },
  { name: 'Microwave cooking', minCurrent: 6.8, maxCurrent: 8.2 },
  { name: 'Air conditioner running', minCurrent: 8.5, maxCurrent: 10.5 }
];

let currentLoadIndex = 0;
let loadChangeCounter = 0;

function generateReading() {
  // Cycle loads every 30 seconds (6 readings)
  loadChangeCounter++;
  if (loadChangeCounter >= 6) {
    loadChangeCounter = 0;
    currentLoadIndex = (currentLoadIndex + 1) % loads.length;
    console.log(`\n🏠 [Simulation Status] Home load profile changed to: ${loads[currentLoadIndex].name}\n`);
  }

  const activeLoad = loads[currentLoadIndex];

  // 1. Simulate voltage (usually fluctuates slightly around nominal grid voltage)
  const voltage = parseFloat((228 + Math.random() * 8).toFixed(1)); // 228V to 236V

  // 2. Simulate current based on active load profile
  const currentRange = activeLoad.maxCurrent - activeLoad.minCurrent;
  const current = parseFloat((activeLoad.minCurrent + Math.random() * currentRange).toFixed(2));

  // 3. Calculate Power (Watts) = V * I * PowerFactor (assume PF is around 0.92 to 0.98)
  const powerFactor = parseFloat((0.92 + Math.random() * 0.06).toFixed(2));
  const power = parseFloat((voltage * current * powerFactor).toFixed(1));

  // 4. Update Cumulative Energy (kWh)
  // Power (W) consumed over 5 seconds:
  // Energy (kWh) = (Power (W) * 5 seconds) / (3600 seconds/hour * 1000 W/kW)
  const energyConsumedInPeriod = (power * 5) / (3600 * 1000);
  energyKwh += energyConsumedInPeriod;

  // 5. Update Bill
  bill = energyKwh * tariff;

  return {
    voltage,
    current,
    power,
    energy: parseFloat(energyKwh.toFixed(4)),
    bill: parseFloat(bill.toFixed(2))
  };
}

async function sendTelemetry() {
  const payload = generateReading();

  try {
    const response = await fetch(URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      console.log(`📤 Sent: ${payload.voltage}V | ${payload.current}A | ${payload.power}W | ${payload.energy}kWh | $${payload.bill}`);
    } else {
      const errorText = await response.text();
      console.error(`⚠️ Server responded with error: ${response.status} - ${errorText}`);
    }
  } catch (error) {
    console.error(`❌ Connection failed. Is backend running at localhost:5000? Error: ${error.message}`);
  }
}

// Start sending every 5 seconds
setInterval(sendTelemetry, 5000);
// Send first reading immediately
sendTelemetry();
