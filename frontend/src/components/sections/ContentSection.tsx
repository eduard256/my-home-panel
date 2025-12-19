import { useNavigationStore } from '@/stores';
import { ServersSection } from './ServersSection';
import { VMsSection } from './VMsSection';
import { AutomationsSection } from './AutomationsSection';
import { CamerasSection } from './CamerasSection';
import { AssistantSection } from './AssistantSection';
import { SmartHomeSection } from '@/components/smart-home';

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
    case 'automations':
      return <AutomationsSection />;
    case 'devices':
      return <SmartHomeSection />;
    case 'cameras':
      return <CamerasSection />;
    case 'assistant':
      return <AssistantSection />;
    default:
      return <ServersSection />;
  }
}
