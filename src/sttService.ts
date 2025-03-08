import * as vscode from 'vscode';

// Use type declarations for Web Speech API
type SpeechRecognition = any;
type SpeechRecognitionEvent = any;

/**
 * Service for handling speech-to-text functionality
 */
export class STTService implements vscode.Disposable {
    private enabled: boolean = false;
    private statusBarItem: vscode.StatusBarItem;
    private recognition: SpeechRecognition | null = null;
    private interimResults: string = '';
    
    constructor() {
        // Create a status bar item to show STT status
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 98);
        this.updateStatusBar();
        this.statusBarItem.show();
        
        try {
            // Check for SpeechRecognition API
            // @ts-ignore - Access global window if it exists (Electron/browser)
            if (typeof window !== 'undefined') {
                // @ts-ignore
                const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
                if (SpeechRecognition) {
                    this.initializeRecognition(SpeechRecognition);
                } else {
                    console.log('Speech recognition API not available');
                }
            }
        } catch (error) {
            console.error('Failed to initialize speech recognition:', error);
        }
    }
    
    /**
     * Initialize the speech recognition object
     */
    private initializeRecognition(SpeechRecognitionConstructor: any): void {
        this.recognition = new SpeechRecognitionConstructor();
        if (this.recognition) {
            this.recognition.continuous = true;
            this.recognition.interimResults = true;
            this.recognition.lang = 'en-US';
            
            this.recognition.onresult = (event: SpeechRecognitionEvent) => {
                let finalTranscript = '';
                let interimTranscript = '';
                
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const transcript = event.results[i][0].transcript;
                    
                    if (event.results[i].isFinal) {
                        finalTranscript += transcript;
                    } else {
                        interimTranscript += transcript;
                    }
                }
                
                // Store interim results
                this.interimResults = interimTranscript;
                
                // Insert final transcript at cursor position
                if (finalTranscript) {
                    this.insertTextAtCursor(finalTranscript);
                }
            };
            
            this.recognition.onerror = (event: any) => {
                console.error('Speech recognition error:', event.error);
                vscode.window.showErrorMessage(`Speech recognition error: ${event.error}`);
            };
            
            this.recognition.onend = () => {
                if (this.enabled) {
                    // Restart recognition if it ended but is still enabled
                    this.recognition?.start();
                }
            };
        }
    }
    
    /**
     * Toggle speech-to-text on/off
     * @returns The new enabled state
     */
    public toggle(): boolean {
        this.enabled = !this.enabled;
        
        if (this.enabled) {
            this.startRecognition();
        } else {
            this.stopRecognition();
        }
        
        this.updateStatusBar();
        vscode.window.showInformationMessage(`Speech recognition ${this.enabled ? 'enabled' : 'disabled'}`);
        return this.enabled;
    }
    
    /**
     * Get current enabled state
     */
    public isEnabled(): boolean {
        return this.enabled;
    }
    
    /**
     * Start speech recognition
     */
    private startRecognition(): void {
        if (this.recognition) {
            try {
                this.recognition.start();
                console.log('Speech recognition started');
            } catch (error) {
                console.error('Error starting speech recognition:', error);
                vscode.window.showErrorMessage('Failed to start speech recognition');
            }
        } else {
            vscode.window.showWarningMessage('Speech recognition not available in this environment');
        }
    }
    
    /**
     * Stop speech recognition
     */
    private stopRecognition(): void {
        if (this.recognition) {
            try {
                this.recognition.stop();
                console.log('Speech recognition stopped');
            } catch (error) {
                console.error('Error stopping speech recognition:', error);
            }
        }
    }
    
    /**
     * Update the status bar to reflect current STT state
     */
    private updateStatusBar(): void {
        this.statusBarItem.text = `$(mic) Speech Recognition: ${this.enabled ? 'ON' : 'OFF'}`;
        this.statusBarItem.tooltip = `Speech recognition is ${this.enabled ? 'enabled' : 'disabled'}`;
        this.statusBarItem.command = 'pedalPilot.toggleSTT';
    }
    
    /**
     * Insert text at the current cursor position
     */
    private insertTextAtCursor(text: string): void {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            editor.edit(editBuilder => {
                // Insert at each selection
                editor.selections.forEach(selection => {
                    editBuilder.insert(selection.active, text);
                });
            }).then(success => {
                if (!success) {
                    vscode.window.showErrorMessage('Failed to insert transcribed text');
                }
            });
        }
    }
    
    public dispose(): void {
        this.stopRecognition();
        this.statusBarItem.dispose();
    }
}