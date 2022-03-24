import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { AlertController, NavController } from 'ionic-angular';
import _ from 'lodash';
import { 
  ApiProvider, Coin, 
  FilterProvider, Logger,  
  ProfileProvider, RateProvider, 
  TxFormatProvider, WalletProvider 
} from '../../providers';
import { DepositAddPage } from './deposit-add/deposit-add';

@Component({
  selector: 'page-deposit',
  templateUrl: 'deposit.html'
})
export class DepositPage {
  public depositsLoading = true;
  public deposits: any[] = [];
  public walletsGroups: any;
  public wallets: any;
  public tableMP = {
    '5': '8',
    '13': '13',
    '34': '21'
  };
  
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

  public async ionViewWillEnter() {
    this.wallets = await this.getWalletsInfoAddress('duc');
  }
  
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

    await this.getDeposits();
  }

  private async getWalletsInfoAddress(coin): Promise<any> {
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
      const address = await this.walletProvider.getAddress(coin, false);
      
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
    const deposits = await this.httpClient
      .get(address)
      .toPromise();

    for ( let i = 0; i < this.deposits.length; i++ ) {
      const deposit = this.deposits[i];

      if ( deposit.amountDeposited ) {
        deposit.amountUnit = Number(this.formatProvider.satToUnit(deposit.amountDeposited, Coin.DUC));
        deposit.amountAdd = Number(this.formatProvider.satToUnit(deposit.amountToWithdraw, Coin.DUC)) - deposit.amountUnit;
        deposit.amountAdd = deposit.amountAdd.toFixed(2);
        deposit.amountAlt = await this.unitToFiat(deposit.amountDeposited);
        deposit.percent = this.tableMP[deposit.lockMonths];
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
    const endDate: number = new Date(depositDateEnd).getTime();
    const createdAt: number = new Date(depositDateCreated).getTime();
    const coefficient = 24 * 60 * 60 * 1000;
    const passedDays: number = (createdAt - endDate) / coefficient * -1; // passed 5 (days)
    const passedDaysPercent = ((passedDays - Number(daysToWithdraw)) / passedDays) * 100; // passed 1 (%)
    
    if ( +daysToWithdraw <= 0 || +daysToWithdraw === -0 ) {
      return 100;
    } else {
      return passedDaysPercent;
    }
  }

  public goToDepositAddPage(): void {
    this.navCtrl.push(DepositAddPage);
  }

  private async getAddress(wallet): Promise<string> {
    const address = await this.walletProvider.getAddress(wallet, false);

    return address;
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

      wallets.push({
        walletId: coin.credentials.walletId,
        requestPubKey: coin.credentials.requestPubKey,
        wallet: coin,
        address
      });
    }
    
    return wallets;
  }

  private showModal(type: string, id?: number, ducAmount?: number): void {
    const modalAnswers = {
      success: {
        title:
          '<img src="./assets/img/icon-complete.svg" width="42px" height="42px">',
        text: `You will get ${ducAmount || ''} Ducatus in 15 minutes`,
        button: 'OK'
      },
      alreadyActivated: {
        title:
          '<img src="./assets/img/icon-complete.svg" width="42px" height="42px">',
        text: `Please wait, Ducatus is on the way to your wallet`,
        button: 'OK'
      },
      network: {
        title:
          '<img src ="./assets/img/icon-attantion.svg" width="42px" height="42px">',
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
    const address = `${this.apiProvider.getAddresses().deposit}user/deposits/${id}/withdraw/`;
    
    try {
      const res = await this.httpClient.post(address,'').toPromise();

      this.showModal('alreadyActivated',id);
      this.logger.debug(res);
    } catch(error) {
      this.logger.debug(error);
      this.showModal('network');
    }
  }
}
