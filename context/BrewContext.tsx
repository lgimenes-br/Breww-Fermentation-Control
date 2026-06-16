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

  // Fetch initial data via REST API
  const { data: fermenters = [], isLoading, refetch } = useQuery<Fermenter[]>({
    queryKey: ['fermenters'],
    queryFn: async () => {
      try {
        const url = import.meta.env.VITE_API_URL;
        if (!url) {
            console.warn("VITE_API_URL not provided, returning empty array");
            return [];
        }
        const token = localStorage.getItem('token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const response = await axios.get(`${url}/api/devices`, { headers });
        return response.data;
      } catch (error) {
        console.error('Failed to fetch devices from REST API:', error);
        return [];
      }
    },
    staleTime: 1000 * 60 * 5,
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
              if (f.ipAddress === serialCode || f.id === serialCode) {
                let status = f.status;
                if (payload.statOp === 'FERMENT') status = FermenterStatus.ACTIVE;
                else if (payload.statOp === 'CRASH') status = FermenterStatus.COLD_CRASH;
                else if (payload.statOp === 'IDLE') status = FermenterStatus.IDLE;

                let mode = f.mode;
                if (payload.opm === 0) mode = DeviceMode.FERMENTER;
                else if (payload.opm === 1) mode = DeviceMode.FRIDGE;
                else if (payload.opm === 2) mode = DeviceMode.KEGERATOR;

                return {
                  ...f,
                  mode,
                  status,
                  targetTemp: (payload.opm === 0 ? payload.fsm : payload.csp) ?? f.targetTemp,
                  currentFridgeTemp: payload.amb ?? f.currentFridgeTemp,
                  currentStepIndex: payload.currStep ?? f.currentStepIndex,
                  currentDevice: {
                    ...f.currentDevice,
                    gravity: payload.is_sg ?? f.currentDevice?.gravity,
                    temperature: payload.ferm ?? f.currentDevice?.temperature,
                    battery: payload.is_bat ?? f.currentDevice?.battery,
                    angle: payload.angle ?? f.currentDevice?.angle,
                    rssi: payload.rssi ?? f.currentDevice?.rssi,
                    lastUpdate: new Date().toISOString()
                  }
                };
              }
              return f;
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