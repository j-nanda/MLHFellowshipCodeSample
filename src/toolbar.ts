import { LitElement, css, html } from 'lit'
import { connect } from 'pwa-helpers/connect-mixin'
import { RootState, store } from './store'
import { Shape, selectShape, Tool, BrushType, EraserType, selectTool, selectToolColor, selectHighlighterColor, selectToolSize, selectBrushType, selectEraserType, selectEraserSize, selectHighlighterSize } from './slices/toolSlice'
import { customElement, property, state } from 'lit/decorators.js'

import './assets/materialdesign.ts'
import { ClearWhiteboardEvent } from './events/ClearWhiteboardEvent'
import { UndoEvent } from './events/UndoEvent'
import { RedoEvent } from './events/RedoEvent'
import { ShareEvent } from './events/ShareEvent.ts'
import { ZoomInEvent } from './events/ZoomInEvent.ts'
import { ZoomOutEvent } from './events/ZoomOutEvent.ts'
import { Whiteboard } from './whiteboard.ts'
import { Menu } from '@material/web/menu/menu'

@customElement('tool-bar')
export class Toolbar extends connect(store)(LitElement) {



  private saveWhiteboard() {
    console.log("saving whiteboard");
    this.dispatchEvent(new CustomEvent('save-whiteboard', { bubbles: true, composed: true }));
   
  }

  private openWhiteboard() {
    this.dispatchEvent(new CustomEvent('open-whiteboard', { bubbles: true, composed: true }));

  }
  

  private clearWhiteboard() {
    //Show the md-icon dialog first here, to prompt the user to make a selection.
    var delDialog = this.shadowRoot.getElementById('deleteDialog');
    delDialog.show();
    //Attach event listner for closing the dialog.
    delDialog.addEventListener('close', () => {
      if(delDialog.returnValue==='confirmDelete'){
        const event = new ClearWhiteboardEvent();
        this.dispatchEvent(event);
      }
      else{
        console.log(delDialog.returnValue);
      }
    });
  }
  
  @property({ type: String })
  activeTool = '';

  @property({attribute: false}) 
  openDropdown: string |null = null;

  @state()
  private colorPickerIsOpen = false;

  @state()
  private brushType = BrushType.Pen;



  handleDropdownItemClick(event: Event) {
    // Get the clicked item
    const item = (event.target as HTMLElement).closest('md-icon-button');
    console.log("item is ", item);

    // Get the shape from the item's data-shape attribute
    if (item) {
    const shape = item.dataset.shape;
    console.log("shape is " ,shape);

    if (shape === "rectangle"){
      console.log("dispatching rectangle");
      store.dispatch(selectShape(Shape.Rectangle));
      this.activeTool = "rectangle-button";
      this._toggleActive('rectangle-button');

    } else if (shape === "square"){
      console.log("dispatching square");
      store.dispatch(selectShape(Shape.Square));
      this.activeTool = "square-button";
      this._toggleActive('square-button');

    } else if (shape === "triangle") {
      console.log("dispatching triangle");
      store.dispatch(selectShape(Shape.Triangle));
      this.activeTool = "triangle-button";
      this._toggleActive('triangle-button');

    } else if (shape === "circle") {
      console.log("dispatching circle");
      store.dispatch(selectShape(Shape.Circle));
      this.activeTool = "circle-button";
      this._toggleActive('circle-button');
    }
  }
}

shapeSelect() {
  this.toggleShapeDropdown();
  const shapeButton = this.shadowRoot?.getElementById('shapeButton') as HTMLButtonElement;
  const isShapeActive = shapeButton?.classList.contains('active');

  if (!isShapeActive) {
    this._shapes();
  }

}

toggleShapeDropdown() {
    const shapeDropdown = this.shadowRoot?.getElementById("shapeDropdown") as Menu;
    shapeDropdown.open = !shapeDropdown.open;
}

  penSelect() {
    this.togglePenDropdown();
    const penButton = this.shadowRoot?.getElementById('penButton') as HTMLButtonElement;
    const isPenActive = penButton?.classList.contains('active');
  
    if (!isPenActive) {
      this._drawing();
    }
  }

  togglePenDropdown(){
    const penDropdown = this.shadowRoot?.getElementById("penDropdown") as Menu;
    penDropdown.open = !penDropdown.open;
  }

  eraserSelect() {
    this.toggleEraserDropdown();
    const eraserButton = this.shadowRoot?.getElementById('eraserButton') as HTMLButtonElement;
    const isEraserActive = eraserButton?.classList.contains('active');

    if (!isEraserActive) {
      this._erasing();
    }

  }

  textSelect(){
    const textButton = this.shadowRoot?.getElementById('textButton') as HTMLButtonElement;
    const isTextActive = textButton?.classList.contains('active');
    if(!isTextActive){
      this._texting();
    }
  }
  zoomIn(){

  }

  toggleEraserDropdown() {
    const eraserDropdown = this.shadowRoot?.getElementById("eraserDropdown") as Menu;
    eraserDropdown.open = !eraserDropdown.open;
  }

  pickerSelect() {
    this.togglePickerDropdown();
    const pickerButton = this.shadowRoot?.getElementById('pickerButton') as HTMLButtonElement;
    const isPickerActive = pickerButton?.classList.contains('active');
    
  
  }

  togglePickerDropdown(){
    this.togglePenDropdown();
    this.colorPickerIsOpen = !this.colorPickerIsOpen;
    
  }

  selectColor(e: MouseEvent, color: string) {
    if (this.brushType == BrushType.Highlighter) {
      store.dispatch(selectHighlighterColor(color));
    } else {
      store.dispatch(selectToolColor(color));
    }
    this.stopPropagation(e);
  }

  selectSize(e: MouseEvent, size: number) {
    store.dispatch(selectToolSize(size))
    if (this.brushType == BrushType.Highlighter) {
      store.dispatch(selectHighlighterSize(size));
    } else {
      store.dispatch(selectToolSize(size));
    }
    this.stopPropagation(e);
  }

  selectBrushType(e: MouseEvent, type: BrushType) {
    store.dispatch(selectBrushType(type));
    this.brushType = type;
    this.stopPropagation(e);
  }

  selectEraserType(e: MouseEvent, type: EraserType) {
    store.dispatch(selectEraserType(type));
    this.stopPropagation(e);
  }

  selectEraseSize(e: MouseEvent, size: number) {
    store.dispatch(selectEraserSize(size))
    this.stopPropagation(e);
  }

  private stopPropagation(e: MouseEvent) {
    e.stopPropagation();
  }

  /*
  * Map that relates brush types to their corresponding images
  */
  brushTypeIconMap: Record<BrushType, String> = {
    [BrushType.Pen]: 'ink_pen',
    [BrushType.Highlighter]: 'ink_highlighter',
    [BrushType.Calligraphy]: 'brush',
    [BrushType.Glow]: 'stylus_laser_pointer',
  };

  /*
  * Iterates through the brush types, maps them to their corresponding images, and then displays the icons
  */
  renderBrushButtons() {
    const brush = ["Pen", "Highlighter", "Calligraphy", "Glow"]
    const brushTypeValues = Object.values(BrushType).filter(value => typeof value === 'number') as BrushType[];
    return brushTypeValues.map((brushType) => html`
      <md-icon-button title=${brush[brushType]} @click="${(e: MouseEvent) => this.selectBrushType(e, brushType)}">
        <md-icon>${this.brushTypeIconMap[brushType]}"</md-icon>
      </md-icon-button>
    `);
  }
  
  render() {
    return html`
      <div class="top-bar">
        <header class="topbar">
          <nav>
            <ul>
            
              <md-filled-button title="Save" class="mainbutton" @click="${this.saveWhiteboard}"><span class="text">Save</span></md-filled-button>
              <md-filled-button title="Open" class="mainbutton" @click="${this.openWhiteboard}"><span class="text">Open</span></md-filled-button>

              <md-filled-button title="Delete whiteboard" class="deletebutton" @click="${this.clearWhiteboard}"><span class="text">Delete Whiteboard</span></md-filled-button>

            
              <md-filled-button title="Share to others" class="sharebutton button-right" @click=${(e: MouseEvent) => {this.dispatchEvent(new ShareEvent());}}>Share</md-filled-button>

         
            </ul>
          </nav>
          <md-dialog type="alert" id="deleteDialog" close>
        <div slot="headline">Delete Whiteboard? <md-icon>delete_outline</md-icon></div>
          <form slot="content" id="form-id" method="dialog">
            Are you sure you wish to delete the contents of the entire whiteboard?
          </form>
        <div slot="actions">
          <md-filled-tonal-button form="form-id" value="cancelDelete">Cancel</md-filled-tonal-button>
          <md-filled-button form="form-id" value="confirmDelete">Confirm</md-filled-button>
        </div>
        </md-dialog>
          
        </header>
      </div>
      <div class="tool-bar">
        <header class="toolbar">
          <nav>
            <div class="parent-container">
              <ul class="icons">
                <!-- Undo Button -->
                <md-icon-button title="Undo (Ctrl+Z)" @click=${(e: MouseEvent, f: KeyboardEvent) => {
                    this.dispatchEvent(new UndoEvent()); this.handleToolKeyPress(f)}}>
                   <md-icon alt="Undo tool icon">undo</md-icon>
                </md-icon-button>

                <!-- Redo Button -->
                <md-icon-button title="Redo (Ctrl+Y)" @click=${(e: MouseEvent, f: KeyboardEvent) => {
                    this.dispatchEvent(new RedoEvent()); this.handleToolKeyPress(f)}}>
                   <md-icon alt="Redo tool icon">redo</md-icon>
                </md-icon-button>

                <!-- Select Tool Button -->
                <md-icon-button title="Select (1)" @click = ${(e: MouseEvent, f: KeyboardEvent) => {this._selecting(); this.handleToolKeyPress(f)}} class="iconbutton" id="selectButton">
                  <md-icon alt="Select icon">arrow_selector_tool</md-icon>
                </md-icon-button>

                <!-- Pen Tool Button -->
                <md-icon-button title="Pen (2)" class="iconbutton" @click="${(e: MouseEvent, f: KeyboardEvent) => {this.penSelect(); this.handleToolKeyPress(f);}}" id="penButton">
                  <md-icon alt="Pen tool icon">edit</md-icon>
                </md-icon-button>


                <!-- Pen Tool Dropdown -->
                <!-- TODO: Refactor this into its own component -->
                <md-menu positioning="popover" anchor="penButton" id="penDropdown">
                  <div class = "dropdown-row" draggable="false">
                    ${this.renderBrushButtons()}
                  </div>

                  <hr class = "modal-divider-horizontal">
                  <div class = "dropdown-secondRow">
                    <!-- Blue color -->
                    <md-icon-button title="Blue" @click="${(e: MouseEvent) => { this.selectColor(e, '#2596be') }}">
                      <md-icon filled id="blueColor" alt="Blue">circle</md-icon>
                    </md-icon-button>

                    <!-- Green color -->
                    <md-icon-button title="Green" @click="${(e: MouseEvent) => { this.selectColor(e, '#a7d784') }}">
                      <md-icon filled id="greenColor" alt="Green">circle</md-icon>
                    </md-icon-button>

                    <!-- Red color -->
                    <md-icon-button title="Red" @click="${(e: MouseEvent) => { this.selectColor(e, '#f50405') }}" >
                      <md-icon filled id="redColor" alt="Red">circle</md-icon>
                    </md-icon-button>

                    <!-- Custom color -->
                    <md-icon-button title="Select custom color" href="#" @click="${(e: MouseEvent) => {this.pickerSelect();}}" >
                      <md-icon filled id="pickerButton" alt="Custom color">palette</md-icon>
                    </md-icon-button>

                    <div class="picker-dropdown-content" style="display: ${this.colorPickerIsOpen ? 'block' : 'none'}" draggable="false">
                      <input type = "color" id = "colorInp"  @input="${this.updateColorPicked}"/>
                    </div>
                  </div>

                  <hr class = "modal-divider-horizontal">

                  <div class="dropdown-secondRow">
                    <!-- Small pen -->
                    <md-icon-button title="Small" @click="${(e: MouseEvent) => this.selectSize(e, 2)}">
                      <md-icon alt="Small Pen Size">pen_size_1</md-icon>
                    </md-icon-button>

                    <!-- Medium pen -->
                    <md-icon-button title="Medium" @click="${(e: MouseEvent) => this.selectSize(e, 5)}">
                      <md-icon alt="Medium Pen Size">pen_size_2</md-icon>
                    </md-icon-button>

                    <!-- Large pen -->
                    <md-icon-button title="Large" @click="${(e: MouseEvent) => this.selectSize(e, 10)}">
                      <md-icon alt="Large Pen Size">pen_size_3</md-icon>
                    </md-icon-button>

                    <!-- Slider -->
                    <input title="Slide to adjust size" type="range" id="brushSizeSlider" min="1" max="50" value="10" @input="${this.updateBrushSize}" />
                  </div>
                </md-menu>

                <!-- Eraser Tool Button -->
                <md-icon-button title="Eraser (3)" @click = ${(e: MouseEvent, f: KeyboardEvent) => {this.eraserSelect(); this.handleToolKeyPress(f);}} class="iconbutton" id="eraserButton">
                  <md-icon alt="Eraser icon">Ink_eraser</md-icon>
                </md-icon-button>

                <!-- Eraser Tool Dropdown -->
                <md-menu positioning="popover" anchor="eraserButton" id="eraserDropdown">
                  <div class = "dropdown-row" draggable="false">
                    <!-- Precision Eraser -->
                    <md-text-button title="Erase stroke parts" @click=${(e: MouseEvent) => { this.selectEraserType(e, EraserType.Precision) }}>Precision Eraser</md-text-button>

                    <!-- Smart Eraser -->
                    <md-text-button title="Erase whole stroke" @click=${(e: MouseEvent) => { this.selectEraserType(e, EraserType.Smart)}}>Smart Eraser</md-text-button>
                  </div>

                  <hr class = "modal-divider-horizontal">
                  <div class = "dropdown-secondRow" draggable="false">
                    <!-- Small Eraser -->
                    <md-icon-button title="Small" @click="${(e: MouseEvent) => this.selectEraseSize(e, 2)}" >
                      <md-icon alt="Small Eraser Size">pen_size_1</md-icon>
                    </md-icon-button>

                    <!-- Medium Eraser -->
                    <md-icon-button title="Medium" @click="${(e: MouseEvent) => this.selectEraseSize(e, 5)}" >
                      <md-icon alt="Medium Eraser Size">pen_size_2<md-icon>
                    </md-icon-button>

                    <!-- Large Eraser -->
                    <md-icon-button title="Large" @click="${(e: MouseEvent) => this.selectEraseSize(e, 10)}" >
                      <md-icon alt="Large Eraser Size">pen_size_3<md-icon>
                    </md-icon-button>

                    <!-- Extra Large Eraser -->
                    <md-icon-button title="Extra Large" @click="${(e: MouseEvent) => this.selectEraseSize(e, 50)}" >
                      <md-icon alt="Extra Large Eraser Size">pen_size_4<md-icon>
                    </md-icon-button>

                    <input title="Slide to adjust size" type="range" id="EraseSizeSlider" min="1" max="300" value="10" @input="${this.updateEraseSize}">
                  </div>
                </md-menu>

                <!-- Shape Tool Button -->
                <md-icon-button title="Shape (4)" @click = ${(e: MouseEvent, f: KeyboardEvent) => {this.shapeSelect(); this.handleToolKeyPress(f);}} class="iconbutton" id="shapeButton">
                  <md-icon alt="Shape tool icon">shapes</md-icon>
                </md-icon-button>

                <!-- Shape Tool Dropdown -->
                <md-menu positioning="popover" anchor="shapeButton" id="shapeDropdown">
                  <div class="dropdown-row">
                    <!-- Rectangle -->
                    <md-icon-button title="Rectangle" id="rectangle-button" data-shape="rectangle" @click="${(e: MouseEvent) => { this.handleDropdownItemClick(e) }}">
                      <md-icon filled alt="Rectangle icon">rectangle</md-icon>
                    </md-icon-button>

                    <!-- Square -->
                    <md-icon-button title="Square" id="square-button" data-shape="square" @click="${(e: MouseEvent) => { this.handleDropdownItemClick(e) }}">
                      <md-icon filled alt="Square icon">square</md-icon>
                    </md-icon-button>

                    <!-- Circle -->
                    <md-icon-button title="Circle" id="circle-button" data-shape="circle" @click="${(e: MouseEvent) => { this.handleDropdownItemClick(e) }}">
                      <md-icon filled alt="Circle icon">circle</md-icon>
                    </md-icon-button>

                    <!-- Triangle -->
                    <md-icon-button title="Triangle" id="triangle-button" data-shape="triangle" @click="${(e: MouseEvent) => { this.handleDropdownItemClick(e) }}">
                      <md-icon filled alt="Triangle icon">change_history</md-icon>
                    </md-icon-button>
                  </div>
                </md-menu>

                <!-- Sticky Note Tool Button -->
                <md-icon-button title="Sticky note (5)" @click = ${(e: MouseEvent, f: KeyboardEvent) => {this._stickers(); this.handleToolKeyPress(f);}} class="iconbutton" id="stickerButton">
                  <md-icon alt="Sticky note icon">note_stack</md-icon>
                </md-icon-button>

                <!-- Text Tool Button -->
                <md-icon-button title="Text (6)" @click = ${(e: MouseEvent, f: KeyboardEvent) => {this._texting(); this.handleToolKeyPress(f);}} class="iconbutton" id="textButton">
                  <md-icon alt="Text tool icon">text_fields</md-icon>
                </md-icon-button>

                <!-- Insert Image Button -->
                <md-icon-button title="Insert image (7)" @click = ${(e: MouseEvent, f: KeyboardEvent) => {this._imaging(); this.handleToolKeyPress(f)}} class="iconbutton" id="imageButton">
                  <md-icon alt="Image icon">image</md-icon>
                </md-icon-button>

                <!-- Zoom In Button -->
                <md-icon-button title="Zoom in (Ctrl+=)" @click = ${(e: MouseEvent, f: KeyboardEvent) => { this.dispatchEvent(new ZoomInEvent()); this.handleToolKeyPress(f)}} class="iconbutton" id="zoomInButton">
                  <md-icon alt="Zoom in icon">zoom_in</md-icon>
                </md-icon-button>

                <!-- Zoom Out Button -->
                <md-icon-button title="Zoom out (Ctrl+-)" @click = ${(e: MouseEvent, f: KeyboardEvent) => { this.dispatchEvent(new ZoomOutEvent()); this.handleToolKeyPress(f)}} class="iconbutton" id="zoomOutButton">
                  <md-icon alt="Zoom out icon">zoom_out</md-icon>
                </md-icon-button>
              </ul>
            </div>
          </nav>
        </header>
      </div>
    `
  }

  connectedCallback() {
    super.connectedCallback();
    document.addEventListener('keydown', this.handleToolKeyPress.bind(this));
  }
  
  disconnectedCallback() {
    document.removeEventListener('keydown', this.handleToolKeyPress.bind(this));
    super.disconnectedCallback();
  }

  private handleToolKeyPress(event: KeyboardEvent) {
    if (event.ctrlKey && event.key === "z") {
      this.dispatchEvent(new UndoEvent);
    }
    if (event.ctrlKey && event.key === "y") {
      this.dispatchEvent(new RedoEvent);
    }
    if (event.key === "1") {
      if (this.activeTool != "selectButton") {
        this._selecting();
      }
    }
    if (event.key === "2") {
      if (this.activeTool != "penButton") {
        this._drawing();
      }
    }
    if (event.key === "3") {
      if (this.activeTool != "eraserButton") {
        this._erasing();
      }
    }
    if (event.key === "4") {
      if (this.activeTool != "shapeButton") {
        this._shapes();
      }
    }
    if (event.key === "5") {
      if (this.activeTool != "stickerButton") {
        this._stickers();
      }
    }
    if (event.key === "6") {
      if (this.activeTool != "textButton") {
        this._texting();
      }
    }
    if (event.key === "7") {
      if (this.activeTool != "imageButton") {
        this._imaging();
      }
    }
    if (event.ctrlKey && event.key === "=") {
      event.preventDefault();
      this.dispatchEvent(new ZoomInEvent);
    }
    if (event.ctrlKey && event.key === "-") {
      event.preventDefault();
      this.dispatchEvent(new ZoomOutEvent);
    }
    if (event.ctrlKey && event.key === "x") {
      event.preventDefault();
      this.clearWhiteboard();
    }
  }

  private _selecting() {
    store.dispatch(selectTool(Tool.Select));
    this.activeTool = "selectButton";
    this._toggleActive('selectButton');
  }

  private _drawing() {
    store.dispatch(selectTool(Tool.Pen));
    this.activeTool = "penButton";
    this._toggleActive('penButton');
  }

  private _erasing() {
    store.dispatch(selectTool(Tool.Eraser));
    this.activeTool = 'eraserButton';
    this._toggleActive('eraserButton');
  }

  private _shapes() {
    store.dispatch(selectTool(Tool.Shape));
    this.activeTool = "shapeButton";
    this._toggleActive('shapeButton');
  }

  private _stickers() {
    this.activeTool = "stickerButton";
    this._toggleActive('stickerButton');
  }
  
  private _texting(){
    store.dispatch(selectTool(Tool.Text));
    this.activeTool = "textButton";
    this._toggleActive('textButton');
  }

  private _imaging() {
    this.activeTool = "imageButton";
    this._toggleActive("imageButton");
  }

  private _toggleActive(buttonId: string) {
    const button = this.shadowRoot?.getElementById(buttonId) as HTMLButtonElement;
    if (button) {
      button.classList.toggle('active');

      const otherButtons = this.shadowRoot?.querySelectorAll('.iconbutton') as NodeListOf<HTMLButtonElement>;
      otherButtons.forEach((otherButton) => {
        if (otherButton.id !== buttonId) {
          otherButton.classList.remove('active');
        }
      });
    }
  }

   private updateColorPicked(e: InputEvent) {
    const colorInput = e.target as HTMLInputElement;
    const colorVal = colorInput.value;
    if (this.brushType == BrushType.Highlighter) {
      store.dispatch(selectHighlighterColor(colorVal));
    } else {
      store.dispatch(selectToolColor(colorVal));
    }
    const pickerIcon = this.shadowRoot?.getElementById("pickerButton") as HTMLElement;
    pickerIcon.style.color = colorInput.value;

}


  //update the erasor size based on the slider value input
  private updateEraseSize(e: InputEvent){
    const eraseSizeInput = e.target as HTMLInputElement;
    const eraseSizeValue: number = eraseSizeInput.valueAsNumber;
    store.dispatch(selectEraserSize(eraseSizeValue));
  }

  //get the input from slider, update the pen size from the input
  private updateBrushSize(e: InputEvent) {
    const brushSizeInput = e.target as HTMLInputElement;
    const brushSizeValue: number = brushSizeInput.valueAsNumber;
    store.dispatch(selectToolSize(brushSizeValue));
}



  static styles = css`

  

  .dropdown-content, .shapeTool-dropdown-content {
      display: none;
      position: absolute;
      background-color: #FFFFFF;
      border-radius: 11px;
      min-width: 160px;
      box-shadow:
      0 1px 1px hsl(0deg 0% 0% / 0.075),
      0 2px 2px hsl(0deg 0% 0% / 0.075),
      0 4px 4px hsl(0deg 0% 0% / 0.075),
      0 8px 8px hsl(0deg 0% 0% / 0.075),
      0 16px 16px hsl(0deg 0% 0% / 0.075)
    ;
      z-index: 1;
      display: flex;
      flex-direction: row;
      top: 120px;
    }

    .dropdown-row {
    overflow: hidden;
    display: flex;
    justify-content: space-around; /*Optional: Adds some space between the images */
  }

  .dropdown-content, .shapeTool-dropdown-content a:hover {
      background-color: #ddd;
    }

    .eraser-dropdown-content {
      display: none;
      position: absolute;
      background-color: #FFFFFF;
      border-radius: 11px;
      min-width: 160px;
      box-shadow:
      0 1px 1px hsl(0deg 0% 0% / 0.075),
      0 2px 2px hsl(0deg 0% 0% / 0.075),
      0 4px 4px hsl(0deg 0% 0% / 0.075),
      0 8px 8px hsl(0deg 0% 0% / 0.075),
      0 16px 16px hsl(0deg 0% 0% / 0.075)
    ;
      z-index: 1;
      display: flex;
      flex-direction: row;
      top: 120px;
    }

    .dropdown-secondRow{
      display: flex;
      flex-direction: row;
    }

    .secondDropdown{
      display: flex;
      flex-direction: row;
      justify-content: flex-start;
    }

    .dropdown-content a {
      //color: black;
      padding: 12px 16px;
      text-decoration: none;
      display: inline-flex
    }

    .dropdown-content a:hover {background-color: #ddd;}
    
    :host {
      /* max-width: 1280px; */
      margin: 0 /*auto*/;
      /* padding: 2rem; */
      text-align: center;
      display: flex;
      flex-direction: column;
    }

    nav ul {
      display: flex;
      gap: 1rem;
      margin: 0;
      padding: 15px;
      list-style: none;
    }

    .parent-container {
      display: flex;
      justify-content: center;
      
    }

    .top-bar {
      width: 100%;
      height: 60px;
      background-color: white;
      box-shadow: 0px 0px rgba(0, 0, 0, 0.1);
      padding-bottom: 0px;
      z-index: 1000;
    }

    .tool-bar {
      width: 99%;
      height: 50px;
      position:absolute;
      bottom: 0;
      box-shadow: 0px 0px rgba(0, 0, 0, 0.1);
      background-color: #EDF2FA;
      border-bottom: none;
      border-top: none;
      z-index: 999;
      user-select: none;
      border-radius: 30px;
      margin: auto;
    
    }

    .whiteboard {
      width: 100%;
      height: 900px;
      position: fixed;
      top: 110px;
      left: 0;
      // box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      z-index: 998;
    }
    
    .mainbutton {
      // border-radius: 8px;
      // border: 1px solid transparent;
      // padding: 0.2em 0.5em;
      // font-size: 1em;
      // font-weight: 500;
      // font-family: inherit;
      // background-color: #6495ED;
      // cursor: pointer;
      // transition: border-color 0.25s;
      // user-select: none;
      --md-filled-button-container-shape: 50px;
      --md-filled-button-label-text-font: system-ui;
      --md-sys-color-primary: #4285F4;
      --md-sys-color-on-primary: #FFFFFF;
      

      
    }
    
    .deletebutton {
      // border-radius: 11px;
      // border: 1px solid transparent;
      // padding: 0.2em 0.5em;
      // font-size: 1em;
      // font-weight: 500;
      // font-family: inherit;
      // background-color: #DC143C;
      // cursor: pointer;
      // transition: border-color 0.25s;
      // user-select: none;
      --md-filled-button-container-shape: 50px;
      --md-filled-button-label-text-font: system-ui;
      --md-sys-color-primary: #d2d2d2;
      --md-sys-color-on-primary: #FFFFFF;
    }

    .sharebutton {
      margin-left: auto;
      --md-filled-button-container-shape: 10px;
      --md-filled-button-label-text-font: system-ui;
      --md-sys-color-primary: #4285F4;
      --md-sys-color-on-primary: #FFFFFF;
    }

    .iconbutton {
      width: 40px;
      height: 40px;
      background-color: rgba(0, 0, 0, 0);
      border-radius: 50px;
      cursor: pointer;
      transition: background-color 0.3s;
      overflow: hidden;
      outline: none;
      text-align: center; /* Center the content horizontally */
      line-height: 40px; /* Center the content vertically */
    } 
    
    .iconbutton img {
      <!-- drop down panel for each icon-->
      width: 35px;
      height: 35px;
      object-fit: contain;
      display: block;
      border-radius: 50px;
      user-select: none;
      line-height: 40px;
    } 

    .iconbutton:hover {
      background-color: #d2d2d2;
      border-radius: 50px;
      outline: none;
      line-height: 40px;
    }

    .iconbutton.active {
      border: 1px solid transparent;
      background-color: #d2d2d2;
      border-radius: 50px;
      outline: none;
      line-height: 40px;
    }

    .text {
      color: white;
    }

    .text:hover {
      color:white;
    }

    .card {
      padding: 2em;
    }

    .read-the-docs {
      color: #888;
    }

    ::slotted(h1) {
      font-size: 3.2em;
      line-height: 1.1;
    }

    a {
      font-weight: 500;
      color: #646cff;
      text-decoration: inherit;
    }
    a:hover {
      color: #535bf2;
    }

    #rectangle-button {
  fill: none;
  stroke: currentColor;
  stroke-width: 2px;
}

    button {
      border-radius: 8px;
      border: 1px solid transparent;
      font-size: 1em;
      font-weight: 400;
      font-family: inherit;
      background-color: #1a1a1a;
      cursor: pointer;
      transition: border-color 0.25s;
      line-height: 40px;
    }

    @media (prefers-color-scheme: light) {
      a:hover {
        color: #747bff;
      }
      button {
        background-color: #f9f9f9;
      }
    }

    .material-symbols-outlined {
      color: black;
      font-size:1.6em;
      font-variation-settings:
      'FILL' 50,
      'wght' 500,
      'GRAD' -25,
      'opsz' 200
    }

    #blueColor{
      color:#2596be;
      fill: 1;
    }

    #greenColor{
      color:#a7d784;
      fill: 1;
    }

    #redColor{
      color:#f50405;
      fill: 1;
    }

    .modal-divider-horizontal {  
      height: 0.75px;  
      background-color: #d3d3d3;  
      border: none;  
  }  

  #pickerButton {
    color: #black;
  }

  md-icon[filled] {
    font-variation-settings: 'FILL' 1;
  }


  `

}

declare global {
  interface HTMLElementTagNameMap {
    'tool-bar': Toolbar
  }
}

