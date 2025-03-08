import * as vscode from 'vscode';

// Define web speech API types that might not be available in Node.js typings
declare global {
    interface Window {
        speechSynthesis?: SpeechSynthesis;
    }
    
    interface SpeechSynthesis {
        speak(utterance: SpeechSynthesisUtterance): void;
        cancel(): void;
        pause(): void;
        resume(): void;
        getVoices(): SpeechSynthesisVoice[];
    }
    
    interface SpeechSynthesisUtterance {
        text: string;
        lang?: string;
        pitch?: number;
        rate?: number;
        voice?: SpeechSynthesisVoice;
        volume?: number;
    }
    
    interface SpeechSynthesisVoice {
        voiceURI: string;
        name: string;
        lang: string;
        localService: boolean;
        default: boolean;
    }
}

/**
 * Service for handling text-to-speech functionality
 */
export class TTSService {
    private enabled: boolean = false;
    private statusBarItem: vscode.StatusBarItem;
    private disposables: vscode.Disposable[] = [];
    private lastSpeakPosition: vscode.Position | null = null;
    private speechSynthesis: SpeechSynthesis | undefined;
    
    constructor() {
        // Create a status bar item to show TTS status
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 99);
        this.updateStatusBar();
        this.statusBarItem.show();
        
        // Access browser's speech synthesis if available (Electron apps have access to browser APIs)
        try {
            // @ts-ignore - Access global window if it exists (Electron/browser)
            if (typeof window !== 'undefined' && (window as any).speechSynthesis) {
                // @ts-ignore
                this.speechSynthesis = (window as any).speechSynthesis;
            }
        } catch (error) {
            console.log('Speech synthesis not available:', error);
        }
        
        // Register for text editor change events to speak new text
        this.disposables.push(
            vscode.window.onDidChangeActiveTextEditor(() => {
                this.lastSpeakPosition = null;
            }),
            vscode.workspace.onDidChangeTextDocument(e => {
                if (this.enabled && e.contentChanges.length > 0) {
                    this.speakChanges(e);
                }
            })
        );
    }
    
    /**
     * Toggle text-to-speech on/off
     * @returns The new enabled state
     */
    public toggle(): boolean {
        this.enabled = !this.enabled;
        this.updateStatusBar();
        
        // Notify user of state change
        vscode.window.showInformationMessage(`Text-to-speech ${this.enabled ? 'enabled' : 'disabled'}`);
        return this.enabled;
    }
    
    /**
     * Update the status bar to reflect current TTS state
     */
    private updateStatusBar(): void {
        this.statusBarItem.text = `$(megaphone) TTS: ${this.enabled ? 'ON' : 'OFF'}`;
        this.statusBarItem.tooltip = `Text-to-speech is ${this.enabled ? 'enabled' : 'disabled'}`;
    }
    
    /**
     * Speak the changes made to a document
     */
    private speakChanges(event: vscode.TextDocumentChangeEvent): void {
        const editor = vscode.window.activeTextEditor;
        if (!editor || editor.document !== event.document) {
            return;
        }
        
        for (const change of event.contentChanges) {
            // Only speak non-empty changes
            if (change.text && change.text.trim() !== '') {
                this.speak(change.text);
                
                // Update last spoken position
                this.lastSpeakPosition = editor.document.positionAt(
                    editor.document.offsetAt(change.range.start) + change.text.length
                );
            }
        }
    }
    
    /**
     * Speak some text using available speech synthesis
     */
    private speak(text: string): void {
        // Web Speech API implementation (works in Electron)
        if (this.speechSynthesis) {
            // Cancel any ongoing speech
            this.speechSynthesis.cancel();
            
            // Create utterance and speak
            // @ts-ignore - Using any for browser compatibility
            const utterance = new (window as any).SpeechSynthesisUtterance(text);
            this.speechSynthesis.speak(utterance);
        } else {
            // Fallback - log that speech synthesis isn't available
            console.log('Speech synthesis not available');
        }
    }
    
    public dispose(): void {
        this.statusBarItem.dispose();
        this.disposables.forEach(d => d.dispose());
    }
}