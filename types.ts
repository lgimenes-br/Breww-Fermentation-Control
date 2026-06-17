
export enum FermenterStatus {
  IDLE = 'Inativo',
  ACTIVE = 'Fermentando',
  COLD_CRASH = 'Cold Crash',
  DIACETYL_REST = 'Descanso de Diacetil',
  CARBONATION = 'Carbonatação Forçada'
}

export enum DeviceMode {
  FERMENTER = 'Fermentador',
  KEGERATOR = 'Choppeira',
  FRIDGE = 'Geladeira'
}

export enum BeerStyle {
  IPA = 'IPA',
  STOUT = 'Stout',
  LAGER = 'Lager',
  PALE_ALE = 'Pale Ale',
  NEIPA = 'NEIPA',
  WHEAT = 'Wheat'
}

export enum EventType {
  DRY_HOP = 'Dry Hop',
  FRUIT = 'Adição de Fruta',
  CLARIFIER = 'Clarificador',
  SPICE = 'Especiarias',
  COLD_CRASH = 'Cold Crash',
  OTHER = 'Outro'
}

export interface FermentationEvent {
  id: string;
  type: EventType;
  description: string;
  timestamp: string;
}

export interface ISpindelData {
  gravity: number; // Specific Gravity (e.g., 1.050)
  temperature: number; // Celsius (Beer Temp)
  battery: number; // Volts
  angle: number; // Tilt angle
  rssi: number; // Wifi strength dBm
  lastUpdate: string; // ISO timestamp
}

export interface Reading {
  timestamp: string;
  beerTemp: number;
  fridgeTemp: number;
  targetTemp: number;
  gravity: number;
}

export interface FermentationStep {
  id: string;
  name: string; // ex: Primária, Descanso Diacetil
  temperature: number;
  duration: number; // dias
}

export interface KegeratorConfig {
  line1: string;
  line2: string;
  style: string;
  brewery: string;
  ibu: number;
  abv: number;
}

export interface Fermenter {
  id: number;
  user_id?: number;
  device_name: string;
  serial_code: string;
  created_at?: string;
  last_seen?: string;
  is_online?: number | boolean;
  active_batch_id?: number | null;
  active_batch_name?: string | null;
  active_batch_style?: string | null;
  active_batch_og?: number | null;
  active_batch_fg?: number | null;
  active_batch_profile?: string | any;
  mode?: DeviceMode; 
  status?: FermenterStatus;
  style?: BeerStyle;
  volume?: number; 
  targetTemp?: number;
  readings?: Reading[];
  currentDevice?: ISpindelData;
  currentFridgeTemp?: number; 
  profile?: FermentationStep[]; 
  currentStepIndex?: number; 
  isPaused?: boolean; 
  events?: FermentationEvent[]; 
  kegeratorConfig?: KegeratorConfig; 
}

export interface FinishedBrew {
  id: string;
  batchNumber: string;
  beerName: string;
  style: BeerStyle;
  startDate: string;
  endDate: string;
  og: number;
  fg: number;
  abv: number;
  efficiency: number; // attenuation
  rating?: number; // 1-5 stars
  notes: string;
  events?: FermentationEvent[];
  readings: Reading[]; // Adicionado para gráficos históricos
}

export interface BrewingInsightData {
  summary: string;
  healthScore: number;
  predictedFG: number;
  estimatedDaysRemaining: number;
  risks: { level: 'LOW' | 'MEDIUM' | 'HIGH'; message: string }[];
  recommendations: string[];
}
