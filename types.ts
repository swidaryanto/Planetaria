export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface Particle3D extends Point3D {
  baseX: number;
  baseY: number;
  baseZ: number;
  size: number;
  hue: number;
  speed: number;
  phase: number; // For pulsing or wave effects
}

export interface MouseState {
  x: number;
  y: number;
  isPressed: boolean;
}