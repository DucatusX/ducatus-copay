import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AlertController, NavController } from 'ionic-angular';
import { 
  ActionSheetProvider, 
  ApiProvider, 
  Coin, 
  Logger, 
  ProfileProvider,
  WalletProvider
} from '../../../providers';

import { BackupKeyPage } from '../../backup/backup-key/backup-key';

interface WalletData {
  wallet: {};
  address: string;
}

@Component({
  selector: 'page-voucher',
  templateUrl: 'add.html'
})

export class VoucherAddPage {

  public VoucherGroup: FormGroup;
  public voucherLoading = false;
  public isDucx: boolean;
  public walletsInfo: WalletData[] = [];
  public selectWallet: {
    wallet: any
  };

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

    let wallets = this.profileProvider.getWallets({ showHidden: true });

    const filterWalletsByCoin = wallets.filter( wallet => {
      return wallet.coin === Coin.DUC;
    });
  
    filterWalletsByCoin.map( wallet => {
      this.walletProvider.getAddress(wallet, false).then(address => {
        this.walletsInfo.push({ wallet, address });
      });
    });
  }

  public openAddressList() {
    if (!this.voucherLoading) {
      if (!this.walletsInfo.length) {
        this.showModal('needbackup');

        return;
      }

      const infoSheet = this.actionSheetProvider.createInfoSheet(
        'convertor-address',
        { wallet: this.walletsInfo }
      );

      infoSheet.present();
      infoSheet.onDidDismiss((option, item) => {

        if (option) {
          this.selectWallet = item;
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
      error: {
        title:
          '<img src="./assets/img/icon-attantion.svg" width="42px" height="42px">',
        text: 'Please check your activation code'
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
    this.sendCode(
      this.VoucherGroup.value.VoucherGroupCode, // VoucherCode
      this.VoucherGroup.value.VoucherGroupAddress, // WalletAddress
      this.selectWallet.wallet.credentials.walletId, // WalletId
    )
    .then(res => {
      const result: any = res;

      if (result.readyToWithdraw === false && result.daysToUnlock === null) {
        this.showModal('ok', { min: '15' });
      }
      else {
        this.showModal('ok_freeze', { day: result.daysToUnlock });
      }
    })
    .catch(err => {
      if (err.error.detail === 'Not found.') {
        this.showModal('error');
      }
      else {
        this.showModal('network');
      }
      this.logger.log(`${JSON.stringify(err)}`);
    });
  }
}