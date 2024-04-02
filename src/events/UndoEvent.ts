export class UndoEvent extends Event {
    constructor() {
        super('undo', { bubbles: true, composed: true});
    }
}
