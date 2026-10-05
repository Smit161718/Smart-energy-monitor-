// src/context/DeviceContext.jsx
// Shares the live ESP32 device status across the whole app (Dashboard → Sidebar)
import { createContext, useContext, useState } from 'react';

const DeviceContext = createContext({ deviceStatus: 'offline', setDeviceStatus: () => {} });

export function DeviceProvider({ children }) {
  const [deviceStatus, setDeviceStatus] = useState('offline'); // default offline until proven online
  return (
    <DeviceContext.Provider value={{ deviceStatus, setDeviceStatus }}>
      {children}
    </DeviceContext.Provider>
  );
}

export const useDevice = () => useContext(DeviceContext);
