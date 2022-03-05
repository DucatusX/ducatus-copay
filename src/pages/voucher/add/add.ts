import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AlertController, NavController } from 'ionic-angular';
import { Logger } from '../../../providers/logger/logger';

import { ActionSheetProvider } from '../../../providers/action-sheet/action-sheet';
import { ApiProvider } from '../../../providers/api/api';
import { ProfileProvider } from '../../../providers/profile/profile';
import { WalletProvider } from '../../../providers/wallet/wallet';

import { BackupKeyPage } from '../../backup/backup-key/backup-key';

@Component({
  selector: 'page-voucher',
  templateUrl: 'add.html'
})
export class VoucherAddPage {
  public VoucherGroup: FormGroup;
  public voucherLoading = false;
  public walletAddresses = [];
  private wallets: any;
  public isDucx: boolean;

  constructor(
    private formBuilder: FormBuilder,
    private profileProvider: ProfileProvider,
    private walletProvider: WalletProvider,
    private actionSheetProvider: ActionSheetProvider,
    private alertCtrl: AlertController,
    private httpClient: HttpClient,
    private navCtrl: NavController,
    private logger: Logger,
    private apiProvider: ApiProvider
  ) {
    this.VoucherGroup = this.formBuilder.group({
      VoucherGroupCode: [
        '',
        Validators.compose([Validators.minLength(1), Validators.required])
      ],
      VoucherGroupAddress: [
        '',
        Validators.compose([Validators.minLength(34), Validators.required])
      ]
    });
  }

  ionViewWillEnter() {
    const coins = [
      'duc',
      'jamasy',
      'nuyasa',
      'sunoba',
      'dscmed',
      'pog1',
      'wde',
      'mdxb',
      'g.o.l.d.',
      'jwan'
    ];
    const wallets = this.profileProvider.getWallets({ showHidden: true });
    let promises = [];

    coins.map(coin => {
      promises.push(this.walletProvider.getWalletsByCoin(wallets, coin));
    });

    Promise.all(promises).then(res => {
      let count = 0;
      for (let i = 0; i < res.length; i++) {
        count += +res[i].count;
      }
      if (count <= 0) this.showModal('needbackup');
      this.wallets = res;
    });
  }

  private isDucxVaucher(): boolean {
    if (
      this.VoucherGroup.value.VoucherGroupCode &&
      this.VoucherGroup.value.VoucherGroupCode.slice(0, 3) === 'CF-'
    ) {
      return true;
    }

    return false;
  }

  public openAddressList() {
    if (!this.voucherLoading) {
      this.walletAddresses = [];
      for (let i = 0; i < this.wallets.length; i++) {
        this.walletAddresses.push(...this.wallets[i].wallets);
      }
      if (this.isDucxVaucher()) {
        this.walletAddresses = this.walletAddresses.filter(
          item => item.wallet.coin !== 'duc'
        );
      } else {
        this.walletAddresses = this.walletAddresses.filter(
          item => item.wallet.coin === 'duc'
        );
      }
      if (!this.walletAddresses.length) {
        this.showModal('empty_wallets');
        return;
      }
      const infoSheet = this.actionSheetProvider.createInfoSheet(
        'convertor-address',
        { wallet: this.walletAddresses }
      );
      infoSheet.present();
      infoSheet.onDidDismiss((option, item) => {
        if (option) {
          this.walletAddresses.forEach(wallet => {
            this.isDucx =
              wallet.address.toLowerCase() === option.toLowerCase()
                ? item.wallet.coin
                : false;
          });
          this.VoucherGroup.value.VoucherGroupAddress = option;

          if (option.needsBackup)
            this.navCtrl.push(BackupKeyPage, {
              keyId: option.keyId
            });
        }
      });
    }
  }

  private showModal(type: string, opt?: any) {
    const options = {
      usd: opt ? opt.usd : '1',
      duc: opt ? opt.duc : '20',
      min: opt ? opt.min : '15',
      day: opt ? opt.day : '14',
      token: opt ? opt.token : 'jamasy'
    };

    const modalAnswers = {
      ok: {
        title:
          '<img src="./assets/img/icon-complete.svg" width="42px" height="42px">',
        text: `Your voucher successfully activated. You will get Ducatus in ${options.min} minutes`
      },
      ok_freeze: {
        title:
          '<img src="./assets/img/icon-complete.svg" width="42px" height="42px">',
        text: `Your voucher succesfully activated. You can withdraw your Ducatus after ${options.day} days`
      },
      ok_token: {
        title:
          '<img src="./assets/img/icon-complete.svg" width="42px" height="42px">',
        text: `Your voucher was successfully activated. You'll receive ${
          options.token
        } tokens shortly.`
      },
      error: {
        title:
          '<img src="./assets/img/icon-attantion.svg" width="42px" height="42px">',
        text: 'Please check your activation code'
      },
      registated: {
        title:
          '<img src ="./assets/img/icon-attantion.svg" width="42px" height="42px">',
        text: 'Your voucher was already registered'
      },
      network: {
        title:
          '<img src ="./assets/img/icon-attantion.svg" width="42px" height="42px">',
        text: 'Something went wrong, try again'
      },
      back_err: {
        title:
          '<img src ="./assets/img/icon-attantion.svg" width="42px" height="42px">',
        text: 'Something in backend went wrong, try again'
      },
      needbackup: {
        title:
          '<img src ="./assets/img/icon-attantion.svg" width="42px" height="42px">',
        text: 'Needs Backup',
        handler: () => {
          this.navCtrl.pop();
        }
      },
      empty_wallets: {
        title:
          '<img src ="./assets/img/icon-attantion.svg" width="42px" height="42px">',
        text: "You don't have wallets suitable for this voucher",
        handler: () => {
          this.navCtrl.pop();
        }
      }
    };

    const answers = modalAnswers[type]
      ? modalAnswers[type]
      : modalAnswers['error'];

    answers.button = 'OK';
    answers.enableBackdropDismiss = false;

    if (type !== 'needbackup') {
      answers.handler = () => {
        this.voucherLoading = false;
        if (type != 'network') {
          this.VoucherGroup.value.VoucherGroupAddress = '';
          this.VoucherGroup.value.VoucherGroupCode = '';
        }
      };
    }

    let alert = this.alertCtrl.create({
      cssClass: 'voucher-alert',
      title: answers.title,
      message: answers.text,
      buttons: [
        {
          text: answers.button,
          handler: answers.handler
        }
      ]
    });
    alert.present();
  }

  private sendCode (
    activation_code: string,
    user_address: string,
    wallet_id: string,
  ) 
  {
    let url = this.apiProvider.getAddresses().deposit + 'user/vouchers/activate/';
    
    return this.httpClient
      .post(url, {
        activation_code,
        user_address,
        wallet_id,
      })
      .toPromise();
  }

  public async activateVoucher() {
    this.voucherLoading = true;
    this.walletProvider
      .prepareAdd(
        this.walletAddresses,
        this.VoucherGroup.value.VoucherGroupAddress
      )
      .then(resPrepare => {
        const resultPrepare: any = resPrepare;
        this.sendCode(
          this.VoucherGroup.value.VoucherGroupCode,
          this.VoucherGroup.value.VoucherGroupAddress,
          resultPrepare.wallet.walletId,
        )
          .then(res => {
            const result: any = res;

            if (
              result.readyToWithdraw === false 
              && result.daysToUnlock === null
            ) {
              this.showModal('ok', { min: '15' });
            } 
             
            this.showModal('ok_freeze', {day: result.daysToUnlock});
          })
          .catch(err => {
            this.logger.log(`${JSON.stringify(err)}`);
            switch (err.status) {
              case 403:
                if (
                  [
                    'This voucher is not active',
                    'Invalid activation code'
                  ].includes(err.error.detail)
                )
                  this.showModal('error');
                if (
                  err.error.detail == 'This voucher already used' ||
                  err.error.detail == 'USED'
                )
                  this.showModal('registated');
                if (err.error.detail == 'TRANSFER FAIL')
                  this.showModal('back_err');
                break;
              default:
                this.showModal('network');
                break;
            }
          });
      });
  }
}
