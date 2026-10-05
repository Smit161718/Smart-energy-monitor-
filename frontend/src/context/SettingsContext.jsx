import React, { createContext, useState, useEffect, useContext } from 'react';
import { settingsAPI } from '../services/api';
import { useAuth } from './AuthContext';

const SettingsContext = createContext();

export const useSettings = () => useContext(SettingsContext);

export const SettingsProvider = ({ children }) => {
  const { user } = useAuth();
  const [settings, setSettings] = useState({
    electricity_tariff: 0.15,
    daily_energy_limit: 15.0,
    monthly_budget: 150.0,
    alert_on_limit: true,
    alert_on_budget: true,
    theme: 'dark'
  });
  const [settingsLoading, setSettingsLoading] = useState(true);

  // Load settings when user logs in
  useEffect(() => {
    const fetchSettings = async () => {
      if (user) {
        setSettingsLoading(true);
        try {
          const data = await settingsAPI.getSettings();
          setSettings(data);
          // Apply theme
          document.documentElement.setAttribute('data-theme', data.theme || 'dark');
        } catch (err) {
          console.error('Error loading settings:', err.message);
        } finally {
          setSettingsLoading(false);
        }
      } else {
        // Reset to default on logout
        setSettings({
          electricity_tariff: 0.15,
          daily_energy_limit: 15.0,
          monthly_budget: 150.0,
          alert_on_limit: true,
          alert_on_budget: true,
          theme: 'dark'
        });
        document.documentElement.setAttribute('data-theme', 'dark');
        setSettingsLoading(false);
      }
    };

    fetchSettings();
  }, [user]);

  const updateSettings = async (newSettings) => {
    try {
      await settingsAPI.updateSettings(newSettings);
      setSettings(newSettings);
      document.documentElement.setAttribute('data-theme', newSettings.theme);
      return true;
    } catch (err) {
      console.error('Error updating settings:', err.message);
      throw err;
    }
  };

  const toggleTheme = async () => {
    const newTheme = settings.theme === 'dark' ? 'light' : 'dark';
    const updated = { ...settings, theme: newTheme };
    await updateSettings(updated);
  };

  const value = {
    settings,
    settingsLoading,
    updateSettings,
    toggleTheme
  };

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
};
