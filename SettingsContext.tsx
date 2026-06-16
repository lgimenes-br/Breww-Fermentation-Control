import React, { createContext, useContext, useState, useEffect } from 'react';

export interface PIDParams {
  kp: number;
  ki: number;
  kd: number;
}

export interface SystemSettings {
  logInterval: number;
  compressorDelay: number;
  chartPoints: number;
  sensor1Name: string;
  sensor2Name: string;
  offsetS1: number;
  offsetS2: number;
  offsetSG: number;
  pidHeating: PIDParams;
  pidCooling: PIDParams;
}

interface SettingsContextType {
  settings: SystemSettings;
  updateSettings: (newSettings: Partial<SystemSettings>) => void;
}

const defaultSettings: SystemSettings = {
  logInterval: 30,
  compressorDelay: 310,
  chartPoints: 50,
  sensor1Name: 'Fermentador',
  sensor2Name: 'Geladeira',
  offsetS1: 0,
  offsetS2: 0,
  offsetSG: 0,
  pidHeating: { kp: 20000, ki: 100, kd: 0 },
  pidCooling: { kp: 40000, ki: 200, kd: 0 }
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<SystemSettings>(() => {
    const saved = localStorage.getItem('app_settings');
    if (saved) {
      try {
        return { ...defaultSettings, ...JSON.parse(saved) };
      } catch (e) {
        console.error('Failed to parse settings', e);
      }
    }
    return defaultSettings;
  });

  useEffect(() => {
    localStorage.setItem('app_settings', JSON.stringify(settings));
  }, [settings]);

  const updateSettings = (newSettings: Partial<SystemSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
