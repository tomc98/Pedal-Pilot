import * as vscode from 'vscode';
import { formatHIDData } from './util';

export class PedalDebugView {
  private panel: vscode.WebviewPanel | undefined;
  private dataHistory: Array<{ timestamp: number; data: Buffer }> = [];
  private maxHistoryEntries = 50;

  constructor(private context: vscode.ExtensionContext) {}

  public show(): void {
    if (this.panel) {
      // If we already have a panel, reveal it
      this.panel.reveal();
      return;
    }

    // Create and show the panel
    this.panel = vscode.window.createWebviewPanel(
      'pedalPilotDebug',
      'Pedal Pilot Debug',
      vscode.ViewColumn.Two,
      {
        enableScripts: true,
        retainContextWhenHidden: true
      }
    );

    // Handle panel disposal
    this.panel.onDidDispose(() => {
      this.panel = undefined;
    });

    // Initial content
    this.updateContent();
  }

  public addData(data: Buffer): void {
    // Add new data to history
    this.dataHistory.push({
      timestamp: Date.now(),
      data: Buffer.from(data) // Create a copy of the buffer
    });

    // Trim history if needed
    if (this.dataHistory.length > this.maxHistoryEntries) {
      this.dataHistory = this.dataHistory.slice(-this.maxHistoryEntries);
    }

    // Update content if panel exists
    if (this.panel) {
      this.updateContent();
    }
  }

  public clear(): void {
    this.dataHistory = [];
    if (this.panel) {
      this.updateContent();
    }
  }

  private updateContent(): void {
    if (!this.panel) {
      return;
    }

    // Format the data entries
    const dataRows = this.dataHistory.map((entry, index) => {
      const date = new Date(entry.timestamp);
      const timeString = date.toLocaleTimeString(undefined, { hour12: false });
      const hexData = formatHIDData(entry.data);
      
      // Try to interpret bytes for pedal data
      const dataValues = [];
      for (let i = 0; i < Math.min(6, entry.data.length); i++) {
        dataValues.push(entry.data[i]);
      }
      
      return `
        <tr>
          <td>${index + 1}</td>
          <td>${timeString}</td>
          <td class="hex-data">${hexData}</td>
          <td class="pedal-values">${dataValues.join(', ')}</td>
        </tr>
      `;
    }).join('');

    // Update the webview content
    this.panel.webview.html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Pedal Data Debug</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 10px; }
          h1 { font-size: 18px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
          .hex-data { font-family: monospace; }
          .pedal-values { font-family: monospace; }
          .controls { margin: 10px 0; }
          button { padding: 5px 10px; margin-right: 5px; }
          .empty-message { color: #888; font-style: italic; margin: 20px 0; }
          tr:nth-child(even) { background-color: #f9f9f9; }
        </style>
      </head>
      <body>
        <h1>Pedal Data Debug View</h1>
        <div class="controls">
          <button id="clearButton">Clear Data</button>
        </div>
        
        ${this.dataHistory.length === 0 ? 
          '<p class="empty-message">No pedal data received yet. Press pedals to see data.</p>' : 
          `<table>
            <thead>
              <tr>
                <th>#</th>
                <th>Time</th>
                <th>Raw Data (Hex)</th>
                <th>Values (Dec)</th>
              </tr>
            </thead>
            <tbody>
              ${dataRows}
            </tbody>
          </table>`
        }
        
        <script>
          const vscode = acquireVsCodeApi();
          
          document.getElementById('clearButton').addEventListener('click', () => {
            vscode.postMessage({ command: 'clear' });
          });
        </script>
      </body>
      </html>
    `;

    // Handle messages from the webview
    this.panel.webview.onDidReceiveMessage(
      message => {
        switch (message.command) {
          case 'clear':
            this.clear();
            break;
        }
      },
      undefined,
      this.context.subscriptions
    );
  }

  public dispose(): void {
    if (this.panel) {
      this.panel.dispose();
      this.panel = undefined;
    }
  }
}