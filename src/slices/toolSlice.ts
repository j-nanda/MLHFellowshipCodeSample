import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";

/*
 * Possible tools the user can select.
 */
export enum Tool {
    Select,
    Pen,
    Eraser,
    Shape,
    Text
}

/*
* Possible brush types for the pen tool.
*/
export enum BrushType {
    Pen,
    Highlighter,
    Calligraphy,
    Glow,
}
  
/*
* Possible eraser types for the eraser tool
*/
export enum EraserType {
    Precision,
    Smart,
}

  export enum Shape {
    Square,
    Rectangle,
    Circle,
    Triangle
}

// export interface WhiteboardState {
//     strokes: Stroke[],
//     textObjects: { x: number, y: number, text: string, width: number, height: number }[],
//     shapes: Array<{ shape: Shape, start: { x: number, y: number }, end: { x: number, y: number } }> 
//   }

/*
 * Store the currently selected whiteboard tool as global state.
 */

export interface ToolState {
    selectedTool: Tool,
    toolSize: number,
    highlighterSize: number,
    toolColor: string,
    highlighterColor: string,
    brushType: BrushType,
    eraserType: EraserType,
    eraserSize: number
    textSize: number
    selectedShape: Shape,
}

/*
 * Default to pen as the initially selected tool.
 */
const initialState: ToolState = {
    selectedTool: Tool.Select,
    toolSize: 5,
    highlighterSize: 5,
    toolColor: '#000000',
    highlighterColor: '#ffff00',
    brushType: BrushType.Pen,
    eraserType: EraserType.Precision,
    selectedShape: Shape.Rectangle,
    eraserSize: 5,
    textSize: 12,
}

/*
 * Redux state slice to store the currently selected whiteboard tool.
 */
export const toolSlice = createSlice({
    name: 'toolSlice',
    initialState,
    reducers: {

        /*
         * Reducer to change the selected tool.
         */
        selectTool: (state: ToolState, action: PayloadAction<Tool>) => {
            state.selectedTool = action.payload;
        },

        /*
         * Reducer to change the tool's size (linewidth).
         */
        selectToolSize: (state: ToolState, action: PayloadAction<number>) => {
            state.toolSize = action.payload;
        },

        selectHighlighterSize: (state: ToolState, action: PayloadAction<number>) => {
            state.highlighterSize = action.payload;
        },

        /*
         * Reducer to change the tool's color.
         * The string passed in the action should be a hex color string
         */
        selectToolColor: (state: ToolState, action: PayloadAction<string>) => {
            state.toolColor = action.payload;
        },

        selectHighlighterColor: (state: ToolState, action: PayloadAction<string>) => {
            state.highlighterColor = action.payload;
        },

        /*
        * Reducer to change the tool's brush type.
        */
        selectBrushType: (state: ToolState, action: PayloadAction<BrushType>) => {
            state.brushType = action.payload;
        },

        /*
        * Reducer to change the tool's eraser type
        */
        selectEraserType: (state: ToolState, action: PayloadAction<EraserType>) => {
            state.eraserType = action.payload;
        },

        /*
        * Reducer to change the size of the eraser.
        */
        selectEraserSize: (state: ToolState, action: PayloadAction<number>) => {
            state.eraserSize = action.payload;
        },

        /**
         * Reducer to change the size of the text.
         */
        selectTextSize: (state: ToolState, action: PayloadAction<number>) => {
            state.textSize = action.payload;
        },

        selectShape: (state: ToolState, action: PayloadAction<Shape>) => {
            state.selectedShape = action.payload;
          },
    }
})

export const { selectTool, selectToolSize, selectHighlighterSize, selectToolColor, selectHighlighterColor, selectBrushType, selectEraserType, selectEraserSize, selectShape, selectTextSize } = toolSlice.actions;

export default toolSlice.reducer
