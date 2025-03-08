import * as vscode from 'vscode';

// Configuration keys
const CONFIG_SECTION = 'pedalPilot';
const VENDOR_ID_KEY = 'vendorId';
const PRODUCT_ID_KEY = 'productId';
const DEBUG_MODE_KEY = 'debugMode';

export interface PedalPilotConfig {
  vendorId: number;
  productId: number;
  debugMode: boolean;
}

export function getConfig(): PedalPilotConfig {
  const config = vscode.workspace.getConfiguration(CONFIG_SECTION);
  
  return {
    // Default Saitek Pro Flight Rudder Pedals IDs
    vendorId: config.get<number>(VENDOR_ID_KEY, 0x06A3),
    productId: config.get<number>(PRODUCT_ID_KEY, 0x0763),
    debugMode: config.get<boolean>(DEBUG_MODE_KEY, false)
  };
}

export function updateConfig(key: string, value: any): Thenable<void> {
  return vscode.workspace.getConfiguration(CONFIG_SECTION).update(key, value, vscode.ConfigurationTarget.Global);
}