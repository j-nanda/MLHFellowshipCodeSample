import { LitElement, css, html } from 'lit'
import { customElement, query, property, state } from 'lit/decorators.js'
import { connect } from 'pwa-helpers/connect-mixin'
import { RootState, store } from './store'
import { Tool, BrushType, EraserType, Shape, WhiteboardState } from './slices/toolSlice';
import { onChildAdded, onValue, set, ref, push } from 'firebase/database';
import { newWhiteboardId, whiteboardRef, db, shapesRef, lastClearedRef} from './config/firebase';


// A line is from point (x0, y0) to (x1, y1)
export interface Line {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  color: string;
  width: number;
  type: BrushType;
  tool: Tool;
}

// A stroke is a sequence of lines, collected during a single drawing motion!
// (mouse-down -> click-and-drag -> mouse-up)
export interface Stroke {
  lines: Line[];
}

@customElement('my-whiteboard')
export class Whiteboard extends connect(store)(LitElement) {


  @query('#board') canvas!: HTMLCanvasElement;
  @state() textInput!: HTMLInputElement;
  @state() textObjects: { x: number, y: number, text: string, width: number, height: number }[] = [];
  @property({ type: Boolean }) textisDragging: boolean = false;
  @property({ type: Number }) textdragStartX: number = 0;
  @property({ type: Number }) textdragStartY: number = 0;
  @property({ type: Object }) mouseMoveListenerRef: any;
  @property({ type: Object }) mouseDownListenerRef: any;
  @property({ type: Object }) mouseUpListenerRef: any;
  @property({ type: Object }) touchMoveListenerRef: any;
  @property({ type: Object }) touchDownListenerRef: any;
  @property({ type: Object }) touchUpListenerRef: any;
  
  @property({ type: Object }) prevPointRef: any;
  @state() selectedTool: Tool = Tool.Select;
  @state() toolColor: string = '#000000';
  @state() highlighterColor: string = '#ffff00';
  @state() toolSize: number = 5;
  @state() highlighterSize: number = 5;
  @state() brushType: BrushType = BrushType.Pen;
  @state() eraserType: EraserType = EraserType.Precision;
  @state() eraserSize: number = 5;

  @state() selectedShape: Shape = Shape.Rectangle;

  // Current interaction state
  @state() isDrawing: boolean = false;
  @state() isPanning: boolean = false;;
  @state() isErasing: boolean = false;
  @state() isTexting: boolean = false;
  @state() drawingShape: boolean = false;

  @state() shapes: Array<{ shape: Shape, start: { x: number, y: number }, end: { x: number, y: number } }> = [];

  @state() shapeStart: { x: number, y: number } | null = null;

  @state() currentWhiteboardRef = whiteboardRef;
  @state() currentWhiteboardID = newWhiteboardId;

  @state() currentShapesRef = shapesRef;
  @state() currentLastClearedRef = lastClearedRef;
  // @state() currentTextRef = textRef;

  // Maintain a list of strokes
  // these are translated/transformed from "true" coordinates to "screen coordinates"
  @state() strokes: Stroke[] = [];    //keeps track of whats drawn, you need to clear this when you clear
  @state() selectedText: { x: number, y: number, text: string } | null = null;
  @state() undoHistory: Stroke[] = [];

  // While the user is drawing, keep track of the current stroke
  // When the user finishes drawing, push the stroke to the stroke history
  @state() currentStroke: Stroke = {
    lines: [],
  };

  @state() cursorX: number = 0;
  @state() cursorY: number = 0;

  @state() prevCursorX: number = 0;
  @state() prevCursorY: number = 0;

  // How much to translate the X and Y coordinates based on panning
  @state() offsetX: number = 0;
  @state() offsetY: number = 0;

  // How much to scale drawings based on zooming
  @state() scale: number = 1;

  @state() private shareIsOpen = false;
  
  //step for zooming in and out
  @state() step: number = 0.25;

  //set a max and min for zoom 
  @state() minScale: number = 0.25;
  @state() maxScale: number = 2;

  
  stateChanged(state: RootState) {
    if (this.brushType == BrushType.Highlighter) {
      this.highlighterColor = state.toolSlice.highlighterColor;
      this.highlighterSize = state.toolSlice.highlighterSize;
    } else {
      this.toolColor = state.toolSlice.toolColor;
      this.toolSize = state.toolSlice.toolSize;
    }
    this.selectedTool = state.toolSlice.selectedTool;
    this.brushType = state.toolSlice.brushType;
    this.eraserType = state.toolSlice.eraserType;
    this.eraserSize = state.toolSlice.eraserSize;
    this.updateCursorVisibility();
    this.updateEraserCursorSize();
    this.handleMouseEnter();
    //this.updateTextCursorVisibility();
    this.activateTextTool();
    this.selectedShape = state.toolSlice.selectedShape;
  }

  whiteboardIDChange(newID: string) {
    if (this.currentWhiteboardID != newID) {
      this.strokes = [];
      this.currentWhiteboardID = newID;
      this.currentWhiteboardRef = ref(db, `whiteboards/${newID}/strokes`);
      this.currentShapesRef = ref(db, `whiteboards/${newID}/shapes`);
      this.currentLastClearedRef = ref(db, `whiteboards/${newID}/lastCleared`);
      this.childAdded();
      this.redrawCanvas();
    }
  }

  public async loadWhiteboardFromFile() {
    console.log("load whiteboard from file");
    // Prompt the user to select a file
    const [fileHandle] = await window.showOpenFilePicker();
    
    // Get the file contents as a Blob
    const file = await fileHandle.getFile();
    const blob = await file.text();
    
    // Parse the JSON data
    const whiteboardData = JSON.parse(blob);
    
    // Extract the whiteboard state from the data
    const { selectedText, textObjects, strokes, shapes } = whiteboardData;
    
    // Update the whiteboard state with the loaded data
    this.selectedText = selectedText;
    this.textObjects = textObjects;
    this.strokes = strokes;
    this.shapes = shapes;
    
    // Redraw the canvas to reflect the loaded content
    this.redrawCanvas();
  }


  public getWhiteboardDataAsBlob() {
    // current state with text,
    console.log("text on here is", this.textObjects)
    const state = {
      selectedText: this.selectedText, // This is an example, adjust according to your needs
      
      textObjects: this.textObjects,
      strokes: this.strokes,
      shapes: this.shapes
      // Add any other state variables you need to capture
    };
  
    // Serialize the state
    const serializedState = JSON.stringify(state);
  
    // Convert the serialized state into a Blob
    const blob = new Blob([serializedState], {type: 'application/json'});
  
    return blob;
  }
  

  public shareWhiteboard() {
    this.shareIsOpen = !this.shareIsOpen;
  }

  public closeShare() {
    this.shareIsOpen = false;
  }


  render() {
    return html`
        <canvas id="board" width=${window.innerWidth - 10} height=${window.innerHeight - 120}></canvas>
        <div class="share" style="display: ${this.shareIsOpen ? 'block' : 'none'}">
          <div class="dropdown-topRow">
          <button @click = ${(e: MouseEvent) => {this.closeShare()}} class="closebutton" id="closeButton">
            <md-icon> close alt="close" draggable="false"</md-icon>
          </button>
          </div>
          <div class="dropdown-firstRow">
            <h3 class="h3">Current Whiteboard ID: ${this.currentWhiteboardID}</h3>
            <button @click = ${(e: MouseEvent) => {this.copyText(e)}} class="iconbutton" id="copyButton" title="Copy link">
              <md-icon> content_copy alt="Copy icon" draggable="false"</md-icon>
            </button>
          </div>
          <div class="dropdown-secondRow">
          <h3 class="h3">Join Session: </h3>
          <input type="text" id="textbox" class="custom-textbox" placeholder="Enter Whitebord ID" @keypress=${(e: KeyboardEvent) => this.handleKeyPress(e)}>
          </div>
        </div>
        <div id="eraserCursor"></div>
        <div id="penCursor">
          <md-icon> edit alt="Pen icon" draggable="false"</md-icon>
        </div>
        <!-- Zoom Scale Indicator -->
        <button title="Reset zoom" @click=${() => this.handleZoomReset()} class="zoomIndicator">${Math.round(this.scale * 100)}%</button>
    `
  }

  private handleZoomReset() {
    if (this.scale == 1) {
      return;
    }

    this.resetZoomPan();
    this.redrawCanvas();
  }

  private handleKeyPress(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      const inputElement = event.target as HTMLInputElement;
      const enteredText = inputElement.value;
      inputElement.value = '';

      this.whiteboardIDChange(enteredText);

      event.preventDefault();
    }
}

  private copyText(e: MouseEvent) {
    if (this.currentWhiteboardID !== null) {
      const textCopy = this.currentWhiteboardID;
      navigator.clipboard.writeText(textCopy)
    }
  }

  private resizeCanvas() {
    if (this.canvas) {
      this.canvas.width = window.innerWidth - 10;
      this.canvas.height = window.innerHeight - 120;
    }
  }

  // Convert "true" coordinates to "screen" coordinates
  private toScreenX(trueX: number) {
    return (trueX + this.offsetX) * this.scale;
  }

  private toScreenY(trueY: number) {
    return (trueY + this.offsetY) * this.scale;
  }

  private toScreenLine(trueLine: Line): Line {
    return {
      x0: this.toScreenX(trueLine.x0),
      y0: this.toScreenY(trueLine.y0),
      x1: this.toScreenX(trueLine.x1),
      y1: this.toScreenY(trueLine.y1),
      color: trueLine.color,
      width: trueLine.width,
      type: trueLine.type,
      tool: trueLine.tool
    }
  }

  // Convert "screen" coordinates to "true" coordinates
  private toTrueX(screenX: number) {
    return (screenX / this.scale) - this.offsetX;
  }

  private toTrueY(screenY: number) {
    return (screenY / this.scale) - this.offsetY;
  }

  private trueHeight() {
    return this.canvas.clientHeight / this.scale;
  }

  private trueWidth() {
    return this.canvas.clientWidth / this.scale;
  }

  public clearCanvas() {
    const ctx = this.canvas.getContext("2d")
    if (!ctx) return;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  //create a new function which clears the canvas and erases the strokes,
  //you have to reset the panning and zooming, reset all the strokes 
  public clearWhiteboard() { //
    set(this.currentLastClearedRef, Date.now()).then(() => console.log("pushed value"))
    this.clearCanvas();
    this.resetZoomPan();
    this.clearStrokes();
    this.clearTextObjects();
  }


  private resetZoomPan() {
    this.offsetX = 0;
    this.offsetY = 0;
    this.scale = 1;
  }

  private clearStrokes() {
    this.strokes = [];
    set(this.currentWhiteboardRef, []);
    set(this.currentShapesRef,[]);
    // set(this.currentTextRef,[])

  }

  private clearTextObjects(){
    this.textObjects = [];
  }

  private redrawCanvas() {
    this.clearCanvas();
    this.clearTextObjects();
    this.drawAllShapes();
    this.strokes.forEach(stroke => {
      this.drawStroke(stroke);
    })
    this.drawTextObjects();
    
  }

  private drawStroke(stroke: Stroke) {
    stroke.lines.forEach(line => {
      if (line.tool == Tool.Pen) {
        this.drawLine(this.toScreenLine(line))
      }
      else if (line.tool == Tool.Eraser) {
        this.eraseStrokes(this.toScreenLine(line))
      }
    })
  }

  private drawLine(line: Line) {
    const ctx = this.canvas.getContext("2d");
    if (!ctx) {
      console.error("no context!");
      return;
    };

    const controlPointX = (line.x0 + line.x1) / 2;
    const controlPointY = (line.y0 + line.y1) / 2;

    const originalLineCap = ctx.lineCap;
    const originalLineJoin = ctx.lineJoin;

    ctx.save();

    ctx.beginPath();
    ctx.imageSmoothingEnabled = true;

    switch (line.type) {
      case BrushType.Pen:
        ctx.lineWidth = line.width * this.scale;
        const segments = 10;

        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        for (let i = 1; i <= segments; i++) {
          const t = i / segments;

          // Interpolate between the current and previous points
          const x = (1 - t) * line.x0 + t * line.x1;
          const y = (1 - t) * line.y0 + t * line.y1;

          if (i === 1) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }

        ctx.strokeStyle = line.color;
        ctx.moveTo(line.x0, line.y0);
        ctx.quadraticCurveTo(controlPointX, controlPointY, line.x1, line.y1);
        ctx.stroke();
        ctx.fillStyle = line.color;
        break;

      case BrushType.Highlighter:
        ctx.globalAlpha = 0.4;
        const highlighterWidth = line.width * this.scale * 8;
        const numRectangles = 30;
  
        ctx.fillStyle = line.color;
  
        const dx = line.x1 - line.x0;
        const dy = line.y1 - line.y0;
        const dist = Math.sqrt(dx ** 2 + dy ** 2);

        const angle = Math.atan2(dy, dx);

        for (let i = 0; i < numRectangles; i++) {

          const rectWidth = dist / numRectangles;
          const rectX = line.x0 + i * rectWidth * Math.cos(angle);
          const rectY = line.y0 + i * rectWidth * Math.sin(angle);

          ctx.beginPath();
          ctx.rect(rectX, rectY - highlighterWidth / 2, rectWidth, highlighterWidth);
          ctx.fill();
        }

        ctx.globalAlpha = 1;
        break;

      case BrushType.Calligraphy:
        const distance = Math.sqrt((line.x1 - line.x0) ** 2 + (line.y1 - line.y0) ** 2);
        const speedFactor = 0.06;

        const sizeAdjustmentFactor = 0.2;

        const targetWidth = Math.min(line.width * this.scale, Math.max(1, line.width * this.scale * distance * speedFactor));

        ctx.lineWidth += (targetWidth - ctx.lineWidth) * sizeAdjustmentFactor;

        ctx.strokeStyle = line.color;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.moveTo(line.x0, line.y0);
        ctx.quadraticCurveTo(controlPointX, controlPointY, line.x1, line.y1);
        ctx.stroke();
        ctx.lineCap = originalLineCap;
        ctx.lineJoin = originalLineJoin;
        break;

      case BrushType.Glow:
        ctx.lineWidth = line.width * this.scale;
        const seg = 10;

        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        for (let i = 1; i <= seg; i++) {
          const t = i / seg;

          // Interpolate between the current and previous points
          const x = (1 - t) * line.x0 + t * line.x1;
          const y = (1 - t) * line.y0 + t * line.y1;

          if (i === 1) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }

        ctx.strokeStyle = line.color;
        ctx.shadowColor = line.color;
        ctx.shadowBlur = 10;
        ctx.moveTo(line.x0, line.y0);
        ctx.quadraticCurveTo(controlPointX, controlPointY, line.x1, line.y1);
        ctx.stroke();
        ctx.fillStyle = line.color;
        ctx.shadowColor = 'rgba(0, 0, 0, 0)';
        ctx.shadowBlur = 0;
        break;
    }
    ctx.restore();

  }

  firstUpdated() {
    document.oncontextmenu = function () {
      return false;
    }
    this.canvas.removeEventListener("mousedown", this.mouseDownListenerRef);
    this.initCanvasSizeListener();
    this.initMouseMoveListener();
    this.initMouseDownListener();
    this.initMouseUpListener();
    this.initMouseWheelListener();
    this.updateCursorVisibility();
    //this.updateTextCursorVisibility();
    this.initMouseLeaveListener();
    this.initMouseEnterListener();
    this.childAdded();
    this.initTouchMoveListener();
    this.initTouchDownListener();
    this.initTouchUpListener();
  }

  /**
   * Activating the text tool by creating an input field for entering text. 
   * It sets up the input field's style and adds event listeners for handling text input.
   */
  private activateTextTool(){
    if(this.selectedTool != Tool.Text){
      //console.log("text tool is unactive")
      this.deactivateTextTool();
      return;
    };
    const bounds = this.canvas.getBoundingClientRect();
    const x = this.cursorX + bounds.left;
    const y = this.cursorY + bounds.top;
      this.textInput = document.createElement('input');
      
      this.textInput.type = 'text';
      this.textInput.style.position = 'absolute';
      this.textInput.style.left = `${x}px`;
      this.textInput.style.top = `${y}px`;
      this.textInput.style.zIndex = '100';
      this.textInput.style.outline = 'none';
      this.textInput.style.border = 'none';
      this.textInput.style.backgroundColor = 'transparent';
      document.body.appendChild(this.textInput);
      console.log(this.textInput)
      this.textInput.focus();
      //Make sure to use arrow link, without arrow link, this.handle canvas click will only refer to the strict mode!!!!!
      //big mistake!!
      this.canvas.addEventListener('click', (event)=>this.handleCanvasClick(event));
      //this.textInput.addEventListener('keydown', this.handleTextInput);
      
      console.log("activate text tool to the end!")

  }


  /**
   * it creates a new text object at the specified position with the entered text.
   *  It then clears the text input value and removes focus from the input field.
   */
  private handleTextInput(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      const text = this.textInput.value;
      const x = parseInt(this.textInput.style.left || '0');
      const y = parseInt(this.textInput.style.top || '0');
      this.createTextObject(x, y, text);
      this.textInput.value = '';
      this.textInput.blur();
    }
  }

  private createTextObject(x: number, y: number, text: string) {
    const ctx = this.canvas.getContext("2d");
    if (!ctx) {
      console.error("no context!");
      return;
    };
    const textObject = {
      x,
      y,
      text,
      width: ctx.measureText(text).width + 10,
      height: 20
    };
    this.textObjects.push(textObject);
    this.drawTextObjects();
  }

  private drawTextObjects() {
    
    const ctx = this.canvas.getContext("2d");
    if (!ctx) {
      console.error("no context!");
      return;
    };
    //ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    //ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    if(this.textObjects.length === 0){
      return;
    };
    const textObj = this.textObjects[this.textObjects.length - 1];
    //this.textObjects.forEach(textObj => {
      if(textObj){
        ctx.font = '20px Arial';
        ctx.fillStyle = 'black';
        ctx.fillText(textObj.text, textObj.x  , textObj.y - 120);
        this.selectedText = textObj;
        console.log("the selected text is: "+this.selectedText)
        //console.log(this.textisDragging)
      if(textObj ===this.selectedText && this.textisDragging){
        ctx.strokeStyle = 'steelblue'; // Set the border color to light blue
        ctx.lineWidth = 2; // Set the border width
        ctx.strokeRect(textObj.x, textObj.y - 30, ctx.measureText(textObj.text).width + 10, 30); // Draw the border
      }
      }
      

   // });
    console.log("drawTextObjects is reached! ")
  }

  private clearTextInputRegion(x: number, y: number, width: number, height: number) {
    const ctx = this.canvas.getContext("2d");
    if (!ctx) {
        console.error("no context!");
        return;
    }
    ctx.clearRect(x, y, width, height);
}


  private deactivateTextTool(){
    if (this.textInput && this.textInput.parentNode) {
      this.textInput.parentNode.removeChild(this.textInput);
    }
    this.canvas.removeEventListener('click', this.handleCanvasClick);
  }


  /**
   * determines the position for the text input field 
   */
  private handleCanvasClick(event: MouseEvent) {
    //if(this.selectedTool === Tool.Text){
      
      const x = event.clientX;
      const y = event.clientY ;
      //console.log("reached handleCanvasClick")
      this.textInput.style.left = `${x + 10}px`; 
      this.textInput.style.top = `${y + 10}px`; 
      this.textInput.focus();
      
      this.textInput.addEventListener('keydown', (event) => this.handleTextInput(event));
    //}
    
  }

  private childAdded() {
    onChildAdded(this.currentWhiteboardRef, (data) => {
      console.log("Adding data: ", data.val())
      this.strokes.push(data.val())
      this.redrawCanvas();
    });

    onChildAdded(this.currentShapesRef, (data) => {
      console.log("Adding shapes data: ", data.val())
      this.shapes.push(data.val())
      this.redrawCanvas();
    });

    onValue(this.currentLastClearedRef, () => {
      this.clearCanvas();
      this.resetZoomPan();
      this.clearStrokes();
      this.clearTextObjects();
    })


    // onChildAdded(this.currentTextRef, (data) => {
    //   console.log("Adding text data: ", data.val())
    //   this.shapes.push(data.val())
    //   this.redrawCanvas();
    // });
  }

  private updateCursorVisibility() {
    const eraserCursor = this.shadowRoot?.getElementById('eraserCursor') as HTMLDivElement;
    const penCursor = this.shadowRoot?.getElementById('penCursor') as HTMLDivElement;
    if (this.selectedTool === Tool.Eraser) {
      penCursor.style.display = 'none';
      eraserCursor.style.display = 'block';
    } else if (this.selectedTool === Tool.Pen) {
      eraserCursor.style.display = 'none';
      penCursor.style.display = 'block';
    } else {
      eraserCursor.style.display = 'none';
      penCursor.style.display = 'none';
    }
  }

  private updateTextCursorVisibility(){
    const board = this.shadowRoot?.getElementById('board') as HTMLCanvasElement;
    if(this.selectedTool === Tool.Text){
      board.style.cursor = 'text';
    } else board.style.cursor = 'default';
  }

  private handleMouseEnter() {
      const eraserCursor = this.shadowRoot?.getElementById('eraserCursor') as HTMLDivElement;
      const penCursor = this.shadowRoot?.getElementById('penCursor') as HTMLDivElement;
      if (this.selectedTool === Tool.Eraser) {
        penCursor.style.display = 'none';
        eraserCursor.style.display = 'block';
        this.canvas.style.cursor = 'none';
      } else if (this.selectedTool === Tool.Pen) {
        eraserCursor.style.display = 'none';
        penCursor.style.display = 'block';
        this.canvas.style.cursor = 'none';
      } else {
        eraserCursor.style.display = 'none';
        penCursor.style.display = 'none';
        this.canvas.style.cursor = 'default';
      }
      // if (this.selectedTool == Tool.Text) {
      //   this.canvas.style.cursor = 'text';
      // }
    
  }

  private handleMouseLeave() {
    const eraserCursor = this.shadowRoot?.getElementById('eraserCursor') as HTMLDivElement;
    const penCursor = this.shadowRoot?.getElementById('penCursor') as HTMLDivElement;
    eraserCursor.style.display = 'none';
    penCursor.style.display = 'none';
    this.canvas.style.cursor = 'default';
  }

  private initMouseEnterListener() {
    const mouseEnterListener = () => {
      this.handleMouseEnter();
    };

    this.canvas.addEventListener('mouseenter', mouseEnterListener);
  }

  private initMouseLeaveListener() {
    const mouseLeaveListener = () => {
      this.handleMouseLeave();
    };

    this.canvas.addEventListener('mouseleave', mouseLeaveListener);
  }

  private updateEraserCursorSize() {
    const eraserCursor = this.shadowRoot?.getElementById('eraserCursor') as HTMLDivElement;
    if (eraserCursor) {
      const cursorSize = this.eraserSize * this.scale;
      eraserCursor.style.setProperty('--eraser-size', `${cursorSize}px`);

      eraserCursor.style.left = `${this.cursorX - cursorSize / 2}px`;
      eraserCursor.style.top = `${this.cursorY - cursorSize / 2}px`;
    }
  }


  private eraseStrokes(line: Line) {
    const ctx = this.canvas.getContext("2d");
    if (!ctx) {
      console.error("no context!");
      return;
    };
     ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.lineWidth = line.width * this.scale;
    ctx.moveTo(line.x0, line.y0);
    ctx.lineTo(line.x1, line.y1);
    ctx.stroke();
    ctx.closePath();
    ctx.globalCompositeOperation = "source-over";

  //   this.shapes = this.shapes.filter(shape => {
  //     return !this.doesShapeIntersectWithRect(line.x1, line.y1, shape, this.eraserSize * 2, this.eraserSize * 2);
  // });



    // Don't delete commented code below
    // Might be useful later for smart eraser

    // this.strokes.forEach(stroke => {
    //   stroke.lines = stroke.lines.filter(line => {
    //     return !this.doesLineIntersectWithEraser(trueX, trueY, line);
    //   });
    // })

    // this.redrawCanvas();
  }

  private doesShapeIntersectWithRect(trueX: number, trueY: number, shape: { shape: Shape, start: { x: number, y: number }, end: { x: number, y: number } }, rectWidth: number, rectHeight: number) {
    const xMin = Math.min(shape.start.x, shape.end.x);
    const xMax = Math.max(shape.start.x, shape.end.x);
    const yMin = Math.min(shape.start.y, shape.end.y);
    const yMax = Math.max(shape.start.y, shape.end.y);
  
    const rectXMin = trueX - rectWidth / 2;
    const rectXMax = trueX + rectWidth / 2;
    const rectYMin = trueY - rectHeight / 2;
    const rectYMax = trueY + rectHeight / 2;
  
    if (rectXMax < xMin || rectXMin > xMax || rectYMax < yMin || rectYMin > yMax) {
      return false;
    }
  
    return true;

  
  }

  private smartErase(trueX: number, trueY: number) {
    const erasedStrokes = this.strokes.filter(stroke => {
      const intersect = stroke.lines.some(line => this.doesLineIntersectWithEraser(trueX, trueY, line));

      if (intersect) {
        this.undoHistory.push(stroke);
      }

      return !intersect;
    });

    this.strokes = erasedStrokes;

    this.redrawCanvas();
  }

  private doesLineIntersectWithEraser(trueX: number, trueY: number, line: Line) {
    const eraserWidth = this.eraserSize * this.scale;
    const eraserHeight = this.eraserSize * this.scale;

    return this.doesSegmentIntersectWithRect(trueX, trueY, line, eraserWidth, eraserHeight);
  }

  private doesSegmentIntersectWithRect(trueX: number, trueY: number, stroke: Line, rectWidth: number, rectHeight: number) {
    const xMin = Math.min(stroke.x0, stroke.x1);
    const xMax = Math.max(stroke.x0, stroke.x1);
    const yMin = Math.min(stroke.y0, stroke.y1);
    const yMax = Math.max(stroke.y0, stroke.y1);

    const rectXMin = trueX - rectWidth / 2;
    const rectXMax = trueX + rectWidth / 2;
    const rectYMin = trueY - rectHeight / 2;
    const rectYMax = trueY + rectHeight / 2;

    if (rectXMax < xMin || rectXMin > xMax || rectYMax < yMin || rectYMin > yMax) {
      return false;
    }

    return true;
  }

  public zoomIn() {
    if (this.scale < this.maxScale) {
      this.scale += this.step;
      this.applyZoom();
    }
  }

  public zoomOut() {
    if (this.scale > this.minScale) {
      this.scale -= this.step;
      this.applyZoom();
    }
  }

  private applyZoom() {
    const ctx = this.canvas.getContext('2d');
    if (!ctx) {
      return;
    }
    // ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0);
    ctx.setTransform(1,0,0,1,0,0);
    this.redrawCanvas();
  }



  public undo() {
    const removedStroke = this.strokes.pop();
    if (removedStroke) {
      this.undoHistory.push(removedStroke);
      this.redrawCanvas();
    }
  }

  public redo() {
    const redoStroke = this.undoHistory.pop();
    if (redoStroke) {
      this.strokes.push(redoStroke);
      this.redrawCanvas();
    }
  }

  private initCanvasSizeListener() {
    window.addEventListener('resize', this.resizeCanvas, false);
  }

  private initMouseMoveListener() {
    const eraserCursor = this.shadowRoot?.getElementById('eraserCursor') as HTMLDivElement;
    const penCursor = this.shadowRoot?.getElementById('penCursor') as HTMLDivElement;
    //this.selectedText={ x: 0, y: 0, text: '' };
    const mouseMoveListener = (e: MouseEvent) => {
      const bounds = this.canvas.getBoundingClientRect();
      const point = { x: e.clientX - bounds.left, y: e.clientY - bounds.top }

      // Get the current position of the cursor
      this.cursorX = point.x;
      this.cursorY = point.y;

      // Translate the cursor position to remove the effects of panning/zooming
      const trueX = this.toTrueX(this.cursorX);
      const trueY = this.toTrueY(this.cursorY);

      // Get the previous cursor position
      const prevTrueX = this.toTrueX(this.prevCursorX);
      const prevTrueY = this.toTrueY(this.prevCursorY);

      const cursorSize = this.eraserSize * this.scale;

      eraserCursor.style.setProperty('--eraser-size', `${cursorSize}px`);
      eraserCursor.style.left = `${e.pageX - cursorSize / 2}px`;
      eraserCursor.style.top = `${e.pageY - cursorSize / 2}px`;

      const penSize = 15;
      penCursor.style.width = `${penSize}px`;
      penCursor.style.height = `${penSize}px`;
      penCursor.style.left = `${e.pageX - penSize / 2}px`;
      penCursor.style.top = `${(e.pageY - penSize / 2) - 10}px`;


      if (this.selectedTool == Tool.Eraser && this.isErasing) {
        this.canvas.style.cursor = 'none';
      }

      if (this.isDrawing && this.selectedTool == Tool.Pen) {
        // Log the true line to history, and draw the screen line
        this.canvas.style.cursor = 'none';
        if (this.brushType == BrushType.Highlighter) {
          const trueLine: Line = {
            x0: prevTrueX,
            y0: prevTrueY,
            x1: trueX,
            y1: trueY,
            color: this.highlighterColor,
            width: this.highlighterSize,
            type: this.brushType,
            tool: Tool.Pen
          }
          const screenLine: Line = {
            x0: this.prevCursorX,
            y0: this.prevCursorY,
            x1: this.cursorX,
            y1: this.cursorY,
            color: this.highlighterColor,
            width: this.highlighterSize,
            type: this.brushType,
            tool: Tool.Pen
          }
  
          this.currentStroke.lines.push(trueLine);
          this.drawLine(screenLine);
        } else {
          const trueLine: Line = {
            x0: prevTrueX,
            y0: prevTrueY,
            x1: trueX,
            y1: trueY,
            color: this.toolColor,
            width: this.toolSize,
            type: this.brushType,
            tool: Tool.Pen
          }
          const screenLine: Line = {
            x0: this.prevCursorX,
            y0: this.prevCursorY,
            x1: this.cursorX,
            y1: this.cursorY,
            color: this.toolColor,
            width: this.toolSize,
            type: this.brushType,
            tool: Tool.Pen
          }
  
          this.currentStroke.lines.push(trueLine);
          this.drawLine(screenLine);
        }

      } else if (this.isErasing && this.selectedTool == Tool.Eraser) {
        if (this.eraserType == EraserType.Precision) {
          const trueLine: Line = {
            x0: prevTrueX,
            y0: prevTrueY,
            x1: trueX,
            y1: trueY,
            color: "rgb(0 0 0 / 0%)",
            width: this.eraserSize,
            type: BrushType.Pen,
            tool: Tool.Eraser
          }
          const screenLine: Line = {
            x0: this.prevCursorX,
            y0: this.prevCursorY,
            x1: this.cursorX,
            y1: this.cursorY,
            color: "rgb(0 0 0 / 0%)",
            width: this.eraserSize,
            type: BrushType.Pen,
            tool: Tool.Eraser
          }
          this.currentStroke.lines.push(trueLine);
          this.eraseStrokes(screenLine);
        }
        else if (this.eraserType == EraserType.Smart) {
          this.smartErase(trueX, trueY);
        }

      } else if (this.isPanning) {
        // Modify the offsets
        this.offsetX += (this.cursorX - this.prevCursorX) / this.scale;
        this.offsetY += (this.cursorY - this.prevCursorY) / this.scale;
        this.redrawCanvas();
      } else if (this.isTexting && this.selectedTool == Tool.Text){
        //when selecting no text
        if(!this.textisDragging){
          console.log("mouse is moving for text tool")
          return;
        };
          if(this.textisDragging && this.selectedText !== null){
            //console.log(this.selectedText)
            console.log("reached")
            const x = prevTrueX;
            console.log(x);
            const y = prevTrueY;
            const dx = trueX;
            const dy = trueY;
            console.log(this.selectedText);
            this.selectedText.x += dx;
            this.selectedText.y += dy;
            this.textdragStartX = x;
            this.textdragStartY = y;
            console.log("reached the mousemove for text")
            this.drawTextObjects();
          }
        this.textisDragging = true;
        
      } else if (this.drawingShape) {
        console.log("moving and drawing shape");
        if (!this.shapeStart) {
          return;
        }
        // this.redrawShapes();
        const ctx = this.canvas.getContext('2d');
        if (!ctx) {
          return;
    
        }
        //  ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
         this.drawAllShapes();
         this.drawSingleShape(this.selectedShape, this.shapeStart, { x: trueX, y: trueY});
      }

      this.prevCursorX = this.cursorX
      this.prevCursorY = this.cursorY
    };

    this.mouseMoveListenerRef = mouseMoveListener;
    window.addEventListener("mousemove", mouseMoveListener);
  }

  private drawSingleShape(shape: Shape, start: { x: any; y: any; }, end: { x: any; y: any; }) {

    const ctx = this.canvas.getContext('2d');
    if (!ctx) {
      return;

    }
    //scale so shapes can zoom in and out
    let startX = start.x * this.scale + this.offsetX;
    let startY = start.y * this.scale + this.offsetY;
    let endX = end.x * this.scale + this.offsetX;
    let endY = end.y * this.scale + this.offsetY;

    let baseLength = Math.abs(endX - startX);


   
    let width = endX - startX;
    let height = endY - startY;

    ctx.lineWidth = 2;
    

    if (shape === Shape.Rectangle) {
        
        ctx.strokeRect(startX, startY, width, height);
    } else if (shape === Shape.Circle) {
        let radius = Math.sqrt(width * width + height * height);
        ctx.beginPath();
        ctx.arc(startX, startY, radius, 0, 2 * Math.PI);
        ctx.stroke();
    } else if (shape === Shape.Triangle) {
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(startX + baseLength, startY);
      ctx.lineTo(startX + baseLength / 2, startY - height);
      
      ctx.closePath();
      ctx.stroke();
    } else if (shape === Shape.Square) {
      let size = Math.max(Math.abs(width), Math.abs(height));
        width = height = size * (width < 0 ? -1 : 1); // Preserve the direction
        ctx.strokeRect(startX, startY, width, height);
      // ctx.strokeRect(startX, startY, height, height);
    }

  }

  private drawAllShapes() {
    const ctx = this.canvas.getContext('2d');
    if (!ctx) {
      return;
    }

     ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
     this.strokes.forEach(stroke => {
      this.drawStroke(stroke);
    })

    for (let shape of this.shapes) {
      this.drawSingleShape(shape.shape, shape.start, shape.end);
    }
}

  private initMouseUpListener() {
    
    const mouseUpListener = (e: MouseEvent) => {
      const bounds = this.canvas.getBoundingClientRect();
      const point = { x: e.clientX - bounds.left, y: e.clientY - bounds.top }

      // Get the current position of the cursor
      this.cursorX = point.x;
      this.cursorY = point.y;

      // Translate the cursor position to remove the effects of panning/zooming
      const trueX = this.toTrueX(this.cursorX);
      const trueY = this.toTrueY(this.cursorY);

      // if (this.isDrawing || this.isErasing) {
    // const mouseUpListener = () => {
      if ((this.isDrawing || this.isErasing) && this.currentStroke.lines.length != 0) {
        this.strokes.push(this.currentStroke)
        const newStrokeRef = push(this.currentWhiteboardRef);
        set(newStrokeRef, this.currentStroke);
        this.currentStroke = {
          lines: []
        }
       } else if (this.drawingShape && this.shapeStart) {
        const shape = { shape: this.selectedShape, start: {x: this.shapeStart.x, y: this.shapeStart.y}, end: { x: trueX, y: trueY } };
        this.shapes.push(shape);
        const newShapeRef = push(this.currentShapesRef);
        set(newShapeRef, shape);
        this.drawAllShapes();
        this.shapeStart = null;
      }

      if(this.isTexting|| this.selectedTool === Tool.Text){
        const ctx = this.canvas.getContext('2d');
        if (!ctx) {
          console.error("no context!");
          return;
        };
        
        this.textisDragging = false;
        ctx.strokeStyle = 'rgba(0, 0, 0, 0)'; 
        ctx.lineWidth = 0; 
        //this.activateTextTool();
        
        this.drawTextObjects();
        //console.log("mouseup is reached!")
        //this.activateTextTool();
        
      }

      this.isDrawing = false;
      this.isPanning = false;
      this.isErasing = false;
      this.isTexting = false;
      this.prevPointRef = null;

      this.drawingShape = false;

      const eraserCursor = this.shadowRoot?.getElementById('eraserCursor') as HTMLDivElement;
      const penCursor = this.shadowRoot?.getElementById('penCursor') as HTMLDivElement;

      if (this.selectedTool == Tool.Eraser) {
        penCursor.style.display = 'none';
        eraserCursor.style.display = 'block';
        this.canvas.style.cursor = 'none';
      } else if (this.selectedTool == Tool.Pen) {
        eraserCursor.style.display = 'none';
        penCursor.style.display = 'block';
        this.canvas.style.cursor = 'none';
      } else {
        penCursor.style.display = 'none';
        eraserCursor.style.display = 'none';
        this.canvas.style.cursor = "default";
      }
    }

    this.mouseUpListenerRef = mouseUpListener;
    window.addEventListener("mouseup", mouseUpListener);
  }



  private initMouseDownListener() {
    if (!this.canvas) return;

    const mouseDownListener = (e: MouseEvent) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      if (e.button == 0) {
        if (this.selectedTool == Tool.Pen) {
          this.isDrawing = true;
        } else if (this.selectedTool == Tool.Eraser) {
          this.isErasing = true;
        } else if (this.selectedTool == Tool.Shape) {
          

          this.drawingShape = true;  
          
          console.log("mouse down for shape");
          const currShape = Shape[this.selectedShape];
          console.log ("current shape being drawn", currShape);
          
          this.shapeStart = {x : e.clientX - rect.left, y : e.clientY - rect.top};
        }
        else if (this.selectedTool == Tool.Text) {
          this.isTexting = true;

          this.handleTextMouseDown(e);
        }
        if (this.selectedTool == Tool.Eraser || this.selectedTool == Tool.Pen) {
          this.canvas.style.cursor = 'none';
        } else {
          this.canvas.style.cursor = "default"
        }
      } else {
        this.isPanning = true;
        this.canvas.style.cursor = "move";

        const eraserCursor = this.shadowRoot?.getElementById('eraserCursor') as HTMLDivElement;
        const penCursor = this.shadowRoot?.getElementById('penCursor') as HTMLDivElement;

        eraserCursor.style.display = 'none';
        penCursor.style.display = 'none';
      }
    }

    this.mouseDownListenerRef = mouseDownListener;
    this.canvas.addEventListener("mousedown", mouseDownListener);
  }

  private handleTextMouseDown(e: MouseEvent){
          const x = e.clientX ;
          const y = e.clientY ;
          
            this.selectedText = this.textObjects.find(textObj =>
              x >= textObj.x &&
              x <= textObj.x + textObj.width &&
              y >= textObj.y - textObj.height &&
              y <= textObj.y
            ) || null;
            
            this.textisDragging = true;
            this.textdragStartX = x;
            this.textdragStartY = y;
          

          console.log("mousedown reached for text tool: "+ this.selectedText)
          
  }

  private initTouchUpListener() {
    const touchUpListener = (e: TouchEvent) => {
      if (this.isDrawing || this.isErasing) {
        this.strokes.push(this.currentStroke)
        this.currentStroke = {
          lines: []
        }
      }
      this.isDrawing = false;
      this.isPanning = false;
      this.isErasing = false;
      this.prevPointRef = null;

      const eraserCursor = this.shadowRoot?.getElementById('eraserCursor') as HTMLDivElement;
      eraserCursor.style.display = this.selectedTool === Tool.Eraser ? 'block' : 'none';

      if (this.selectedTool == Tool.Eraser) {
        this.canvas.style.cursor = 'none';
      } else {
        this.canvas.style.cursor = "default";
      }
    };

    this.touchUpListenerRef = touchUpListener;
    window.addEventListener("touchend", touchUpListener);
  }

  // ...

  private initTouchDownListener() {
    if (!this.canvas) return;

    const touchDownListener = (e: TouchEvent) => {

      if (e.touches.length === 1) {
        if (this.selectedTool == Tool.Pen) {
          this.isDrawing = true;
        } else if (this.selectedTool == Tool.Eraser) {
          this.isErasing = true;
        }
        if (this.selectedTool == Tool.Eraser) {
          this.canvas.style.cursor = 'none';
        } else {
          this.canvas.style.cursor = "default"
        }

        const eraserCursor = this.shadowRoot?.getElementById('eraserCursor') as HTMLDivElement;
        eraserCursor.style.display = 'none';

        const touch = e.touches[0];
        const bounds = this.canvas.getBoundingClientRect();
        const point = { x: touch.clientX - bounds.left, y: touch.clientY - bounds.top }
  
        // Initialize the cursor position for the new stroke
        this.cursorX = point.x;
        this.cursorY = point.y;
  
        // Translate the cursor position to remove the effects of panning/zooming
        const trueX = this.toTrueX(this.cursorX);
        const trueY = this.toTrueY(this.cursorY);
  
        // Initialize the previous cursor position
        this.prevCursorX = this.cursorX;
        this.prevCursorY = this.cursorY;
  
        // Log the starting point of the stroke
        this.currentStroke = {
          lines: [{
            x0: trueX,
            y0: trueY,
            x1: trueX,
            y1: trueY,
            color: this.toolColor,
            width: this.toolSize,
            type: this.brushType,
            tool: this.selectedTool
          }]
        };
  
      } else if (e.touches.length === 2) {
        // Handle multitouch events if needed
        // ...
      }

      // Prevent default touch behavior
      e.preventDefault();
    };

    this.touchDownListenerRef = touchDownListener;
    this.canvas.addEventListener("touchstart", touchDownListener);
  }


  private initTouchMoveListener() {
    const eraserCursor = this.shadowRoot?.getElementById('eraserCursor') as HTMLDivElement;

    const touchMoveListener = (e: TouchEvent) => {
      const touch = e.touches[0];
      const bounds = this.canvas.getBoundingClientRect();
      const point = { x: touch.clientX - bounds.left, y: touch.clientY - bounds.top }

      // Get the current position of the cursor
      this.cursorX = point.x;
      this.cursorY = point.y;

      // Translate the cursor position to remove the effects of panning/zooming
      const trueX = this.toTrueX(this.cursorX);
      const trueY = this.toTrueY(this.cursorY);

      // Get the previous cursor position
      const prevTrueX = this.toTrueX(this.prevCursorX);
      const prevTrueY = this.toTrueY(this.prevCursorY);

      const cursorSize = this.eraserSize * this.scale;

      eraserCursor.style.setProperty('--eraser-size', `${cursorSize}px`);
      eraserCursor.style.left = `${touch.pageX - cursorSize / 2}px`;
      eraserCursor.style.top = `${touch.pageY - cursorSize / 2}px`;

      if (this.selectedTool == Tool.Eraser && this.isErasing) {
        this.canvas.style.cursor = 'none';
      }

      if (this.isDrawing && this.selectedTool == Tool.Pen) {
        // Log the true line to history, and draw the screen line
        const trueLine: Line = {
          x0: prevTrueX,
          y0: prevTrueY,
          x1: trueX,
          y1: trueY,
          color: this.toolColor,
          width: this.toolSize,
          type: this.brushType,
          tool: Tool.Pen
        }
        const screenLine: Line = {
          x0: this.prevCursorX,
          y0: this.prevCursorY,
          x1: this.cursorX,
          y1: this.cursorY,
          color: this.toolColor,
          width: this.toolSize,
          type: this.brushType,
          tool: Tool.Pen
        }

        this.currentStroke.lines.push(trueLine);
        this.drawLine(screenLine);
      } else if (this.isErasing && this.selectedTool == Tool.Eraser) {
        if (this.eraserType == EraserType.Precision) {
          const trueLine: Line = {
            x0: prevTrueX,
            y0: prevTrueY,
            x1: trueX,
            y1: trueY,
            color: "rgb(0 0 0 / 0%)",
            width: this.eraserSize,
            type: BrushType.Pen,
            tool: Tool.Eraser
          }
          const screenLine: Line = {
            x0: this.prevCursorX,
            y0: this.prevCursorY,
            x1: this.cursorX,
            y1: this.cursorY,
            color: "rgb(0 0 0 / 0%)",
            width: this.eraserSize,
            type: BrushType.Pen,
            tool: Tool.Eraser
          }

          this.currentStroke.lines.push(trueLine);
          this.eraseStrokes(screenLine);
        } else if (this.eraserType = EraserType.Smart) {
          this.smartErase(trueX, trueY);
        }
      } else if (this.isPanning) {
        // Modify the offsets
        this.offsetX += (this.cursorX - this.prevCursorX) / this.scale;
        this.offsetY += (this.cursorY - this.prevCursorY) / this.scale;
        this.redrawCanvas();
      }

      this.prevCursorX = this.cursorX
      this.prevCursorY = this.cursorY
    };

    this.touchMoveListenerRef = touchMoveListener;
    window.addEventListener("touchmove", touchMoveListener);
  }

  private initMouseWheelListener() {
    
    const mouseWheelListener = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();

        const scaleAmount = -e.deltaY / 500;
        this.scale = this.scale * (1 + scaleAmount);


        // zoom the page
        const distX = e.pageX / this.canvas.clientWidth;
        const distY = e.pageY / this.canvas.clientHeight;

        const zoomX = this.trueWidth() * scaleAmount;
        const zoomY = this.trueHeight() * scaleAmount;
        this.offsetX -= zoomX * distX;
        this.offsetY -= zoomY * distY;
        this.redrawCanvas();
        return;
      }

      // pan the canvas
      this.offsetX += (-e.deltaX) / this.scale;
      this.offsetY += (-e.deltaY) / this.scale;

      this.updateEraserCursorSize();
      this.redrawCanvas();
    }

    window.addEventListener("wheel", mouseWheelListener, {passive: false});
  }

  static styles = css`
    :host {
      height: 100%;
      margin: 0 auto; /*
      width: 90vh;
      height: 100vh;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.5rem */;
      --md-dialog-headline-font: 'Roboto' sans-serif;
    }

    #deleteDialog {
      color: red;
    }

    canvas {
      background-color: white;
    }

    #eraserCursor {
      position: fixed;
      width: var(--eraser-size, 20px);
      height: var(--eraser-size, 20px);
      border-radius: 50%;
      background-color: transparent;
      border: 2px solid #000;
      pointer-events: none;
      display: none;
    }

    #penCursor {
      position: fixed;
      height: 20px;
      width: 20px;
      pointer-events: none;
    }

    ::slotted(h1) {
      font-size: 3.2em;
    }

    .h3 {
      user-select: none;
    }

    button {
      max-width: min-content;
      border-radius: 8px;
      border: 1px solid transparent;
      padding: 0.6em 1.2em;
      font-size: 1em;
      font-weight: 500;
      font-family: inherit;
      cursor: pointer;
      transition: border-color 0.25s, background-color 0.25s;
      align-items: center;
    }

    button:hover {
      border-color: transparent;
      background-color: transparent;
    }

    button:active {
      background-color: transparent;
    }

    button:focus,
    button:focus-visible {
      outline: none;
    }

    button::-moz-focus-inner {
      border: 0;
    }

    .iconbutton {
      width: 41px;
      height: 40px;
      background-color: rgba(0, 0, 0, 0);
      cursor: pointer;
      overflow: hidden;
      text-align: center; /* Center the content horizontally */
      line-height: 40px; /* Center the content vertically */
      position: relative;
      right: 13px;
      top: 5px;
    }

    .closebutton {
      width: 41px;
      height: 40px;
      background-color: rgba(0, 0, 0, 0);
      cursor: pointer;
      overflow: hidden;
      text-align: center; /* Center the content horizontally */
      line-height: 40px; /* Center the content vertically */
      position: absolute;
      right: 7px;
      top: -15px;
    }

    .share {
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
      0 16px 16px hsl(0deg 0% 0% / 0.075);
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      z-index: 1000;
      display: flex;
      top: 34%;
      left: 34%;
    }

    .zoomIndicator {
      position: absolute;
      top: 86%;
      left: 15px;
      text-align: center;
      background-color: #ddd;
      padding-top: 10px; 
      padding-bottom: 10px; 
      padding-left: 25px;
      padding-right: 25px;
      border-radius: 8px;
      user-select: none;
      font-size: 1em;
      font-weight: 500;
      font-family: inherit;
      opacity: 0.6;
      filter: alpha(opacity=60);
    }

    .zoomIndicator:hover {
      background-color: #cdcdcd;
      
    }

    .custom-textbox {
      background-color: #e0e0e0;
      border: 1px solid #ccc;
      border-radius: 5px;
      padding: 5px 10px;
      font-size: 16px;
      height: 20px;
      margin-top: 15px;
      margin-left: 8px;
    }

    .dropdown-topRow {
      padding: 5px 10px;
      display: flex;
      flex-direction: flex-end;
      align-items: right;
    }

    .dropdown-firstRow {
      padding: 5px 10px;
      display: flex;
      flex-direction: center;
    }

    .dropdown-secondRow {
      padding: 5px 10px;
      display: flex;
      flex-direction: center;
      position: relative;
      top: -20px;
    }
  `
}

export const selectedShape: Shape = Shape.Rectangle;

declare global {
  interface HTMLElementTagNameMap {
    'my-whiteboard': Whiteboard
  }
}
