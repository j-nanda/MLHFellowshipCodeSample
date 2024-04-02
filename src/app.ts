import { LitElement, css, html } from 'lit'
import { customElement, property, query } from 'lit/decorators.js'
import './toolbar'
import './whiteboard'
import { Whiteboard } from './whiteboard';
import { ZoomOutEvent } from './events/ZoomOutEvent';
import { store } from './store';

@customElement('my-app')
export class App extends LitElement {

@query('my-whiteboard') whiteboard!: Whiteboard;

  connectedCallback() {
    super.connectedCallback();
    this.addEventListener('clear-whiteboard', this.handleClearWhiteboard);
    this.addEventListener('undo', this.handleUndo);
    this.addEventListener('redo', this.handleRedo);
    this.addEventListener('share', this.handleShare);
    this.addEventListener('zoomIn', this.handleZoomIn);
    this.addEventListener('zoomOut', this.handleZoomOut);
    this.addEventListener('save-whiteboard', this.handleSaveWhiteboard);
    this.addEventListener('open-whiteboard', this.handleOpenWhiteboardFromFile);
    this.addEventListener('whiteboard-saved', this.handleWhiteboardSaved as EventListener);

  }

  disconnectedCallback() {
    this.removeEventListener('clear-whiteboard', this.handleClearWhiteboard);
    this.removeEventListener('whiteboard-saved', this.handleWhiteboardSaved as EventListener);
    super.disconnectedCallback();
  }

  handleClearWhiteboard = () => {
    this.whiteboard.clearWhiteboard();
  }

  handleOpenWhiteboardFromFile = async () => {
    await this.whiteboard.loadWhiteboardFromFile();
  }

  handleWhiteboardSaved(event: CustomEvent) {
    const message = event.detail.message;
    alert(message);
    console.log(message); 
  }

    handleSaveWhiteboard = async () => {
    const whiteboardData = this.whiteboard.getWhiteboardDataAsBlob(); 
    await this.saveFile(whiteboardData);
    this.dispatchEvent(new CustomEvent('whiteboard-saved', { detail: { message: 'Whiteboard saved successfully!' } }));
  }

  async saveFile(blob: Blob) {
    const handle = await window.showSaveFilePicker();
    const writable = await handle.createWritable();
    await writable.write(blob);
    await writable.close();
  }

  handleUndo = () => {
    this.whiteboard.undo();
  }

  handleRedo = () => {
    this.whiteboard.redo();
  }

  handleShare = () => {
    this.whiteboard.shareWhiteboard();
  }
  
  handleZoomIn = () => {
    this.whiteboard.zoomIn();
  }

  handleZoomOut = () => {
    this.whiteboard.zoomOut();
  }

   
    render() {
        return html`
            <tool-bar></tool-bar>
            <my-whiteboard></my-whiteboard>
        `
    } //pass a callback to the toolbar, have the whiteboard component expose t

    static styles = css`
        :host {
            height: 100%;
            width: 100%;
            display: flex;
            flex-direction: column;
            background-color: white;
        }
    `
}
