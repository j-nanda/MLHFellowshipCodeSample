export class ZoomOutEvent extends Event {
    constructor() {
        super('zoomOut', { bubbles: true, composed: true});
    }
}