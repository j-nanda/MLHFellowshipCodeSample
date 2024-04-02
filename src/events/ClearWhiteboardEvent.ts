export class ClearWhiteboardEvent extends Event {
    constructor() {
        super('clear-whiteboard', { bubbles: true, composed: true});
       
    }
    
}