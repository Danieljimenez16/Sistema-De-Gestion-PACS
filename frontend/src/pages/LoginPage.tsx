import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { ShieldCheck, Eye, EyeOff, Lock, Mail, Search, Key, BarChart3 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button, Input, Alert } from '../components/ui';

export const LoginPage: React.FC = () => {
  const { user, login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (user) return <Navigate to="/dashboard" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login({ email, password });
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e?.message ?? 'Credenciales inválidas');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950 flex-col justify-between p-12 border-r border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
            <ShieldCheck size={20} className="text-white" />
          </div>
          <div>
            <p className="text-lg font-bold text-slate-100">SIGAT-ES</p>
            <p className="text-xs text-slate-500">Sistema de Gestión de Activos Tecnológicos</p>
          </div>
        </div>

        <div>
          <h2 className="text-4xl font-bold text-slate-100 leading-tight mb-4">
            Control total de<br />
            <span className="text-blue-400">tus activos tecnológicos</span>
          </h2>
          <p className="text-slate-400 text-base leading-relaxed">
            Inventario, asignaciones, licencias y auditoría en un solo lugar.
            Trazabilidad completa con historial inmutable.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Trazabilidad', icon: <Search size={20} className="text-blue-400" /> },
            { label: 'Licencias', icon: <Key size={20} className="text-purple-400" /> },
            { label: 'Reportes', icon: <BarChart3 size={20} className="text-green-400" /> },
          ].map(f => (
            <div key={f.label} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-center">
              <div className="flex justify-center mb-2">{f.icon}</div>
              <p className="text-xs font-medium text-slate-300">{f.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel - login form */}
      <div className="flex-1 flex items-center justify-center px-8">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
              <ShieldCheck size={20} className="text-white" />
            </div>
            <p className="text-xl font-bold text-slate-100">SIGAT-ES</p>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-slate-100">Iniciar sesión</h1>
            <p className="text-slate-400 mt-1 text-sm">Ingresa tus credenciales para continuar</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && <Alert type="error" message={error} />}

            <Input
              label="Correo electrónico"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="usuario@elemento.com"
              required
              autoComplete="email"
              icon={<Mail size={16} />}
            />

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-300">
                Contraseña <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg text-slate-100 placeholder-slate-500 text-sm pl-10 pr-10 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
                  aria-label={showPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <Button type="submit" variant="primary" size="lg" loading={loading} className="w-full justify-center">
              {loading ? 'Ingresando…' : 'Ingresar al sistema'}
            </Button>
          </form>

          <p className="text-center text-xs text-slate-600 mt-8">
            Element System © {new Date().getFullYear()} · SIGAT-ES
          </p>
        </div>
      </div>
    </div>
  );
};
