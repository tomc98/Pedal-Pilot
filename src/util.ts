import * as HID from 'node-hid';
import * as vscode from 'vscode';
import { updateConfig } from './config';

// Create a user-friendly way to list and select HID devices
export async function selectHIDDevice(): Promise<{ vendorId: number; productId: number } | undefined> {
  const devices = HID.devices().filter(d => d.vendorId !== undefined && d.productId !== undefined);
  
  if (devices.length === 0) {
    vscode.window.showErrorMessage('No HID devices found');
    return undefined;
  }
  
  // Format devices for QuickPick
  const deviceItems = devices.map(d => {
    const vendorId = d.vendorId?.toString(16).padStart(4, '0') || 'unknown';
    const productId = d.productId?.toString(16).padStart(4, '0') || 'unknown';
    const label = `${d.product || d.manufacturer || 'Unknown Device'}`;
    const description = `VID: 0x${vendorId}, PID: 0x${productId}`;
    
    return {
      label,
      description,
      detail: `Path: ${d.path || 'unknown'}`,
      vendorId: d.vendorId,
      productId: d.productId
    };
  });
  
  // Show QuickPick
  const selectedDevice = await vscode.window.showQuickPick(deviceItems, {
    placeHolder: 'Select your pedal device'
  });
  
  if (selectedDevice && selectedDevice.vendorId && selectedDevice.productId) {
    // Ask user to save this device for future use
    const saveDevice = await vscode.window.showInformationMessage(
      `Would you like to save this device (${selectedDevice.label}) as your pedal device?`,
      'Yes', 'No'
    );
    
    if (saveDevice === 'Yes') {
      await updateConfig('vendorId', selectedDevice.vendorId);
      await updateConfig('productId', selectedDevice.productId);
      vscode.window.showInformationMessage('Device settings saved');
    }
    
    return {
      vendorId: selectedDevice.vendorId,
      productId: selectedDevice.productId
    };
  }
  
  return undefined;
}

// Format device data as a readable string
export function formatHIDData(data: Buffer): string {
  return Array.from(data)
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join(' ');
}