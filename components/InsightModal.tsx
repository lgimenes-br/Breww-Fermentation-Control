import React, { useRef, useState } from 'react';
import { X, Activity, TrendingDown, Clock, AlertTriangle, CheckCircle2, Info, Sparkles, Download, MessageCircle, Loader2 } from 'lucide-react';
import { BrewingInsightData, Fermenter } from '../types';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, ReferenceLine } from 'recharts';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { TemperatureChart } from './TemperatureChart';

interface InsightModalProps {
  isOpen: boolean;
  onClose: () => void;
  insight: BrewingInsightData | null;
  fermenter: Fermenter;
}

export const InsightModal: React.FC<InsightModalProps> = ({ isOpen, onClose, insight, fermenter }) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  if (!isOpen || !insight) return null;

  const handleDownloadPDF = async () => {
    if (!modalRef.current) return;
    setIsExporting(true);
    
    try {
      // Small delay to allow React to render the expanded view without scrollbars
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const canvas = await html2canvas(modalRef.current, {
        scale: 2,
        backgroundColor: '#171717', // neutral-900
        useCORS: true,
        windowWidth: modalRef.current.scrollWidth,
        windowHeight: modalRef.current.scrollHeight
      });
      
      const imgData = canvas.toDataURL('image/png');
      
      // Calculate PDF dimensions based on canvas ratio
      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });
      
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save(`breww-ai-${fermenter.beerName.replace(/\s+/g, '-').toLowerCase()}.pdf`);
    } catch (err) {
      console.error('Erro ao gerar PDF', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleWhatsAppShare = () => {
    const text = `🍺 *Análise BREWW.AI - ${fermenter.beerName}*\nEstilo: ${fermenter.style}\n\n📊 *Indicadores:*\n• Saúde: ${insight.healthScore}/100\n• FG Prevista: ${insight.predictedFG.toFixed(3)}\n• Estimativa: ${insight.estimatedDaysRemaining} dias restantes\n\n📝 *Resumo:*\n${insight.summary}\n\n✅ *Recomendações:*\n${insight.recommendations.map(r => `• ${r}`).join('\n')}`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  // Prepare chart data: recent readings + predicted FG
  const recentReadings = fermenter.readings.slice(-30); // last 30 readings
  const chartData = recentReadings.map(r => ({
    time: new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    gravity: r.gravity,
  }));

  // Add a predicted point
  if (chartData.length > 0) {
    const lastReading = chartData[chartData.length - 1];
    chartData.push({
      time: 'Previsão',
      gravity: insight.predictedFG,
    });
  }

  const getHealthColor = (score: number) => {
    if (score >= 80) return 'text-emerald-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getRiskIcon = (level: string) => {
    switch (level) {
      case 'HIGH': return <AlertTriangle className="text-red-400 shrink-0" size={18} />;
      case 'MEDIUM': return <AlertTriangle className="text-yellow-400 shrink-0" size={18} />;
      case 'LOW': return <Info className="text-blue-400 shrink-0" size={18} />;
      default: return <Info className="text-neutral-400 shrink-0" size={18} />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div 
        ref={modalRef}
        className={`bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-4xl flex flex-col shadow-2xl ${isExporting ? 'h-auto max-h-none overflow-visible' : 'max-h-[90vh] overflow-hidden'}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-800 bg-neutral-900/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 rounded-lg">
              <Sparkles className="text-indigo-400" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Análise BREWW.AI</h2>
              <p className="text-sm text-neutral-400">{fermenter.beerName} • {fermenter.style}</p>
            </div>
          </div>
          
          {!isExporting && (
            <div className="flex items-center gap-2">
              <button 
                onClick={handleWhatsAppShare}
                className="flex items-center gap-2 px-3 py-2 bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 rounded-lg transition-colors text-sm font-medium"
                title="Compartilhar no WhatsApp"
              >
                <MessageCircle size={18} />
                <span className="hidden sm:inline">Compartilhar</span>
              </button>
              <button 
                onClick={handleDownloadPDF}
                disabled={isExporting}
                className="flex items-center gap-2 px-3 py-2 bg-neutral-800 text-white hover:bg-neutral-700 rounded-lg transition-colors text-sm font-medium"
                title="Salvar como PDF"
              >
                {isExporting ? <Loader2 className="animate-spin" size={18} /> : <Download size={18} />}
                <span className="hidden sm:inline">PDF</span>
              </button>
              <div className="w-px h-6 bg-neutral-800 mx-1"></div>
              <button 
                onClick={onClose}
                className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
              >
                <X size={24} />
              </button>
            </div>
          )}
        </div>

        {/* Content */}
        <div className={`p-6 ${isExporting ? 'overflow-visible' : 'flex-1 overflow-y-auto custom-scrollbar'}`}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Health Score */}
            <div className="bg-black/40 border border-neutral-800 rounded-xl p-6 flex flex-col items-center justify-center text-center">
              <Activity className="text-neutral-500 mb-2" size={24} />
              <div className={`text-5xl font-black mb-1 ${getHealthColor(insight.healthScore)}`}>
                {insight.healthScore}
              </div>
              <div className="text-sm font-medium text-neutral-400 uppercase tracking-wider">Saúde da Fermentação</div>
            </div>

            {/* Predicted FG */}
            <div className="bg-black/40 border border-neutral-800 rounded-xl p-6 flex flex-col items-center justify-center text-center">
              <TrendingDown className="text-indigo-400 mb-2" size={24} />
              <div className="text-4xl font-bold text-white mb-1">
                {insight.predictedFG.toFixed(3)}
              </div>
              <div className="text-sm font-medium text-neutral-400 uppercase tracking-wider">FG Prevista</div>
            </div>

            {/* Estimated Days */}
            <div className="bg-black/40 border border-neutral-800 rounded-xl p-6 flex flex-col items-center justify-center text-center">
              <Clock className="text-emerald-400 mb-2" size={24} />
              <div className="text-4xl font-bold text-white mb-1">
                {insight.estimatedDaysRemaining}
              </div>
              <div className="text-sm font-medium text-neutral-400 uppercase tracking-wider">Dias Restantes</div>
            </div>
          </div>

          <div className="mb-8">
            <h3 className="text-lg font-semibold text-white mb-3">Resumo</h3>
            <p className="text-neutral-300 leading-relaxed bg-black/40 p-4 rounded-xl border border-neutral-800">
              {insight.summary}
            </p>
          </div>

          {/* Chart */}
          <div className="mb-8 bg-black/40 border border-neutral-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-6">Projeção de Atenuação</h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                <AreaChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <defs>
                    <linearGradient id="colorGravity" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#818cf8" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#818cf8" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                  <XAxis 
                    dataKey="time" 
                    stroke="#666" 
                    fontSize={12}
                    tickMargin={10}
                  />
                  <YAxis 
                    domain={['dataMin - 0.005', 'dataMax + 0.005']} 
                    stroke="#666" 
                    fontSize={12}
                    tickFormatter={(val) => val.toFixed(3)}
                    width={60}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#171717', borderColor: '#333', borderRadius: '8px', color: '#fff' }}
                    itemStyle={{ color: '#818cf8' }}
                    formatter={(value: number) => [value.toFixed(3), 'Gravidade']}
                    labelStyle={{ color: '#999', marginBottom: '4px' }}
                  />
                  <ReferenceLine y={insight.predictedFG} stroke="#10b981" strokeDasharray="3 3" label={{ position: 'insideTopLeft', value: 'FG Prevista', fill: '#10b981', fontSize: 12 }} />
                  <Area 
                    type="monotone" 
                    dataKey="gravity" 
                    stroke="#818cf8" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorGravity)" 
                    isAnimationActive={true}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Temperature Chart */}
          <TemperatureChart 
            data={fermenter.readings} 
            events={fermenter.events} 
            className="mb-8 bg-black/40 border border-neutral-800 rounded-xl p-6"
            titleClassName="text-lg font-semibold text-white mb-6"
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Risks */}
            <div className="bg-black/40 border border-neutral-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <AlertTriangle className="text-yellow-400" size={20} />
                Riscos Identificados
              </h3>
              {insight.risks.length > 0 ? (
                <ul className="space-y-3">
                  {insight.risks.map((risk, idx) => (
                    <li key={idx} className="flex items-start gap-3 text-sm">
                      {getRiskIcon(risk.level)}
                      <span className="text-neutral-300 pt-0.5">{risk.message}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="flex items-center gap-2 text-emerald-400 text-sm">
                  <CheckCircle2 size={18} />
                  <span>Nenhum risco significativo detectado.</span>
                </div>
              )}
            </div>

            {/* Recommendations */}
            <div className="bg-black/40 border border-neutral-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <CheckCircle2 className="text-emerald-400" size={20} />
                Recomendações
              </h3>
              <ul className="space-y-3">
                {insight.recommendations.map((rec, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-2 shrink-0" />
                    <span className="text-neutral-300">{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
