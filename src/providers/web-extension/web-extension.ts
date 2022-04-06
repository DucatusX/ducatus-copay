import { Injectable } from '@angular/core';
import { WalletProvider } from '../../providers/wallet/wallet';
import { Logger } from '../logger/logger';
import { IncomingDataProvider } from '../../providers';
import { ProfileProvider } from '../../providers/profile/profile';

@Injectable()
export class WebExtensionsProvider {
  constructor(
    private logger: Logger,
    private walletProvider: WalletProvider,
    private profileProvider: ProfileProvider,
    private incomingDataProvider: IncomingDataProvider
  ) {
    this.logger.debug('WebExtensionsProvaider initialized');
    this.init();
  }

  init(): void {
   
    if ( !chrome || !chrome.storage ) {
      return;
    }

    chrome.storage.sync.get("ducxTx", (data) => {
      const { ducxTx } = data;

      if ( ducxTx ) {
        this.openTxPage(ducxTx);

        chrome.storage.sync.set({ducxTx: null}, function() {
          console.log('Value is set to null');
        });
      } 
    });

    chrome.storage.onChanged.addListener( (changes) => {
      const { ducxTx = {} } = changes;
      const { newValue } = ducxTx;
    
      if ( newValue ) {
        this.openTxPage(newValue);

        chrome.storage.sync.set({ducxTx: null}, function() {
          console.log('Value is set to null');
        });
      } 
    });
  }

  public async openTxPage(tx): Promise<void> {
    const { 
      from, 
      to, 
      amount
    } = tx;

    if ( !from || !to || !amount ) {
      return;
    }
  
    let walletId: number = undefined;
    const wallets = this.profileProvider.getWallets();

    for ( let i = 0; i < wallets.length; i++ ) {
      const wallet = wallets[i];
      const { 
        coin, 
        needsBackup,
        network,
        id
      } = wallet;
      
      if ( 
        coin === 'ducx' 
        && !needsBackup 
        && network !== "testnet" 
      ) {
        const address = await this.walletProvider.getAddress(wallet, false);
        
        if ( from === address ) {
          walletId = id;
        }
      }
    }

    if ( !walletId ) {
      return;
    }

    const redirectParameters: any = {
      activePage: 'ConfirmPage',
      amount,
      coin: 'DUCX',
      walletId
    };

    this.incomingDataProvider.redir(to, redirectParameters);
  }

  public async setDucxAddresses(wallets): Promise<void> {

    if ( !chrome || !chrome.storage ) { 
      return;
    }

    const ducxAddresses: string[] = [];

    for ( let i = 0; i < wallets.length; i++ ) {
      const wallet = wallets[i];
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
        ducxAddresses.push(address);
      }
    }
    
    chrome.storage.sync.set({ ducxAddresses });
  }

}
