import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { AlertController, NavController } from 'ionic-angular';
import _ from 'lodash';
import { 
  ApiProvider, 
  Coin, 
  FilterProvider, 
  Logger,  
  ProfileProvider, 
  RateProvider, 
  TxFormatProvider, 
  WalletProvider 
} from '../../providers';
import { DepositAddPage } from './deposit-add/deposit-add';

@Component({
  selector: 'page-deposit',
  templateUrl: 'deposit.html'
})
export class DepositPage {
  public depositsLoading = true;
  public deposits = [];
  public walletsGroups: any;
  public wallets: any;
  // month - %
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

  ionViewWillEnter() {
    let walletsGet = this.getWalletsInfoAddress('duc');

    Promise.all([walletsGet]).then(results => {
      this.wallets = results[0];
    });
  }
  
  ngOnInit() {
    const wallets = this.profileProvider.getWallets({ showHidden: true });

    this.walletsGroups = _.values(
      _.groupBy(
        _.filter(wallets, wallet => {
          return wallet.keyId != 'read-only';
        }),
        'keyId'
      )
    );
    this.getDeposits();
  }

  private getWalletsInfoAddress(coin) {
    let coins = [];
    let wallets = [];
    let walletsRes = [];

    this.walletsGroups.forEach(keyID => {
      coins = _.concat(
        coins,
        keyID.filter(wallet => wallet.coin === coin.toLowerCase())
      );
    });

    wallets = coins.map(wallet => {
      
      return this.walletProvider.getAddress(wallet, false).then(address => {
        return { wallet, address };
      });
    });

    wallets.map(res => {
      res.then(result => {
        walletsRes.push(result);
      });
    });

    return walletsRes;
  }

  private getDeposits() {
    this.getWalletsInfo('duc').then(wallets => {
      const walletsResult = [];

      wallets.map(res => {
        if (!walletsResult.includes(res.walletId))
          walletsResult.push(res.walletId);
      });

      this.httpClient
        .get(this.apiProvider.getAddresses().deposit + `user/deposits/list/?wallet_ids=${walletsResult}`)
        .toPromise()
        .then(result => {
          this.deposits = result as any;
          this.deposits.map(x => {
            // if amountDeposited === null 
            // it means that the payment was not received on the created deposit
            if(x.amountDeposited) {
              // convert sat to unit
              x.amountUnit = Number(this.formatProvider.satToUnit(x.amountDeposited,Coin.DUC));
              // calculate the amount of deposit profit
              x.amountAdd = Number(this.formatProvider.satToUnit(x.amountToWithdraw,Coin.DUC)) - x.amountUnit;
              x.amountAdd = x.amountAdd.toFixed(2);
              // the amount of the initial deposit deposit in fiat
              this.unitToFiat(x.amountDeposited).then((res)=>{
                x.amountAlt = res;
              });
              x.percent = this.tableMP[x.lockMonths];
              // how many days have passed in percentage
              x.executeRange = this.getTimePassed(x.createdAt,x.readyToWithdrawDate,x.daysToWithdraw);
            }
          });
          this.depositsLoading = false;
        });
    });
  }

  public async unitToFiat(amount:number):Promise<number>{

    return this.rateProvider.whenRatesAvailable('duc').then( () => {
      let amountAlt: number;
      amountAlt = this.rateProvider.toFiat(amount, 'USD', 'duc');
      amountAlt = this.filter.formatFiatAmount(amountAlt);

      return amountAlt;
    });
  }

  public getTimePassed(depositDateCreated:string, depositDateEnd:string,daysToWithdraw: string) {
    const endDate: number = new Date(depositDateEnd).getTime();
    const createdAt: number = new Date(depositDateCreated).getTime();
    const coefficient = 24 * 60 * 60 * 1000;
   
    // the number of days which have passed 
    // since the creation of the deposit 
    const passedDays: number = (createdAt - endDate) / coefficient * -1; // passed 5 (days)
    const passedDaysPercent = ((passedDays - Number(daysToWithdraw)) / passedDays) * 100; // passed 1 (%)
    
    if (+daysToWithdraw <= 0 || +daysToWithdraw === -0) {
      return 100;
    } else {
      return passedDaysPercent;
    }
  }

  public goToDepositAddPage() {
    this.navCtrl.push(DepositAddPage);
  }

  private getAddress(wallet) {

    return new Promise(resolve => {
      this.walletProvider.getAddress(wallet, false).then(addr => {
        return resolve(addr);
      });
    });
  }

  private getWalletsInfo(coin): Promise<any> {

    return new Promise(resolve => {
      let coins = [];
      let wallets = [];

      this.walletsGroups.forEach(keyID => {
        coins = _.concat(
          coins,
          keyID.filter(wallet => wallet.coin === coin.toLowerCase())
        );
      });

      wallets = coins.map(wallet => {
        
        return {
          walletId: wallet.credentials.walletId,
          requestPubKey: wallet.credentials.requestPubKey,
          wallet,
          address: this.getAddress(wallet)
        };
      });

      resolve(wallets);
    });
  }

  private showModal(type: string, id?: number, ducAmount?: number) {
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

    const answers = modalAnswers[type]
      ? modalAnswers[type]
      : modalAnswers['network'];

    let alert = this.alertCtrl.create({
      cssClass: 'deposit-alert',
      title: answers.title,
      message: answers.text,
      buttons: [
        {
          text: answers.button,
          handler: () => {
            this.deposits.forEach(t => {
              if (t.id == id) {
                t.withdrawn = true;
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

  public withdraw(id:number){
    this.httpClient.post(this.apiProvider.getAddresses().deposit + "user/deposits/" + id + "/withdraw/","").toPromise()
    .then(
      res => {
        this.logger.debug(res);
        this.showModal('alreadyActivated',id);
      }
    )
    .catch(
      err => {
        this.logger.debug(err);
        this.showModal('network');
      }
    )
  }
}
