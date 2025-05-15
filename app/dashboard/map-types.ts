import type { Device, SoilReading } from '@/types/field-eyes';
import { FC } from 'react';

// Interface for the dynamically imported map component
export interface DashboardMapProps {
  onDeviceSelect?: (device: Device, readings: SoilReading[]) => void;
  onDeviceHover?: (device: Device, readings: SoilReading[], isHovering: boolean) => void;
}

// Export a React FC type for the map component
export type DashboardMapType = FC<DashboardMapProps>; 