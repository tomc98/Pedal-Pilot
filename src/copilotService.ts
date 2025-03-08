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
     * @param pedalValue Left pedal position (0-255)
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
            // Calculate intensity (0-100) based on distance from center, max at 255
            state.intensity = Math.min(100, Math.round(((pedalValue - (pedalCenter + pedalDeadzone)) / (255 - (pedalCenter + pedalDeadzone))) * 100));
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
        // If intensity is 0, no action needed
        if (state.intensity === 0) {
            return;
        }

        // Update the current control state
        this.controlState = state;

        if (state.isAccepting) {
            await this.acceptSuggestion(state.intensity);
        } else if (state.isDeleting) {
            await this.deleteSuggestion(state.intensity);
        }
    }

    /**
     * Accept the current Copilot suggestion at the given intensity/speed
     * @param intensity The intensity/speed of acceptance (0-100)
     */
    private async acceptSuggestion(intensity: number): Promise<void> {
        // Map intensity to an appropriate chunk size of characters to accept
        const chunkSize = Math.max(1, Math.round(intensity / 10));
        
        try {
            // Accept suggestion using VS Code's API
            // The exact approach depends on how Copilot's API is exposed
            
            // For now, we'll simulate pressing Tab key which is the default for accepting suggestions
            // This can be refined once we understand more about the Copilot API
            await vscode.commands.executeCommand('editor.action.inlineSuggest.commit');
        } catch (error) {
            console.error('Error accepting Copilot suggestion:', error);
        }
    }

    /**
     * Delete the current Copilot suggestion at the given intensity/speed
     * @param intensity The intensity/speed of deletion (0-100)
     */
    private async deleteSuggestion(intensity: number): Promise<void> {
        // Map intensity to an appropriate chunk size of characters to delete
        const chunkSize = Math.max(1, Math.round(intensity / 10));
        
        try {
            // Dismiss suggestion using VS Code's API
            await vscode.commands.executeCommand('editor.action.inlineSuggest.hide');
        } catch (error) {
            console.error('Error deleting Copilot suggestion:', error);
        }
    }

    public dispose(): void {
        this.disposables.forEach(d => d.dispose());
    }
}