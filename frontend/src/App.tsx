import { useEffect } from 'react';
import { useAuthStore, useUIStore } from '@/shared/stores';
import { Layout } from '@/shared/components';
import { LoginPage } from '@/features/auth';
import { DashboardOverview } from '@/features/dashboard';
import { ServersOverview, ServerDetail } from '@/features/servers';
import { VMsOverview, VMDetail } from '@/features/vms';
import { AutomationsOverview, AutomationDetail } from '@/features/automations';
import { SmartHomeOverview, DeviceDetail } from '@/features/smarthome';
import { CamerasOverview, CameraDetail } from '@/features/cameras';
import { AssistantOverview, AssistantDetail } from '@/features/assistant';
import { AIChat } from '@/shared/components';

function App() {
  const { isAuthenticated, checkAuth } = useAuthStore();
  const { section, isAIChatOpen } = useUIStore();

  // Check auth on mount
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Show login if not authenticated
  if (!isAuthenticated) {
    return <LoginPage />;
  }

  // Get content based on current section
  const getBlock2Content = () => {
    switch (section) {
      case 'dashboard':
        return <DashboardOverview />;
      case 'servers':
        return <ServersOverview />;
      case 'vms':
        return <VMsOverview />;
      case 'automations':
        return <AutomationsOverview />;
      case 'smarthome':
        return <SmartHomeOverview />;
      case 'cameras':
        return <CamerasOverview />;
      case 'assistant':
        return <AssistantOverview />;
      default:
        return <DashboardOverview />;
    }
  };

  const getBlock3Content = () => {
    // For cameras section - no AI chat, just camera detail
    if (section === 'cameras') {
      return <CameraDetail />;
    }

    // For assistant section - always show AI chat
    if (section === 'assistant') {
      return <AssistantDetail />;
    }

    // If AI chat is open, show it
    if (isAIChatOpen) {
      return <AIChat />;
    }

    // Otherwise show section-specific detail
    switch (section) {
      case 'dashboard':
        // Dashboard can show AI chat or a placeholder
        return (
          <div className="flex items-center justify-center h-full text-center p-8">
            <div>
              <div className="w-16 h-16 rounded-full bg-[#9b87f5]/10 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-[#9b87f5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-white mb-2">AI Ассистент</h3>
              <p className="text-sm text-[#a0a0a8]">Нажмите кнопку AI чтобы открыть чат с ассистентом</p>
            </div>
          </div>
        );
      case 'servers':
        return <ServerDetail />;
      case 'vms':
        return <VMDetail />;
      case 'automations':
        return <AutomationDetail />;
      case 'smarthome':
        return <DeviceDetail />;
      default:
        return null;
    }
  };

  return (
    <Layout
      block2Content={getBlock2Content()}
      block3Content={getBlock3Content()}
    />
  );
}

export default App;
