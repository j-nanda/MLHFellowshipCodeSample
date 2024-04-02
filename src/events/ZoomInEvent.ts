export class ZoomInEvent extends Event {
    constructor() {
        super('zoomIn', { bubbles: true, composed: true});
    }
}
