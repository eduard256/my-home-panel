import { useNavigationStore } from '@/stores';
import { ServersSection } from './ServersSection';
import { VMsSection } from './VMsSection';
import { AutomationsSection } from './AutomationsSection';
import { AssistantSection } from './AssistantSection';
import { SmartHomeSection } from '@/components/smart-home';
import { CamerasSection } from '@/components/cameras';

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
    case 'automations':
      return <AutomationsSection />;
    case 'devices':
      return <SmartHomeSection />;
    case 'assistant':
      return <AssistantSection />;
    default:
      return <ServersSection />;
  }
}
