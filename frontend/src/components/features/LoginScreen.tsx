import { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, Eye, EyeOff, Home, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/stores';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AnimatedBackground } from '@/components/layout/AnimatedBackground';
import { toast } from 'sonner';

export function LoginScreen() {
  const [token, setToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const login = useAuthStore((state) => state.login);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token.trim()) {
      toast.error('Please enter your access token');
      return;
    }

    setIsLoading(true);

    try {
      const success = await login(token.trim());

      if (success) {
        toast.success('Welcome back!');
      } else {
        toast.error('Invalid token. Please try again.');
      }
    } catch {
      toast.error('Login failed. Please check your connection.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      {/* Animated Background */}
      <AnimatedBackground />

      {/* Content */}
      <div className="relative z-10 flex min-h-screen items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{
            type: 'spring',
            stiffness: 100,
            damping: 15,
            duration: 0.5,
          }}
          className="w-full max-w-md"
        >
          {/* Login Card */}
          <div className="relative overflow-hidden rounded-3xl">
            {/* Animated gradient border */}
            <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary-dark to-primary animate-pulse opacity-50 blur-xl" />

            <div className="relative m-[1px] rounded-3xl bg-dark-card/95 backdrop-blur-xl p-8">
              {/* Logo and Title */}
              <div className="mb-8 text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{
                    type: 'spring',
                    stiffness: 200,
                    damping: 15,
                    delay: 0.2,
                  }}
                  className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary-dark"
                >
                  <Home className="h-8 w-8 text-white" />
                </motion.div>

                <motion.h1
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-3xl font-bold text-white"
                >
                  Home Panel
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="mt-2 text-muted"
                >
                  Enter your access token to continue
                </motion.p>
              </div>

              {/* Login Form */}
              <motion.form
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                onSubmit={handleSubmit}
                className="space-y-6"
              >
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted">
                    <Lock className="h-5 w-5" />
                  </div>

                  <Input
                    type={showToken ? 'text' : 'password'}
                    placeholder="Access Token"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    className="pl-12 pr-12"
                    disabled={isLoading}
                    autoFocus
                  />

                  <button
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted hover:text-white transition-colors"
                    tabIndex={-1}
                  >
                    {showToken ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>

                <Button type="submit" className="w-full h-12 text-base" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Authenticating...
                    </>
                  ) : (
                    'Login'
                  )}
                </Button>
              </motion.form>

              {/* Footer */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="mt-6 text-center text-xs text-muted"
              >
                Home Infrastructure Management
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
