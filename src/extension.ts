import * as vscode from 'vscode';
import { PedalService, PedalState } from './pedalService';
import { selectHIDDevice } from './util';
import { PedalDebugView } from './debugView';
import { getConfig, updateConfig } from './config';
import { CopilotService } from './copilotService';
import { TTSService } from './ttsService';

export function activate(context: vscode.ExtensionContext) {
  console.log('Activating Pedal Pilot extension');

  // Create status bar item to show pedal status
  const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.text = '$(device-desktop) Pedals: Disconnected';
  statusBarItem.tooltip = 'Pedal Pilot Status';
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);

  // Create debug view
  const debugView = new PedalDebugView(context);
  context.subscriptions.push({ dispose: () => debugView.dispose() });
  
  // Create and initialize pedal service
  const pedalService = new PedalService();
  context.subscriptions.push(pedalService);
  
  // Create copilot service
  const copilotService = new CopilotService();
  context.subscriptions.push(copilotService);
  
  // Create text-to-speech service
  const ttsService = new TTSService();
  context.subscriptions.push(ttsService);
  
  // If debug mode is enabled, connect raw data to the debug view
  const config = getConfig();
  if (config.debugMode) {
    pedalService.onRawData(data => {
      debugView.addData(data);
    });
  }

  // Try to initialize pedals
  const connected = pedalService.initialize();
  
  if (connected) {
    statusBarItem.text = '$(device-desktop) Pedals: Connected';
    vscode.window.showInformationMessage('Pedal Pilot: Connected to Saitek Pro Flight Rudder Pedals');
  } else {
    statusBarItem.text = '$(device-desktop) Pedals: Disconnected';
    vscode.window.showWarningMessage('Pedal Pilot: Could not connect to Saitek Pro Flight Rudder Pedals');
    
    // Register command to list and select HID devices
    const listDevicesCommand = vscode.commands.registerCommand('pedalPilot.listHIDDevices', async () => {
      const devices = PedalService.listHIDDevices();
      
      // Create a formatted string of device information
      const deviceInfo = devices.map(d => 
        `Vendor ID: 0x${d.vendorId?.toString(16).padStart(4, '0') || 'unknown'}, ` +
        `Product ID: 0x${d.productId?.toString(16).padStart(4, '0') || 'unknown'}, ` +
        `Product: ${d.product || 'unknown'}`
      ).join('\n');
      
      // Show the device information in a new editor
      const document = await vscode.workspace.openTextDocument({
        content: `# Connected HID Devices\n\n${deviceInfo || 'No devices found'}\n\n` +
                `## Expected Saitek Pro Flight Rudder Pedals:\nVendor ID: 0x06A3, Product ID: 0x0763\n\n` +
                `To select a different device, use the "Pedal Pilot: Select Device" command.`,
        language: 'markdown'
      });
      
      await vscode.window.showTextDocument(document);
      
      // Offer to select a device
      const selection = await vscode.window.showInformationMessage(
        'Would you like to select a different pedal device?',
        'Yes', 'No'
      );
      
      if (selection === 'Yes') {
        vscode.commands.executeCommand('pedalPilot.selectDevice');
      }
    });
    
    context.subscriptions.push(listDevicesCommand);
    
    // Add command to status bar
    statusBarItem.command = 'pedalPilot.listHIDDevices';
    statusBarItem.tooltip = 'Click to list available HID devices';
  }

  // Track rudder position to detect changes for TTS toggle
  let previousRudderPosition = 0;

  // Handle pedal state updates
  pedalService.onPedalStateChanged(state => {
    updateStatusBar(statusBarItem, state);
    
    // Use the left pedal value to control Copilot
    const controlState = copilotService.calculateControlState(state.leftPedal);
    
    // Update status bar with control state info
    if (controlState.isAccepting || controlState.isDeleting) {
      const actionText = controlState.isAccepting ? 'Accepting' : 'Deleting';
      statusBarItem.text = `$(device-desktop) ${actionText} (${controlState.intensity}%) L:${state.leftPedal} R:${state.rightPedal} C:${state.rudderPosition}`;
    }
    
    // Execute the control action
    copilotService.executeCopilotControl(controlState).catch(error => {
      console.error('Error executing Copilot control:', error);
    });
    
    // Check if rudder position (C) crossed the threshold to toggle text-to-speech
    const currentRudderPosition = state.rudderPosition;
    
    // Get the configuration value for TTS toggle threshold
    const ttsToggleThreshold = getConfig().ttsToggleThreshold;
    
    // Detect threshold crossing
    if ((previousRudderPosition < ttsToggleThreshold && currentRudderPosition >= ttsToggleThreshold) ||
        (previousRudderPosition >= ttsToggleThreshold && currentRudderPosition < ttsToggleThreshold)) {
      // Toggle text-to-speech
      ttsService.toggle();
    }
    
    // Update previous position for next comparison
    previousRudderPosition = currentRudderPosition;
  });

  // Register command to select a device
  const selectDeviceCommand = vscode.commands.registerCommand('pedalPilot.selectDevice', async () => {
    const device = await selectHIDDevice();
    
    if (device) {
      // Reconnect with the new device
      pedalService.dispose();
      const reconnected = pedalService.initialize();
      
      if (reconnected) {
        statusBarItem.text = '$(device-desktop) Pedals: Connected';
        vscode.window.showInformationMessage('Pedal Pilot: Connected to selected device');
      } else {
        statusBarItem.text = '$(device-desktop) Pedals: Disconnected';
        vscode.window.showWarningMessage('Pedal Pilot: Could not connect to selected device');
      }
    }
  });
  
  // Register command to reconnect pedals
  const reconnectCommand = vscode.commands.registerCommand('pedalPilot.reconnect', () => {
    pedalService.dispose();
    const reconnected = pedalService.initialize();
    
    if (reconnected) {
      statusBarItem.text = '$(device-desktop) Pedals: Connected';
      vscode.window.showInformationMessage('Pedal Pilot: Reconnected to configured pedal device');
    } else {
      statusBarItem.text = '$(device-desktop) Pedals: Disconnected';
      vscode.window.showWarningMessage('Pedal Pilot: Could not reconnect to configured pedal device');
      
      // Offer to select a different device
      vscode.window.showInformationMessage(
        'Would you like to select a different pedal device?',
        'Yes', 'No'
      ).then(selection => {
        if (selection === 'Yes') {
          vscode.commands.executeCommand('pedalPilot.selectDevice');
        }
      });
    }
  });
  
  // Register command to show debug view
  const showDebugCommand = vscode.commands.registerCommand('pedalPilot.showDebugView', () => {
    debugView.show();
    
    // If debug mode is not enabled, ask user if they want to enable it
    if (!getConfig().debugMode) {
      vscode.window.showInformationMessage(
        'Debug mode is currently disabled. Enable it to see pedal data?',
        'Yes', 'No'
      ).then(selection => {
        if (selection === 'Yes') {
          updateConfig('debugMode', true).then(() => {
            // Connect raw data to debug view
            pedalService.onRawData(data => {
              debugView.addData(data);
            });
            vscode.window.showInformationMessage('Debug mode enabled');
          });
        }
      });
    }
  });
  
  // Register command to calibrate pedal center
  const calibratePedalCenterCommand = vscode.commands.registerCommand('pedalPilot.calibratePedalCenter', () => {
    const currentState = pedalService.getPedalState();
    const currentLeftPedal = currentState.leftPedal;
    
    updateConfig('pedalCenterPosition', currentLeftPedal).then(() => {
      vscode.window.showInformationMessage(`Pedal center calibrated to position ${currentLeftPedal}`);
      statusBarItem.text = `$(device-desktop) Center: ${currentLeftPedal} L: ${currentState.leftPedal} R: ${currentState.rightPedal} C: ${currentState.rudderPosition}`;
    });
  });
  
  // Register command to toggle text-to-speech manually
  const toggleTTSCommand = vscode.commands.registerCommand('pedalPilot.toggleTTS', () => {
    ttsService.toggle();
  });
  
  context.subscriptions.push(
    selectDeviceCommand, 
    reconnectCommand, 
    showDebugCommand, 
    calibratePedalCenterCommand,
    toggleTTSCommand
  );
}

// Helper function to update status bar with pedal state
function updateStatusBar(statusBar: vscode.StatusBarItem, state: PedalState): void {
  // Only update if the control state hasn't overridden the text
  if (!statusBar.text.includes('Accepting') && !statusBar.text.includes('Deleting')) {
    statusBar.text = `$(device-desktop) L: ${state.leftPedal} R: ${state.rightPedal} C: ${state.rudderPosition}`;
  }
}

export function deactivate() {
  console.log('Deactivating Pedal Pilot extension');
}