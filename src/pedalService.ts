import * as HID from 'node-hid';
import * as vscode from 'vscode';
import { getConfig, PedalPilotConfig } from './config';

export interface PedalState {
  leftPedal: number;    // 0-255 value for left pedal position
  rightPedal: number;   // 0-255 value for right pedal position
  rudderPosition: number; // 0-255 value for rudder position (slide)
}

export class PedalService {
  private device: HID.HID | null = null;
  private _onPedalStateChanged: vscode.EventEmitter<PedalState> = new vscode.EventEmitter<PedalState>();
  public readonly onPedalStateChanged: vscode.Event<PedalState> = this._onPedalStateChanged.event;

  private currentState: PedalState = {
    leftPedal: 0,
    rightPedal: 0,
    rudderPosition: 0
  };

  constructor() {}

  public initialize(): boolean {
    try {
      // Get configuration
      const config = getConfig();
      
      // List all connected HID devices
      const devices = HID.devices();
      if (config.debugMode) {
        console.log('Found HID devices:', devices);
      }

      // Find our pedals using the configured vendor and product IDs
      const pedalDevice = devices.find(
        (device) => device.vendorId === config.vendorId && device.productId === config.productId
      );

      if (!pedalDevice || !pedalDevice.path) {
        console.log('Saitek Pro Flight Rudder Pedals not found');
        return false;
      }

      // Connect to the device
      this.device = new HID.HID(pedalDevice.path);
      console.log('Connected to Saitek Pro Flight Rudder Pedals');

      // Set up data event handler
      this.device.on('data', (data) => {
        this.handlePedalData(data);
      });

      // Set up error handler
      this.device.on('error', (error) => {
        console.error('HID device error:', error);
        this.dispose();
      });

      return true;
    } catch (error) {
      console.error('Failed to initialize pedal device:', error);
      return false;
    }
  }

  // Parse the HID data from pedals
  private _onRawData: vscode.EventEmitter<Buffer> = new vscode.EventEmitter<Buffer>();
  public readonly onRawData: vscode.Event<Buffer> = this._onRawData.event;

  private handlePedalData(data: Buffer): void {
    // Emit raw data event for debug purposes
    this._onRawData.fire(data);
    
    // HID data format for Saitek Pro Flight Rudder Pedals
    // This may need to be adjusted based on the actual data format of the device
    // Bytes 0 and 1: X-axis (rudder), Bytes 2 and 3: Y-axis (left pedal), Bytes 4 and 5: Z-axis (right pedal)
    // Note: This is an approximation and the actual data format may vary

    // Update current state
    const newState: PedalState = {
      rudderPosition: data[0] || 0,
      leftPedal: data[2] || 0,
      rightPedal: data[4] || 0
    };

    // Check if state has changed
    if (
      this.currentState.leftPedal !== newState.leftPedal ||
      this.currentState.rightPedal !== newState.rightPedal ||
      this.currentState.rudderPosition !== newState.rudderPosition
    ) {
      // Update current state
      this.currentState = newState;
      
      // Emit event
      this._onPedalStateChanged.fire(this.currentState);
    }
  }

  // Get current pedal state
  public getPedalState(): PedalState {
    return this.currentState;
  }

  // Clean up resources
  public dispose(): void {
    if (this.device) {
      try {
        this.device.close();
      } catch (error) {
        console.error('Error closing HID device:', error);
      }
      this.device = null;
    }
    this._onPedalStateChanged.dispose();
    this._onRawData.dispose();
  }

  // Helper method to list all connected HID devices
  public static listHIDDevices(): HID.Device[] {
    return HID.devices();
  }
}