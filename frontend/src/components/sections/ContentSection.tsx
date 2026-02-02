import { useNavigationStore } from '@/stores';
import { ServersSection } from './ServersSection';
import { VMsSection } from './VMsSection';
import { AutomationsSection } from './AutomationsSection';
import { AssistantSection } from './AssistantSection';
import { AISection } from './AISection';
import { SmartHomeSection } from '@/components/smart-home';
import { SmartHomeNewSection } from '@/components/smart-home-new';
import { CamerasSection } from '@/components/cameras';
import { CamerasNewSection } from '@/components/cameras-new';

/**
 * ContentSection - Routes to the appropriate section based on current category
 */
export function ContentSection() {
  const currentCategory = useNavigationStore((state) => state.currentCategory);

  switch (currentCategory) {
    case 'servers':
      return <ServersSection />;
    case 'vms':
      return <VMsSection />;
    case 'cameras':
      return <CamerasSection />;
    case 'cameras-new':
      return <CamerasNewSection />;
    case 'automations':
      return <AutomationsSection />;
    case 'devices':
      return <SmartHomeSection />;
    case 'devices-new':
      return <SmartHomeNewSection />;
    case 'assistant':
      return <AssistantSection />;
    case 'ai':
      return <AISection />;
    default:
      return <ServersSection />;
  }
}
