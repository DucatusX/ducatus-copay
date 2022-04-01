import StorageController from './storageController.js';

export default class ExtensionController {
    
    popIsOpen = false;
    height = 600;
    width = 375;
    topIndent = 75;
    extensionWindowId = undefined;

    reload() {
      chrome.runtime.reload();
    }

    async getDucxAddresses(cb) {
      const ducxAddresses = await StorageController.getDucxAddresses();

      cb(ducxAddresses);
    }

    async sendTx(tx) {
      await this.openExtension();
      
      await StorageController.setDucxTx(tx);
    }

    async openExtension() {
        const extensionWindow = await this.getExtensionWindow();
        
        if ( extensionWindow ) {
            return await this.focusExtensionWindow(extensionWindow.id);
        } 
    
        const { 
            screen 
        } = window;
        const {
            availTop,
            availWidth
        } = screen;
        const height = this.height;
        const width = this.width;
        const top = availTop + this.topIndent;
        const left = availWidth - width;
       
        const extension = await this.openExtensionWindow({
            url: 'index.html',
            type: 'popup',
            width,
            height,
            left,
            top
        });
    
        this.extensionWindowId = extension.id;
    }

    async getExtensionWindow() {
    
        return new Promise((resolve, reject) => {
            chrome.windows.getAll((windows) => {
                
                if ( windows ) {
                    const window = windows.find((win) => {
                        return (
                            win
                            && win.type === 'popup' 
                            && win.id === this.extensionWindowId
                        );
                    });
    
                    return resolve(window);
                }
                
                return resolve(null);
            });
        });
    }
    
    async focusExtensionWindow(extensionWindowID) {
        
        return new Promise((resolve, reject) => {
            chrome.windows.update(extensionWindowID, { focused: true }, () => {
                return resolve();
            });
        });
    }
    
    async openExtensionWindow(options) {
    
        return new Promise((resolve, reject) => {
            chrome.windows.create(options, (newWindow) => {
    
                return resolve(newWindow);
            });
        });
    }
    
    async openExtensionTab(options) {
    
        return new Promise((resolve, reject) => {
            chrome.tabs.create(options, (newTab) => {
            
                return resolve(newTab);
            });
        });
    }

};