import { safeFixed } from '../utils/format';

import axios from 'axios';
import React, { useState, useEffect } from 'react';
import { Fermenter, FermenterStatus, FermentationStep, DeviceMode, FermentationEvent, KegeratorConfig } from '../types';
import { ThermometerSnowflake, Flame, PauseCircle, PlayCircle, Snowflake, Wifi, Clock, Percent, FlaskConical, Beer, Battery, Target, ArrowDown, Monitor, Save, Plus, Minus, ChevronDown } from 'lucide-react';
import { TemperatureChart } from './TemperatureChart';
import { GravityChart } from './GravityChart';
import { GeminiAdvisor } from './GeminiAdvisor';
import { FermentationProfile } from './FermentationProfile';
import { StartBatchModal } from './StartBatchModal';
import { useSettings } from '../SettingsContext';
import { useBrewContext } from '../context/BrewContext';

interface FermenterDetailProps {
  fermenter: Fermenter;
  onUpdate: (id: string, updates: Partial<Fermenter>) => void;
}

export const FermenterDetail: React.FC<FermenterDetailProps> = ({ fermenter, onUpdate }) => {
  const { settings } = useSettings();
  const { handleTriggerUpdate } = useBrewContext();
  
  // Local state for Kegerator Config to handle inputs before saving
  const [kegeratorForm, setKegeratorForm] = useState<KegeratorConfig>({
      line1: '',
      line2: '',
      style: '',
      brewery: '',
      ibu: 0,
      abv: 0
  });

  const [localReadings, setLocalReadings] = useState<Reading[]>(fermenter.readings || []);
  const [events, setEvents] = useState<FermentationEvent[]>(fermenter.events || []);
  const [isReady, setIsReady] = useState(false);
  const [isNewBatchModalOpen, setIsNewBatchModalOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
      if (fermenter.kegeratorConfig) {
          setKegeratorForm(fermenter.kegeratorConfig);
      }
  }, [fermenter.kegeratorConfig]);

  useEffect(() => {
    if (!fermenter.active_batch_id) {
       setLocalReadings(fermenter.readings || []);
       setEvents(fermenter.events || []);
       return;
    }
    
    const fetchBatchData = async () => {
      try {
        const url = import.meta.env.VITE_API_URL || '';
        const token = localStorage.getItem('token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        
        const resData = await axios.get(`${url}/api/batch/${fermenter.active_batch_id}/data`, { headers });
        const resEvents = await axios.get(`${url}/api/batch/${fermenter.active_batch_id}/events`, { headers });
        
        const mappedReadings: Reading[] = resData.data.map((r: any) => ({
            timestamp: r.recorded_at,
            beerTemp: r.temp_ferm,
            fridgeTemp: r.temp_amb,
            targetTemp: r.target_temp,
            gravity: r.gravity
        }));

        const mappedEvents: FermentationEvent[] = resEvents.data.map((e: any) => ({
            id: String(e.id),
            type: e.event_type as any,
            description: e.description,
            timestamp: e.recorded_at
        }));
        
        setLocalReadings(mappedReadings);
        setEvents(mappedEvents);
      } catch (e) {
        console.error("Failed to load batch data", e);
      }
    };
    
    fetchBatchData();
    const interval = setInterval(fetchBatchData, 60000); // Polling every minute
    return () => clearInterval(interval);
  }, [fermenter.active_batch_id]);

  const handleStartFermentation = async (
      steps: FermentationStep[], 
      beerName: string, 
      style: string, 
      volume: number, 
      og: number, 
      fg: number
  ) => {
      const target = steps[0]?.temperature || 20;
      onUpdate(fermenter.id, {
          profile: steps,
          active_batch_name: beerName,
          style: style as any,
          volume,
          active_batch_og: og,
          active_batch_fg: fg,
          status: FermenterStatus.ACTIVE,
          startDate: new Date().toISOString(),
          currentStepIndex: 0,
          isPaused: false,
          targetTemp: target,
          events: []
      });

      // Also start it on the backend
      try {
          const url = import.meta.env.VITE_API_URL || '';
          const token = localStorage.getItem('token');
          const headers = token ? { Authorization: `Bearer ${token}` } : {};
          await axios.post(`${url}/api/batch/start`, {
              serialCode: fermenter.serial_code || String(fermenter.id),
              name: beerName,
              style,
              og,
              fg
          }, { headers });
      } catch (e) {
          console.error("Failed to start batch on backend", e);
      }

      handleTriggerUpdate(fermenter.serial_code || String(fermenter.id), {
          type: 'SET_TEMP',
          target,
          opm: 0
      });
  };
  
  const handleStartProduction = async (formData: any, steps: FermentationStep[]) => {
      try {
          const url = import.meta.env.VITE_API_URL || '';
          const token = localStorage.getItem('token');
          const headers = token ? { Authorization: `Bearer ${token}` } : {};
          
          // 1. PENEIRA: Remove rampas vazias (sem nome ou com duração zero)
          const validSteps = steps.filter((step: any) => {
              const name = step.name || step.n || '';
              const duration = Number(step.duration ?? step.d ?? 0);
              return name.trim() !== '' && duration > 0;
          });

          // 2. Cria o lote no MySQL
          const response = await axios.post(`${url}/api/batches`, {
              device_id: fermenter.id,
              name: formData.name,
              style: formData.style,
              og: formData.og,
              fg: formData.fg,
              profile: validSteps // Envia apenas as rampas preenchidas
          }, { headers });

          // Captura o ID real recém-criado pelo banco de dados
          const newBatchId = response.data.id || response.data.batch_id || response.data.batchId;

          // 3. Prepara o payload para o hardware
          const payloadSteps = validSteps.map((step: any) => ({
              n: step.name || step.n,         
              t: Number(step.temperature ?? step.t ?? 0),  
              d: Number(step.duration ?? step.d ?? 0)      
          }));

          // 4. Dispara a ordem de rádio usando o MQTT
          handleTriggerUpdate(fermenter.serial_code || String(fermenter.id), { 
              type: 'setProfile',
              steps: payloadSteps, 
              currentStep: 0 
          });

          console.log("✅ Lote iniciado com sucesso! ID:", newBatchId);

          // 5. Atualiza a UI e fecha o modal
          setIsNewBatchModalOpen(false);
          const target = Number(validSteps[0]?.temperature || 20);
          onUpdate(fermenter.id, {
              active_batch_id: newBatchId,
              active_batch_name: formData.name,
              active_batch_og: formData.og,
              active_batch_fg: formData.fg,
              style: formData.style as any,
              profile: validSteps,
              status: FermenterStatus.ACTIVE,
              startDate: new Date().toISOString(),
              currentStepIndex: 0,
              isPaused: false,
              targetTemp: target,
              events: []
          });
          if (refetchFermenters) refetchFermenters(); // Força o painel a buscar os dados atualizados do banco
          
      } catch (e) {
          console.error('❌ Erro ao iniciar produção:', e);
      }
  };

  const handleUpdateSteps = (newSteps: FermentationStep[]) => {
      onUpdate(fermenter.id, { profile: newSteps });
  };

  const handleUpdateGravity = async (og: number, fg: number) => {
      onUpdate(fermenter.id, { active_batch_og: og, active_batch_fg: fg });

      // Hit backend
      try {
          const url = import.meta.env.VITE_API_URL || '';
          const token = localStorage.getItem('token');
          const headers = token ? { Authorization: `Bearer ${token}` } : {};
          await axios.put(`${url}/api/batch/update`, {
              serialCode: fermenter.serial_code || String(fermenter.id),
              og,
              fg
          }, { headers });
      } catch (e) {
          console.error("Failed to update gravity on backend", e);
      }
  };

  const handleAddEvent = async (event: Omit<FermentationEvent, 'id'>) => {
    const tempId = Math.random().toString(36).substr(2, 9);
    const newEvent: FermentationEvent = {
        ...event,
        id: tempId
    };
    
    // Optimistic UI
    const previousEvents = [...events];
    const updatedEvents = [...events, newEvent];
    setEvents(updatedEvents);
    onUpdate(fermenter.id, { events: updatedEvents });

    if (fermenter.active_batch_id) {
       try {
          const url = import.meta.env.VITE_API_URL || '';
          const token = localStorage.getItem('token');
          const headers = token ? { Authorization: `Bearer ${token}` } : {};
          const response = await axios.post(`${url}/api/batch/${fermenter.active_batch_id}/events`, {
              type: event.type,
              description: event.description,
              timestamp: event.timestamp
          }, { headers });
          
          // Sincroniza o ID falso com o ID real do MySQL
          const realId = response.data.id;
          if (realId) {
             const finalEvents = updatedEvents.map(e => e.id === tempId ? { ...e, id: String(realId) } : e);
             setEvents(finalEvents);
             onUpdate(fermenter.id, { events: finalEvents });
          }
       } catch (err) {
          console.error("Failed to add event to backend", err);
          // Rollback para não mentir para o usuário
          setEvents(previousEvents);
          onUpdate(fermenter.id, { events: previousEvents });
       }
    }
  };

  const handleRemoveEvent = async (id: string) => {
    const updatedEvents = events.filter(e => e.id !== id);
    setEvents(updatedEvents);
    onUpdate(fermenter.id, { events: updatedEvents });

    if (fermenter.active_batch_id) {
       try {
          const url = import.meta.env.VITE_API_URL || '';
          const token = localStorage.getItem('token');
          const headers = token ? { Authorization: `Bearer ${token}` } : {};
          await axios.delete(`${url}/api/events/${id}`, { headers });
       } catch (err) {
          console.error("Failed to remove event from backend", err);
       }
    }
  };

  // Profile Control Handlers
  const handleTogglePause = () => {
    onUpdate(fermenter.id, { isPaused: !fermenter.isPaused });
  };

  const handleNextStep = () => {
    if (fermenter.profile && fermenter.currentStepIndex < fermenter.profile.length - 1) {
        const nextIndex = fermenter.currentStepIndex + 1;
        const target = fermenter.profile[nextIndex].temperature;
        onUpdate(fermenter.id, { currentStepIndex: nextIndex, targetTemp: target });
        
        handleTriggerUpdate(fermenter.serial_code || String(fermenter.id), {
            type: 'SET_TEMP',
            target,
            opm: 0
        });
    }
  };

  const handlePreviousStep = () => {
    if (fermenter.profile && fermenter.currentStepIndex > 0) {
        const prevIndex = fermenter.currentStepIndex - 1;
        const target = fermenter.profile[prevIndex].temperature;
        onUpdate(fermenter.id, { currentStepIndex: prevIndex, targetTemp: target });

        handleTriggerUpdate(fermenter.serial_code || String(fermenter.id), {
            type: 'SET_TEMP',
            target,
            opm: 0
        });
    }
  };

  const handleFinishProfile = async () => {
      // Moves status to IDLE, stops the profile, resets events, and sets targetTemp to the last step's temp
      const lastStepTemp = fermenter.profile && fermenter.profile.length > 0
          ? fermenter.profile[fermenter.profile.length - 1].temperature
          : fermenter.targetTemp;

      onUpdate(fermenter.id, { 
          status: FermenterStatus.IDLE, 
          isPaused: false,
          currentStepIndex: 0,
          events: [],
          targetTemp: lastStepTemp,
          active_batch_name: null,
          active_batch_id: null,
          active_batch_og: null,
          active_batch_fg: null,
          profile: []
      });

      // Also stop it on the backend
      if (fermenter.active_batch_id) {
          try {
              const url = import.meta.env.VITE_API_URL || '';
              const token = localStorage.getItem('token');
              const headers = token ? { Authorization: `Bearer ${token}` } : {};
              await axios.post(`${url}/api/batch/${fermenter.active_batch_id}/finish`, {}, { headers });
          } catch (e) {
              console.error("Failed to stop batch on backend", e);
          }
      }

      handleTriggerUpdate(fermenter.serial_code || String(fermenter.id), {
          type: 'SET_TEMP',
          target: lastStepTemp,
          opm: 0
      });
  };

  // Kegerator Handlers
  const handleKegeratorChange = (field: keyof KegeratorConfig, value: string | number) => {
      setKegeratorForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveKegerator = () => {
      onUpdate(fermenter.id, { kegeratorConfig: kegeratorForm });
  };

  const handleSetPointChange = (delta: number) => {
      const newTemp = Number(safeFixed(safeTargetTemp + delta, 1));
      let opm = 0;
      if (fermenter.mode === DeviceMode.FRIDGE) opm = 1;
      if (fermenter.mode === DeviceMode.KEGERATOR) opm = 2;

      handleTriggerUpdate(fermenter.serial_code || String(fermenter.id), {
          type: 'SET_TEMP',
          target: newTemp,
          opm
      });
      onUpdate(fermenter.id, { targetTemp: newTemp });
  };

  const safeProfile = React.useMemo(() => {
    let raw = fermenter.profile || 
              (fermenter as any).active_batch_profile || 
              (fermenter.currentDevice as any)?.steps || 
              (fermenter as any).steps;

    if (typeof raw === 'string') {
        try { raw = JSON.parse(raw); } catch(e) { raw = []; }
    }
    if (!Array.isArray(raw)) return [];

    return raw.map((step: any, index: number) => ({
        id: step.id || String(index),
        name: step.name || step.n || `Rampa ${index + 1}`,
        temperature: parseFloat(step.temperature ?? step.t ?? 0),
        duration: parseFloat(step.duration ?? step.d ?? 0)
    })).filter((step: FermentationStep) => {
        if (step.duration === 0) return false;
        if (step.name.startsWith('Rampa') && step.temperature === 0) return false;
        return true;
    });
  }, [fermenter]);

  const safeTargetTemp = React.useMemo(() => {
      // Se for fermentador e tiver um perfil ativo, a rampa manda.
      if (fermenter.mode === DeviceMode.FERMENTER && safeProfile.length > 0) {
          const currentRamp = safeProfile[fermenter.currentStepIndex || 0];
          if (currentRamp && currentRamp.temperature !== undefined) {
              return currentRamp.temperature;
          }
      }
      // Caso contrário (Geladeira/Chopeira ou sem perfil), usa o setpoint genérico do device
      return parseFloat(String(fermenter.targetTemp || 0));
  }, [fermenter.mode, safeProfile, fermenter.currentStepIndex, fermenter.targetTemp]);

  // Calculations
  const og = Number(fermenter.active_batch_og || 1.050); // Fallback para evitar divisão por zero
  const sg = Number(fermenter.currentDevice?.gravity || 0);

  // Cálculo da Atenuação (Apenas se SG > 0 e OG > 1)
  // Fórmula: ((OG - SG) / (OG - 1)) * 100
  const currentAttenuation = (sg > 0 && og > 1) ? ((og - sg) / (og - 1)) * 100 : 0;

  // Cálculo do ABV
  // Fórmula: (OG - SG) * 131.25
  const currentAbv = (og > sg && sg > 0) ? (og - sg) * 131.25 : 0;


  const getStepTimeRemaining = () => {
      if (fermenter.status === FermenterStatus.IDLE || !fermenter.startDate || !fermenter.profile || fermenter.profile.length === 0) return '--';
      
      const start = new Date(fermenter.startDate).getTime();
      let daysPrior = 0;
      
      // Sum previous steps
      for (let i = 0; i < fermenter.currentStepIndex; i++) {
          daysPrior += fermenter.profile[i].duration;
      }
      
      // Add current step duration to calculate target end time of this step
      const currentDuration = fermenter.profile[fermenter.currentStepIndex]?.duration || 0;
      const targetEndTime = start + ((daysPrior + currentDuration) * 24 * 60 * 60 * 1000);
      const now = Date.now();
      const diff = targetEndTime - now;

      if (diff <= 0) return '0h';
      
      const d = Math.floor(diff / (1000 * 60 * 60 * 24));
      const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      
      return d > 0 ? `${d}d ${h}h` : `${h}h`;
  };

  const getBatteryColor = (volts: number) => {
    if (volts > 3.9) return 'text-green-500';
    if (volts > 3.5) return 'text-yellow-500';
    return 'text-red-500';
  };

  useEffect(() => {
      console.log("DEBUG TOTAL DO FERMENTADOR:", fermenter);
  }, [fermenter]);

  useEffect(() => {
    if (!fermenter.currentDevice) return;

    const newPoint = {
        timestamp: fermenter.currentDevice.lastUpdate || new Date().toISOString(),
        beerTemp: parseFloat(String(fermenter.currentDevice.temperature || 0)),
        targetTemp: safeTargetTemp,
        fridgeTemp: parseFloat(String(fermenter.currentFridgeTemp || 0)),
        gravity: parseFloat(String(fermenter.currentDevice.gravity || 0))
    };

    setLocalReadings(prev => {
        // Evita duplicar o mesmo segundo
        if (prev.length > 0 && prev[prev.length - 1].timestamp === newPoint.timestamp) {
            return prev;
        }
        // O spread [...] cria uma nova referência forçando o React.memo a re-renderizar o gráfico
        return [...prev, newPoint]; 
    });
}, [fermenter.currentDevice, safeTargetTemp, fermenter.currentFridgeTemp]);

  const chartLimit = settings?.chartPoints || 50;
  const slicedReadings = chartLimit > 0 ? localReadings.slice(-chartLimit) : localReadings;

  return (
    <div className="p-6 md:p-8 w-full animate-in fade-in duration-500">
      {/* Header Section Clean */}
      <div className="flex flex-col items-start mb-6 w-full">
        <div className="w-full mb-12 flex justify-between items-start">
            <div>
                <div className="flex items-center gap-3 mb-1">
                    <span className={`w-2 h-2 rounded-full ${fermenter.currentDevice?.lastUpdate ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-red-500'} animate-pulse`}></span>
                    <span className="text-xs font-mono text-neutral-500 uppercase tracking-widest">
                        {fermenter.device_name || 'Dispositivo Sem Nome'}
                    </span>
                </div>
                <h1 className="text-5xl md:text-6xl font-black text-white tracking-tighter min-h-[60px]">
                    {fermenter.status === FermenterStatus.IDLE ? '' : (fermenter.active_batch_name || 'Sem Nome')}
                </h1>
            </div>
        </div>
      </div>

      {(fermenter.mode === DeviceMode.KEGERATOR || fermenter.mode === DeviceMode.FRIDGE) ? (
          // === KEGERATOR & FRIDGE MODE LAYOUT ===
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
             
             {/* Big Temperature Display */}
             <div className="flex flex-col items-center justify-center py-12 mb-10 bg-neutral-900/20 border border-neutral-800 rounded-3xl relative overflow-hidden">
                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-neutral-700 to-transparent opacity-50"></div>
                
                <h2 className="text-neutral-500 font-bold uppercase tracking-[0.2em] text-sm mb-4">Temperatura Atual</h2>
                
                <div className="flex items-start gap-2 mb-8">
                    <span className="text-8xl md:text-9xl font-black text-white tracking-tighter tabular-nums">
                        {safeFixed(fermenter.currentDevice?.temperature, 1)}
                    </span>
                    <span className="text-4xl text-neutral-600 font-light mt-4">°C</span>
                </div>

                {/* Set Point Controls */}
                <div className="flex items-center gap-6 bg-black/40 p-2 pr-6 rounded-2xl border border-neutral-800">
                    <div className="flex items-center gap-1">
                        <button 
                            onClick={() => handleSetPointChange(-0.5)}
                            className="w-12 h-12 flex items-center justify-center rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white transition-colors border border-neutral-700 active:scale-95"
                        >
                            <Minus size={20} />
                        </button>
                        <button 
                            onClick={() => handleSetPointChange(0.5)}
                            className="w-12 h-12 flex items-center justify-center rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white transition-colors border border-neutral-700 active:scale-95"
                        >
                            <Plus size={20} />
                        </button>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">Set-Point</span>
                        <span className="text-2xl font-mono text-green-500">{safeFixed(safeTargetTemp, 1)}°C</span>
                    </div>
                </div>
             </div>

             {/* Display Information Form - Only for Kegerator */}
             {fermenter.mode === DeviceMode.KEGERATOR && (
                 <div className="bg-neutral-900/30 border border-neutral-800 rounded-3xl p-8 backdrop-blur-sm">
                    <div className="flex items-center gap-3 mb-8">
                        <Monitor size={20} className="text-white" />
                        <h3 className="text-white font-bold uppercase tracking-widest text-sm">Editar Informações do Display</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                        {/* Linha 1 */}
                        <div className="space-y-2">
                            <label className="flex items-center justify-between text-[10px] font-bold text-neutral-500 uppercase tracking-widest">
                                Linha 1 
                                <span className="text-yellow-500/80 bg-yellow-500/10 px-2 py-0.5 rounded text-[9px] border border-yellow-500/20">AMARELO</span>
                            </label>
                            <input 
                                type="text" 
                                value={kegeratorForm.line1}
                                onChange={(e) => handleKegeratorChange('line1', e.target.value)}
                                className="w-full bg-black border border-neutral-800 text-white rounded-xl px-4 py-4 focus:outline-none focus:border-yellow-600/50 transition-colors text-lg font-mono placeholder-neutral-800"
                                placeholder="LINHA 1..."
                            />
                        </div>

                        {/* Linha 2 */}
                        <div className="space-y-2">
                            <label className="flex items-center justify-between text-[10px] font-bold text-neutral-500 uppercase tracking-widest">
                                Linha 2
                                <span className="text-yellow-500/80 bg-yellow-500/10 px-2 py-0.5 rounded text-[9px] border border-yellow-500/20">AMARELO</span>
                            </label>
                            <input 
                                type="text" 
                                value={kegeratorForm.line2}
                                onChange={(e) => handleKegeratorChange('line2', e.target.value)}
                                className="w-full bg-black border border-neutral-800 text-white rounded-xl px-4 py-4 focus:outline-none focus:border-yellow-600/50 transition-colors text-lg font-mono placeholder-neutral-800"
                                placeholder="LINHA 2..."
                            />
                        </div>

                        {/* Estilo */}
                        <div className="space-y-2">
                            <label className="flex items-center justify-between text-[10px] font-bold text-neutral-500 uppercase tracking-widest">
                                Estilo
                                <span className="text-neutral-400 bg-neutral-800 px-2 py-0.5 rounded text-[9px] border border-neutral-700">BRANCO</span>
                            </label>
                            <input 
                                type="text" 
                                value={kegeratorForm.style}
                                onChange={(e) => handleKegeratorChange('style', e.target.value)}
                                className="w-full bg-black border border-neutral-800 text-white rounded-xl px-4 py-4 focus:outline-none focus:border-neutral-500 transition-colors text-lg font-mono placeholder-neutral-800"
                                placeholder="EX: IPA..."
                            />
                        </div>

                        {/* Cervejaria */}
                        <div className="space-y-2">
                            <label className="flex items-center justify-between text-[10px] font-bold text-neutral-500 uppercase tracking-widest">
                                Cervejaria
                                <span className="text-neutral-400 bg-neutral-800 px-2 py-0.5 rounded text-[9px] border border-neutral-700">BRANCO</span>
                            </label>
                            <input 
                                type="text" 
                                value={kegeratorForm.brewery}
                                onChange={(e) => handleKegeratorChange('brewery', e.target.value)}
                                className="w-full bg-black border border-neutral-800 text-white rounded-xl px-4 py-4 focus:outline-none focus:border-neutral-500 transition-colors text-lg font-mono placeholder-neutral-800"
                                placeholder="NOME DA CERVEJARIA..."
                            />
                        </div>

                        {/* IBU */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">IBU</label>
                            <input 
                                type="number" 
                                value={kegeratorForm.ibu}
                                onChange={(e) => handleKegeratorChange('ibu', parseFloat(e.target.value))}
                                className="w-full bg-black border border-neutral-800 text-white rounded-xl px-4 py-4 focus:outline-none focus:border-neutral-500 transition-colors text-lg font-mono placeholder-neutral-800"
                                placeholder="0"
                            />
                        </div>

                        {/* ABV */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">ABV %</label>
                            <input 
                                type="number" 
                                step="0.1"
                                value={kegeratorForm.abv}
                                onChange={(e) => handleKegeratorChange('abv', parseFloat(e.target.value))}
                                className="w-full bg-black border border-neutral-800 text-white rounded-xl px-4 py-4 focus:outline-none focus:border-neutral-500 transition-colors text-lg font-mono placeholder-neutral-800"
                                placeholder="0.0"
                            />
                        </div>
                    </div>

                    <button 
                        onClick={handleSaveKegerator}
                        className="w-full bg-white text-black font-bold py-4 rounded-xl hover:bg-neutral-200 transition-all shadow-lg flex items-center justify-center gap-2 uppercase tracking-widest text-sm"
                    >
                        <Save size={18} />
                        Atualizar Display
                    </button>
                 </div>
             )}
          </div>
      ) : (
          // === STANDARD FERMENTER MODE LAYOUT ===
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
            
            {/* Left Column: Charts & Events */}
            <div className="lg:col-span-2 space-y-4 min-w-0 flex flex-col order-2 lg:order-1">
                {isReady ? (
                    <div style={{ minHeight: '300px', width: '100%', display: 'block' }}>
                        <TemperatureChart 
                            data={slicedReadings} 
                            events={fermenter.status === FermenterStatus.IDLE ? [] : events} 
                            onAddEvent={handleAddEvent}
                            onRemoveEvent={handleRemoveEvent}
                        />
                    </div>
                ) : (
                    <div style={{ minHeight: '300px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>
                        Carregando gráfico...
                    </div>
                )}

                {fermenter.mode === DeviceMode.FERMENTER && (
                    isReady ? (
                        <div style={{ minHeight: '300px', width: '100%', display: 'block' }}>
                            <GravityChart 
                                data={slicedReadings} 
                                og={og} 
                                fg={fermenter.active_batch_fg || 0} 
                                events={fermenter.status === FermenterStatus.IDLE ? [] : events} 
                            />
                        </div>
                    ) : (
                        <div style={{ minHeight: '300px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>
                            Carregando gráfico...
                        </div>
                    )
                )}
            </div>

            {/* Right Column: Metrics & Controls */}
            <div className="flex flex-col gap-8 min-w-0 h-full order-1 lg:order-2">
                {/* Telemetria Card Updated */}
                <div className="bg-neutral-900/30 rounded-3xl p-6 border border-neutral-800 backdrop-blur-sm relative overflow-hidden shrink-0">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-neutral-500 text-xs font-bold uppercase tracking-widest">Telemetria em Tempo Real</h3>
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
                    </div>
                    
                    <div className="space-y-6">
                        {/* Big Numbers */}
                        <div className="flex items-baseline justify-between">
                            <div className="flex flex-col">
                                <span className="text-neutral-600 text-sm mb-1">Temperatura ({settings.sensor1Name})</span>
                                <div className="flex items-center gap-1">
                                    <span className="text-4xl font-light text-white font-mono">
                                        {safeFixed(fermenter.currentDevice?.temperature, 1)}
                                    </span>
                                    <span className="text-lg text-neutral-500">°C</span>
                                </div>
                            </div>
                            <div className="flex flex-col items-end">
                                <span className="text-neutral-600 text-sm mb-1">Gravidade (SG)</span>
                                <div className="flex items-center gap-1">
                                    <span className="text-4xl font-light text-purple-400 font-mono">
                                        {safeFixed(sg, 3)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Detailed Grid - 4x2 */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-y-6 gap-x-2 pt-6 border-t border-neutral-800/50">
                            {/* Row 1 */}
                            <div className="text-center">
                                <Target size={16} className="text-neutral-600 mx-auto mb-2" />
                                <span className="block text-[10px] font-bold text-neutral-600 uppercase mb-1">Set-point</span>
                                <span className="block text-sm font-mono text-white">{safeFixed(safeTargetTemp, 1)}°</span>
                            </div>
                             <div className="text-center">
                                <Snowflake size={16} className="text-neutral-600 mx-auto mb-2" />
                                <span className="block text-[10px] font-bold text-neutral-600 uppercase mb-1">{settings.sensor2Name}</span>
                                <span className="block text-sm font-mono text-blue-300">{safeFixed(fermenter.currentFridgeTemp, 1)}°</span>
                            </div>
                             <div className="text-center">
                                <Battery size={16} className="text-neutral-600 mx-auto mb-2" />
                                <span className="block text-[10px] font-bold text-neutral-600 uppercase mb-1">Bateria</span>
                                <span className={`block text-sm font-mono ${getBatteryColor(fermenter.currentDevice?.battery || 0)}`}>
                                    {(fermenter.currentDevice?.battery || 0) > 0 ? `${fermenter.currentDevice?.battery}V` : '--'}
                                </span>
                            </div>
                             <div className="text-center">
                                <Clock size={16} className="text-neutral-600 mx-auto mb-2" />
                                <span className="block text-[10px] font-bold text-neutral-600 uppercase mb-1">Fim Rampa</span>
                                <span className="block text-sm font-mono text-white">{getStepTimeRemaining()}</span>
                            </div>

                            {/* Row 2 */}
                            <div className="text-center">
                                <ArrowDown size={16} className="text-neutral-600 mx-auto mb-2" />
                                <span className="block text-[10px] font-bold text-neutral-600 uppercase mb-1">OG</span>
                                <span className="block text-sm font-mono text-white">{safeFixed(og, 3)}</span>
                            </div>
                            <div className="text-center">
                                <Target size={16} className="text-neutral-600 mx-auto mb-2" />
                                <span className="block text-[10px] font-bold text-neutral-600 uppercase mb-1">Meta FG</span>
                                <span className="block text-sm font-mono text-white">{fermenter.active_batch_fg ? safeFixed(fermenter.active_batch_fg, 3) : '-'}</span>
                            </div>
                            <div className="text-center">
                                <Percent size={16} className="text-neutral-600 mx-auto mb-2" />
                                <span className="block text-[10px] font-bold text-neutral-600 uppercase mb-1">Atenuação</span>
                                <span className="block text-sm font-mono text-white">{safeFixed(currentAttenuation, 1)}%</span>
                            </div>
                            <div className="text-center">
                                <FlaskConical size={16} className="text-neutral-600 mx-auto mb-2" />
                                <span className="block text-[10px] font-bold text-neutral-600 uppercase mb-1">ABV Est.</span>
                                <span className="block text-sm font-mono text-white">{safeFixed(currentAbv, 1)}%</span>
                            </div>
                        </div>
                    </div>
                </div>

                {fermenter.mode === DeviceMode.FERMENTER && (
                    <div className="shrink-0">
                        {!fermenter.active_batch_id ? (
                            <div className="flex flex-col items-center justify-center py-12 border border-neutral-800/50 rounded-2xl bg-neutral-900/20">
                                <h3 className="text-xs font-bold tracking-widest text-neutral-500 uppercase mb-4">Perfil de Fermentação</h3>
                                <p className="text-neutral-400 mb-6">Nenhuma produção ativa</p>
                                <button 
                                    onClick={() => setIsNewBatchModalOpen(true)}
                                    className="flex items-center gap-2 px-6 py-3 bg-white text-black font-medium rounded-xl hover:bg-neutral-200 transition-colors"
                                >
                                    <Plus size={18} /> Iniciar Nova Produção
                                </button>
                            </div>
                        ) : (
                            <FermentationProfile 
                                steps={safeProfile} 
                                currentStepIndex={fermenter.currentStepIndex || 0}
                                isPaused={fermenter.isPaused || false}
                                style={fermenter.style}
                                volume={fermenter.volume}
                                startDate={fermenter.startDate}
                                og={og}
                                fg={fermenter.active_batch_fg || 0}
                                onUpdateSteps={handleUpdateSteps}
                                onUpdateGravity={handleUpdateGravity}
                                onTogglePause={handleTogglePause}
                                onNextStep={handleNextStep}
                                onPreviousStep={handlePreviousStep}
                                onFinishProfile={handleFinishProfile}
                            />
                        )}
                    </div>
                )}
                
                <GeminiAdvisor fermenter={fermenter} className="flex-1 min-h-[200px]" />
            </div>
          </div>
      )}

      {/* System Info Box */}
      <div className="mt-6 w-full bg-neutral-900/30 border border-neutral-800/50 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-center text-[10px] font-mono text-neutral-500 uppercase tracking-widest gap-2">
          <span>VER: V1.0.017 SAFE-BOOT STABLE</span>
          <span>IP: {fermenter.serial_code || '192.168.68.106'}</span>
      </div>

      <StartBatchModal 
          isOpen={isNewBatchModalOpen}
          onClose={() => setIsNewBatchModalOpen(false)}
          onStart={handleStartProduction}
      />
    </div>
  );
};
