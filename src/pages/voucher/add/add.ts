import _ from 'lodash';

import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AlertController, NavController } from 'ionic-angular';

import { ActionSheetProvider } from '../../../providers/action-sheet/action-sheet';
import { ProfileProvider } from '../../../providers/profile/profile';
import { WalletProvider } from '../../../providers/wallet/wallet';

import { BackupKeyPage } from '../../backup/backup-key/backup-key';

import { VOUCHER_URL_REQUEST } from '../params';

@Component({
  selector: 'page-voucher',
  templateUrl: 'add.html'
})
export class VoucherAddPage {
  public VoucherGroup: FormGroup;
  public voucherLoading = false;
  public walletAddresses: any;

  constructor(
    private formBuilder: FormBuilder,
    private profileProvider: ProfileProvider,
    private walletProvider: WalletProvider,
    private actionSheetProvider: ActionSheetProvider,
    private alertCtrl: AlertController,
    private httpClient: HttpClient,
    private navCtrl: NavController
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
    const wallets = this.profileProvider.getWallets({ showHidden: true });

    this.walletProvider.getWalletsByCoin(wallets, 'duc').then(res => {
      const result: any = res;

      if (
        result.count <= 0 ||
        (result.count === 1 && result.wallets.length === 0)
      )
        this.showModal('needbackup');

      this.walletAddresses = result.wallets;
    });
  }

  public openAddressList() {
    if (!this.voucherLoading) {
      const infoSheet = this.actionSheetProvider.createInfoSheet(
        'convertor-address',
        { wallet: this.walletAddresses }
      );
      infoSheet.present();
      infoSheet.onDidDismiss(option => {
        if (option) {
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
      day: opt ? opt.day : '14'
    };

    const modalAnswers = {
      ok: {
        title:
          '<img src="./assets/img/icon-complete.svg" width="42px" height="42px">',
        text: `Your ${
          options.usd
        }$ voucher successfully activated. You will get ${
          options.duc
        } Ducatus in ${options.min} minutes`
      },
      ok_freeze: {
        title:
          '<img src="./assets/img/icon-complete.svg" width="42px" height="42px">',
        text: `Your $${
          options.usd
        } voucher succesfully activated. You can withdraw your ${
          options.duc
        } Ducatus after ${options.day} days`
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
      needbackup: {
        title:
          '<img src ="./assets/img/icon-attantion.svg" width="42px" height="42px">',
        text: 'Needs Backup',
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

  private sendCode(
    wallet_id: string,
    duc_address: string,
    duc_public_key: string,
    activation_code: string,
    private_path: string
  ) {
    return this.httpClient
      .post(`${VOUCHER_URL_REQUEST}/transfer/`, {
        wallet_id,
        duc_address,
        duc_public_key,
        activation_code,
        private_path
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
          resultPrepare.wallet.walletId,
          this.VoucherGroup.value.VoucherGroupAddress,
          resultPrepare.pubKey,
          this.VoucherGroup.value.VoucherGroupCode,
          resultPrepare.path
        )
          .then(res => {
            const result: any = res;

            result.lock_days !== 0
              ? this.showModal('ok_freeze', {
                  usd: result.usd_amount,
                  duc: result.duc_amount,
                  day: result.lock_days
                })
              : this.showModal('ok', {
                  usd: result.usd_amount,
                  duc: result.duc_amount,
                  min: '15'
                });
          })
          .catch(err => {
            switch (err.status) {
              case 403:
                if (
                  [
                    'This voucher is not active',
                    'Invalid activation code'
                  ].includes(err.error.detail)
                )
                  this.showModal('error');
                if (err.error.detail == 'This voucher already used')
                  this.showModal('registated');
                break;
              default:
                this.showModal('network');
                break;
            }
          });
      });
  }
}
