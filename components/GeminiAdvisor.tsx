
import React, { useState } from 'react';
import { Brain, Sparkles, Loader2, MessageSquare } from 'lucide-react';
import { Fermenter, BrewingInsightData } from '../types';
import { getBrewingInsights } from '../services/geminiService';
import { InsightModal } from './InsightModal';

interface GeminiAdvisorProps {
  fermenter: Fermenter;
  className?: string;
}

export const GeminiAdvisor: React.FC<GeminiAdvisorProps> = ({ fermenter, className = "" }) => {
  const [insight, setInsight] = useState<BrewingInsightData | null>(null);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleAskAI = async () => {
    setLoading(true);
    const result = await getBrewingInsights(fermenter);
    if (result) {
      setInsight(result);
      setIsModalOpen(true);
    }
    setLoading(false);
  };

  return (
    <>
      <div className={`bg-gradient-to-br from-neutral-900 to-black border border-neutral-800 rounded-xl p-6 shadow-lg relative overflow-hidden group hover:border-indigo-900/50 transition-colors flex flex-col ${className}`}>
        {/* Background decoration */}
        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity">
          <Brain size={120} />
        </div>

        <div className="relative z-10 flex flex-col h-full">
          <div className="flex items-center justify-between mb-4 shrink-0">
            <div className="flex items-center gap-2">
              <Sparkles className="text-white" size={20} />
              <h3 className="text-lg font-bold text-neutral-100">BREWW.AI</h3>
            </div>
            <button
              onClick={handleAskAI}
              disabled={loading}
              className="flex items-center gap-2 bg-neutral-800 hover:bg-neutral-700 text-white px-4 py-2 rounded-lg transition-all disabled:opacity-50 text-sm font-medium border border-neutral-700"
            >
              {loading ? <Loader2 className="animate-spin" size={16} /> : <MessageSquare size={16} />}
              {loading ? "Analisando..." : "Analisar Fermentação"}
            </button>
          </div>

          <div className="flex-1 flex flex-col justify-center items-center text-center">
            <p className="text-neutral-500 text-sm max-w-md">
              Utilize a inteligência artificial do Gemini para analisar as curvas de temperatura e gravidade, identificar paradas de fermentação e sugerir correções de perfil.
            </p>
            {insight && (
              <button 
                onClick={() => setIsModalOpen(true)}
                className="mt-4 text-sm text-indigo-400 hover:text-indigo-300 underline"
              >
                Ver Última Análise
              </button>
            )}
          </div>
        </div>
      </div>

      <InsightModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        insight={insight} 
        fermenter={fermenter} 
      />
    </>
  );
};
