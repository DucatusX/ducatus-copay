export default class StorageController {
    
  static getDucxAddresses() {

    return new Promise((resolve, reject) => {
      chrome.storage.sync.get("ducxAddresses", (data) => {
        const { ducxAddresses } = data;
        
        resolve(ducxAddresses);
      })
    });
  }

  static setDucxTx(tx) {

    return new Promise((resolve, reject) => {
      chrome.storage.sync.set({ ducxTx: tx });
    });
  }

};