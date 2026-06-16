
import React, { useState, useEffect } from 'react';
import { Fermenter, FermenterStatus, FermentationStep, DeviceMode, FermentationEvent, KegeratorConfig } from '../types';
import { ThermometerSnowflake, Flame, PauseCircle, PlayCircle, Snowflake, Wifi, Clock, Percent, FlaskConical, Beer, Battery, Target, ArrowDown, Monitor, Save, Plus, Minus, ChevronDown } from 'lucide-react';
import { TemperatureChart } from './TemperatureChart';
import { GravityChart } from './GravityChart';
import { GeminiAdvisor } from './GeminiAdvisor';
import { FermentationProfile } from './FermentationProfile';
import { FermentationWizard } from './FermentationWizard';
import { useSettings } from '../SettingsContext';

interface FermenterDetailProps {
  fermenter: Fermenter;
  onUpdate: (id: string, updates: Partial<Fermenter>) => void;
}

export const FermenterDetail: React.FC<FermenterDetailProps> = ({ fermenter, onUpdate }) => {
  const { settings } = useSettings();
  
  // Local state for Kegerator Config to handle inputs before saving
  const [kegeratorForm, setKegeratorForm] = useState<KegeratorConfig>({
      line1: '',
      line2: '',
      style: '',
      brewery: '',
      ibu: 0,
      abv: 0
  });

  useEffect(() => {
      if (fermenter.kegeratorConfig) {
          setKegeratorForm(fermenter.kegeratorConfig);
      }
  }, [fermenter.kegeratorConfig]);

  const handleStartFermentation = (
      steps: FermentationStep[], 
      beerName: string, 
      style: string, 
      volume: number, 
      og: number, 
      fg: number
  ) => {
      onUpdate(fermenter.id, {
          profile: steps,
          beerName,
          style: style as any,
          volume,
          og,
          fg,
          status: FermenterStatus.ACTIVE,
          startDate: new Date().toISOString(),
          currentStepIndex: 0,
          isPaused: false,
          targetTemp: steps[0]?.temperature || 20,
          events: []
      });
  };
  
  const handleUpdateSteps = (newSteps: FermentationStep[]) => {
      onUpdate(fermenter.id, { profile: newSteps });
  };

  const handleUpdateGravity = (og: number, fg: number) => {
      onUpdate(fermenter.id, { og, fg });
  };

  const handleAddEvent = (event: Omit<FermentationEvent, 'id'>) => {
    const newEvent: FermentationEvent = {
        ...event,
        id: Math.random().toString(36).substr(2, 9)
    };
    const updatedEvents = [...(fermenter.events || []), newEvent];
    onUpdate(fermenter.id, { events: updatedEvents });
  };

  const handleRemoveEvent = (id: string) => {
    const updatedEvents = (fermenter.events || []).filter(e => e.id !== id);
    onUpdate(fermenter.id, { events: updatedEvents });
  };

  // Profile Control Handlers
  const handleTogglePause = () => {
    onUpdate(fermenter.id, { isPaused: !fermenter.isPaused });
  };

  const handleNextStep = () => {
    if (fermenter.profile && fermenter.currentStepIndex < fermenter.profile.length - 1) {
        onUpdate(fermenter.id, { currentStepIndex: fermenter.currentStepIndex + 1 });
    }
  };

  const handlePreviousStep = () => {
    if (fermenter.profile && fermenter.currentStepIndex > 0) {
        onUpdate(fermenter.id, { currentStepIndex: fermenter.currentStepIndex - 1 });
    }
  };

  const handleFinishProfile = () => {
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
          beerName: '',
          profile: []
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
      const newTemp = Number((fermenter.targetTemp + delta).toFixed(1));
      onUpdate(fermenter.id, { targetTemp: newTemp });
  };

  // Calculations
  const abv = ((fermenter.og - fermenter.currentDevice.gravity) * 131.25).toFixed(1);
  
  const currentAttenuation = fermenter.og > 1.000 
    ? ((fermenter.og - fermenter.currentDevice.gravity) / (fermenter.og - 1.000) * 100).toFixed(0)
    : "0";

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

  return (
    <div className="p-6 md:p-8 w-full animate-in fade-in duration-500">
      {/* Header Section Clean */}
      <div className="flex flex-col items-start mb-6 w-full">
        <div className="w-full mb-12 flex justify-between items-start">
            <div>
                <div className="flex items-center gap-3 mb-1">
                    <span className={`w-2 h-2 rounded-full ${fermenter.currentDevice.lastUpdate ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-red-500'} animate-pulse`}></span>
                    <span className="text-xs font-mono text-neutral-500 uppercase tracking-widest">{fermenter.name}</span>
                </div>
                <h1 className="text-5xl md:text-6xl font-black text-white tracking-tighter min-h-[60px]">
                    {fermenter.status === FermenterStatus.IDLE ? '' : (fermenter.beerName || 'Sem Nome')}
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
                        {fermenter.currentDevice.temperature.toFixed(1)}
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
                        <span className="text-2xl font-mono text-green-500">{fermenter.targetTemp.toFixed(1)}°C</span>
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
                <div className="flex-1">
                    <TemperatureChart 
                        data={fermenter.readings} 
                        events={fermenter.status === FermenterStatus.IDLE ? [] : fermenter.events} 
                        onAddEvent={handleAddEvent}
                        onRemoveEvent={handleRemoveEvent}
                    />
                </div>

                {fermenter.mode === DeviceMode.FERMENTER && (
                    <div className="flex-1">
                        <GravityChart 
                            data={fermenter.readings} 
                            og={fermenter.og} 
                            fg={fermenter.fg} 
                            events={fermenter.status === FermenterStatus.IDLE ? [] : fermenter.events} 
                        />
                    </div>
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
                                        {fermenter.currentDevice.temperature.toFixed(1)}
                                    </span>
                                    <span className="text-lg text-neutral-500">°C</span>
                                </div>
                            </div>
                            <div className="flex flex-col items-end">
                                <span className="text-neutral-600 text-sm mb-1">Gravidade (SG)</span>
                                <div className="flex items-center gap-1">
                                    <span className="text-4xl font-light text-purple-400 font-mono">
                                        {fermenter.currentDevice.gravity.toFixed(3)}
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
                                <span className="block text-sm font-mono text-white">{fermenter.targetTemp.toFixed(1)}°</span>
                            </div>
                             <div className="text-center">
                                <Snowflake size={16} className="text-neutral-600 mx-auto mb-2" />
                                <span className="block text-[10px] font-bold text-neutral-600 uppercase mb-1">{settings.sensor2Name}</span>
                                <span className="block text-sm font-mono text-blue-300">{fermenter.currentFridgeTemp.toFixed(1)}°</span>
                            </div>
                             <div className="text-center">
                                <Battery size={16} className="text-neutral-600 mx-auto mb-2" />
                                <span className="block text-[10px] font-bold text-neutral-600 uppercase mb-1">Bateria</span>
                                <span className={`block text-sm font-mono ${getBatteryColor(fermenter.currentDevice.battery)}`}>
                                    {fermenter.currentDevice.battery > 0 ? `${fermenter.currentDevice.battery}V` : '--'}
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
                                <span className="block text-sm font-mono text-white">{fermenter.og.toFixed(3)}</span>
                            </div>
                            <div className="text-center">
                                <Target size={16} className="text-neutral-600 mx-auto mb-2" />
                                <span className="block text-[10px] font-bold text-neutral-600 uppercase mb-1">Meta FG</span>
                                <span className="block text-sm font-mono text-white">{fermenter.fg ? fermenter.fg.toFixed(3) : '-'}</span>
                            </div>
                            <div className="text-center">
                                <Percent size={16} className="text-neutral-600 mx-auto mb-2" />
                                <span className="block text-[10px] font-bold text-neutral-600 uppercase mb-1">Atenuação</span>
                                <span className="block text-sm font-mono text-white">{currentAttenuation}%</span>
                            </div>
                            <div className="text-center">
                                <FlaskConical size={16} className="text-neutral-600 mx-auto mb-2" />
                                <span className="block text-[10px] font-bold text-neutral-600 uppercase mb-1">ABV Est.</span>
                                <span className="block text-sm font-mono text-white">{abv}%</span>
                            </div>
                        </div>
                    </div>
                </div>

                {fermenter.mode === DeviceMode.FERMENTER && (
                    <div className="shrink-0">
                        {fermenter.status === FermenterStatus.IDLE ? (
                            <FermentationWizard onStartFermentation={handleStartFermentation} />
                        ) : (
                            <FermentationProfile 
                                steps={fermenter.profile || []} 
                                currentStepIndex={fermenter.currentStepIndex || 0}
                                isPaused={fermenter.isPaused || false}
                                style={fermenter.style}
                                volume={fermenter.volume}
                                startDate={fermenter.startDate}
                                og={fermenter.og}
                                fg={fermenter.fg}
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
          <span>IP: {fermenter.ipAddress || '192.168.68.106'}</span>
      </div>
    </div>
  );
};
