
import React, { useState, useEffect } from 'react';
import { FermentationStep } from '../types';
import { Plus, Trash2, Clock, Thermometer, Edit2, Check, Play, Pause, SkipForward, SkipBack, Square } from 'lucide-react';

interface FermentationProfileProps {
  steps: FermentationStep[];
  currentStepIndex: number;
  isPaused: boolean;
  style?: string;
  volume?: number;
  startDate?: string;
  og?: number;
  fg?: number;
  onUpdateSteps: (newSteps: FermentationStep[]) => void;
  onUpdateGravity?: (og: number, fg: number) => void;
  onTogglePause: () => void;
  onNextStep: () => void;
  onPreviousStep: () => void;
  onFinishProfile: () => void;
}

export const FermentationProfile: React.FC<FermentationProfileProps> = ({ 
  steps, 
  currentStepIndex, 
  isPaused,
  style,
  volume,
  startDate,
  og,
  fg,
  onUpdateSteps,
  onUpdateGravity,
  onTogglePause,
  onNextStep,
  onPreviousStep,
  onFinishProfile
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [localSteps, setLocalSteps] = useState<FermentationStep[]>(steps);
  const [localOg, setLocalOg] = useState<number | undefined>(og);
  const [localFg, setLocalFg] = useState<number | undefined>(fg);

  useEffect(() => {
    if (!isEditing) {
      setLocalSteps(steps);
      setLocalOg(og);
      setLocalFg(fg);
    }
  }, [isEditing, steps, og, fg]);

  const handleToggleEdit = () => {
    if (isEditing) {
      onUpdateSteps(localSteps);
      if (onUpdateGravity && (localOg !== og || localFg !== fg)) {
        onUpdateGravity(localOg || 0, localFg || 0);
      }
    }
    setIsEditing(!isEditing);
  };

  const handleAddStep = () => {
    const newStep: FermentationStep = {
      id: Math.random().toString(36).substr(2, 9),
      name: 'Nova Rampa',
      temperature: 18,
      duration: 1
    };
    setLocalSteps(prev => [...prev, newStep]);
  };

  const handleRemoveStep = (id: string) => {
    setLocalSteps(prev => prev.filter(s => s.id !== id));
  };

  const handleChangeStep = (id: string, field: keyof FermentationStep, value: any) => {
    setLocalSteps(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const displaySteps = isEditing ? localSteps : steps;
  const displayOg = isEditing ? localOg : og;
  const displayFg = isEditing ? localFg : fg;

  const isLastStep = currentStepIndex >= displaySteps.length - 1;

  return (
    <div className="bg-neutral-900/30 rounded-3xl p-6 border border-neutral-800 backdrop-blur-sm flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-neutral-500 text-xs font-bold uppercase tracking-widest">Perfil de Fermentação</h3>
        <button 
            onClick={handleToggleEdit}
            className="text-neutral-400 hover:text-white transition-colors"
        >
            {isEditing ? <Check size={16} className="text-green-500" /> : <Edit2 size={16} />}
        </button>
      </div>

      {(style || volume || startDate || displayOg || displayFg || isEditing) && (
        <div className="flex flex-wrap items-center gap-4 text-xs text-neutral-500 font-light mb-6 pb-4 border-b border-neutral-800/50">
            {style && <span className="bg-neutral-900 px-2 py-1 rounded text-neutral-400">{style}</span>}
            {volume && <span>Vol: {volume}L</span>}
            {startDate && <span>Início: {new Date(startDate).toLocaleDateString()}</span>}
            
            {(displayOg !== undefined || isEditing) && (
              <div className="flex items-center gap-1">
                <span>OG:</span>
                {isEditing ? (
                  <input 
                    type="number" 
                    step="0.001"
                    value={displayOg || ''}
                    onChange={(e) => setLocalOg(parseFloat(e.target.value) || 0)}
                    className="bg-neutral-800 border border-neutral-700 text-white rounded px-1 w-16 outline-none"
                  />
                ) : (
                  <span>{displayOg?.toFixed(3)}</span>
                )}
              </div>
            )}
            
            {(displayFg !== undefined || isEditing) && (
              <div className="flex items-center gap-1">
                <span>FG:</span>
                {isEditing ? (
                  <input 
                    type="number" 
                    step="0.001"
                    value={displayFg || ''}
                    onChange={(e) => setLocalFg(parseFloat(e.target.value) || 0)}
                    className="bg-neutral-800 border border-neutral-700 text-white rounded px-1 w-16 outline-none"
                  />
                ) : (
                  <span>{displayFg?.toFixed(3)}</span>
                )}
              </div>
            )}
        </div>
      )}

      <div className="space-y-3 relative mb-6">
        {displaySteps.map((step, index) => {
          const isActive = index === currentStepIndex;
          const isPast = index < currentStepIndex;
          
          return (
            <div 
                key={step.id}
                className={`relative z-10 flex items-center gap-4 p-3 rounded-xl border transition-all duration-300 ${
                    isActive 
                    ? 'bg-neutral-800/80 border-white/40 shadow-[0_0_15px_rgba(255,255,255,0.1)]' // Alterado de amber para white
                    : 'bg-black/40 border-neutral-800 hover:border-neutral-700'
                } ${isPast ? 'opacity-40' : 'opacity-100'}`}
            >
                {/* Indicador de Status (Bolinha) */}
                <div className="relative shrink-0">
                    {isActive && !isPaused && (
                        <div className="absolute inset-0 rounded-full bg-white opacity-20 animate-ping"></div>
                    )}
                    <div className={`relative w-10 h-10 rounded-full flex items-center justify-center border transition-colors ${
                        isActive ? (isPaused ? 'bg-neutral-800 text-white border-white' : 'bg-white text-black border-white') : 
                        isPast ? 'bg-neutral-800 text-neutral-500 border-neutral-700' : 
                        'bg-neutral-900 text-neutral-600 border-neutral-800'
                    }`}>
                        {isActive ? (
                            isPaused ? <Pause size={18} /> : <Thermometer size={18} />
                        ) : (
                            <span className="text-xs font-mono">{index + 1}</span>
                        )}
                    </div>
                </div>

                <div className="flex-1 min-w-0">
                    {isEditing ? (
                        <input 
                            type="text" 
                            value={step.name}
                            onChange={(e) => handleChangeStep(step.id, 'name', e.target.value)}
                            className="bg-transparent border-b border-neutral-700 text-sm font-medium text-white w-full outline-none focus:border-neutral-500"
                        />
                    ) : (
                        <h4 className={`text-sm font-medium truncate ${isActive ? 'text-white' : 'text-neutral-300'}`}>
                            {step.name}
                        </h4>
                    )}
                    
                    <div className="flex items-center gap-4 mt-1">
                        <div className="flex items-center gap-1.5" title="Temperatura Alvo">
                             <Thermometer size={12} className="text-neutral-500" />
                             {isEditing ? (
                                <input 
                                    type="number"
                                    value={step.temperature}
                                    onChange={(e) => handleChangeStep(step.id, 'temperature', parseFloat(e.target.value))}
                                    className="bg-transparent text-xs font-mono text-neutral-300 w-10 border-b border-neutral-700 outline-none"
                                />
                             ) : (
                                <span className="text-xs font-mono text-neutral-300">{step.temperature}°C</span>
                             )}
                        </div>
                        <div className="flex items-center gap-1.5" title="Duração">
                             <Clock size={12} className="text-neutral-500" />
                             {isEditing ? (
                                <input 
                                    type="number"
                                    value={step.duration}
                                    onChange={(e) => handleChangeStep(step.id, 'duration', parseFloat(e.target.value))}
                                    className="bg-transparent text-xs font-mono text-neutral-300 w-8 border-b border-neutral-700 outline-none"
                                />
                             ) : (
                                <span className="text-xs font-mono text-neutral-300">{step.duration}d</span>
                             )}
                        </div>
                    </div>
                </div>

                {isEditing && (
                    <button 
                        onClick={() => handleRemoveStep(step.id)}
                        className="text-neutral-600 hover:text-red-500 transition-colors p-2"
                    >
                        <Trash2 size={16} />
                    </button>
                )}
                
                {!isEditing && isActive && (
                    <div className={`${isPaused ? 'text-neutral-500' : 'text-white'} text-[10px] font-bold uppercase tracking-widest px-2`}>
                        {isPaused ? 'Pausado' : 'Ativo'}
                    </div>
                )}
            </div>
          );
        })}

        {isEditing && (
            <button 
                onClick={handleAddStep}
                className="w-full py-3 rounded-xl border border-dashed border-neutral-800 text-neutral-500 hover:text-white hover:border-neutral-600 hover:bg-neutral-900/50 transition-all flex items-center justify-center gap-2 text-sm"
            >
                <Plus size={16} /> Adicionar Rampa
            </button>
        )}
      </div>

      {/* Control Bar Footer */}
      {!isEditing && displaySteps.length > 0 && (
          <div className="grid grid-cols-4 gap-2 mt-auto pt-4 border-t border-neutral-800">
             <button 
                onClick={onTogglePause}
                className={`flex flex-col items-center justify-center py-3 rounded-xl transition-all border ${
                    isPaused 
                    ? 'bg-neutral-800 text-neutral-400 border-neutral-700' 
                    : 'bg-neutral-800 hover:bg-neutral-700 text-white border-neutral-700'
                }`}
                title={isPaused ? "Retomar Fermentação" : "Pausar Rampa Atual"}
             >
                {isPaused ? <Play size={20} className="mb-1" /> : <Pause size={20} className="mb-1" />}
                <span className="text-[10px] uppercase font-bold tracking-wider">{isPaused ? 'Retomar' : 'Pausar'}</span>
             </button>

             <button 
                onClick={onPreviousStep}
                disabled={currentStepIndex === 0}
                className="flex flex-col items-center justify-center py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 disabled:opacity-30 disabled:hover:bg-neutral-800 text-white border border-neutral-700 transition-all"
                title="Voltar para rampa anterior"
             >
                <SkipBack size={20} className="mb-1" />
                <span className="text-[10px] uppercase font-bold tracking-wider">Anterior</span>
             </button>

             <button 
                onClick={onNextStep}
                disabled={isLastStep}
                className="flex flex-col items-center justify-center py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 disabled:opacity-30 disabled:hover:bg-neutral-800 text-white border border-neutral-700 transition-all"
                title="Avançar para próxima rampa"
             >
                <SkipForward size={20} className="mb-1" />
                <span className="text-[10px] uppercase font-bold tracking-wider">Próxima</span>
             </button>

             <button 
                onClick={onFinishProfile}
                className="flex flex-col items-center justify-center py-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-900/50 transition-all"
                title="Encerrar Perfil e Fermentação"
             >
                <Square size={20} className="mb-1 fill-current" />
                <span className="text-[10px] uppercase font-bold tracking-wider">Finalizar</span>
             </button>
          </div>
      )}
    </div>
  );
};
