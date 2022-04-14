import ExtensionController from "./extensionController.js";

export default class EventController {
    
    extensionController = new ExtensionController();

    start() {
       this.onInstalled();
    }

    onInstalled() {
        chrome.runtime.onInstalled.addListener((event) => {
            const { reason: eventType } = event;
        
            if ( 
                eventType === 'install' 
                || eventType === "update" 
            ) {
                this.extensionController.openExtension();
            }
        });
    }
};