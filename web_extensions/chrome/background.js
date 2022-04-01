let extensionWindowId = undefined;

function initialize() {
    // some services
}

function reload() {
    chrome.runtime.reload();
}

async function getExtensionWindow() {
    
    return new Promise((resolve, reject) => {
        chrome.windows.getAll((windows) => {
            
            if ( windows ) {
                const window = windows.find((win) => {
                    return (
                        win
                        && win.type === 'popup' 
                        && win.id === extensionWindowId
                    );
                });

                return resolve(window);
            }
            
            return resolve(null);
        });
    });
}

async function focusExtensionWindow(extensionWindowID) {
    
    return new Promise((resolve, reject) => {
        chrome.windows.update(extensionWindowID, { focused: true }, () => {
            return resolve();
        });
    });
}

function openExtensionWindow(options) {

    return new Promise((resolve, reject) => {
        chrome.windows.create(options, (newWindow) => {

            return resolve(newWindow);
        });
    });
}

function openExtensionTab(options) {

    return new Promise((resolve, reject) => {
        chrome.tabs.create(options, (newTab) => {
        
            return resolve(newTab);
        });
    });
}

async function openExtension() {
    const extensionWindow = await getExtensionWindow();
    
    if ( extensionWindow ) {
        return await focusExtensionWindow(extensionWindow.id);
    } 

    const { 
        screen 
    } = window;
    const {
        availTop,
        availWidth
    } = screen;
    const height = 600;
    const width = 375;
    const top = availTop + 75;
    const left = availWidth - width;
   
    const extension = await openExtensionWindow({
        url: 'index.html',
        type: 'popup',
        width,
        height,
        left,
        top
    });

    extensionWindowId = extension.id;
}

chrome.runtime.onInstalled.addListener((event) => {
    const { reason: eventType } = event;

    if ( 
        eventType === 'install' 
        || eventType === "update" 
    ) {
        openExtension();
    }
});

initialize();