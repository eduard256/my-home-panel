import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigationStore } from '@/stores';
import { AnimatedBackground } from './AnimatedBackground';
import { Block, blockVariants, containerVariants } from './Block';
import { NavigationMenu } from './NavigationMenu';
import { ContentSection } from '@/components/sections/ContentSection';
import { DetailPanel } from '@/components/sections/DetailPanel';
import { AIChatPanel } from '@/components/ai-chat';
import { Button } from '@/components/ui/button';
import { getCategoryById } from '@/config/categories';

/**
 * MainLayout - Three-block layout with animations
 */
export function MainLayout() {
  const {
    currentCategory,
    block3State,
    isFirstVisit,
    setFirstVisitComplete,
    openAI,
    closeBlock3,
  } = useNavigationStore();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [hasAnimated, setHasAnimated] = useState(!isFirstVisit);

  const category = getCategoryById(currentCategory);
  const isAIEnabled = category?.aiEnabled;

  // Mark first visit complete after animation
  useEffect(() => {
    if (isFirstVisit) {
      const timer = setTimeout(() => {
        setFirstVisitComplete();
        setHasAnimated(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isFirstVisit, setFirstVisitComplete]);

  // Close mobile menu when category changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [currentCategory]);

  const handleAIClick = () => {
    if (block3State.type === 'ai-chat') {
      closeBlock3();
    } else {
      openAI();
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      {/* Animated Background */}
      <AnimatedBackground />

      {/* Content Layer */}
      <div className="relative z-10 flex min-h-screen p-4 gap-4">
        <motion.div
          className="flex w-full gap-4"
          variants={isFirstVisit ? containerVariants : undefined}
          initial={isFirstVisit ? 'hidden' : false}
          animate="visible"
        >
          {/* Block 1 - Navigation Menu (Desktop) */}
          <motion.div
            variants={isFirstVisit ? blockVariants : undefined}
            className="hidden lg:block w-[280px] flex-shrink-0"
          >
            <Block className="h-[calc(100vh-2rem)]">
              <NavigationMenu />
            </Block>
          </motion.div>

          {/* Block 2 - Content */}
          <motion.div
            variants={isFirstVisit ? blockVariants : undefined}
            className={cn(
              'flex-1 min-w-0',
              // When Block 3 is open, Block 2 shrinks on desktop
              block3State.isOpen && 'lg:flex-[1]'
            )}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={currentCategory}
                initial={hasAnimated ? { opacity: 0, filter: 'blur(10px)' } : false}
                animate={{ opacity: 1, filter: 'blur(0px)' }}
                exit={{ opacity: 0, filter: 'blur(10px)' }}
                transition={{ duration: 0.2 }}
                className="h-full"
              >
                <Block className="h-[calc(100vh-2rem)]">
                  <ContentSection />
                </Block>
              </motion.div>
            </AnimatePresence>
          </motion.div>

          {/* Block 3 - Detail/AI Chat */}
          <AnimatePresence>
            {block3State.isOpen && (
              <motion.div
                initial={{ opacity: 0, x: 100, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 100, scale: 0.95 }}
                transition={{
                  type: 'spring',
                  stiffness: 100,
                  damping: 15,
                }}
                className="hidden lg:block lg:flex-[1] min-w-[400px] max-w-[600px]"
              >
                <Block className="h-[calc(100vh-2rem)]">
                  {block3State.type === 'ai-chat' ? (
                    <AIChatPanel />
                  ) : (
                    <DetailPanel />
                  )}
                </Block>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="lg:hidden fixed top-6 left-6 z-50 p-2 rounded-xl bg-dark-card/90 backdrop-blur-lg border border-white/10"
        >
          {isMobileMenuOpen ? (
            <X className="h-6 w-6 text-white" />
          ) : (
            <Menu className="h-6 w-6 text-white" />
          )}
        </button>

        {/* Mobile Menu Overlay */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
                onClick={() => setIsMobileMenuOpen(false)}
              />
              <motion.div
                initial={{ x: -300 }}
                animate={{ x: 0 }}
                exit={{ x: -300 }}
                transition={{ type: 'spring', damping: 25 }}
                className="lg:hidden fixed top-0 left-0 z-50 h-full w-[280px] bg-dark-card/95 backdrop-blur-xl border-r border-white/10"
              >
                <NavigationMenu />
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* AI FAB Button (when Block 3 is closed and AI is enabled) */}
        {isAIEnabled && !block3State.isOpen && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="fixed bottom-6 right-6 z-40"
          >
            <Button
              onClick={handleAIClick}
              className="h-14 w-14 rounded-full shadow-glow"
            >
              <MessageSquare className="h-6 w-6" />
            </Button>
          </motion.div>
        )}

        {/* Mobile Bottom Sheet for Block 3 */}
        <AnimatePresence>
          {block3State.isOpen && (
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25 }}
              className="lg:hidden fixed inset-x-0 bottom-0 z-40 h-[80vh] rounded-t-3xl bg-dark-card/95 backdrop-blur-xl border-t border-white/10"
            >
              <div className="h-full overflow-hidden">
                {/* Handle bar */}
                <div className="flex justify-center py-3">
                  <div className="w-12 h-1.5 rounded-full bg-white/20" />
                </div>

                {block3State.type === 'ai-chat' ? (
                  <AIChatPanel />
                ) : (
                  <DetailPanel />
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
