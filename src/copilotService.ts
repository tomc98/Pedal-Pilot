import * as vscode from 'vscode';
import { getConfig } from './config';

export interface CopilotControlState {
    isAccepting: boolean;
    isDeleting: boolean;
    intensity: number; // 0-100 speed rate based on distance from center
}

export class CopilotService {
    private disposables: vscode.Disposable[] = [];
    private controlState: CopilotControlState = {
        isAccepting: false,
        isDeleting: false,
        intensity: 0
    };

    constructor() {}

    /**
     * Calculate control state based on pedal position
     * @param pedalValue Left pedal position (0-127)
     * @returns CopilotControlState with information about what action to take
     */
    public calculateControlState(pedalValue: number): CopilotControlState {
        // Get configuration values
        const config = getConfig();
        const pedalCenter = config.pedalCenterPosition;
        const pedalDeadzone = config.pedalDeadzone;
    
        // Default state - no action
        const state: CopilotControlState = {
            isAccepting: false,
            isDeleting: false,
            intensity: 0
        };

        // If we're in the deadzone, return the default inactive state
        if (pedalValue >= pedalCenter - pedalDeadzone && 
            pedalValue <= pedalCenter + pedalDeadzone) {
            return state;
        }

        // Beyond deadzone - calculate intensity based on distance from center
        if (pedalValue > pedalCenter + pedalDeadzone) {
            // Accept direction
            state.isAccepting = true;
            // Calculate intensity (0-100) based on distance from center, max at 127
            state.intensity = Math.min(100, Math.round(((pedalValue - (pedalCenter + pedalDeadzone)) / (127 - (pedalCenter + pedalDeadzone))) * 100));
        } else if (pedalValue < pedalCenter - pedalDeadzone) {
            // Delete direction
            state.isDeleting = true;
            // Calculate intensity (0-100) based on distance from center, max at 0
            state.intensity = Math.min(100, Math.round(((pedalCenter - pedalDeadzone - pedalValue) / (pedalCenter - pedalDeadzone)) * 100));
        }

        return state;
    }

    /**
     * Execute copilot control action based on control state
     * @param state The control state to execute
     */
    public async executeCopilotControl(state: CopilotControlState): Promise<void> {
        // Update the current control state
        this.controlState = state;

        // If in deadzone (intensity is 0), stop any running timers
        if (state.intensity === 0) {
            this.stopAcceptTimer();
            this.stopDeleteTimer();
            return;
        }

        if (state.isAccepting) {
            // Stop any delete timer first
            this.stopDeleteTimer();
            
            // Start the acceptance process
            await this.acceptSuggestion(state.intensity);
        } else if (state.isDeleting) {
            // Stop any accept timer first
            this.stopAcceptTimer();
            
            // Start the deletion process (backspace)
            await this.deleteSuggestion(state.intensity);
        }
    }

    // Timer for repeating character acceptance
    private acceptTimer: NodeJS.Timeout | null = null;
    // Current active editor
    private activeEditor: vscode.TextEditor | undefined;
    // Flag to indicate if we're currently in an accepting state
    private isCurrentlyAccepting: boolean = false;

    /**
     * Accept the current Copilot suggestion at the given intensity/speed
     * @param intensity The intensity/speed of acceptance (0-100)
     */
    private async acceptSuggestion(intensity: number): Promise<void> {
        // Stop any existing timer
        this.stopAcceptTimer();
        
        // Map intensity to delay between character acceptances (ms)
        // Higher intensity = lower delay (faster acceptance)
        // Increasing speed by factor of 3
        const delay = Math.max(5, Math.round((500 - (intensity * 4.8)) / 3));
        
        try {
            // Get current editor
            this.activeEditor = vscode.window.activeTextEditor;
            
            if (!this.activeEditor) {
                return;
            }
            
            // Start accepting one character at a time
            this.isCurrentlyAccepting = true;
            
            // Start a timer to repeatedly accept one character at a time
            this.acceptTimer = setInterval(() => {
                this.acceptOneCharacter();
            }, delay);
        } catch (error) {
            console.error('Error accepting Copilot suggestion:', error);
            this.stopAcceptTimer();
        }
    }
    
    /**
     * Accept a single character from the current suggestion
     */
    // Track whether we've shown the fallback warning
    private fallbackWarningShown = false;
    
    private async acceptOneCharacter(): Promise<void> {
        try {
            // Try all known commands for accepting inline suggestions character by character
            const commands = [
                // VS Code standard commands
                'editor.action.inlineSuggest.acceptNextChar',
                'editor.action.inlineSuggest.acceptNextWord',
                // Copilot specific commands that might exist
                'github.copilot.acceptNextWord',
                'github.copilot.acceptNextChar'
            ];
            
            // Try each command in order
            for (const command of commands) {
                try {
                    // Check if command exists first
                    const allCommands = await vscode.commands.getCommands();
                    if (allCommands.includes(command)) {
                        await vscode.commands.executeCommand(command);
                        return; // Command succeeded
                    }
                } catch (error) {
                    // Continue to next command
                    console.log(`Command ${command} failed: ${error}`);
                }
            }
            
            // If we got here, none of the commands worked
            // Fall back to accepting the whole suggestion
            if (!this.fallbackWarningShown) {
                console.warn('Character-by-character acceptance not available, falling back to full suggestion acceptance');
                vscode.window.showWarningMessage('Character-by-character acceptance not available. Using full suggestion acceptance instead.');
                this.fallbackWarningShown = true;
            }
            
            // Stop the timer since we're accepting the whole suggestion
            this.stopAcceptTimer();
            await vscode.commands.executeCommand('editor.action.inlineSuggest.commit');
        } catch (error) {
            console.error('Error accepting suggestion:', error);
            this.stopAcceptTimer();
        }
    }
    
    /**
     * Stop the current accept timer
     */
    private stopAcceptTimer(): void {
        if (this.acceptTimer) {
            clearInterval(this.acceptTimer);
            this.acceptTimer = null;
        }
        this.isCurrentlyAccepting = false;
    }

    // Timer for repeating character deletion (backspace)
    private deleteTimer: NodeJS.Timeout | null = null;
    
    /**
     * Delete characters using backspace with the given intensity/speed
     * @param intensity The intensity/speed of deletion (0-100)
     */
    private async deleteSuggestion(intensity: number): Promise<void> {
        // Stop any existing timer
        this.stopDeleteTimer();
        
        // First hide any current suggestion
        try {
            await vscode.commands.executeCommand('editor.action.inlineSuggest.hide');
        } catch (error) {
            console.error('Error hiding Copilot suggestion:', error);
        }
        
        // Map intensity to delay between backspace presses (ms)
        // Higher intensity = lower delay (faster deletion)
        const delay = Math.max(5, Math.round((500 - (intensity * 4.8)) / 3));
        
        try {
            // Get current editor
            const editor = vscode.window.activeTextEditor;
            
            if (!editor) {
                return;
            }
            
            // Start a timer to repeatedly press backspace
            this.deleteTimer = setInterval(() => {
                this.sendBackspace();
            }, delay);
        } catch (error) {
            console.error('Error setting up backspace timer:', error);
            this.stopDeleteTimer();
        }
    }
    
    /**
     * Send a backspace key to delete a character
     */
    private async sendBackspace(): Promise<void> {
        try {
            // Execute backspace through VS Code's delete command
            await vscode.commands.executeCommand('deleteLeft');
        } catch (error) {
            console.error('Error sending backspace:', error);
            this.stopDeleteTimer();
        }
    }
    
    /**
     * Stop the current delete timer
     */
    private stopDeleteTimer(): void {
        if (this.deleteTimer) {
            clearInterval(this.deleteTimer);
            this.deleteTimer = null;
        }
    }

    public dispose(): void {
        this.stopAcceptTimer();
        this.stopDeleteTimer();
        this.disposables.forEach(d => d.dispose());
    }
}