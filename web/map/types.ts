export interface GeoPoint {
  lat: number;
  lon: number;
  accuracy?: number;
  heading?: number | null;
}
export interface AedTarget extends GeoPoint {
  id: string;
  name: string;
  description: string;
  photo?: string;
  address?: string;
  access?: string;
  source_url?: string;
  photo_license?: string;
  hours?: string;
  level?: string;
  indoor?: string;
  source?: string;
  verified?: string;
  access_note?: string;
}
export interface RouteState {
  coordinates: [number, number][];
  distance: number;
  duration: number;
  steps: Step[];
}
export interface NavigationPayload {
  target: AedTarget;
  position: GeoPoint;
  mode: 'manual' | 'live';
  route: RouteState | null;
  path: GeoPoint[];
}
export interface MapOptions {
  active?: boolean;
  onStartGuidance?: (state: NavigationPayload) => void;
  onOpenRecording?: () => void;
  onEndGuidance?: () => void;
  onBack?: () => void;
  onNavigate?: (state: NavigationPayload) => void;
  onOpenAR?: (state: NavigationPayload) => void;
  onArrive?: (state: NavigationPayload) => void;
}
export interface MapSession {
  getState(): Omit<NavigationPayload, 'target' | 'position'> & {
    target: AedTarget | null;
    position: GeoPoint | null;
    view: string;
    nearest: { target: AedTarget; meters: number }[];
    usedFallback: boolean;
  };
  setActive(active: boolean): void;
  destroy(): void;
}

export interface Step {
  name: string;
  distance: number;
  maneuver: { type: string; location: [number, number]; modifier?: string | undefined };
}
export interface AedPhoto {
  src: string;
  label: string;
  credit: string;
  url?: string | undefined;
}
