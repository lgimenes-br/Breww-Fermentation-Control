
import React, { useState, useEffect } from 'react';
import { Dashboard } from './components/Dashboard';
import { FermenterDetail } from './components/FermenterDetail';
import { Login } from './components/Login';
import { Register } from './components/Register';
import { FermentationHistory } from './components/FermentationHistory';
import { FinishedBrewDetail } from './components/FinishedBrewDetail';
import { Settings } from './components/Settings';
import { Fermenter, FermenterStatus, BeerStyle, DeviceMode, FinishedBrew } from './types';
import { History, LogOut, Settings as SettingsIcon, ArrowLeft, Snowflake, Circle, Flame, Timer, Menu, X, FlaskConical, Beer, ChevronDown, AlertTriangle } from 'lucide-react';
import { useTheme } from './ThemeContext';
import { useBrewContext } from './context/BrewContext';
import { useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

type ViewState = 'DASHBOARD' | 'HISTORY' | 'SETTINGS';
type AuthState = 'LOGIN' | 'REGISTER';

const App: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const { fermenters, handleTriggerUpdate, refetchFermenters } = useBrewContext();
  const [isAuthenticated, setIsAuthenticated] = useState(() => !!localStorage.getItem('token'));
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [authView, setAuthView] = useState<AuthState>('LOGIN');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
        setIsAuthenticated(true);
    }
    // Como não há validação complexa no backend no load inicial (apenas dependendo de chamadas que levam o 401 se falhar),
    // podemos liberar o loading após a leitura síncrona
    setIsAuthLoading(false);
  }, []);
  const [currentView, setCurrentView] = useState<ViewState>(() => {
    const path = window.location.pathname;
    if (path === '/settings') return 'SETTINGS';
    if (path.startsWith('/history')) return 'HISTORY';
    return 'DASHBOARD';
  });
  const [previousView, setPreviousView] = useState<ViewState | null>(null);
  const [selectedFermenterId, setSelectedFermenterId] = useState<number | null>(() => {
    const path = window.location.pathname;
    if (path.startsWith('/fermenter/')) {
        const id = parseInt(path.split('/')[2]);
        return isNaN(id) ? null : id;
    }
    return null;
  });
  const [selectedBrew, setSelectedBrew] = useState<FinishedBrew | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isModeMenuOpen, setIsModeMenuOpen] = useState(false);
  const [viewedMode, setViewedMode] = useState<DeviceMode | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);

  // Sincroniza a URL com o estado (F5 preservation)
  useEffect(() => {
    const handlePopState = () => {
        const path = window.location.pathname;
        if (path.startsWith('/fermenter/')) {
            const id = parseInt(path.split('/')[2]);
            if (!isNaN(id)) {
                setSelectedFermenterId(id);
                setCurrentView('DASHBOARD');
                setSelectedBrew(null);
            }
        } else if (path === '/settings') {
            setCurrentView('SETTINGS');
            setSelectedFermenterId(null);
            setSelectedBrew(null);
        } else if (path === '/history') {
            setCurrentView('HISTORY');
            setSelectedFermenterId(null);
            setSelectedBrew(null);
        } else {
            setCurrentView('DASHBOARD');
            setSelectedFermenterId(null);
            setSelectedBrew(null);
        }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    let newPath = '/dashboard';
    if (currentView === 'SETTINGS') {
        newPath = '/settings';
    } else if (currentView === 'HISTORY') {
        newPath = '/history';
    } else if (selectedFermenterId) {
        newPath = `/fermenter/${selectedFermenterId}`;
    }
    
    // Atualiza a URL sem recarregar a página, se estiver diferente e não formos deslogados
    if (isAuthenticated && window.location.pathname !== newPath) {
        if (window.location.pathname === '/' || window.location.pathname === '/login') {
           window.history.replaceState({}, '', newPath);
        } else {
           window.history.pushState({}, '', newPath);
        }
    }
  }, [currentView, selectedFermenterId, isAuthenticated]);

  useEffect(() => {
    if (selectedFermenterId) {
      const f = fermenters.find(f => f.id === selectedFermenterId);
      if (f && !isPreviewing) {
        setViewedMode(f.mode);
      }
    } else {
      setViewedMode(null);
      setIsPreviewing(false);
    }
  }, [selectedFermenterId, fermenters, isPreviewing]);

  const queryClient = useQueryClient();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        const target = event.target as HTMLElement;
        if (!target.closest('.mode-selector-dropdown')) {
            setIsModeMenuOpen(false);
        }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleUpdateFermenter = async (id: number, updates: Partial<Fermenter>) => {
    const f = fermenters.find(f => f.id === id);
    if (f) {
      // Optmistic local update
      queryClient.setQueryData<Fermenter[]>(['fermenters'], (old) => 
        old ? old.map(item => item.id === id ? { ...item, ...updates } : item) : []
      );
      
      // Sincronização via API para estado do Profile no MySQL: currentStepIndex e isPaused
      const url = import.meta.env.VITE_API_URL || '';
      const token = localStorage.getItem('token') || '';
      if (f.active_batch_id && (updates.currentStepIndex !== undefined || updates.isPaused !== undefined)) {
          try {
             await axios.put(`${url}/api/batch/${f.active_batch_id}`, {
                 current_step_index: updates.currentStepIndex,
                 is_paused: updates.isPaused
             }, { headers: { Authorization: `Bearer ${token}` } });
          } catch (e) {
             console.error('Erro ao atualizar batch no backend', e);
          }
      }

      // Se tivermos enviando um novo alvo (targetTemp) ou mudando de modo, dispara via MQTT
      if (updates.targetTemp !== undefined || updates.mode !== undefined) {
         let currentMode = updates.mode || f.mode;
         let opm = 0;
         if (currentMode === DeviceMode.FRIDGE) opm = 1;
         if (currentMode === DeviceMode.KEGERATOR) opm = 2;

         handleTriggerUpdate(f.serial_code || String(f.id), {
            type: 'SET_TEMP',
            target: updates.targetTemp ?? f.targetTemp,
            opm
         });
      }

      if (updates.profile !== undefined) {
         // 1. Otimiza o payload para o Arduino/ESP32 (n, t, d)
         const payloadSteps = updates.profile.map((step: any) => ({
             n: step.name || step.n,         
             t: step.temperature ?? step.t,  
             d: step.duration ?? step.d      
         }));
         
         // 2. Dispara a ordem de rádio para o hardware (Idioma legado)
         handleTriggerUpdate(f.serial_code || String(f.id), { 
             type: 'setProfile',
             steps: payloadSteps, 
             currentStep: f.currentStepIndex || 0 
         });

         const batchId = f.active_batch_id || (f as any).activeBatchId || (f as any).batch_id; // Fallback para garantir que ache o ID

         if (batchId) {
             try {
                 const url = import.meta.env.VITE_API_URL || '';
                 const token = localStorage.getItem('token');
                 await axios.put(`${url}/api/batch/${batchId}`, {
                     profile: updates.profile
                 }, { headers: { Authorization: `Bearer ${token}` } });
             } catch (e) {
                 console.error('❌ Erro na requisição Axios:', e);
             }
         } else {
             // removed warn
         }
      }
    }
  };

  const handleAddFermenter = async (newDevice: Partial<Fermenter>) => {
    try {
        const url = import.meta.env.VITE_API_URL || '';
        const token = localStorage.getItem('token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        
        await axios.post(`${url}/api/devices`, {
            serialCode: newDevice.serial_code,
            name: newDevice.device_name || 'Novo Dispositivo'
        }, { headers });

        refetchFermenters();
    } catch (err) {
        console.error('Erro ao adicionar device:', err);
    }
  };

  const handleDeleteFermenter = async (id: number) => {
    const f = fermenters.find(f => f.id === id);
    if (!f) return;
    try {
        const url = import.meta.env.VITE_API_URL || '';
        const token = localStorage.getItem('token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        await axios.delete(`${url}/api/devices/${f.serial_code || f.id}`, { headers });
        
        queryClient.setQueryData<Fermenter[]>(['fermenters'], (old) => old ? old.filter(item => item.id !== id) : []);
        if (selectedFermenterId === id) {
            setSelectedFermenterId(null);
            setCurrentView('DASHBOARD');
        }
    } catch (err) {
        console.error('Erro ao remover device:', err);
    }
  };

  const handleBack = () => {
    if (currentView === 'SETTINGS') {
      setCurrentView(previousView || 'DASHBOARD');
      setPreviousView('DASHBOARD');
    } else if (currentView === 'HISTORY' && selectedBrew) {
      setSelectedBrew(null);
    } else if (currentView === 'HISTORY') {
      setCurrentView(previousView || 'DASHBOARD');
      setPreviousView('DASHBOARD');
    } else if (currentView === 'DASHBOARD' && selectedFermenterId) {
      setSelectedFermenterId(null);
    }
  };

  const selectedFermenter = fermenters.find(f => f.id === selectedFermenterId);

  if (isAuthLoading) {
    return (
        <div className="flex items-center justify-center h-screen bg-black text-neutral-500">
            Carregando sessão...
        </div>
    );
  }

  if (!isAuthenticated) {
    if (authView === 'REGISTER') {
        return (
            <Register 
                onLogin={() => {
                    setCurrentView('DASHBOARD');
                    setSelectedFermenterId(null);
                    setSelectedBrew(null);
                    setIsAuthenticated(true);
                    window.history.pushState({}, '', '/dashboard');
                }} 
                onSwitchToLogin={() => setAuthView('LOGIN')} 
            />
        );
    }
    return (
        <Login 
            onLogin={() => {
                setCurrentView('DASHBOARD');
                setSelectedFermenterId(null);
                setSelectedBrew(null);
                setIsAuthenticated(true);
                window.history.pushState({}, '', '/dashboard');
            }} 
            onSwitchToRegister={() => setAuthView('REGISTER')} 
        />
    );
  }

  // Header Styles
  const headerBtnBase = "flex items-center justify-center gap-1 md:gap-2 px-2 md:px-3 lg:px-4 h-8 md:h-10 rounded-md text-[11px] font-bold uppercase tracking-wider border transition-all shrink-0";
  const iconOnlyBase = "flex items-center justify-center w-8 h-8 md:w-10 md:h-10 rounded-md border transition-all shrink-0";
  const navBtnDefault = "border-neutral-800 text-neutral-400 hover:border-neutral-600 hover:text-white";
  const navBtnActive = "border-neutral-400 text-white bg-white/5";

  // Status Logic for the Active Fermenter
  const lastUpdateStr = selectedFermenter?.currentDevice?.lastUpdate;
  const lastUpdateMs = lastUpdateStr ? new Date(lastUpdateStr).getTime() : 0;
  const isOnline = selectedFermenter && lastUpdateMs > 0 &&
    (new Date().getTime() - lastUpdateMs) < 30 * 60 * 1000;
  
  const currentTemp = selectedFermenter?.currentDevice?.temperature || 0;
  const isCooling = selectedFermenter && selectedFermenter.currentFridgeTemp < currentTemp - 0.2;
  const isHeating = selectedFermenter && selectedFermenter.currentFridgeTemp > currentTemp + 0.2;

  const showBackButton = currentView !== 'DASHBOARD' || selectedFermenterId !== null;

  return (
    <div className="min-h-screen bg-black pb-10">
      <nav className="bg-black py-6 no-print border-b border-neutral-800/50">
        <div className="w-full px-4 md:px-8 flex flex-wrap items-center justify-between gap-y-4">
          
          {/* Logo */}
          <div 
            className="flex items-center cursor-pointer select-none" 
            onClick={() => {
                setSelectedFermenterId(null);
                setSelectedBrew(null);
                setCurrentView('DASHBOARD');
                setPreviousView(null);
            }}
          >
            <div className="flex items-baseline">
                <span className="text-2xl md:text-4xl font-black text-white tracking-tighter">BREW</span>
                <div className="relative">
                    <span className="text-2xl md:text-4xl font-black text-white tracking-tighter">W</span>
                    <div className="absolute top-0 -right-1.5 md:-right-2 w-2 md:w-3 h-1.5 md:h-2 bg-white rounded-tr-sm"></div>
                </div>
            </div>
          </div>

          {/* Right side controls */}
          <div className="flex flex-wrap items-center gap-1 md:gap-2 justify-end">
            
            {/* Contextual Status Badges - Only visible inside a Fermenter Detail */}
            {selectedFermenterId && selectedFermenter && (
              <>
                <div className={`${headerBtnBase} ${isOnline ? 'border-green-500/50 text-green-500 bg-green-500/5' : 'border-red-500/50 text-red-500 bg-red-500/5'}`}>
                    <Circle size={8} className={isOnline ? "fill-current" : ""} />
                    <span className="hidden lg:inline">{isOnline ? 'Online' : 'Offline'}</span>
                </div>

                {isCooling && (
                  <div className={`${headerBtnBase} border-blue-500/50 text-blue-500 bg-blue-500/5`}>
                      <Snowflake size={14} />
                      <span className="hidden lg:inline">Resfriando</span>
                  </div>
                )}

                {isHeating && (
                  <div className={`${headerBtnBase} border-orange-500/50 text-orange-500 bg-orange-500/5`}>
                      <Flame size={14} />
                      <span className="hidden lg:inline">Aquecendo</span>
                  </div>
                )}

                {!isCooling && !isHeating && isOnline && (
                  <div className={`${headerBtnBase} border-neutral-700 text-neutral-500`}>
                      <Timer size={14} />
                      <span className="hidden lg:inline">Estável</span>
                  </div>
                )}

                {/* Mode Selector Dropdown */}
                <div className="relative mode-selector-dropdown">
                    <button 
                        onClick={() => setIsModeMenuOpen(!isModeMenuOpen)}
                        className={`${headerBtnBase} border-neutral-800 text-white bg-transparent hover:bg-white/5`}
                    >
                        {viewedMode === DeviceMode.FERMENTER && <><FlaskConical size={14} /> <span className="hidden lg:inline">Fermentador</span></>}
                        {viewedMode === DeviceMode.KEGERATOR && <><Beer size={14} /> <span className="hidden lg:inline">Chopeira</span></>}
                        {viewedMode === DeviceMode.FRIDGE && <><Snowflake size={14} /> <span className="hidden lg:inline">Geladeira</span></>}
                        <ChevronDown size={14} className={`transition-transform duration-200 ${isModeMenuOpen ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {isModeMenuOpen && (
                        <div className="absolute right-0 mt-2 w-48 bg-neutral-900 border border-neutral-800 rounded-xl shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                            <button 
                                onClick={() => {
                                    setViewedMode(DeviceMode.FERMENTER);
                                    setIsPreviewing(true);
                                    setIsModeMenuOpen(false);
                                }}
                                className={`w-full flex items-center gap-3 px-4 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${viewedMode === DeviceMode.FERMENTER ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'}`}
                            >
                                <FlaskConical size={14} /> Fermentador
                            </button>
                            <button 
                                onClick={() => {
                                    setViewedMode(DeviceMode.KEGERATOR);
                                    setIsPreviewing(true);
                                    setIsModeMenuOpen(false);
                                }}
                                className={`w-full flex items-center gap-3 px-4 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${viewedMode === DeviceMode.KEGERATOR ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'}`}
                            >
                                <Beer size={14} /> Chopeira
                            </button>
                            <button 
                                onClick={() => {
                                    setViewedMode(DeviceMode.FRIDGE);
                                    setIsPreviewing(true);
                                    setIsModeMenuOpen(false);
                                }}
                                className={`w-full flex items-center gap-3 px-4 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${viewedMode === DeviceMode.FRIDGE ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'}`}
                            >
                                <Snowflake size={14} /> Geladeira
                            </button>
                        </div>
                    )}
                </div>
              </>
            )}

            {/* Navigation Icons - Desktop */}
            <div className="hidden md:flex items-center gap-2">
              <button 
                  title="Logs"
                  onClick={() => {
                      if (currentView !== 'HISTORY') setPreviousView(currentView);
                      setCurrentView('HISTORY');
                  }}
                  className={`${iconOnlyBase} ${currentView === 'HISTORY' && !selectedBrew ? navBtnActive : navBtnDefault}`}
              >
                  <History size={18} />
              </button>

              <button 
                  title="Settings"
                  onClick={() => {
                    if (currentView !== 'SETTINGS') setPreviousView(currentView);
                    setCurrentView('SETTINGS');
                  }}
                  className={`${iconOnlyBase} ${currentView === 'SETTINGS' ? navBtnActive : navBtnDefault}`}
              >
                  <SettingsIcon size={18} />
              </button>

              {/* Back Button - Centralized for all detailed views */}
              {showBackButton && (
                  <button 
                      onClick={handleBack}
                      className={`${iconOnlyBase} border-neutral-800 text-neutral-100 bg-transparent hover:bg-white/5 ml-2`}
                      title="Voltar"
                  >
                      <ArrowLeft size={18} />
                  </button>
              )}

              {currentView === 'DASHBOARD' && !selectedFermenterId && !selectedBrew && (
                <button 
                    onClick={() => setIsAuthenticated(false)}
                    className="ml-2 p-2 text-neutral-700 hover:text-red-500 transition-colors"
                    title="Sair"
                >
                    <LogOut size={18} />
                </button>
              )}
            </div>

            {/* Hamburger Button - Mobile */}
            <button 
                className="md:hidden p-2 text-neutral-400 hover:text-white transition-colors"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
                {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {isMobileMenuOpen && (
            <div className="md:hidden absolute top-20 right-4 left-4 bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex flex-col gap-2 z-50 shadow-2xl">
                <button 
                    onClick={() => {
                        if (currentView !== 'HISTORY') setPreviousView(currentView);
                        setCurrentView('HISTORY');
                        setIsMobileMenuOpen(false);
                    }}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold uppercase tracking-wider transition-all ${currentView === 'HISTORY' && !selectedBrew ? 'bg-white/10 text-white' : 'text-neutral-400 hover:bg-white/5 hover:text-white'}`}
                >
                    <History size={18} /> Histórico
                </button>

                <button 
                    onClick={() => {
                      if (currentView !== 'SETTINGS') setPreviousView(currentView);
                      setCurrentView('SETTINGS');
                      setIsMobileMenuOpen(false);
                    }}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold uppercase tracking-wider transition-all ${currentView === 'SETTINGS' ? 'bg-white/10 text-white' : 'text-neutral-400 hover:bg-white/5 hover:text-white'}`}
                >
                    <SettingsIcon size={18} /> Configurações
                </button>

                {showBackButton && (
                    <button 
                        onClick={() => {
                            handleBack();
                            setIsMobileMenuOpen(false);
                        }}
                        className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold uppercase tracking-wider text-neutral-100 bg-neutral-800 hover:bg-neutral-700 transition-all mt-2"
                    >
                        <ArrowLeft size={18} /> Voltar
                    </button>
                )}

                {currentView === 'DASHBOARD' && !selectedFermenterId && !selectedBrew && (
                  <button 
                      onClick={() => setIsAuthenticated(false)}
                      className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold uppercase tracking-wider text-red-500 hover:bg-red-500/10 transition-all mt-2"
                  >
                      <LogOut size={18} /> Sair
                  </button>
                )}
            </div>
        )}
      </nav>

      <main className="mt-2">
        {currentView === 'SETTINGS' ? (
          <Settings />
        ) : currentView === 'HISTORY' ? (
          selectedBrew ? <FinishedBrewDetail brew={selectedBrew} /> : <FermentationHistory onSelectBrew={setSelectedBrew} />
        ) : selectedFermenterId && selectedFermenter ? (
          <>
            {viewedMode && viewedMode !== selectedFermenter.mode && (
              <div className="mx-6 md:mx-8 mt-6 bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4">
                <div className="flex items-start md:items-center gap-3">
                  <AlertTriangle className="text-yellow-500 shrink-0 mt-0.5 md:mt-0" size={20} />
                  <div>
                    <h4 className="text-yellow-500 font-bold text-sm">
                      Modo {viewedMode === DeviceMode.FERMENTER ? 'Fermentador' : viewedMode === DeviceMode.KEGERATOR ? 'Chopeira' : 'Geladeira'} Selecionado
                    </h4>
                    <p className="text-yellow-500/80 text-xs mt-1">
                      Você está apenas visualizando. Deseja ativar este modo no dispositivo?
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                  <button 
                    onClick={() => {
                      setViewedMode(selectedFermenter.mode);
                      setIsPreviewing(false);
                    }}
                    className="flex-1 md:flex-none px-4 py-2 text-xs font-bold text-neutral-400 hover:text-white bg-neutral-800/50 hover:bg-neutral-800 rounded-lg transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={() => {
                      handleUpdateFermenter(selectedFermenter.id, { mode: viewedMode });
                      setIsPreviewing(false);
                    }}
                    className="flex-1 md:flex-none px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-black text-xs font-bold rounded-lg transition-colors"
                  >
                    Ativar no Dispositivo
                  </button>
                </div>
              </div>
            )}
            <FermenterDetail 
              fermenter={{ ...selectedFermenter, mode: viewedMode || selectedFermenter.mode }} 
              onUpdate={handleUpdateFermenter}
            />
          </>
        ) : (
          <Dashboard 
            onSelectFermenter={setSelectedFermenterId}
            onUpdateFermenter={handleUpdateFermenter}
            onAddFermenter={handleAddFermenter}
            onDeleteFermenter={handleDeleteFermenter}
          />
        )}
      </main>
    </div>
  );
};

export default App;
