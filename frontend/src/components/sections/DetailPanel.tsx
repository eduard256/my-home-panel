import { useNavigationStore } from '@/stores';
import { ServerDetail } from './details/ServerDetail';
import { VMDetail } from './details/VMDetail';
import { AutomationDetail } from './details/AutomationDetail';
import { CameraDetail } from './details/CameraDetail';
import { DeviceDetailPanel } from '@/components/smart-home/details';

/**
 * DetailPanel - Routes to the appropriate detail view based on block3 state
 */
export function DetailPanel() {
  const { block3State, closeBlock3 } = useNavigationStore();

  if (!block3State.isOpen || block3State.type !== 'detail') {
    return null;
  }

  switch (block3State.detailType) {
    case 'servers':
      return <ServerDetail id={block3State.detailId || ''} />;
    case 'vms':
      return <VMDetail id={block3State.detailId || ''} />;
    case 'automations':
      return <AutomationDetail name={block3State.detailId || ''} />;
    case 'cameras':
      return <CameraDetail name={block3State.detailId || ''} />;
    case 'devices':
      return <DeviceDetailPanel deviceId={block3State.detailId || ''} onClose={closeBlock3} />;
    default:
      return null;
  }
}
