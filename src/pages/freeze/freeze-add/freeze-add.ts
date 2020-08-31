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
  public freezeDays = 0;
  // public freezeMonth = 36;
  public freezePercent = 21;
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
      AddressTo: [
        '',
        Validators.compose([
          Validators.minLength(34),
          Validators.maxLength(34),
          Validators.required
        ])
      ],
      Amount: [
        '',
        Validators.compose([
          Validators.minLength(1),
          Validators.required,
          Validators.min(0)
        ])
      ],
      Days: [
        '',
        Validators.compose([
          Validators.minLength(1),
          Validators.required,
          Validators.min(0)
        ])
      ]
      // Month: ['13', Validators.compose([Validators.required])],
      // Percent: ['8', Validators.compose([Validators.required])]
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

  // public changePercentAndMoth(type: string) {
  //   const tableMP = {
  //     '36': '21'
  //   };

  //   type === 'month'
  //     ? this.FreezeGroup.controls.Percent.setValue(
  //         tableMP[this.FreezeGroup.controls.Month.value]
  //       )
  //     : this.FreezeGroup.controls.Month.setValue(
  //         Object.keys(tableMP).find(
  //           key => tableMP[key] === this.FreezeGroup.controls.Percent.value
  //         )
  //       );

  //   this.changeAmount();
  // }

  public changeAmountToMax() {
    this.FreezeGroup.controls.Amount.setValue(this.maxAmount);
    // this.changeAmount();
  }

  // public changeAmount() {
  //   if (parseFloat(this.FreezeGroup.value.Amount) < 0)
  //     this.FreezeGroup.controls.Amount.setValue('0');

  //   const amount =
  //     this.FreezeGroup.value.Amount ||
  //     parseFloat(this.FreezeGroup.value.Amount) > 0
  //       ? parseFloat(this.FreezeGroup.value.Amount)
  //       : 0;

  //   const amountWithPercentValue = (
  //     amount *
  //     (parseFloat(this.FreezeGroup.value.Percent) / 100) *
  //     (parseFloat(this.FreezeGroup.value.Month) / 12)
  //   ).toFixed(4);

  //   this.amountWithPercent = amountWithPercentValue;
  // }

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

  public amountChange(event) {
    // console.log('amountWallet', this.amountWallet);
    // console.log('event', event, event.length);

    // if (isNaN(event)) {
    //   event = event.replace(/[^0-9\.]/g, '');
    //   if (event.split('.').length > 2) event = event.replace(/\.+$/, '');
    // }
    // this.amountWallet = event;

    // console.log('event', event);
    // console.log('amountWallet', this.amountWallet);

    console.log('event', event);
    console.log('amountWallet', this.amountWallet);

    // this.amountWallet = event
    //   .replace(/[^.\d]/g, '')
    //   .replace(/^(\d*\.?)|(\d*)\.?/g, '$1$2');

    // const value = event
    //   .replace(/[^\d.]/g, '')
    //   .replace(/\.([.\d]+)$/, (_m, m1) => {
    //     return '.' + m1.replace(/\./g, '');
    //   });

    

    if (!isNaN(event)) {
      if (event.length >= 2) {
        if (event.charAt(0) === 0 && event.charAt(1) === 0) {
          this.amountWallet = 0;
        }
      }
    }

    console.log('replace event', event);
    console.log('replace amountWallet', this.amountWallet);

    if (event.length >= 2) {
      if (event[0] === '0')
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
    private_path: number,
    lock_days: number
  ) {
    return this.httpClient
      .post(`${FREEZE_URL_REQUEST}generate_deposit_without_dividends/`, {
        wallet_id,
        duc_address,
        receiver_user_public_key,
        sender_user_public_key,
        lock_days,
        private_path
      })
      .toPromise();
  }

  public async generateUserFreeze() {
    this.freezeLoading = true;

    const addresses = this.walletAddresses;
    const addressFrom = this.FreezeGroup.value.Address;
    const addressTo = this.FreezeGroup.value.AddressTo;
    const days = this.FreezeGroup.value.Days;

    const receiverAddress = await this.walletProvider
      .getInfoByAddress(addresses, addressFrom, addressTo)
      .then(res => {
        return res;
      });

    console.log('receiverAddress', receiverAddress); // информация об адрессе получателя

    const receiverData = (await this.walletProvider
      .prepareAddFreeze(receiverAddress.wallet, receiverAddress.address[0])
      .then(res => {
        return res;
      })) as any;

    console.log('receiverData', receiverData); // информация о об адрессе получателя { walletId, pubKey, path }

    const senderData = (await this.walletProvider
      .prepareAdd(addresses, addressFrom)
      .then(res => {
        return res;
      })) as any;

    console.log('senderData', senderData); // информация о об адрессе получателя { walletId, pubKey, path }

    this.generateFreeze(
      receiverData.walletId, // wallet id получателя
      addressTo, // адрес получателя
      receiverData.pubKey, // публичный ключ получателя
      senderData.pubKey, // публичный ключ отправителя
      receiverData.path, // path получателя
      Number(days) // количество дней заморозки
    )
      .then(res => {
        const result: any = res;

        if (result.cltv_details.locked_duc_address) {
          const addressView = this.walletProvider.getAddressView(
            senderData.wallet.wallet.coin,
            senderData.wallet.wallet.network,
            result.cltv_details.locked_duc_address,
            true
          );

          const parsedAmount = this.txFormatProvider.parseAmount(
            senderData.wallet.wallet.coin.toLowerCase(),
            this.FreezeGroup.value.Amount,
            senderData.wallet.wallet.coin.toUpperCase()
          );

          const redirParms = {
            activePage: 'ScanPage',
            walletId: senderData.wallet.wallet.id,
            amount: parsedAmount.amountSat
          };

          this.incomingDataProvider.redir(addressView, redirParms);
        }
      })
      .catch(() => this.showModal('network'));
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
