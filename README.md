# Pedal-Pilot

PedalPilot 🚀 – A VSCode extension that uses foot pedal input to seamlessly control AI completions. Adjust completion acceptance rate intuitively with foot pressure, keeping your hands coding and your workflow effortless.

## Features

- Connect to Saitek Pro Flight Rudder Pedals or other similar HID devices
- Control GitHub Copilot inline suggestions with your left pedal
  - Push forward to accept suggestions (attempts character-by-character if supported)
  - Pull back to dismiss/hide suggestions
  - Acceptance speed varies based on pedal position (faster with more forward pressure)
  - Adapts to available Copilot commands (falls back to full acceptance if needed)
- Debug view to visualize pedal inputs
- Auto-detection of commonly used USB pedals
- Configuration options for custom devices
- Calibration command to set the center position for your pedals

## Requirements

- VS Code 1.60.0 or higher
- Saitek Pro Flight Rudder Pedals (or compatible USB foot pedals)
- Operating system with HID device support

## Installation

1. Install the extension from the VS Code Marketplace
2. Connect your foot pedals to your computer
3. If your pedals aren't recognized automatically, use the "Pedal Pilot: Select Pedal Device" command to select them

## Usage

The extension adds the following commands to VS Code:

- **Pedal Pilot: List Connected HID Devices** - Lists all HID devices and displays their IDs
- **Pedal Pilot: Select Pedal Device** - Allows you to choose a specific pedal device
- **Pedal Pilot: Reconnect to Pedals** - Attempts to reconnect to the configured pedal device
- **Pedal Pilot: Show Debug View** - Opens a debug view showing raw pedal data
- **Pedal Pilot: Calibrate Pedal Center Position** - Sets the current left pedal position as the center/neutral point

Using with GitHub Copilot:
1. Ensure GitHub Copilot is installed and configured in VS Code
2. Start typing code to generate Copilot suggestions
3. Use the left pedal to control acceptance:
   - Keep pedal at center position (default: 63) to see suggestions without accepting/rejecting
   - Push pedal forward to accept suggestions (harder push = faster acceptance)
   - Pull pedal back to dismiss/hide the entire suggestion
   
   Note: Character-by-character acceptance depends on available VS Code commands. If not available, the extension will fall back to accepting the entire suggestion.

## Configuration

The extension provides the following settings:

- `pedalPilot.vendorId`: Vendor ID of your pedal device (default: 0x06A3 for Saitek)
- `pedalPilot.productId`: Product ID of your pedal device (default: 0x0763 for Saitek Pro Flight Rudder Pedals)
- `pedalPilot.debugMode`: Enable debug logging for pedal inputs (default: false)
- `pedalPilot.pedalCenterPosition`: Center position value for the left pedal (default: 63)
- `pedalPilot.pedalDeadzone`: Deadzone size around the center position (default: 1)

## Troubleshooting

If the extension doesn't detect your pedals:

1. Use the "Pedal Pilot: List Connected HID Devices" command to check if your device is recognized
2. Make sure your pedals are properly connected to your computer
3. Try the "Pedal Pilot: Select Pedal Device" command to manually select your pedals
4. Check Windows Device Manager or equivalent to ensure the device drivers are properly installed

## Planned Features

- Integration with other AI assistants beyond GitHub Copilot
- Custom pedal mapping for various VS Code functions
- Support for additional pedal types and brands
- Enhanced control options for GitHub Copilot
- Right pedal and rudder functionality

## Credits

This extension was created to enhance the coding experience by allowing hands-free control of AI completions.
