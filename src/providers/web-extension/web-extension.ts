import { Injectable } from '@angular/core';
import { WalletProvider } from '../../providers/wallet/wallet';
import { Logger } from '../logger/logger';

@Injectable()
export class WebExtensionsProvider {
  private wallets;
  private ducxAddresses = [];
  private extension = null;

  constructor(
    private logger: Logger,
    private walletProvider: WalletProvider
  ) {
    this.logger.debug('WebExtensionsProvaider initialized');
    this.init();
  }

  init()  {
   
    if ( chrome && chrome.storage ) {
      return;
    } 

    this.extension.storage.sync.get("ducxTx", (data) => {
      const { ducxTx } = data;

      if ( ducxTx ) {
        this.openTxPage(ducxTx);
        this.extension.storage.sync.set({ducxTx: null}, function() {
          console.log('Value is set to null');
        });
      } 
    });

    this.extension.storage.onChanged.addListener( (changes) => {
      const { ducxTx = {} } = changes;
      const { newValue } = ducxTx;
    
      if ( newValue ) {
        this.openTxPage(newValue);
        this.extension.storage.sync.set({ducxTx: null}, function() {
          console.log('Value is set to null');
        });
      } 
    });
  }

  public openTxPage(tx) {
    console.log(tx);
  }

  public async setDucxAddresses(wallets) {
    this.wallets = wallets || [];
   
    for( let i = 0; i < this.wallets.length; i++ ) {
      const wallet = this.wallets[i];
      const { 
        coin, 
        needsBackup,
        network
      } = wallet;
      
      if ( 
        coin === 'ducx' 
        && !needsBackup 
        && network !== "testnet" 
      ) {
        const address = await this.walletProvider.getAddress(wallet, false);
        this.ducxAddresses.push(address);
      }
    }
    
    this.extension.storage.sync.set({ ducxAddresses: this.ducxAddresses });
  }

}
