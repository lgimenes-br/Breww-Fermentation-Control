
import React, { useState } from 'react';
import { Save, Power, Activity, Thermometer, RotateCcw, Download, Trash2, Cpu, Zap, Sliders, Sun, Moon } from 'lucide-react';
import { useSettings, SystemSettings, PIDParams } from '../SettingsContext';
import { useTheme } from '../ThemeContext';

export const Settings: React.FC = () => {
  const { settings, updateSettings } = useSettings();
  const { theme, toggleTheme } = useTheme();
  const [localSettings, setLocalSettings] = useState<SystemSettings>(settings);
  const [relayState, setRelayState] = useState<'AUTO' | 'HEAT' | 'COOL'>('AUTO');

  const handleChange = (field: keyof SystemSettings, value: any) => {
    setLocalSettings(prev => ({ ...prev, [field]: value }));
  };

  const handlePIDChange = (type: 'pidHeating' | 'pidCooling', param: keyof PIDParams, value: number) => {
    setLocalSettings(prev => ({
      ...prev,
      [type]: { ...prev[type], [param]: value }
    }));
  };

  const handleSave = () => {
    updateSettings(localSettings);
  };

  const SectionHeader = ({ icon: Icon, title }: { icon: any, title: string }) => (
    <div className="flex items-center gap-2 mb-6 border-b border-neutral-800 pb-2">
      <Icon size={18} className="text-neutral-400" />
      <h3 className="text-white font-bold text-sm uppercase tracking-widest">{title}</h3>
    </div>
  );

  const InputField = ({ label, value, onChange, type = "text", placeholder = "" }: any) => (
    <div className="space-y-2">
      <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest block">{label}</label>
      <input 
        type={type}
        value={value}
        onChange={(e) => onChange(type === 'number' ? parseFloat(e.target.value) : e.target.value)}
        placeholder={placeholder}
        className="w-full bg-black border border-neutral-800 text-neutral-200 rounded-xl px-4 py-3 focus:outline-none focus:border-neutral-600 transition-colors font-mono text-sm"
      />
    </div>
  );

  return (
    <div className="p-6 md:p-8 w-full animate-in fade-in duration-500 space-y-8 pb-20">
      
      <header className="mb-10 flex justify-between items-start">
        <div>
          <h1 className="text-4xl font-light tracking-tight text-white mb-2">Configurações</h1>
          <p className="text-neutral-500 font-light">Parâmetros do controlador ESP32 e calibração de sensores.</p>
        </div>
        <button 
            onClick={toggleTheme}
            className="flex items-center justify-center w-10 h-10 rounded-md border border-neutral-800 text-neutral-400 hover:border-neutral-600 hover:text-white transition-all shrink-0"
            title="Alternar Tema"
        >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </header>

      {/* 1. Configurações Gerais */}
      <section className="bg-neutral-900/30 border border-neutral-800 rounded-3xl p-8">
        <SectionHeader icon={Sliders} title="Configurações Gerais" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <InputField 
            label="Intervalo Log ESP32 (s)" 
            value={localSettings.logInterval} 
            onChange={(v: number) => handleChange('logInterval', v)} 
            type="number" 
          />
          <InputField 
            label="Delay Compressor (s)" 
            value={localSettings.compressorDelay} 
            onChange={(v: number) => handleChange('compressorDelay', v)} 
            type="number" 
          />
          <div className="space-y-2">
             <InputField 
              label="Pontos no Gráfico (Zoom)" 
              value={localSettings.chartPoints} 
              onChange={(v: number) => handleChange('chartPoints', v)} 
              type="number" 
            />
            <p className="text-[10px] text-neutral-600">Define quantos pontos históricos aparecem.</p>
          </div>
        </div>
        <div className="mt-6 flex justify-end">
          <button onClick={handleSave} className="bg-neutral-100 hover:bg-white text-black px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-2">
            <Save size={14} /> Salvar Gerais
          </button>
        </div>
      </section>

      {/* 2. Personalizar Sensores */}
      <section className="bg-neutral-900/30 border border-neutral-800 rounded-3xl p-8">
        <SectionHeader icon={Thermometer} title="Personalizar Sensores" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <InputField 
            label="Nome Sensor 1 (Fermentador)" 
            value={localSettings.sensor1Name} 
            onChange={(v: string) => handleChange('sensor1Name', v)} 
          />
          <InputField 
            label="Nome Sensor 2 (Ambiente)" 
            value={localSettings.sensor2Name} 
            onChange={(v: string) => handleChange('sensor2Name', v)} 
          />
        </div>
        <div className="mt-6 flex justify-end">
          <button onClick={handleSave} className="bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-700 px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-2">
            <Save size={14} /> Salvar Nomes
          </button>
        </div>
      </section>

      {/* 3. Calibração (Offset) */}
      <section className="bg-neutral-900/30 border border-neutral-800 rounded-3xl p-8">
        <SectionHeader icon={Activity} title="Calibração (Offset)" />
        <p className="text-neutral-500 text-xs mb-6 -mt-4">Ajuste fino adicionado à leitura bruta dos sensores. Use valores positivos ou negativos (ex: -0.5).</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <InputField 
            label="Offset S1 (°C)" 
            value={localSettings.offsetS1} 
            onChange={(v: number) => handleChange('offsetS1', v)} 
            type="number" 
          />
          <InputField 
            label="Offset S2 (°C)" 
            value={localSettings.offsetS2} 
            onChange={(v: number) => handleChange('offsetS2', v)} 
            type="number" 
          />
          <InputField 
            label="Offset SG" 
            value={localSettings.offsetSG} 
            onChange={(v: number) => handleChange('offsetSG', v)} 
            type="number" 
          />
        </div>
        <div className="mt-6 flex justify-end">
          <button onClick={handleSave} className="bg-neutral-100 hover:bg-white text-black px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-2 shadow-lg">
            <Save size={14} /> Salvar Calibração
          </button>
        </div>
      </section>

      {/* 4. Parâmetros PID */}
      <section className="bg-neutral-900/30 border border-neutral-800 rounded-3xl p-8">
        <SectionHeader icon={Cpu} title="Parâmetros PID" />
        
        <div className="mb-6">
            <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-neutral-600"></span> Aquecimento
            </h4>
            <div className="grid grid-cols-3 gap-4">
                <InputField label="Kp" value={localSettings.pidHeating.kp} onChange={(v: number) => handlePIDChange('pidHeating', 'kp', v)} type="number" />
                <InputField label="Ki" value={localSettings.pidHeating.ki} onChange={(v: number) => handlePIDChange('pidHeating', 'ki', v)} type="number" />
                <InputField label="Kd" value={localSettings.pidHeating.kd} onChange={(v: number) => handlePIDChange('pidHeating', 'kd', v)} type="number" />
            </div>
        </div>

        <div className="border-t border-neutral-800/50 pt-6">
            <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-neutral-600"></span> Refrigeração
            </h4>
            <div className="grid grid-cols-3 gap-4">
                <InputField label="Kp" value={localSettings.pidCooling.kp} onChange={(v: number) => handlePIDChange('pidCooling', 'kp', v)} type="number" />
                <InputField label="Ki" value={localSettings.pidCooling.ki} onChange={(v: number) => handlePIDChange('pidCooling', 'ki', v)} type="number" />
                <InputField label="Kd" value={localSettings.pidCooling.kd} onChange={(v: number) => handlePIDChange('pidCooling', 'kd', v)} type="number" />
            </div>
        </div>
        
        <div className="mt-8 flex justify-end">
          <button onClick={handleSave} className="bg-neutral-100 hover:bg-white text-black px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-2 shadow-lg">
            <Save size={14} /> Atualizar PID
          </button>
        </div>
      </section>

      {/* 5. Teste de Relés */}
      <section className="bg-neutral-900/30 border border-neutral-800 rounded-3xl p-8">
        <SectionHeader icon={Zap} title="Teste de Relés" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button 
                onClick={() => setRelayState('HEAT')}
                className={`py-2.5 rounded-lg font-bold uppercase tracking-wider text-xs transition-all flex items-center justify-center gap-2 border ${relayState === 'HEAT' ? 'bg-white text-black border-white shadow-lg' : 'bg-transparent border-neutral-800 text-neutral-500 hover:border-neutral-600 hover:text-neutral-300'}`}
            >
                <Thermometer size={14} /> Aquecer
            </button>
            <button 
                onClick={() => setRelayState('COOL')}
                className={`py-2.5 rounded-lg font-bold uppercase tracking-wider text-xs transition-all flex items-center justify-center gap-2 border ${relayState === 'COOL' ? 'bg-white text-black border-white shadow-lg' : 'bg-transparent border-neutral-800 text-neutral-500 hover:border-neutral-600 hover:text-neutral-300'}`}
            >
                <Power size={14} /> Refrigerar
            </button>
            <button 
                onClick={() => setRelayState('AUTO')}
                className={`py-2.5 rounded-lg font-bold uppercase tracking-wider text-xs transition-all flex items-center justify-center gap-2 border ${relayState === 'AUTO' ? 'bg-white text-black border-white shadow-lg' : 'bg-transparent border-neutral-800 text-neutral-500 hover:border-neutral-600 hover:text-neutral-300'}`}
            >
                <Cpu size={14} /> Auto
            </button>
        </div>
        <p className="text-xs text-neutral-600 mt-4">* O modo AUTO retorna o controle para o algoritmo PID.</p>
      </section>

      {/* 6. Sistema */}
      <section className="bg-neutral-900/30 border border-neutral-800 rounded-3xl p-8">
        <SectionHeader icon={Power} title="Sistema" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button className="bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-white py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2">
                <RotateCcw size={14} /> Reiniciar
            </button>
            <button className="bg-white hover:bg-neutral-200 text-black py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg">
                <Download size={14} /> Baixar Logs
            </button>
            <button className="bg-transparent border border-neutral-800 hover:border-red-900/50 hover:bg-red-900/10 hover:text-red-500 text-neutral-500 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2">
                <Trash2 size={14} /> Limpar Logs
            </button>
            <button className="bg-transparent border border-neutral-800 hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-500 text-neutral-500 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2">
                <Power size={14} /> Reset Fábrica
            </button>
        </div>
      </section>

    </div>
  );
};
