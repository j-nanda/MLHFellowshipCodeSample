export class ShareEvent extends Event {
    constructor() {
        super('share', { bubbles: true, composed: true});
    }
    
}