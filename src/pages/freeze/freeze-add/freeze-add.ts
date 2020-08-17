import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AlertController, NavController } from 'ionic-angular';

import { ActionSheetProvider } from '../../../providers/action-sheet/action-sheet';
import { IncomingDataProvider } from '../../../providers/incoming-data/incoming-data';
import { ProfileProvider } from '../../../providers/profile/profile';
import { TxFormatProvider } from '../../../providers/tx-format/tx-format';
import { WalletProvider } from '../../../providers/wallet/wallet';

import { BackupKeyPage } from '../../backup/backup-key/backup-key';

import { FREEZE_URL_REQUEST } from '../params';

@Component({
  selector: 'page-freeze-add',
  templateUrl: 'freeze-add.html'
})
export class FreezeAddPage {
  public FreezeGroup: FormGroup;

  public wallet: any;
  public walletAddresses: any;
  public sendLength: number = 0;
  public freezeLoading = false;
  public amountWithPercent: any;
  public amountWallet = 0;
  public freezeMonth = 13;
  public freezePercent = 13;
  public maxAmount = 0;

  constructor(
    private formBuilder: FormBuilder,
    private profileProvider: ProfileProvider,
    private walletProvider: WalletProvider,
    private actionSheetProvider: ActionSheetProvider,
    private incomingDataProvider: IncomingDataProvider,
    private txFormatProvider: TxFormatProvider,
    private alertCtrl: AlertController,
    private navCtrl: NavController,
    private httpClient: HttpClient
  ) {
    this.FreezeGroup = this.formBuilder.group({
      Address: [
        '',
        Validators.compose([Validators.minLength(34), Validators.required])
      ],
      Amount: [
        '',
        Validators.compose([
          Validators.minLength(1),
          Validators.required,
          Validators.min(0)
        ])
      ],
      Month: ['13', Validators.compose([Validators.required])],
      Percent: ['8', Validators.compose([Validators.required])]
    });
  }

  ionViewWillEnter() {
    const wallets = this.profileProvider.getWallets({
      showHidden: true,
      backedUp: true
    });

    this.walletProvider.getWalletsByCoin(wallets, 'duc').then(res => {
      const result: any = res;

      if (result.count <= 0) this.showModal('needbackup');

      this.walletAddresses = result.wallets;
    });
  }

  public changePercentAndMoth(type: string) {
    const tableMP = {
      '36': '21'
    };

    type === 'month'
      ? this.FreezeGroup.controls.Percent.setValue(
          tableMP[this.FreezeGroup.controls.Month.value]
        )
      : this.FreezeGroup.controls.Month.setValue(
          Object.keys(tableMP).find(
            key => tableMP[key] === this.FreezeGroup.controls.Percent.value
          )
        );

    this.changeAmount();
  }

  public changeAmountToMax() {
    this.FreezeGroup.controls.Amount.setValue(this.maxAmount);
    this.changeAmount();
  }

  public changeAmount() {
    if (parseFloat(this.FreezeGroup.value.Amount) < 0)
      this.FreezeGroup.controls.Amount.setValue('0');

    const amount =
      this.FreezeGroup.value.Amount ||
      parseFloat(this.FreezeGroup.value.Amount) > 0
        ? parseFloat(this.FreezeGroup.value.Amount)
        : 0;

    const amountWithPercentValue = (
      amount *
      (parseFloat(this.FreezeGroup.value.Percent) / 100) *
      (parseFloat(this.FreezeGroup.value.Month) / 12)
    ).toFixed(4);

    this.amountWithPercent = amountWithPercentValue;
  }

  public openAddressList() {
    if (!this.freezeLoading) {
      const infoSheet = this.actionSheetProvider.createInfoSheet(
        'convertor-address',
        { wallet: this.walletAddresses }
      );
      infoSheet.present();
      infoSheet.onDidDismiss(option => {
        if (option) {
          this.FreezeGroup.value.Address = option;

          this.wallet = this.walletAddresses.find(t => t.address === option);
          this.sendMax();

          if (this.wallet.needsBackup)
            this.navCtrl.push(BackupKeyPage, {
              keyId: this.wallet.keyId
            });
        }
      });
    }
  }

  public sendMax() {
    const { token } = this.wallet.wallet.credentials;

    this.walletProvider
      .getBalance(this.wallet.wallet, {
        tokenAddress: token ? token.address : ''
      })
      .then(resp => {
        this.maxAmount = resp.availableAmount / 100000000;
      });
  }

  private generateFreeze(
    wallet_id: string,
    duc_address: string,
    receiver_user_public_key: string,
    sender_user_public_key: string,
    private_path: string
  ) {
    return this.httpClient
      .post(`${FREEZE_URL_REQUEST}generate_deposit_for_three_years/`, {
        wallet_id,
        duc_address,
        receiver_user_public_key,
        sender_user_public_key,
        private_path
      })
      .toPromise();
  }

  public async generateUserFreeze() {
    this.freezeLoading = true;

    this.walletProvider
      .prepareAdd(this.walletAddresses, this.FreezeGroup.value.Address)
      .then(resPrepare => {
        const resultPrepare: any = resPrepare;

        this.generateFreeze(
          resultPrepare.wallet.walletId,
          this.FreezeGroup.value.Address,
          resultPrepare.pubKey, // receiver_user_public_key
          resultPrepare.pubKey, // sender_user_public_key
          resultPrepare.path
        )
          .then(res => {
            const result: any = res;

            if (result.cltv_details.locked_duc_address) {
              const addressView = this.walletProvider.getAddressView(
                resultPrepare.wallet.wallet.coin,
                resultPrepare.wallet.wallet.network,
                result.cltv_details.locked_duc_address,
                true
              );

              const parsedAmount = this.txFormatProvider.parseAmount(
                resultPrepare.wallet.wallet.coin.toLowerCase(),
                this.FreezeGroup.value.Amount,
                resultPrepare.wallet.wallet.coin.toUpperCase()
              );

              const redirParms = {
                activePage: 'ScanPage',
                walletId: resultPrepare.wallet.wallet.id,
                amount: parsedAmount.amountSat
              };

              this.incomingDataProvider.redir(addressView, redirParms);
            }
          })
          .catch(() => this.showModal('network'));
      });
  }

  private showModal(type: string) {
    const modalAnswers = {
      network: {
        title:
          '<img src ="./assets/img/icon-attantion.svg" width="42px" height="42px">',
        text: 'Something went wrong, try again',
        button: 'OK',
        handler: () => {
          this.freezeLoading = false;
          if (type != 'network') {
            this.FreezeGroup.value.Address = '';
            this.FreezeGroup.value.Amount = '';
          }
        },
        enableBackdropDismiss: false
      },
      needbackup: {
        title:
          '<img src ="./assets/img/icon-attantion.svg" width="42px" height="42px">',
        text: 'Needs Backup',
        button: 'OK',
        handler: () => {
          this.navCtrl.pop();
        },
        enableBackdropDismiss: false
      }
    };

    const answers = modalAnswers[type]
      ? modalAnswers[type]
      : modalAnswers['error'];

    let alert = this.alertCtrl.create({
      cssClass: 'voucher-alert',
      title: answers.title,
      message: answers.text,
      buttons: [
        {
          text: answers.button,
          handler: answers.handler
        }
      ],
      enableBackdropDismiss: answers.enableBackdropDismiss
    });
    alert.present();
  }
}
