export class RedoEvent extends Event {
    constructor() {
        super('redo', { bubbles: true, composed: true});
    }
}
