import { useEffect, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquareText } from 'lucide-react';
import { useUIStore } from '@/shared/stores';
import { AnimatedBackground } from './AnimatedBackground';
import { Block1Navigation } from './Block1Navigation';
import { MobileTopBar } from './MobileTopBar';

interface LayoutProps {
  block2Content: ReactNode;
  block3Content: ReactNode;
}

export function Layout({ block2Content, block3Content }: LayoutProps) {
  const {
    isMobile,
    setIsMobile,
    isMenuOpen,
    activeBlock,
    setActiveBlock,
    isAIChatOpen,
    setAIChatOpen,
  } = useUIStore();

  // Handle responsive breakpoints
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [setIsMobile]);

  // Handle swipe gestures for mobile
  const handleSwipe = (direction: 'left' | 'right') => {
    if (!isMobile) return;

    if (direction === 'left') {
      if (activeBlock === 1) setActiveBlock(2);
      else if (activeBlock === 2) setActiveBlock(3);
    } else {
      if (activeBlock === 3) setActiveBlock(2);
      else if (activeBlock === 2) setActiveBlock(1);
    }
  };

  // Desktop layout
  if (!isMobile) {
    return (
      <div className="relative h-screen w-screen overflow-hidden bg-[#0a0a0f]">
        <AnimatedBackground />

        <div className="relative z-10 flex h-full">
          {/* Block 1 - Navigation */}
          <motion.aside
            className="h-full w-[250px] flex-shrink-0 border-r border-white/5"
            initial={{ x: -250, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
          >
            <Block1Navigation />
          </motion.aside>

          {/* Block 2 - Overview */}
          <motion.main
            className="h-full flex-1 overflow-hidden border-r border-white/5"
            style={{ minWidth: 0 }}
            initial={{ x: -100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.1, ease: [0.4, 0, 0.2, 1] }}
          >
            <div className="h-full overflow-y-auto scrollbar-thin p-6">
              {block2Content}
            </div>
          </motion.main>

          {/* Block 3 - Detail / AI Chat */}
          <motion.aside
            className="h-full w-[45%] max-w-[600px] flex-shrink-0 overflow-hidden relative"
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2, ease: [0.4, 0, 0.2, 1] }}
          >
            <div className="h-full overflow-y-auto scrollbar-thin">
              {block3Content}
            </div>

            {/* AI Chat button - only show when chat is not open */}
            {!isAIChatOpen && (
              <motion.button
                onClick={() => setAIChatOpen(true)}
                className="absolute bottom-6 right-6 p-4 rounded-full bg-gradient-to-r from-[#9b87f5] to-[#7c3aed] text-white shadow-lg shadow-[#9b87f5]/30 hover:shadow-[#9b87f5]/50 transition-shadow"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                <MessageSquareText size={24} />
              </motion.button>
            )}
          </motion.aside>
        </div>
      </div>
    );
  }

  // Mobile layout
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#0a0a0f]">
      <AnimatedBackground />

      {/* Mobile Top Bar */}
      <MobileTopBar onSwipe={handleSwipe} />

      {/* Content area */}
      <div className="relative z-10 h-[calc(100vh-56px)] mt-[56px]">
        {/* Menu overlay */}
        <AnimatePresence>
          {isMenuOpen && (
            <>
              <motion.div
                className="absolute inset-0 bg-black/50 z-40"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => useUIStore.getState().setMenuOpen(false)}
              />
              <motion.div
                className="absolute inset-y-0 left-0 w-[280px] z-50 bg-[#0a0a0f] border-r border-white/5"
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
              >
                <Block1Navigation />
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Swipeable blocks */}
        <motion.div
          className="h-full w-full"
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.2}
          onDragEnd={(_, info) => {
            if (info.offset.x > 100) handleSwipe('right');
            else if (info.offset.x < -100) handleSwipe('left');
          }}
        >
          <AnimatePresence mode="wait">
            {activeBlock === 1 && (
              <motion.div
                key="block1"
                className="h-full w-full"
                initial={{ x: '-100%', opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: '-100%', opacity: 0 }}
                transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
              >
                <Block1Navigation />
              </motion.div>
            )}

            {activeBlock === 2 && (
              <motion.div
                key="block2"
                className="h-full w-full overflow-y-auto scrollbar-thin p-4"
                initial={{ x: activeBlock > 2 ? '100%' : '-100%', opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: activeBlock > 2 ? '-100%' : '100%', opacity: 0 }}
                transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
              >
                {block2Content}
              </motion.div>
            )}

            {activeBlock === 3 && (
              <motion.div
                key="block3"
                className="h-full w-full overflow-y-auto scrollbar-thin"
                initial={{ x: '100%', opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: '100%', opacity: 0 }}
                transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
              >
                {block3Content}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* AI Chat overlay for mobile */}
        <AnimatePresence>
          {isAIChatOpen && (
            <motion.div
              className="absolute inset-0 z-50 bg-[#0a0a0f]"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            >
              {block3Content}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
