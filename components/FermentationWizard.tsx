import React, { useState, useRef } from 'react';
import { Upload, FileJson, Plus, BookOpen, Play, X, Save } from 'lucide-react';
import { FermentationStep, FermenterStatus } from '../types';
import { useRecipes, Recipe } from '../hooks/useRecipes';

interface FermentationWizardProps {
  onStartFermentation: (
    steps: FermentationStep[], 
    beerName: string, 
    style: string, 
    volume: number, 
    og: number, 
    fg: number
  ) => void;
}

type WizardStep = 'select' | 'import' | 'manual' | 'saved' | 'review_saved';

export const FermentationWizard: React.FC<FermentationWizardProps> = ({ onStartFermentation }) => {
  const [step, setStep] = useState<WizardStep>('select');
  const { recipes, addRecipe, deleteRecipe } = useRecipes();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);

  // Manual Creation State
  const [recipeName, setRecipeName] = useState('');
  const [beerStyle, setBeerStyle] = useState('');
  const [volume, setVolume] = useState(20);
  const [og, setOg] = useState(1.050);
  const [fg, setFg] = useState(1.010);
  const [manualSteps, setManualSteps] = useState<FermentationStep[]>([
    { id: Math.random().toString(36).substr(2, 9), name: 'Primária', temperature: 18, duration: 7 }
  ]);

  const handleImportBrewfather = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        
        // Basic Brewfather JSON parsing
        const name = json.name || 'Cerveja Importada';
        const style = json.style?.name || 'Desconhecido';
        const vol = json.batchSize || 20;
        const o = json.og || 1.050;
        const f = json.fg || 1.010;
        
        const steps: FermentationStep[] = [];
        if (json.fermentation && json.fermentation.steps) {
          json.fermentation.steps.forEach((s: any, index: number) => {
            steps.push({
              id: Math.random().toString(36).substr(2, 9),
              name: `Rampa ${index + 1}`,
              temperature: s.stepTemp || 20,
              duration: s.stepTime || 1
            });
          });
        }

        if (steps.length === 0) {
          alert('Nenhuma rampa de fermentação encontrada no arquivo.');
          return;
        }

        // Save as recipe
        const newRecipe = addRecipe({
          name,
          steps,
          source: 'brewfather'
        });

        setSelectedRecipe(newRecipe);
        setRecipeName(name);
        setBeerStyle(style);
        setVolume(vol);
        setOg(o);
        setFg(f);
        setStep('review_saved');
      } catch (error) {
        console.error('Error parsing Brewfather JSON:', error);
        alert('Erro ao ler o arquivo. Certifique-se de que é um JSON válido do Brewfather.');
      }
    };
    reader.readAsText(file);
  };

  const handleStartManual = () => {
    if (!recipeName) {
      alert('Por favor, insira um nome para a receita.');
      return;
    }
    
    // Save recipe
    addRecipe({
      name: recipeName,
      steps: manualSteps,
      source: 'manual'
    });

    onStartFermentation(manualSteps, recipeName, beerStyle, volume, og, fg);
  };

  const handleStartSaved = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    setRecipeName(recipe.name);
    setBeerStyle('Estilo Salvo');
    setVolume(20);
    setOg(1.050);
    setFg(1.010);
    setStep('review_saved');
  };

  const handleConfirmSaved = () => {
    if (!selectedRecipe) return;
    onStartFermentation(selectedRecipe.steps, recipeName, beerStyle, volume, og, fg);
  };

  const renderSelect = () => (
    <div className="space-y-4">
      <h3 className="text-white font-bold text-lg mb-6">Nova Fermentação</h3>
      
      <button 
        onClick={() => fileInputRef.current?.click()}
        className="w-full flex items-center gap-4 p-4 rounded-2xl bg-neutral-900 border border-neutral-800 hover:border-neutral-600 hover:bg-neutral-800 transition-all text-left group"
      >
        <div className="w-12 h-12 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
          <Upload size={24} />
        </div>
        <div>
          <h4 className="text-white font-semibold">Importar do Brewfather</h4>
          <p className="text-neutral-500 text-sm">Faça upload do arquivo JSON da sua receita</p>
        </div>
      </button>
      <input 
        type="file" 
        accept=".json" 
        className="hidden" 
        ref={fileInputRef} 
        onChange={handleImportBrewfather} 
      />

      <button 
        onClick={() => setStep('manual')}
        className="w-full flex items-center gap-4 p-4 rounded-2xl bg-neutral-900 border border-neutral-800 hover:border-neutral-600 hover:bg-neutral-800 transition-all text-left group"
      >
        <div className="w-12 h-12 rounded-xl bg-green-500/20 text-green-400 flex items-center justify-center group-hover:scale-110 transition-transform">
          <Plus size={24} />
        </div>
        <div>
          <h4 className="text-white font-semibold">Criar Rampas Manualmente</h4>
          <p className="text-neutral-500 text-sm">Defina suas próprias temperaturas e tempos</p>
        </div>
      </button>

      <button 
        onClick={() => setStep('saved')}
        className="w-full flex items-center gap-4 p-4 rounded-2xl bg-neutral-900 border border-neutral-800 hover:border-neutral-600 hover:bg-neutral-800 transition-all text-left group"
      >
        <div className="w-12 h-12 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center group-hover:scale-110 transition-transform">
          <BookOpen size={24} />
        </div>
        <div>
          <h4 className="text-white font-semibold">Receitas Salvas</h4>
          <p className="text-neutral-500 text-sm">Escolha uma receita que você já criou ou importou</p>
        </div>
      </button>
    </div>
  );

  const renderManual = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-white font-bold text-lg">Criar Receita</h3>
        <button onClick={() => setStep('select')} className="text-neutral-500 hover:text-white">
          <X size={20} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">Nome da Receita</label>
          <input 
            type="text" 
            value={recipeName}
            onChange={e => setRecipeName(e.target.value)}
            className="w-full bg-black border border-neutral-800 rounded-xl px-4 py-2 text-white outline-none focus:border-neutral-600"
            placeholder="Ex: IPA da Casa"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">Estilo</label>
          <input 
            type="text" 
            value={beerStyle}
            onChange={e => setBeerStyle(e.target.value)}
            className="w-full bg-black border border-neutral-800 rounded-xl px-4 py-2 text-white outline-none focus:border-neutral-600"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">Volume (L)</label>
          <input 
            type="number" 
            value={volume}
            onChange={e => setVolume(Number(e.target.value))}
            className="w-full bg-black border border-neutral-800 rounded-xl px-4 py-2 text-white outline-none focus:border-neutral-600"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">OG Estimada</label>
          <input 
            type="number" 
            step="0.001"
            value={og}
            onChange={e => setOg(Number(e.target.value))}
            className="w-full bg-black border border-neutral-800 rounded-xl px-4 py-2 text-white outline-none focus:border-neutral-600"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">FG Estimada</label>
          <input 
            type="number" 
            step="0.001"
            value={fg}
            onChange={e => setFg(Number(e.target.value))}
            className="w-full bg-black border border-neutral-800 rounded-xl px-4 py-2 text-white outline-none focus:border-neutral-600"
          />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-bold text-neutral-500 uppercase">Rampas de Fermentação</label>
          <button 
            onClick={() => setManualSteps(prev => [...prev, { id: Math.random().toString(36).substr(2, 9), name: 'Nova Rampa', temperature: 20, duration: 1 }])}
            className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
          >
            <Plus size={14} /> Adicionar
          </button>
        </div>
        
        {manualSteps.map((step, index) => (
          <div key={step.id} className="flex items-center gap-3 bg-black/40 p-3 rounded-xl border border-neutral-800">
            <div className="w-6 h-6 rounded-full bg-neutral-800 flex items-center justify-center text-xs text-neutral-500 shrink-0">
              {index + 1}
            </div>
            <input 
              type="text" 
              value={step.name}
              onChange={e => setManualSteps(prev => prev.map(s => s.id === step.id ? { ...s, name: e.target.value } : s))}
              className="flex-1 bg-transparent border-none text-white outline-none text-sm"
              placeholder="Nome da rampa"
            />
            <div className="flex items-center gap-1 shrink-0">
              <input 
                type="number" 
                value={step.temperature}
                onChange={e => setManualSteps(prev => prev.map(s => s.id === step.id ? { ...s, temperature: Number(e.target.value) } : s))}
                className="w-14 bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-white text-sm outline-none"
              />
              <span className="text-neutral-500 text-xs">°C</span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <input 
                type="number" 
                value={step.duration}
                onChange={e => setManualSteps(prev => prev.map(s => s.id === step.id ? { ...s, duration: Number(e.target.value) } : s))}
                className="w-14 bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-white text-sm outline-none"
              />
              <span className="text-neutral-500 text-xs">dias</span>
            </div>
            <button 
              onClick={() => setManualSteps(prev => prev.filter(s => s.id !== step.id))}
              className="text-neutral-600 hover:text-red-400 p-1"
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>

      <button 
        onClick={handleStartManual}
        className="w-full py-3 bg-white text-black rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-neutral-200 transition-colors"
      >
        <Play size={18} /> Iniciar Fermentação
      </button>
    </div>
  );

  const renderSaved = () => (
    <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-white font-bold text-lg">Receitas Salvas</h3>
        <button onClick={() => setStep('select')} className="text-neutral-500 hover:text-white">
          <X size={20} />
        </button>
      </div>

      {recipes.length === 0 ? (
        <div className="text-center py-8 text-neutral-500">
          <BookOpen size={32} className="mx-auto mb-3 opacity-20" />
          <p>Nenhuma receita salva ainda.</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
          {recipes.map(recipe => (
            <div key={recipe.id} className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex items-center justify-between group">
              <div>
                <h4 className="text-white font-semibold flex items-center gap-2">
                  {recipe.name}
                  {recipe.source === 'brewfather' && (
                    <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded uppercase tracking-wider">Brewfather</span>
                  )}
                </h4>
                <p className="text-neutral-500 text-xs mt-1">
                  {recipe.steps.length} rampas • {recipe.steps.reduce((acc, s) => acc + s.duration, 0)} dias totais
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => deleteRecipe(recipe.id)}
                  className="p-2 text-neutral-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={18} />
                </button>
                <button 
                  onClick={() => handleStartSaved(recipe)}
                  className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-transform"
                >
                  <Play size={18} className="ml-1" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderReviewSaved = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-white font-bold text-lg">Iniciar Receita: {selectedRecipe?.name}</h3>
        <button onClick={() => setStep('saved')} className="text-neutral-500 hover:text-white">
          <X size={20} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">Nome do Lote</label>
          <input 
            type="text" 
            value={recipeName}
            onChange={e => setRecipeName(e.target.value)}
            className="w-full bg-black border border-neutral-800 rounded-xl px-4 py-2 text-white outline-none focus:border-neutral-600"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">Estilo</label>
          <input 
            type="text" 
            value={beerStyle}
            onChange={e => setBeerStyle(e.target.value)}
            className="w-full bg-black border border-neutral-800 rounded-xl px-4 py-2 text-white outline-none focus:border-neutral-600"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">Volume (L)</label>
          <input 
            type="number" 
            value={volume}
            onChange={e => setVolume(Number(e.target.value))}
            className="w-full bg-black border border-neutral-800 rounded-xl px-4 py-2 text-white outline-none focus:border-neutral-600"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">OG Estimada</label>
          <input 
            type="number" 
            step="0.001"
            value={og}
            onChange={e => setOg(Number(e.target.value))}
            className="w-full bg-black border border-neutral-800 rounded-xl px-4 py-2 text-white outline-none focus:border-neutral-600"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">FG Estimada</label>
          <input 
            type="number" 
            step="0.001"
            value={fg}
            onChange={e => setFg(Number(e.target.value))}
            className="w-full bg-black border border-neutral-800 rounded-xl px-4 py-2 text-white outline-none focus:border-neutral-600"
          />
        </div>
      </div>

      <div className="space-y-3">
        <label className="block text-xs font-bold text-neutral-500 uppercase">Rampas da Receita</label>
        {selectedRecipe?.steps.map((step, index) => (
          <div key={step.id} className="flex items-center gap-3 bg-black/40 p-3 rounded-xl border border-neutral-800">
            <div className="w-6 h-6 rounded-full bg-neutral-800 flex items-center justify-center text-xs text-neutral-500 shrink-0">
              {index + 1}
            </div>
            <div className="flex-1 text-white text-sm">
              {step.name}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-white font-mono">{step.temperature}</span>
              <span className="text-neutral-500 text-xs">°C</span>
            </div>
            <div className="flex items-center gap-1 shrink-0 ml-4">
              <span className="text-white font-mono">{step.duration}</span>
              <span className="text-neutral-500 text-xs">dias</span>
            </div>
          </div>
        ))}
      </div>

      <button 
        onClick={handleConfirmSaved}
        className="w-full py-3 bg-white text-black rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-neutral-200 transition-colors"
      >
        <Play size={18} /> Iniciar Fermentação
      </button>
    </div>
  );

  return (
    <div className="bg-neutral-900/30 rounded-3xl p-6 border border-neutral-800 backdrop-blur-sm">
      {step === 'select' && renderSelect()}
      {step === 'import' && renderSelect()}
      {step === 'manual' && renderManual()}
      {step === 'saved' && renderSaved()}
      {step === 'review_saved' && renderReviewSaved()}
    </div>
  );
};
