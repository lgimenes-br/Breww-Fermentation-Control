
import React, { useState } from 'react';
import { Lock, Mail, ArrowRight, Loader2 } from 'lucide-react';

const GoogleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="20px" height="20px">
    <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
    <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
    <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
    <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
  </svg>
);

interface LoginProps {
  onLogin: () => void;
  onSwitchToRegister?: () => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin, onSwitchToRegister }) => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('cervejeiro@brewmaster.ai');
  const [password, setPassword] = useState('123456');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simulating API call
    setTimeout(() => {
      setLoading(false);
      onLogin();
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Ambience - Monochrome/Subtle */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-neutral-800/10 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-neutral-800/10 rounded-full blur-[100px]"></div>
      </div>

      <div className="bg-neutral-900/30 backdrop-blur-sm border border-neutral-800 p-8 rounded-3xl shadow-2xl w-full max-w-md relative z-10 animate-in fade-in zoom-in-95 duration-500">
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 bg-white text-black border border-white rounded-2xl flex items-center justify-center shadow-2xl mb-4 transform rotate-3 hover:rotate-6 transition-transform font-black text-4xl">
             B
          </div>
          <h1 className="text-4xl font-black text-white tracking-tighter">BREWW</h1>
          <p className="text-neutral-400 text-sm mt-1 uppercase tracking-widest font-bold">Smart Brewing</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest ml-1">Email</label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-500 group-focus-within:text-white transition-colors">
                <Mail size={18} />
              </div>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-black/50 border border-neutral-800 text-neutral-100 rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:ring-1 focus:ring-neutral-500 focus:border-neutral-500 transition-all placeholder-neutral-700"
                placeholder="seu@email.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest ml-1">Senha</label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-500 group-focus-within:text-white transition-colors">
                <Lock size={18} />
              </div>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-black/50 border border-neutral-800 text-neutral-100 rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:ring-1 focus:ring-neutral-500 focus:border-neutral-500 transition-all placeholder-neutral-700"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-neutral-100 hover:bg-white text-black font-bold py-3.5 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 group disabled:opacity-70 disabled:cursor-not-allowed mt-4"
          >
            {loading ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <>
                Entrar
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 flex items-center justify-center space-x-4">
          <div className="flex-1 border-t border-neutral-800"></div>
          <span className="text-neutral-500 text-xs uppercase tracking-widest font-bold">ou</span>
          <div className="flex-1 border-t border-neutral-800"></div>
        </div>

        <button 
          type="button"
          onClick={() => {
            setLoading(true);
            setTimeout(() => {
              setLoading(false);
              onLogin();
            }, 1500);
          }}
          disabled={loading}
          className="w-full mt-6 bg-transparent border border-neutral-800 hover:border-neutral-600 hover:bg-neutral-800/50 text-white font-medium py-3.5 rounded-xl transition-all flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          <GoogleIcon />
          Entrar com Google
        </button>

        <div className="mt-8 text-center pt-6 border-t border-neutral-800/50">
             {onSwitchToRegister && (
                <p className="text-neutral-500 text-sm">
                    Novo por aqui? <button onClick={onSwitchToRegister} className="text-neutral-300 hover:text-white font-medium underline underline-offset-4 transition-colors">Criar conta</button>
                </p>
             )}
        </div>
      </div>
    </div>
  );
};
