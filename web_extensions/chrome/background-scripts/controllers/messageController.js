import ExtensionController from "./extensionController.js";

export default class MessageController {
    
    extensionController = new ExtensionController();

    start() {
       this.onMessage();
       console.log("Message controller is started");
    }

    onMessage() {
        chrome.runtime.onMessageExternal.addListener((request, sender, sendResponse) => {
            const { method, tx } = request;
           
            switch(method) {
              case "OPEN_EXTENSION":
                  this.extensionController.openExtension();
                  break;

              case "GET_DUCX_ADDRESSES":
                  this.extensionController.getDucxAddresses((ducxAddresses) => {

                    if (ducxAddresses && ducxAddresses.length) { 
                      sendResponse({
                        response: {
                          status: 'success',
                          ducxAddresses
                        }
                      });
                    } else {
                      sendResponse({
                        response: {
                          status: 'error',
                          message: 'Ducx addresses is not exists.'
                        }
                      });

                      this.extensionController.openExtension();
                    }
                  });

                  break;
              
              case "SENT_TX":
                  this.extensionController.sendTx(tx);

                  sendResponse({
                    response: {
                      status: 'success'
                    }
                  });
                  break;

              default:
                sendResponse({
                  response: {
                      status: 'error',
                      message: 'Method is not exists'
                  }
                });
                break;
          }
        });
    }

};