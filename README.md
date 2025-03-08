# Pedal-Pilot

PedalPilot 🚀 – A VSCode extension that uses foot pedal input to seamlessly control AI completions. Adjust completion acceptance rate intuitively with foot pressure, keeping your hands coding and your workflow effortless.

## Features

- Connect to Saitek Pro Flight Rudder Pedals or other similar HID devices
- Use foot pedals to control VS Code actions (AI completions integration coming soon)
- Debug view to visualize pedal inputs
- Auto-detection of commonly used USB pedals
- Configuration options for custom devices

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

## Configuration

The extension provides the following settings:

- `pedalPilot.vendorId`: Vendor ID of your pedal device (default: 0x06A3 for Saitek)
- `pedalPilot.productId`: Product ID of your pedal device (default: 0x0763 for Saitek Pro Flight Rudder Pedals)
- `pedalPilot.debugMode`: Enable debug logging for pedal inputs (default: false)

## Troubleshooting

If the extension doesn't detect your pedals:

1. Use the "Pedal Pilot: List Connected HID Devices" command to check if your device is recognized
2. Make sure your pedals are properly connected to your computer
3. Try the "Pedal Pilot: Select Pedal Device" command to manually select your pedals
4. Check Windows Device Manager or equivalent to ensure the device drivers are properly installed

## Planned Features

- Integration with VS Code's Copilot and other AI assistants
- Custom pedal mapping for various VS Code functions
- Support for multiple pedal types
- Pressure sensitivity controls

## Credits

This extension was created to enhance the coding experience by allowing hands-free control of AI completions.
