import { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, LogIn, AlertCircle } from 'lucide-react';
import { useAuthStore } from '@/shared/stores';
import { AnimatedBackground } from '@/shared/components';
import { Button } from '@/shared/components/ui';

export function LoginPage() {
  const [token, setToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const { login, isLoading, error } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) return;
    await login(token.trim());
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-[#0a0a0f]">
      <AnimatedBackground />

      <motion.div
        className="relative z-10 w-full max-w-md mx-4"
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
      >
        {/* Logo and title */}
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#9b87f5] to-[#7c3aed] mb-4 shadow-lg shadow-[#9b87f5]/30">
            <span className="text-3xl">🏠</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Home Panel</h1>
          <p className="text-[#a0a0a8]">Войдите для управления системой</p>
        </motion.div>

        {/* Login form */}
        <motion.form
          onSubmit={handleSubmit}
          className="glass-card p-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          {/* Error message */}
          {error && (
            <motion.div
              className="flex items-center gap-3 p-4 mb-6 rounded-xl bg-[#ef4444]/10 border border-[#ef4444]/30 text-[#ef4444]"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <AlertCircle size={20} />
              <span className="text-sm">{error}</span>
            </motion.div>
          )}

          {/* Token input */}
          <div className="mb-6">
            <label htmlFor="token" className="block text-sm font-medium text-[#a0a0a8] mb-2">
              Токен доступа
            </label>
            <div className="relative">
              <input
                id="token"
                type={showToken ? 'text' : 'password'}
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Введите токен..."
                className="w-full pr-12"
                disabled={isLoading}
                autoComplete="off"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#6b6b70] hover:text-[#a0a0a8] transition-colors"
              >
                {showToken ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Submit button */}
          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            isLoading={isLoading}
            leftIcon={<LogIn size={20} />}
            disabled={!token.trim()}
          >
            Войти
          </Button>
        </motion.form>

        {/* Footer */}
        <motion.p
          className="text-center text-xs text-[#6b6b70] mt-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          Токен доступа можно найти в настройках сервера
        </motion.p>
      </motion.div>
    </div>
  );
}
