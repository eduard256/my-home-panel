import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Server,
  Box,
  Zap,
  Lightbulb,
  Camera,
  MessageSquare,
  LogOut,
  User,
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useNavigationStore, useAuthStore } from '@/stores';
import { CATEGORIES } from '@/config/categories';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import type { CategoryId } from '@/types';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Server,
  Box,
  Zap,
  Lightbulb,
  Camera,
  MessageSquare,
};

/**
 * Block 1 - Navigation Menu
 */
export function NavigationMenu() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const { currentCategory, setCategory } = useNavigationStore();
  const logout = useAuthStore((state) => state.logout);

  // Update time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleCategoryClick = (categoryId: CategoryId) => {
    setCategory(categoryId);
  };

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Top Section - Clock */}
      <div className="px-6 pt-6 pb-4">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <div className="text-display-sm font-bold text-white leading-none">
            {format(currentTime, 'HH:mm')}
          </div>
          <div className="text-body text-muted mt-1">
            {format(currentTime, 'd MMMM')}
          </div>
        </motion.div>
      </div>

      {/* Middle Section - Navigation Items */}
      <ScrollArea className="flex-1 px-4">
        <nav className="space-y-2 py-4">
          <AnimatePresence>
            {CATEGORIES.map((category, index) => {
              const Icon = iconMap[category.icon] || Server;
              const isActive = currentCategory === category.id;

              return (
                <motion.button
                  key={category.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => handleCategoryClick(category.id)}
                  className={cn(
                    'w-full flex items-center gap-4 px-5 py-4 rounded-xl',
                    'transition-all duration-300',
                    'relative overflow-hidden group',
                    isActive
                      ? 'bg-primary text-white'
                      : 'text-muted hover:bg-white/5 hover:text-white'
                  )}
                >
                  {/* Ripple effect on hover */}
                  <span
                    className={cn(
                      'absolute inset-0 bg-gradient-to-r from-primary/20 to-transparent',
                      'opacity-0 group-hover:opacity-100 transition-opacity',
                      isActive && 'opacity-0'
                    )}
                  />

                  <Icon className="h-6 w-6 relative z-10" />
                  <span className="text-body font-medium relative z-10">
                    {category.name}
                  </span>

                  {/* Glow effect for active item */}
                  {isActive && (
                    <motion.span
                      layoutId="activeGlow"
                      className="absolute inset-0 bg-primary rounded-xl"
                      style={{ boxShadow: '0 0 20px rgba(155, 135, 245, 0.4)' }}
                      initial={false}
                      transition={{
                        type: 'spring',
                        stiffness: 300,
                        damping: 30,
                      }}
                    />
                  )}
                </motion.button>
              );
            })}
          </AnimatePresence>
        </nav>
      </ScrollArea>

      {/* Bottom Section - User/Logout */}
      <div className="p-4 border-t border-white/5">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10">
            <User className="h-5 w-5 text-muted" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium text-white">Admin</div>
            <div className="text-xs text-muted">Home Panel</div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            className="text-muted hover:text-destructive"
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
