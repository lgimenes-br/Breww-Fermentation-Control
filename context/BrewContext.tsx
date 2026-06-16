import React, { createContext, useContext, useEffect, useState } from 'react';
import mqtt from 'mqtt';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Fermenter, FermenterStatus, DeviceMode } from '../types';

interface BrewContextType {
  fermenters: Fermenter[];
  isLoading: boolean;
  handleTriggerUpdate: (serialCode: string, payload: any) => void;
  refetchFermenters: () => void;
}

const BrewContext = createContext<BrewContextType | undefined>(undefined);

export const BrewProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = useQueryClient();
  const [mqttClient, setMqttClient] = useState<mqtt.MqttClient | null>(null);
  
  // Make token reactive so enabled flag updates upon login without reload
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  useEffect(() => {
    const handleStorage = () => setToken(localStorage.getItem('token'));
    window.addEventListener('local-storage', handleStorage);
    return () => window.removeEventListener('local-storage', handleStorage);
  }, []);

  // Fetch initial data via REST API
  const isLoginPage = window.location.pathname === '/login';
  const { data: fermenters = [], isLoading, refetch } = useQuery<Fermenter[]>({
    queryKey: ['fermenters'],
    enabled: !isLoginPage && !!token,
    queryFn: async () => {
      try {
        const url = import.meta.env.VITE_API_URL;
        if (!url) {
            console.warn("VITE_API_URL not provided, returning empty array");
            return [];
        }
        
        const token = localStorage.getItem('token');
        console.log(`Tentando buscar dispositivos. Token encontrado: ${token ? 'Sim' : 'Não'}`);
        
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const response = await axios.get(`${url}/api/devices`, { headers });
        return response.data;
      } catch (error: any) {
        if (axios.isAxiosError(error) && error.response?.status === 401) {
          return [];
        }
        console.error('Failed to fetch devices from REST API:', error);
        throw error;
      }
    },
    staleTime: 1000 * 60 * 5,
    retry: false,
  });

  useEffect(() => {
    const brokerUrl = import.meta.env.VITE_MQTT_BROKER;
    if (!brokerUrl) {
        console.warn("VITE_MQTT_BROKER not provided. Skipping MQTT connection.");
        return;
    }

    const client = mqtt.connect(brokerUrl);

    client.on('connect', () => {
      console.log('Connected to MQTT Broker via WebSocket');
      client.subscribe('brewbrother/+/data');
      client.subscribe('brewbrother/global/update');
    });

    client.on('message', (topic, message) => {
      const payloadString = message.toString();
      try {
        const payload = JSON.parse(payloadString);

        if (topic === 'brewbrother/global/update') {
          queryClient.invalidateQueries({ queryKey: ['fermenters'] });
          return;
        }

        if (topic.startsWith('brewbrother/') && topic.endsWith('/data')) {
          const parts = topic.split('/');
          const serialCode = parts[1];

          queryClient.setQueryData<Fermenter[]>(['fermenters'], (old) => {
            if (!old) return [];
            return old.map((f) => {
              // Se não for o fermentador da mensagem, retorna ele intacto
              if (f.serial_code !== serialCode && String(f.id) !== serialCode) {
                return f;
              }

              let status = f.status;
              if (payload.statOp === 'FERMENT') status = FermenterStatus.ACTIVE;
              else if (payload.statOp === 'CRASH') status = FermenterStatus.COLD_CRASH;
              else if (payload.statOp === 'IDLE') status = FermenterStatus.IDLE;

              let mode = f.mode;
              if (payload.opm === 0) mode = DeviceMode.FERMENTER;
              else if (payload.opm === 1) mode = DeviceMode.FRIDGE;
              else if (payload.opm === 2) mode = DeviceMode.KEGERATOR;

              // Identify gravity, prioritizing is_sg which is SmartPID/BrewTaurus default, then others
              let rawGravity = payload.is_sg ?? payload.sg ?? payload.gravity ?? f.currentDevice?.gravity ?? 0;
              
              // If rawGravity looks like Plato (between 1.2 and 50), convert to SG
              let calculatedGravity = rawGravity;
              if (rawGravity > 1.2 && rawGravity < 50) {
                 // Formula: SG = 1 + (Plato / (258.6 - ((Plato / 258.2) * 227.1)))
                 calculatedGravity = 1 + (rawGravity / (258.6 - ((rawGravity / 258.2) * 227.1)));
              }

              // Bloco de segurança: garante que currentDevice sempre exista antes de ler
              const updatedDevice = {
                ...(f.currentDevice || {}),
                gravity: calculatedGravity,
                temperature: payload.temperature ?? payload.ferm ?? f.currentDevice?.temperature ?? 0,
                battery: payload.battery ?? payload.is_bat ?? f.currentDevice?.battery ?? 0,
                angle: payload.tilt ?? payload.angle ?? payload.is_a ?? f.currentDevice?.angle ?? 0,
                rssi: payload.rssi ?? f.currentDevice?.rssi ?? 0,
                lastUpdate: new Date().toISOString()
              };

              return {
                ...f,
                mode,
                status,
                targetTemp: (payload.opm === 0 ? payload.fsm : payload.csp) ?? f.targetTemp ?? 20,
                currentFridgeTemp: payload.amb ?? f.currentFridgeTemp ?? 20,
                currentStepIndex: payload.currStep ?? f.currentStepIndex ?? 0,
                currentDevice: updatedDevice
              };
            });
          });
        }
      } catch (err) {
        console.error('Failed to parse MQTT message:', err);
      }
    });

    setMqttClient(client);

    return () => {
      client.end();
    };
  }, [queryClient]);

  const handleTriggerUpdate = (serialCode: string, payload: any) => {
    if (mqttClient && mqttClient.connected) {
      mqttClient.publish(`brewbrother/${serialCode}/comando`, JSON.stringify(payload));
    } else {
      console.warn('MQTT Client not connected.');
    }
  };

  return (
    <BrewContext.Provider value={{ fermenters, isLoading, handleTriggerUpdate, refetchFermenters: refetch }}>
      {children}
    </BrewContext.Provider>
  );
};

export const useBrewContext = () => {
  const context = useContext(BrewContext);
  if (context === undefined) {
    throw new Error('useBrewContext must be used within a BrewProvider');
  }
  return context;
};