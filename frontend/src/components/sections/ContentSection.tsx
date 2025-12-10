import { useNavigationStore } from '@/stores';
import { ServersSection } from './ServersSection';
import { VMsSection } from './VMsSection';
import { AutomationsSection } from './AutomationsSection';
import { DevicesSection } from './DevicesSection';
import { CamerasSection } from './CamerasSection';
import { AssistantSection } from './AssistantSection';

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
      return <DevicesSection />;
    case 'cameras':
      return <CamerasSection />;
    case 'assistant':
      return <AssistantSection />;
    default:
      return <ServersSection />;
  }
}
