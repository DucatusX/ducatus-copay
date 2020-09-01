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
  public freezeLoading = false;
  public amountWallet = null;
  public freezeDays = null;
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

  public changeAmountToMax() {
    this.FreezeGroup.controls.Amount.setValue(this.maxAmount);
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

  public amountChange(_event) {
    this.amountWallet = Number(
      this.FreezeGroup.controls['Amount'].value
        .toString()
        .replace(/[^0-9.]/g, '')
        .replace(/(\..*)\./g, '$1')
    );
    this.FreezeGroup.controls['Amount'].setValue(
      Number(
        this.FreezeGroup.controls['Amount'].value
          .toString()
          .replace(/[^0-9.]/g, '')
          .replace(/(\..*)\./g, '$1')
      )
    );
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

    const receiverData = (await this.walletProvider
      .prepareAddFreeze(receiverAddress.wallet, receiverAddress.address[0])
      .then(res => {
        return res;
      })) as any;

    const senderData = (await this.walletProvider
      .prepareAdd(addresses, addressFrom)
      .then(res => {
        return res;
      })) as any;

    this.generateFreeze(
      receiverData.walletId,
      addressTo,
      receiverData.pubKey,
      senderData.pubKey,
      receiverData.path,
      Number(days)
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
