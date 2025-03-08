# Pedal-Pilot

PedalPilot 🚀 – A VSCode extension that uses foot pedal input to seamlessly control AI completions. Adjust completion acceptance rate intuitively with foot pressure, keeping your hands coding and your workflow effortless.

## Features

- Connect to Saitek Pro Flight Rudder Pedals or other similar HID devices
- Control GitHub Copilot inline suggestions and text editing with your left pedal
  - Push forward to accept suggestions (attempts character-by-character if supported)
  - Pull back to send backspace keypresses that delete text
  - Speed varies based on pedal position (farther from center = faster action)
  - Adapts to available Copilot commands (falls back to full acceptance if needed)
- Toggle text-to-speech with the rudder position (C variable)
  - Move the rudder past a configurable threshold to toggle text-to-speech on/off
  - When enabled, text changes are read aloud using your system's speech synthesis
- Toggle speech recognition with the right pedal
  - Move the right pedal past a configurable threshold to toggle speech recognition on/off
  - When enabled, your speech is transcribed and inserted at the cursor position
  - Choose between Web Speech API and Deepgram Nova-3 for high-accuracy transcription
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
- **Pedal Pilot: Toggle Text-to-Speech** - Manually enables or disables text-to-speech
- **Pedal Pilot: Toggle Speech Recognition** - Manually enables or disables speech recognition
- **Pedal Pilot: Toggle Deepgram Speech Recognition** - Specifically toggles Deepgram Nova-3 speech recognition
- **Pedal Pilot: Set Deepgram Speech Recognition Language** - Changes the language for Deepgram transcription
- **Pedal Pilot: Select Speech Recognition Engine** - Choose between Web Speech API and Deepgram Nova-3

Using with GitHub Copilot:
1. Ensure GitHub Copilot is installed and configured in VS Code
2. Start typing code to generate Copilot suggestions
3. Use the left pedal to control your coding experience:
   - Keep pedal at center position (default: 63) for no action
   - Push pedal forward to accept suggestions (harder push = faster acceptance)
   - Pull pedal back to send backspace keypresses (farther back = faster deletion)
   
   Notes: 
   - Character-by-character acceptance depends on available VS Code commands. If not available, the extension will fall back to accepting the entire suggestion.
   - When pulling back, the extension sends actual backspace keypresses that delete text in your editor.

Using Text-to-Speech:
1. Move the rudder pedal (C variable) to toggle text-to-speech on or off
   - Move rudder past the threshold (default: 90) to enable text-to-speech
   - Move rudder back below the threshold to disable text-to-speech
2. When enabled, any text changes in the editor will be read aloud
3. A status bar item shows the current text-to-speech status (ON/OFF)

Using Speech Recognition:
1. Move the right pedal to toggle speech recognition on or off
   - Move right pedal past the threshold (default: 90) to enable speech recognition
   - Move right pedal back below the threshold to disable speech recognition
2. When enabled, your speech will be transcribed and inserted at the cursor position
3. Choose your preferred speech recognition engine:
   - Web Speech API: Built-in browser speech recognition (no API key required)
   - Deepgram Nova-3: High-accuracy, real-time transcription (requires API key)
4. For Deepgram Nova-3:
   - Get an API key from [Deepgram's website](https://deepgram.com)
   - Set the API key using the "Select Speech Recognition Engine" command
   - Customize language settings with the "Set Deepgram Speech Recognition Language" command
5. A status bar item shows the current speech recognition status (ON/OFF)

## Configuration

The extension provides the following settings:

- `pedalPilot.vendorId`: Vendor ID of your pedal device (default: 0x06A3 for Saitek)
- `pedalPilot.productId`: Product ID of your pedal device (default: 0x0763 for Saitek Pro Flight Rudder Pedals)
- `pedalPilot.debugMode`: Enable debug logging for pedal inputs (default: false)
- `pedalPilot.pedalCenterPosition`: Center position value for the left pedal (default: 63)
- `pedalPilot.pedalDeadzone`: Deadzone size around the center position (default: 1)
- `pedalPilot.ttsToggleThreshold`: Rudder position threshold to toggle text-to-speech (default: 90)
- `pedalPilot.sttToggleThreshold`: Right pedal position threshold to toggle speech recognition (default: 90)
- `pedalPilot.sttEngine`: Speech recognition engine to use ("webSpeech" or "deepgram")
- `pedalPilot.deepgramApiKey`: Deepgram API key for speech recognition
- `pedalPilot.deepgramLanguage`: Language code for Deepgram speech recognition (default: "en-US")

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
- Additional text-to-speech voice customization options
- Integration with more speech recognition providers

## Credits

This extension was created to enhance the coding experience by allowing hands-free control of AI completions.

## Speech Recognition Implementation

Pedal Pilot offers two speech recognition engines:

1. **Web Speech API**: The default implementation uses the browser's built-in Web Speech API, which works well for basic transcription without requiring any API keys or external services.

2. **Deepgram Nova-3**: For users who need higher accuracy and more features, Pedal Pilot integrates with [Deepgram](https://deepgram.com)'s Nova-3 AI model. This offers:
   - Higher accuracy transcription
   - Improved performance in noisy environments
   - Support for multiple languages
   - Punctuation and formatting

To use Deepgram, you'll need to:
1. Obtain an API key from [Deepgram's website](https://deepgram.com)
2. Use the "Select Speech Recognition Engine" command and choose "Deepgram Nova-3"
3. Enter your API key when prompted

The right pedal controls speech recognition regardless of which engine you're using.
