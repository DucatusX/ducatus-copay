import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { AlertController, NavController } from 'ionic-angular';
import { VoucherAddPage } from './add/add';

import _ from 'lodash';

import { ApiProvider, Coin, Logger, ProfileProvider, TxFormatProvider, WalletProvider } from '../../providers';

@Component({
  selector: 'page-voucher',
  templateUrl: 'voucher.html'
})
export class VoucherPage {
  public vouchersLoading = true;
  public vouchers = [];
  public walletsGroups: any;
  public wallets: any;

  constructor(
    private alertCtrl: AlertController,
    private navCtrl: NavController,
    private httpClient: HttpClient,
    private profileProvider: ProfileProvider,
    private walletProvider: WalletProvider,
    private apiProvider: ApiProvider,
    private logger: Logger,
    private formatProvider: TxFormatProvider
  ) {}

  ionViewWillEnter() {
    const wallets = this.profileProvider.getWallets({ showHidden: true });

    this.walletsGroups = _.values(
      _.groupBy(
        _.filter(wallets, wallet => {
          return wallet.keyId != 'read-only';
        }),
        'keyId'
      )
    );

    this.getVouchers();
    let walletsGet = this.getWalletsInfoAddress('duc');

    Promise.all([walletsGet]).then(results => {
      this.wallets = results[0];
    });
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

  private getVouchers() {
    this.getWalletsInfo('duc').then(wallets => {
      const walletsResult = [];

      wallets.map(res => {
        if (!walletsResult.includes(res.walletId))
          walletsResult.push(res.walletId);
      });

      this.httpClient
        .get(
          this.apiProvider.getAddresses().deposit + `user/vouchers/list/?wallet_ids=${walletsResult}`
        )
        .toPromise()
        .then(result => {
          this.vouchers = result as any;
          this.vouchers.map(x => {
            if(x.daysToUnlock < 0){
              x.daysToUnlock = x.daysToUnlock * -1;
            }
            x.ducAmount = this.formatProvider.satToUnit(x.ducAmount,Coin.DUC);
            x.withdrow_check = false;
          });
          this.vouchersLoading = false;
        });
    });
  }

  public goToVoucehrAddPage() {
    this.navCtrl.push(VoucherAddPage);
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
      cssClass: 'voucher-alert',
      title: answers.title,
      message: answers.text,
      buttons: [
        {
          text: answers.button,
          handler: () => {
            this.vouchers.map(t => {
              this.getVouchers();
              if (t.id === id) t.withdrow_check = false;
            });
          }
        }
      ],
      enableBackdropDismiss: false
    });
    alert.present();
  }

  private debounceGetVouchers = _.debounce(
    async () => {
      this.getVouchers();
    },
    5000,
    {
      leading: true
    }
  );

  public doRefresh(refresher): void {
    this.debounceGetVouchers();
    setTimeout(() => {
      refresher.complete();
    }, 2000);
  }

  private withdraw (wallet_id: number):Promise<object>{
    let url = this.apiProvider.getAddresses().deposit + `/user/vouchers/${wallet_id}/withdraw/`;

    return this.httpClient
      .put(url, "")
      .toPromise();
  }

  public withdrowTrigger(id: number) {
    this.withdraw(id)
    .then(
      res=>{
        this.logger.debug(res);
        this.showModal('success', id, );
    })
    .catch(
      err=>{
        this.logger.debug(err);
        this.showModal('network', id);
    })
  }
}
