import * as vscode from 'vscode';
import { Deepgram } from '@deepgram/sdk';

// Just use any type for browser API references since they're available in Electron/browser environment
// but not during build in pure Node.js environment
type MediaRecorder = any;
type AudioContext = any;
type WebSocket = any;

/**
 * Service for handling speech-to-text functionality using Deepgram Nova-3
 */
export class DeepgramService implements vscode.Disposable {
    private enabled: boolean = false;
    private statusBarItem: vscode.StatusBarItem;
    private deepgramClient: Deepgram | null = null;
    private mediaRecorder: MediaRecorder | null = null;
    private socket: WebSocket | null = null;
    private apiKey: string | null = null;
    private language: string = 'en-US';
    private audioContext: AudioContext | null = null;
    private interimResult: string = '';
    
    constructor() {
        // Create a status bar item to show Deepgram status
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 98);
        this.updateStatusBar();
        this.statusBarItem.show();
        
        // Try to get the API key from configuration
        this.getApiKey().then(key => {
            this.apiKey = key;
            if (!key) {
                vscode.window.showWarningMessage('Deepgram API key not found. Please configure it to use Deepgram speech recognition.');
            }
        });
    }
    
    /**
     * Get or prompt for the Deepgram API key
     */
    public async getApiKey(): Promise<string | null> {
        console.log('Getting Deepgram API key...');
        
        // Try to get the API key from extension settings
        const config = vscode.workspace.getConfiguration('pedalPilot');
        let apiKey = config.get<string>('deepgramApiKey');
        
        if (apiKey) {
            console.log('Found existing API key in settings');
            // Mask the key for logging
            const maskedKey = apiKey.substring(0, 3) + '...' + apiKey.substring(apiKey.length - 3);
            console.log(`Using API key: ${maskedKey}`);
        } else {
            console.log('No API key found, prompting user');
            
            // If no API key is found, prompt the user
            apiKey = await vscode.window.showInputBox({
                prompt: 'Enter your Deepgram API key',
                placeHolder: 'Your Deepgram API key',
                ignoreFocusOut: true
            });
            
            // Save the API key if provided
            if (apiKey) {
                console.log('API key provided, saving to settings');
                await config.update('deepgramApiKey', apiKey, vscode.ConfigurationTarget.Global);
                vscode.window.showInformationMessage('Deepgram API key saved.');
            } else {
                console.log('No API key provided by user');
            }
        }
        
        return apiKey || null;
    }
    
    /**
     * Initialize the audio capture and Deepgram connection
     */
    private async initializeAudio(): Promise<boolean> {
        try {
            console.log('Initializing Deepgram audio...');
            
            // @ts-ignore - Access global window if it exists (Electron/browser)
            if (typeof window === 'undefined') {
                console.error('Browser environment not detected - window is undefined');
                vscode.window.showErrorMessage('Deepgram speech recognition requires browser environment.');
                return false;
            }
            
            // Check if API key is available
            if (!this.apiKey) {
                console.log('No API key found, prompting user...');
                const key = await this.getApiKey();
                if (!key) {
                    console.error('No API key provided by user');
                    vscode.window.showErrorMessage('Deepgram API key is required for speech recognition.');
                    return false;
                }
                console.log('API key received');
                this.apiKey = key;
            }
            
            // Initialize Deepgram client
            console.log('Initializing Deepgram client with API key');
            this.deepgramClient = new Deepgram(this.apiKey);
            
            try {
                // Request audio permissions
                console.log('Requesting microphone access...');
                // @ts-ignore - MediaDevices may not be recognized in VS Code types
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                console.log('Microphone access granted!');
                
                // Create audio context if needed
                if (!this.audioContext) {
                    console.log('Creating audio context...');
                    // @ts-ignore - window and AudioContext may not be recognized in non-browser TypeScript
                    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                    console.log('Audio context created successfully');
                }
                
                // Stop any existing recorder
                if (this.mediaRecorder) {
                    console.log('Stopping existing media recorder');
                    this.mediaRecorder.stop();
                }
                
                // Create a new recorder
                console.log('Creating new MediaRecorder...');
                // @ts-ignore - MediaRecorder may not be recognized in VS Code types
                this.mediaRecorder = new MediaRecorder(stream, {
                    mimeType: 'audio/webm'
                });
                console.log('MediaRecorder created with mimeType: audio/webm');
                
                // Close any existing WebSocket
                if (this.socket) {
                    console.log('Closing existing WebSocket connection');
                    this.socket.close();
                    this.socket = null;
                }
                
                // Create connection to Deepgram
                console.log('Creating connection to Deepgram...');
                this.connectToDeepgram();
                
                return true;
            } catch (mediaError) {
                console.error('Media access error:', mediaError);
                vscode.window.showErrorMessage(`Could not access microphone: ${mediaError instanceof Error ? mediaError.message : String(mediaError)}`);
                return false;
            }
        } catch (error) {
            console.error('Failed to initialize Deepgram audio capture:', error);
            vscode.window.showErrorMessage(`Failed to initialize audio: ${error instanceof Error ? error.message : String(error)}`);
            return false;
        }
    }
    
    /**
     * Connect to Deepgram WebSocket API
     */
    private connectToDeepgram(): void {
        // Check if API key is available
        if (!this.apiKey) {
            vscode.window.showErrorMessage('Deepgram API key is required');
            return;
        }
        
        try {
            // Use Deepgram SDK to create a live transcription client
            if (!this.deepgramClient) {
                console.log('Creating Deepgram client');
                this.deepgramClient = new Deepgram(this.apiKey);
            }
            
            console.log('Creating Deepgram live transcription connection');
            
            // Define transcription options
            const options = {
                punctuate: true,
                interim_results: true,
                language: this.language,
                model: 'nova-3'
            };
            
            // @ts-ignore - Using the SDK's method
            const deepgramLive = this.deepgramClient.transcription.live(options);
            console.log('Deepgram live transcription created', options);
            
            // Store the socket connection
            this.socket = deepgramLive;
            
            // Define open event handler
            deepgramLive.addListener('open', () => {
                console.log('Connected to Deepgram successfully');
                
                // Set up the media recorder data handler
                if (this.mediaRecorder) {
                    console.log('Setting up media recorder data handler');
                    
                    // Keep track of chunks for debugging
                    let chunkCount = 0;
                    let totalBytes = 0;
                    
                    this.mediaRecorder.ondataavailable = (event: any) => {
                        if (event.data.size > 0 && this.socket) {
                            chunkCount++;
                            totalBytes += event.data.size;
                            console.log(`Sending audio chunk #${chunkCount} (size: ${event.data.size} bytes, total sent: ${totalBytes} bytes)`);
                            
                            try {
                                this.socket.send(event.data);
                                console.log(`Successfully sent audio chunk #${chunkCount}`);
                            } catch (error) {
                                console.error(`Error sending audio chunk #${chunkCount}:`, error);
                                vscode.window.showErrorMessage(`Error sending audio to Deepgram: ${error}`);
                            }
                        } else {
                            if (!this.socket) {
                                console.error('Socket not available for sending audio chunk');
                            } else if (event.data.size === 0) {
                                console.warn('Received empty audio chunk, not sending');
                            }
                        }
                    };
                    
                    // Start recording in small chunks (100ms)
                    console.log('Starting media recorder with 100ms intervals');
                    this.mediaRecorder.start(100);
                    console.log('Media recorder started successfully');
                    
                    // Log media recorder state
                    console.log(`Media recorder state: ${this.mediaRecorder.state}`);
                    console.log(`Media recorder mime type: ${this.mediaRecorder.mimeType}`);
                } else {
                    console.error('Media recorder not initialized');
                    vscode.window.showErrorMessage('Media recorder not initialized');
                }
            });
            
            // Handle transcription results
            deepgramLive.addListener('transcriptReceived', (data: any) => {
                console.log('==========================================');
                console.log('RECEIVED TRANSCRIPTION FROM DEEPGRAM');
                console.log('==========================================');
                
                try {
                    // Log the raw JSON for complete debugging
                    console.log('Raw transcription data:');
                    console.log(JSON.stringify(data, null, 2));
                    
                    // Parse and use the transcription data
                    if (data.channel && data.channel.alternatives && data.channel.alternatives.length > 0) {
                        const transcript = data.channel.alternatives[0].transcript;
                        const confidence = data.channel.alternatives[0].confidence;
                        const isFinal = data.is_final;
                        
                        console.log('');
                        console.log(`TRANSCRIPT: "${transcript}"`);
                        console.log(`CONFIDENCE: ${confidence || 'N/A'}`);
                        console.log(`IS FINAL: ${isFinal}`);
                        console.log('');
                        
                        // Process valid transcripts
                        if (transcript && transcript.trim() !== '') {
                            if (isFinal) {
                                // Final result - insert at cursor
                                console.log('ACTION: Inserting final transcript at cursor position');
                                this.insertTextAtCursor(transcript);
                                this.interimResult = '';
                                
                                // Notify user about the final transcription
                                const shortTranscript = transcript.length > 40 ? 
                                    transcript.substring(0, 37) + '...' : transcript;
                                vscode.window.showInformationMessage(`Transcribed: "${shortTranscript}"`);
                            } else {
                                // Interim result - store but don't insert yet
                                console.log('ACTION: Storing interim transcript');
                                this.interimResult = transcript;
                                
                                // Update status bar with interim result
                                this.updateStatusBar(transcript);
                            }
                        } else {
                            console.log('ACTION: None (empty transcript)');
                        }
                    } else {
                        console.log('No transcription alternatives found in response');
                    }
                    console.log('==========================================');
                } catch (error) {
                    console.error('ERROR PROCESSING DEEPGRAM TRANSCRIPTION:');
                    console.error(error);
                    console.log('Raw data that caused error:');
                    console.log(data);
                    console.log('==========================================');
                }
            });
            
            // Handle connection errors
            deepgramLive.addListener('error', (error: any) => {
                console.log('==========================================');
                console.log('DEEPGRAM CONNECTION ERROR');
                console.log('==========================================');
                console.error(error);
                console.log('==========================================');
                
                vscode.window.showErrorMessage(`Deepgram error: ${error.message || JSON.stringify(error)}`);
            });
            
            // Handle connection close
            deepgramLive.addListener('close', (event: any) => {
                console.log('==========================================');
                console.log('DEEPGRAM CONNECTION CLOSED');
                console.log('==========================================');
                console.log('Close event details:');
                console.log(JSON.stringify(event, null, 2));
                console.log('==========================================');
                
                vscode.window.showInformationMessage(`Deepgram connection closed`);
                
                // Restart if still enabled
                if (this.enabled) {
                    console.log('Attempting to reconnect to Deepgram in 1 second...');
                    setTimeout(() => {
                        this.connectToDeepgram();
                    }, 1000);
                }
            });
            
            // Also add a metadata listener to see connection details
            deepgramLive.addListener('metadata', (metadata: any) => {
                console.log('==========================================');
                console.log('DEEPGRAM CONNECTION METADATA');
                console.log('==========================================');
                console.log(JSON.stringify(metadata, null, 2));
                console.log('==========================================');
            });
        } catch (error) {
            console.error('Failed to connect to Deepgram:', error);
            vscode.window.showErrorMessage(`Deepgram connection failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    
    /**
     * Toggle speech-to-text on/off
     * @returns The new enabled state
     */
    public async toggle(): Promise<boolean> {
        console.log(`Toggling Deepgram recognition from ${this.enabled ? 'ON' : 'OFF'} to ${!this.enabled ? 'ON' : 'OFF'}`);
        
        // Toggle the enabled state
        this.enabled = !this.enabled;
        
        if (this.enabled) {
            console.log('Enabling Deepgram speech recognition');
            const initialized = await this.startRecognition();
            if (!initialized) {
                console.log('Failed to initialize Deepgram, reverting to disabled state');
                this.enabled = false;
            } else {
                console.log('Deepgram recognition successfully enabled');
            }
        } else {
            console.log('Disabling Deepgram speech recognition');
            this.stopRecognition();
            console.log('Deepgram recognition successfully disabled');
        }
        
        // Update the UI
        this.updateStatusBar();
        console.log(`Status bar updated to show Deepgram is ${this.enabled ? 'enabled' : 'disabled'}`);
        
        return this.enabled;
    }
    
    /**
     * Start speech recognition
     */
    private async startRecognition(): Promise<boolean> {
        console.log('Starting Deepgram speech recognition...');
        vscode.window.showInformationMessage('Starting Deepgram speech recognition...');
        
        const initialized = await this.initializeAudio();
        if (!initialized) {
            console.error('Failed to initialize audio');
            vscode.window.showErrorMessage('Failed to initialize audio for Deepgram');
            return false;
        }
        
        try {
            console.log('Deepgram speech recognition started successfully');
            vscode.window.showInformationMessage('Deepgram speech recognition is now active');
            return true;
        } catch (error) {
            console.error('Error starting Deepgram speech recognition:', error);
            vscode.window.showErrorMessage('Failed to start Deepgram speech recognition: ' + (error instanceof Error ? error.message : String(error)));
            return false;
        }
    }
    
    /**
     * Stop speech recognition
     */
    private stopRecognition(): void {
        console.log('Stopping Deepgram speech recognition...');
        
        try {
            // Stop media recorder if it exists
            if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
                console.log('Stopping media recorder');
                this.mediaRecorder.stop();
                console.log('Media recorder stopped');
            } else {
                console.log('No active media recorder to stop');
            }
            
            // Close connection if open
            if (this.socket) {
                console.log('Closing Deepgram connection');
                // try both finish() and close() methods
                try {
                    // @ts-ignore - Deepgram SDK method
                    if (typeof this.socket.finish === 'function') {
                        console.log('Calling finish() on Deepgram connection');
                        this.socket.finish();
                    }
                } catch (e) {
                    console.error('Error calling finish():', e);
                }
                
                try {
                    console.log('Calling close() on Deepgram connection');
                    this.socket.close();
                } catch (e) {
                    console.error('Error calling close():', e);
                }
                
                this.socket = null;
                console.log('Deepgram connection closed');
            } else {
                console.log('No Deepgram connection to close');
            }
            
            console.log('Deepgram speech recognition stopped successfully');
            vscode.window.showInformationMessage('Deepgram speech recognition stopped');
        } catch (error) {
            console.error('Error stopping Deepgram speech recognition:', error);
            vscode.window.showErrorMessage('Error stopping Deepgram speech recognition: ' + (error instanceof Error ? error.message : String(error)));
        }
    }
    
    /**
     * Update the status bar to reflect current Deepgram state
     * @param interimText Optional interim transcript text to show
     */
    private updateStatusBar(interimText?: string): void {
        if (this.enabled && interimText) {
            // Show interim transcription (limited to avoid status bar overflow)
            const shortText = interimText.length > 25 ? 
                interimText.substring(0, 22) + '...' : interimText;
            this.statusBarItem.text = `$(mic) Deepgram: "${shortText}"`;
            this.statusBarItem.tooltip = `Deepgram is listening... Current text: "${interimText}"`;
        } else {
            // Show regular status
            this.statusBarItem.text = `$(mic) Deepgram: ${this.enabled ? 'ON' : 'OFF'}`;
            this.statusBarItem.tooltip = `Deepgram speech recognition is ${this.enabled ? 'enabled' : 'disabled'}`;
        }
        
        this.statusBarItem.command = 'pedalPilot.toggleDeepgram';
    }
    
    /**
     * Get current enabled state
     */
    public isEnabled(): boolean {
        return this.enabled;
    }
    
    /**
     * Insert text at the current cursor position
     */
    private insertTextAtCursor(text: string): void {
        console.log(`Attempting to insert text at cursor: "${text}"`);
        
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            console.log('Active editor found, inserting text');
            editor.edit(editBuilder => {
                // Insert at each selection
                editor.selections.forEach(selection => {
                    editBuilder.insert(selection.active, text + ' '); // Add space for better separation
                });
            }).then(success => {
                if (success) {
                    console.log('Successfully inserted text at cursor');
                } else {
                    console.error('Failed to insert transcribed text');
                    vscode.window.showErrorMessage('Failed to insert transcribed text');
                }
            });
        } else {
            console.error('No active editor to insert text into');
            vscode.window.showWarningMessage('No active editor to insert transcribed text');
        }
    }
    
    /**
     * Set the language for recognition
     */
    public async setLanguage(): Promise<void> {
        const languages = [
            { label: 'English (US)', code: 'en-US' },
            { label: 'English (UK)', code: 'en-GB' },
            { label: 'Spanish', code: 'es' },
            { label: 'French', code: 'fr' },
            { label: 'German', code: 'de' },
            { label: 'Japanese', code: 'ja' },
            { label: 'Dutch', code: 'nl' },
            { label: 'Italian', code: 'it' },
            { label: 'Portuguese', code: 'pt' },
            { label: 'Russian', code: 'ru' },
            { label: 'Chinese (Mandarin)', code: 'zh' }
        ];
        
        const selected = await vscode.window.showQuickPick(
            languages.map(lang => lang.label),
            { placeHolder: 'Select speech recognition language' }
        );
        
        if (selected) {
            const langCode = languages.find(l => l.label === selected)?.code || 'en-US';
            this.language = langCode;
            
            // Save the language setting
            await vscode.workspace.getConfiguration('pedalPilot').update(
                'deepgramLanguage', 
                langCode, 
                vscode.ConfigurationTarget.Global
            );
            
            vscode.window.showInformationMessage(`Speech recognition language set to ${selected}`);
            
            // Restart recognition if it's active
            if (this.enabled) {
                this.stopRecognition();
                await this.startRecognition();
            }
        }
    }
    
    public dispose(): void {
        this.stopRecognition();
        this.statusBarItem.dispose();
    }
}