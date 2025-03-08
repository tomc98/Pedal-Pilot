import * as vscode from 'vscode';

// Configuration keys
const CONFIG_SECTION = 'pedalPilot';
const VENDOR_ID_KEY = 'vendorId';
const PRODUCT_ID_KEY = 'productId';
const DEBUG_MODE_KEY = 'debugMode';
const PEDAL_CENTER_POSITION_KEY = 'pedalCenterPosition';
const PEDAL_DEADZONE_KEY = 'pedalDeadzone';
const TTS_TOGGLE_THRESHOLD_KEY = 'ttsToggleThreshold';
const STT_TOGGLE_THRESHOLD_KEY = 'sttToggleThreshold';

export interface PedalPilotConfig {
  vendorId: number;
  productId: number;
  debugMode: boolean;
  pedalCenterPosition: number;
  pedalDeadzone: number;
  ttsToggleThreshold: number;
  sttToggleThreshold: number;
}

export function getConfig(): PedalPilotConfig {
  const config = vscode.workspace.getConfiguration(CONFIG_SECTION);
  
  return {
    // Default Saitek Pro Flight Rudder Pedals IDs
    vendorId: config.get<number>(VENDOR_ID_KEY, 0x06A3),
    productId: config.get<number>(PRODUCT_ID_KEY, 0x0763),
    debugMode: config.get<boolean>(DEBUG_MODE_KEY, false),
    pedalCenterPosition: config.get<number>(PEDAL_CENTER_POSITION_KEY, 63),
    pedalDeadzone: config.get<number>(PEDAL_DEADZONE_KEY, 1),
    ttsToggleThreshold: config.get<number>(TTS_TOGGLE_THRESHOLD_KEY, 90),
    sttToggleThreshold: config.get<number>(STT_TOGGLE_THRESHOLD_KEY, 90)
  };
}

export function updateConfig(key: string, value: any): Thenable<void> {
  return vscode.workspace.getConfiguration(CONFIG_SECTION).update(key, value, vscode.ConfigurationTarget.Global);
}