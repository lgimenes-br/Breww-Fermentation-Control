
import React from 'react';
import { FinishedBrew } from '../types';
import { Award, Share2, FileDown, Quote, CheckCircle } from 'lucide-react';
import { TemperatureChart } from './TemperatureChart';
import { GravityChart } from './GravityChart';

interface FinishedBrewDetailProps {
  brew: FinishedBrew;
}

export const FinishedBrewDetail: React.FC<FinishedBrewDetailProps> = ({ brew }) => {
  const [copied, setCopied] = React.useState(false);
  const [annotation, setAnnotation] = React.useState(brew.notes || '');
  const [isEditingAnnotation, setIsEditingAnnotation] = React.useState(false);

  const attenuation = ((brew.og - brew.fg) / (brew.og - 1)) * 100;
  const calories = (brew.abv * 2.5) * (brew.fg * 10);

  const handleExportPDF = () => {
    window.print();
  };

  const handleShare = async () => {
    const shareData = {
      title: `Lote ${brew.batchNumber} - ${brew.beerName}`,
      text: `Confira minha ${brew.beerName} (${brew.style}). ABV: ${brew.abv.toFixed(1)}%, FG: ${brew.fg.toFixed(3)}. Analisado no BREWW Dashboard!`,
      url: window.location.href
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.error("Erro ao compartilhar:", err);
      }
    } else {
      // Fallback: Copy to clipboard
      navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const StatCard = ({ label, value, subtext, colorClass }: any) => (
    <div className="bg-neutral-900/20 rounded-2xl p-6 border border-neutral-800/50 hover:border-neutral-700 transition-colors">
        <p className="text-neutral-500 text-xs font-bold uppercase tracking-widest mb-2">{label}</p>
        <p className={`text-4xl font-light tracking-tighter ${colorClass}`}>{value}</p>
        {subtext && <p className="text-neutral-600 text-xs mt-1">{subtext}</p>}
    </div>
  );

  return (
    <div className="p-6 md:p-8 w-full animate-in fade-in slide-in-from-bottom-4 duration-300 pb-16">
      <div className="flex justify-end items-center mb-8 no-print">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsEditingAnnotation(true)}
            className="flex items-center gap-2 px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white rounded-xl border border-neutral-800 transition-all text-xs font-bold uppercase tracking-wider"
          >
            <Quote size={14} />
            {annotation ? 'Editar Anotação' : 'Adicionar Anotação'}
          </button>
          
          <button 
            onClick={handleShare}
            className="flex items-center gap-2 px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white rounded-xl border border-neutral-800 transition-all text-xs font-bold uppercase tracking-wider"
          >
            {copied ? <CheckCircle size={14} className="text-green-500" /> : <Share2 size={14} />}
            {copied ? 'Copiado' : 'Compartilhar'}
          </button>
          
          <button 
            onClick={handleExportPDF}
            className="flex items-center gap-2 px-4 py-2 bg-neutral-100 hover:bg-white text-black rounded-xl transition-all text-xs font-bold uppercase tracking-wider"
          >
            <FileDown size={14} />
            Exportar PDF
          </button>
        </div>
      </div>

      {/* Hero Section */}
      <div className="mb-12">
        <div className="flex items-center gap-3 mb-2">
            <span className="text-neutral-500 text-sm font-mono tracking-widest">{brew.batchNumber}</span>
            <span className="h-px w-8 bg-neutral-800"></span>
            <span className="text-neutral-500 text-sm font-light">{new Date(brew.endDate).toLocaleDateString()}</span>
        </div>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
                <h1 className="text-5xl md:text-6xl font-black text-white tracking-tighter mb-2">{brew.beerName || 'Sem Nome'}</h1>
                <span className="inline-block px-3 py-1 bg-neutral-900 text-neutral-400 rounded-md text-sm border border-neutral-800">
                    {brew.style}
                </span>
            </div>
            
            <div className="flex gap-1">
                 {[...Array(5)].map((_, i) => (
                    <Award 
                        key={i} 
                        size={20} 
                        className={i < (brew.rating || 0) ? "text-white fill-white/20" : "text-neutral-800"} 
                    />
                ))}
            </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <StatCard 
            label="Teor Alcoólico" 
            value={`${brew.abv.toFixed(1)}%`} 
            colorClass="text-green-400" 
        />
        <StatCard 
            label="Atenuação" 
            value={`${attenuation.toFixed(1)}%`} 
            colorClass="text-blue-400" 
            subtext="Eficiência aparente"
        />
        <div className="bg-neutral-900/20 rounded-2xl p-6 border border-neutral-800/50 hover:border-neutral-700 transition-colors">
            <p className="text-neutral-500 text-xs font-bold uppercase tracking-widest mb-2">Gravidade (OG → FG)</p>
            <div className="flex items-baseline gap-3">
                 <span className="text-2xl text-neutral-600 font-light line-through decoration-neutral-700">{brew.og.toFixed(3)}</span>
                 <span className="text-4xl font-light text-purple-400 tracking-tighter">{brew.fg.toFixed(3)}</span>
            </div>
        </div>
        <StatCard 
            label="Calorias (350ml)" 
            value={`~${calories.toFixed(0)}`} 
            colorClass="text-white" 
        />
      </div>

      {/* Notes / Annotation Section */}
      {annotation && !isEditingAnnotation && (
        <div className="mb-12 print:mb-8">
           <h3 className="text-neutral-500 text-xs font-bold uppercase tracking-widest mb-2">Anotações do Lote</h3>
           <p className="text-neutral-300 text-sm whitespace-pre-wrap leading-relaxed">
              {annotation}
           </p>
        </div>
      )}

      {isEditingAnnotation && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 no-print">
            <div className="bg-neutral-900 border border-neutral-800 w-full max-w-2xl rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
                <h3 className="text-lg font-bold text-white mb-6">Anotações do Lote</h3>
                <textarea 
                  value={annotation}
                  onChange={(e) => setAnnotation(e.target.value)}
                  className="w-full bg-black border border-neutral-800 rounded-xl p-4 text-neutral-300 focus:border-neutral-600 focus:ring-1 focus:ring-neutral-600 outline-none resize-y min-h-[200px]"
                  placeholder="Adicione suas observações, notas de degustação ou comentários para o PDF..."
                />
                <div className="flex justify-end gap-3 mt-6">
                  <button 
                    onClick={() => setIsEditingAnnotation(false)}
                    className="px-6 py-3 bg-neutral-100 hover:bg-white text-black rounded-xl text-xs font-bold uppercase tracking-wider transition-colors"
                  >
                    Concluir
                  </button>
                </div>
            </div>
        </div>
      )}

      {/* Charts Section - min-w-0 for ResponsiveContainer support */}
      <div className="grid grid-cols-1 gap-8 min-w-0">
         <div className="space-y-4 min-w-0">
            <h3 className="text-neutral-500 text-xs font-bold uppercase tracking-widest pl-2">Perfil de Temperatura</h3>
            <TemperatureChart data={brew.readings} events={brew.events} />
         </div>
         <div className="space-y-4 min-w-0">
            <h3 className="text-neutral-500 text-xs font-bold uppercase tracking-widest pl-2">Curva de Atenuação</h3>
            <GravityChart data={brew.readings} />
         </div>
      </div>

      <div className="mt-16 pt-8 border-t border-neutral-900 flex justify-center text-xs text-neutral-600 font-mono uppercase tracking-widest">
         Tempo Total de Fermentação: {Math.ceil((new Date(brew.endDate).getTime() - new Date(brew.startDate).getTime()) / (1000 * 3600 * 24))} dias
      </div>
    </div>
  );
};
