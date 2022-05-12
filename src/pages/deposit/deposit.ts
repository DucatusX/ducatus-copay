import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { AlertController, NavController } from 'ionic-angular';
import _ from 'lodash';
import moment from 'moment';
import { 
  ApiProvider, Coin, 
  FilterProvider, Logger,  
  ProfileProvider, RateProvider, 
  TxFormatProvider, WalletProvider 
} from '../../providers';
import { DepositAddPage } from './deposit-add/deposit-add';

interface TxProperties {
  sending_amount: number;
  tx_hash: string;
  vout_number: number;
  user_duc_address: string;
  redeem_script: string;
  lock_time: number;
  private_path: string;
}

@Component({
  selector: 'page-deposit',
  templateUrl: 'deposit.html'
})

export class DepositPage {
  public depositsLoading = true;
  public deposits: any[] = [];
  public walletsGroups: any;
  public wallets: any;
  
  constructor(
    private alertCtrl: AlertController,
    private navCtrl: NavController,
    private httpClient: HttpClient,
    private profileProvider: ProfileProvider,
    private walletProvider: WalletProvider,
    private rateProvider: RateProvider,
    private filter: FilterProvider,
    private formatProvider: TxFormatProvider,
    private logger: Logger,
    private apiProvider: ApiProvider
  ) {}

  public async ngOnInit(): Promise<void> {
    const wallets = this.profileProvider.getWallets({ showHidden: true });
    this.walletsGroups = _.values(
      _.groupBy(
        _.filter(wallets, wallet => {
          return wallet.keyId != 'read-only';
        }),
        'keyId'
      )
    );
    this.wallets = await this.getWalletsInfoAddress('duc');

    await this.getDeposits();
  }

  private async getWalletsInfoAddress(coin: string): Promise<any> {
    let coins = [];
    const wallets = [];

    this.walletsGroups.forEach(keyID => {
      coins = _.concat(
        coins,
        keyID.filter(wallet => wallet.coin === coin.toLowerCase())
      );
    });

    for ( let i = 0; i < coins.length; i++ ) {
      const coin = coins[i];
      let address: string;

      try {
        address = await this.walletProvider.getAddress(coin, false);
      }
      catch {
       address = '';
      }

      wallets.push({ 
        wallet: coin, 
        address 
      });
    }

    return wallets;
  }

  private async getDeposits(): Promise<void> {
    const wallets = await this.getWalletsInfo('duc');
    const walletsResult = [];

    wallets.forEach(res => {
      if ( !walletsResult.includes(res.walletId) ) {
        walletsResult.push(res.walletId);
      }
    });

    const address = `${this.apiProvider.getAddresses().deposit}user/deposits/list/?wallet_ids=${walletsResult}`;
    // @ts-ignore
    const deposits: any[] = await this.httpClient
      .get(address)
      .toPromise();
    
    for ( let i = 0; i < deposits.length; i++ ) {
      const deposit = deposits[i];
    
      if ( deposit.amountDeposited ) {
        deposit.readyToWithdrawDate = moment(deposit.readyToWithdrawDate).format();
        deposit.createdAt = moment(deposit.createdAt).format();
        deposit.amountUnit = Number(this.formatProvider.satToUnit(deposit.amountDeposited, Coin.DUC));
        deposit.amountAdd = Number(this.formatProvider.satToUnit(deposit.amountToWithdraw, Coin.DUC)) - deposit.amountUnit;
        deposit.amountAdd = deposit.amountAdd.toFixed(2);
        deposit.amountAlt = await this.unitToFiat(deposit.amountDeposited);
        deposit.interestRate *= 100;
        deposit.executeRange = this.getTimePassed(
          deposit.createdAt,
          deposit.readyToWithdrawDate,
          deposit.daysToWithdraw
        );
      }
    }
    
    this.deposits = deposits as any[];
    this.depositsLoading = false;
  }

  public async unitToFiat(amount: number): Promise<number> {
    await this.rateProvider.whenRatesAvailable('duc');

    let amountAlt: number = this.rateProvider.toFiat(amount, 'USD', 'duc');
    amountAlt = this.filter.formatFiatAmount(amountAlt);

    return amountAlt;
  }

  public getTimePassed(
    depositDateCreated: string, 
    depositDateEnd: string,
    daysToWithdraw: string
  ): number {
    const createdAt: number = moment(depositDateCreated).valueOf();
    const endDate: number = moment(depositDateEnd).valueOf();
    const coefficient = 24 * 60 * 60 * 1000;
    let passedDays: number = (endDate - createdAt) / coefficient; // passed 5 (days)
    passedDays = Math.floor(passedDays);
    let passedDaysPercent = ((passedDays - Number(daysToWithdraw)) / passedDays) * 100; // passed 1 (%)
    passedDaysPercent = Math.trunc(passedDaysPercent) || 1;
    
    if ( Number(daysToWithdraw) < 1 ) {
      return 100;
    } else {
      return passedDaysPercent;
    }
  }

  public goToDepositAddPage(): void {
    this.navCtrl.push(DepositAddPage);
  }

  private async getAddress(wallet): Promise<string> {
    try {
      const address = await this.walletProvider.getAddressForDeposits(wallet, false);
      
      return address;
    } catch(e) {
      return null;
    } 
  }

  private async getWalletsInfo(coin): Promise<any> {
    let coins = [];
    const wallets = [];

    this.walletsGroups.forEach(keyID => {
      coins = _.concat(
        coins,
        keyID.filter(wallet => wallet.coin === coin.toLowerCase())
      );
    });

    for ( let i = 0; i < coins.length; i++ ) {
      const coin = coins[i];
      const address = await this.getAddress(coin);
      
      if ( address ) {
        wallets.push({
          walletId: coin.credentials.walletId,
          requestPubKey: coin.credentials.requestPubKey,
          wallet: coin,
          address
        });
      }
    }
    
    return wallets;
  }

  private showModal(type: string, id?: number, ducAmount?: number): void {
    const modalAnswers = {
      success: {
        title: '<img src="./assets/img/icon-complete.svg" width="42px" height="42px">',
        text: `You will get ${ducAmount || ''} Ducatus in 15 minutes`,
        button: 'OK'
      },
      alreadyActivated: {
        title: '<img src="./assets/img/icon-complete.svg" width="42px" height="42px">',
        text: `Please wait, Ducatus is on the way to your wallet`,
        button: 'OK'
      },
      network: {
        title: '<img src ="./assets/img/icon-attantion.svg" width="42px" height="42px">',
        text: 'Something went wrong, try again',
        button: 'OK'
      }
    };

    const answers = modalAnswers[type] || modalAnswers['network'];

    const alert = this.alertCtrl.create({
      cssClass: 'deposit-alert',
      title: answers.title,
      message: answers.text,
      buttons: [
        {
          text: answers.button,
          handler: () => {
            this.deposits.forEach(deposit => {
              if ( deposit.id == id ) {
                deposit.withdrawn = true;
              }
            });
          }
        }
      ]
    });

    alert.present();
  }

  private debounceGetDeposits = _.debounce(
    async () => {
      this.getDeposits();
    },
    5000,
    {
      leading: true
    }
  );

  public doRefresh(refresher): void {
    this.debounceGetDeposits();

    setTimeout(() => {
      refresher.complete();
    }, 2000);
  }

  public async withdraw(id: number): Promise<void> {
    let deposit = this.deposits.find(element => element.id === id);

    if (!deposit.extraData.length) {
      const address = `${this.apiProvider.getAddresses().deposit}user/deposits/${id}/withdraw/`;
    
      try {
        const res = await this.httpClient.post(address,'').toPromise();
  
        this.showModal('alreadyActivated',id);
        this.logger.debug(res);
      } catch(error) {
        this.logger.debug(error);
        this.showModal('network');
      }
    } else {
      const  txProps: TxProperties  = {
        sending_amount: deposit.amountDeposited,
        tx_hash: deposit.extraData[0].mintTxHash,
        vout_number: deposit.extraData[0].txVout,
        user_duc_address: deposit.extraData[0].userDucAddress,
        redeem_script: deposit.extraData[0].redeemScript,
        lock_time: deposit.extraData[0].lockTime,
        private_path: deposit.extraData[0].privatePath
      };
          
      deposit.cltv_details = txProps;

      const addressFilter = this.wallets.find(wallet => {
        return wallet.address === deposit.cltv_details.user_duc_address;
      });

      const walletToUnfreeze = addressFilter
        ? addressFilter.wallet
        : this.wallets.find(wallet => 
            wallet.wallet.credentials.walletId === deposit.wallet_id
          ).wallet;

      const txHex = await this.walletProvider.signFreeze(
        walletToUnfreeze,
        deposit.cltv_details,
        Boolean(addressFilter)
      );

      try {
        const withdrawDeposit = await this.withdrawnOldDepositsDividends(id);
        this.logger.debug(withdrawDeposit);

        const response = this.sendTX(txHex, id);

        this.logger.debug(response);
        this.showModal('success', id, deposit.duc_amount);
      } catch(error) {
        this.logger.debug(error);

        if (
          error 
          && error.error
          && error.error.detail === '-27: transaction already in block chain'
        ) {
          this.showModal('alreadyActivated', id);
        } else {
          this.showModal('network', id);
        }
      }
    }
  }

  private withdrawnOldDepositsDividends(id: number) {
    const address = `${this.apiProvider.getAddresses().deposit + 'user/deposits/'  + id}/send-dividends/`;

    return this.httpClient
      .post(address, {})
      .toPromise();
  }

  private sendTX(raw_tx_hex, id: number) {
    const address = `${this.apiProvider.getAddresses().deposit + 'user/deposits/' + id}/withdraw-with-hex/`;

    return this.httpClient
      .post(address, { raw_tx_hex })
      .toPromise();
  }

}
