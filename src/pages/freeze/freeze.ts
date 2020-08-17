import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { AlertController, NavController } from 'ionic-angular';
import { FreezeAddPage } from './freeze-add/freeze-add';

import _ from 'lodash';

import { ProfileProvider, WalletProvider } from '../../providers';
import { FREEZE_URL_REQUEST } from './params';

@Component({
  selector: 'page-freeze',
  templateUrl: 'freeze.html'
})
export class FreezePage {
  public depositsLoading = true;
  public deposits = [];
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

    this.getDeposits();

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

  private getDeposits() {
    this.getWalletsInfo('duc').then(wallets => {
      const walletsResult = [];

      wallets.map(res => {
        if (!walletsResult.includes(res.walletId))
          walletsResult.push(res.walletId);
      });

      this.httpClient
        .get(`${FREEZE_URL_REQUEST}get_deposits/?wallet_ids=${walletsResult}`)
        .toPromise()
        .then(result => {
          this.deposits = result as any;

          this.deposits.map(x => {
            if (x.depositinput_set.length != 0) {
              x.ended_at_date = new Date(x.ended_at * 1000);
              x.duc_added = (
                x.duc_amount *
                (x.dividends / 100) *
                (x.lock_months / 12)
              ).toFixed(2);

              const curDate = new Date(x.ended_at * 1000);
              const dateToExecute = Math.round(
                (new Date(curDate).getTime() - new Date().getTime()) /
                  (24 * 60 * 60 * 1000)
              );
              const dateToExecuteRagne =
                Math.round(
                  (new Date(x.deposited_at * 1000).getTime() -
                    new Date(curDate).getTime()) /
                    (24 * 60 * 60 * 1000)
                ) * -1;
              x.executeRagne =
                ((dateToExecuteRagne - dateToExecute) / dateToExecuteRagne) *
                100;

              if (dateToExecute <= 0 || dateToExecute === -0) {
                x.executeRagne = 100;
              }
            }
            x.freez_date = new Date(x.cltv_details.lock_time * 1000);
            x.freez_date_count = Math.ceil(
              Math.abs(x.freez_date.getTime() - new Date().getTime()) /
                (1000 * 3600 * 24)
            );
            x.withdrow_check = false;
          });

          this.depositsLoading = false;
        });
    });
  }

  public goToDepositAddPage() {
    this.navCtrl.push(FreezeAddPage);
  }

  private getAddress(wallet) {
    return new Promise(resolve => {
      this.walletProvider.getAddress(wallet, false).then(addr => {
        return resolve(addr);
      });
    });
  }

  private getDeposit(id) {
    return this.httpClient
      .get(`${FREEZE_URL_REQUEST}get_deposit_info/?deposit_id=${id}`)
      .toPromise();
  }

  private sendTX(raw_tx_hex) {
    return this.httpClient
      .post(`${FREEZE_URL_REQUEST}send_deposit_transaction/`, {
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
      cssClass: 'deposit-alert',
      title: answers.title,
      message: answers.text,
      buttons: [
        {
          text: answers.button,
          handler: () => {
            this.deposits.map(t => {
              this.getDeposits();
              if (t.id === id) t.withdrow_check = false;
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

  public withdrowTrigger(id: number) {
    this.deposits.map(t => {
      if (t.id === id) t.withdrow_check = true;
    });

    this.getDeposit(id).then(async res => {
      const deposit: any = res;

      deposit.cltv_details.sending_amount =
        deposit.depositinput_set[0].amount - deposit.tx_fee;
      deposit.cltv_details.tx_hash = deposit.depositinput_set[0].mint_tx_hash;
      deposit.cltv_details.user_duc_address = deposit.user_duc_address;
      deposit.cltv_details.vout_number = deposit.depositinput_set[0].tx_vout;

      const addressFilter = this.wallets.find(t => {
        return t.address === deposit.cltv_details.user_duc_address;
      });

      console.log('addressFilter', addressFilter);

      const walletToUnfreeze = addressFilter
        ? addressFilter.wallet
        : this.wallets.find(t => {
            return t.wallet.credentials.walletId === deposit.wallet_id;
          }).wallet;

      console.log('walletFilter', walletToUnfreeze);

      const txHex = await this.walletProvider.signFreeze(
        walletToUnfreeze,
        deposit.cltv_details,
        !!addressFilter
      );

      console.log('freeze transaction hex', txHex);

      this.sendTX(txHex)
        .then(res => {
          console.log('transaction sended', res);
          this.showModal('success', id, deposit.duc_amount);
        })
        .catch(err => {
          err.error.detail === '-27: transaction already in block chain'
            ? this.showModal('alreadyActivated', id)
            : this.showModal('network', id);
          console.error('transaction not sended', err, err.error.detail);
        });
    });
  }
}
