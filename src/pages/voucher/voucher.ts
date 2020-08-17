import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { AlertController, NavController } from 'ionic-angular';
import { VoucherAddPage } from './add/add';

import _ from 'lodash';

import { ProfileProvider, WalletProvider } from '../../providers';
import { VOUCHER_URL_REQUEST } from './params';

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
    private walletProvider: WalletProvider
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
          `${VOUCHER_URL_REQUEST}get_frozen_vouchers/?wallet_ids=${walletsResult}`
        )
        .toPromise()
        .then(result => {
          this.vouchers = result as any;

          this.vouchers.map(x => {
            x.freez_date = new Date(x.cltv_details.lock_time * 1000);
            x.freez_date_count = Math.ceil(
              Math.abs(x.freez_date.getTime() - new Date().getTime()) /
                (1000 * 3600 * 24)
            );
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

  private getVoucher(id) {
    return this.httpClient
      .get(`${VOUCHER_URL_REQUEST}get_withdraw_info/?voucher_id=${id}`)
      .toPromise();
  }

  private sendTX(raw_tx_hex) {
    return this.httpClient
      .post(`${VOUCHER_URL_REQUEST}send_raw_transaction/`, {
        raw_tx_hex
      })
      .toPromise();
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

  public withdrowTrigger(id: number) {
    this.vouchers.map(t => {
      if (t.id === id) t.withdrow_check = true;
    });

    this.getVoucher(id).then(async res => {
      const voucher: any = res;

      voucher.cltv_details.sending_amount =
        voucher.voucherinput_set[0].amount - voucher.tx_fee;
      voucher.cltv_details.tx_hash = voucher.voucherinput_set[0].mint_tx_hash;
      voucher.cltv_details.user_duc_address = voucher.user_duc_address;
      voucher.cltv_details.vout_number = voucher.voucherinput_set[0].tx_vout;

      const addressFilter = this.wallets.find(t => {
        return t.address === voucher.cltv_details.user_duc_address;
      });

      const walletToUnfreeze = addressFilter
        ? addressFilter.wallet
        : this.wallets.find(t => {
            return t.wallet.credentials.walletId === voucher.wallet_id;
          }).wallet;

      const txHex = await this.walletProvider.signFreeze(
        walletToUnfreeze,
        voucher.cltv_details,
        !!addressFilter
      );

      this.sendTX(txHex)
        .then(() => {
          this.showModal('success', id, voucher.duc_amount);
        })
        .catch(err => {
          err.error.detail === '-27: transaction already in block chain'
            ? this.showModal('alreadyActivated', id)
            : this.showModal('network', id);
        });
    });
  }
}
