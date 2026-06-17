import React, { useState } from 'react';
import { X, Plus, Trash } from 'lucide-react';
import { FermentationStep } from '../types';

interface StartBatchModalProps {
    isOpen: boolean;
    onClose: () => void;
    onStart: (formData: any, steps: FermentationStep[]) => void;
}

export const StartBatchModal: React.FC<StartBatchModalProps> = ({ isOpen, onClose, onStart }) => {
    const [name, setName] = useState('');
    const [style, setStyle] = useState('IPA');
    const [og, setOg] = useState('1.050');
    const [fg, setFg] = useState('1.010');
    const [steps, setSteps] = useState<FermentationStep[]>([
        { id: Math.random().toString(36).substr(2, 9), name: 'Primária', temperature: 18, duration: 7 }
    ]);

    if (!isOpen) return null;

    const handleAddStep = () => {
        setSteps([
            ...steps,
            { id: Math.random().toString(36).substr(2, 9), name: 'Nova Etapa', temperature: 20, duration: 2 }
        ]);
    };

    const handleRemoveStep = (id: string) => {
        if (steps.length === 1) return; // Prevent removing the last step
        setSteps(steps.filter(s => s.id !== id));
    };

    const handleUpdateStep = (id: string, field: keyof FermentationStep, value: any) => {
        setSteps(steps.map(s => s.id === id ? { ...s, [field]: value } : s));
    };

    const handleSubmit = () => {
        if (!name) return alert('Por favor, informe o nome da cerveja.');
        onStart({ name, style, og: parseFloat(og), fg: parseFloat(fg) }, steps);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose}></div>
            <div className="relative w-full max-w-xl bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between p-6 border-b border-neutral-800">
                    <h2 className="text-xl font-bold text-white tracking-tight">Nova Produção</h2>
                    <button onClick={onClose} className="text-neutral-400 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto flex-1 space-y-6">
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold tracking-widest text-neutral-500 uppercase">Informações do Lote</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <label className="block text-xs text-neutral-400 mb-1">Nome da Cerveja</label>
                                <input 
                                    type="text" 
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Ex: IPA da Casa"
                                    className="w-full bg-black border border-neutral-800 rounded-xl px-4 py-3 text-white outline-none focus:border-neutral-600 transition-colors"
                                />
                            </div>
                            <div className="col-span-2">
                                <label className="block text-xs text-neutral-400 mb-1">Estilo</label>
                                <select 
                                    value={style}
                                    onChange={(e) => setStyle(e.target.value)}
                                    className="w-full bg-black border border-neutral-800 rounded-xl px-4 py-3 text-white outline-none focus:border-neutral-600 transition-colors appearance-none"
                                >
                                    <option value="IPA">IPA</option>
                                    <option value="Pale Ale">Pale Ale</option>
                                    <option value="Lager">Lager</option>
                                    <option value="Stout">Stout</option>
                                    <option value="Weissbier">Weissbier</option>
                                    <option value="Custom">Outro</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs text-neutral-400 mb-1">OG Estimada</label>
                                <input 
                                    type="number" 
                                    step="0.001"
                                    value={og}
                                    onChange={(e) => setOg(e.target.value)}
                                    className="w-full bg-black border border-neutral-800 rounded-xl px-4 py-3 text-white outline-none focus:border-neutral-600 transition-colors"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-neutral-400 mb-1">FG Estimada</label>
                                <input 
                                    type="number" 
                                    step="0.001"
                                    value={fg}
                                    onChange={(e) => setFg(e.target.value)}
                                    className="w-full bg-black border border-neutral-800 rounded-xl px-4 py-3 text-white outline-none focus:border-neutral-600 transition-colors"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-bold tracking-widest text-neutral-500 uppercase">Perfil de Fermentação</h3>
                            <button 
                                onClick={handleAddStep}
                                className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium"
                            >
                                <Plus size={14} /> Adicionar Etapa
                            </button>
                        </div>
                        
                        <div className="space-y-3">
                            {steps.map((step, index) => (
                                <div key={step.id} className="flex flex-wrap sm:flex-nowrap items-center gap-3 bg-black/40 p-3 rounded-xl border border-neutral-800 group">
                                    <div className="w-6 h-6 rounded-full bg-neutral-800 flex items-center justify-center text-xs text-neutral-500 shrink-0 font-mono">
                                        {index + 1}
                                    </div>
                                    <input 
                                        type="text" 
                                        value={step.name}
                                        onChange={(e) => handleUpdateStep(step.id, 'name', e.target.value)}
                                        className="flex-1 min-w-[100px] bg-transparent border-none text-white outline-none text-sm"
                                        placeholder="Nome da etapa"
                                    />
                                    <div className="flex items-center gap-2 shrink-0">
                                        <div className="flex items-center gap-1 bg-neutral-900 border border-neutral-800 rounded-lg px-2 py-1">
                                            <input 
                                                type="number" 
                                                value={step.temperature}
                                                onChange={(e) => handleUpdateStep(step.id, 'temperature', Number(e.target.value))}
                                                className="w-12 bg-transparent text-white text-sm outline-none text-right font-mono"
                                            />
                                            <span className="text-neutral-500 text-xs">°C</span>
                                        </div>
                                        <div className="flex items-center gap-1 bg-neutral-900 border border-neutral-800 rounded-lg px-2 py-1">
                                            <input 
                                                type="number" 
                                                value={step.duration}
                                                onChange={(e) => handleUpdateStep(step.id, 'duration', Number(e.target.value))}
                                                className="w-12 bg-transparent text-white text-sm outline-none text-right font-mono"
                                            />
                                            <span className="text-neutral-500 text-xs">dias</span>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => handleRemoveStep(step.id)}
                                        className="text-neutral-600 hover:text-red-400 p-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity"
                                        title="Remover"
                                    >
                                        <Trash size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t border-neutral-800 flex items-center justify-end gap-3 bg-neutral-900/50">
                    <button 
                        onClick={onClose}
                        className="px-6 py-3 rounded-xl text-neutral-300 font-medium hover:bg-neutral-800 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={handleSubmit}
                        className="px-6 py-3 rounded-xl bg-white text-black font-medium hover:bg-neutral-200 transition-colors"
                    >
                        Iniciar Produção
                    </button>
                </div>
            </div>
        </div>
    );
};
