import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AlertController, NavController } from 'ionic-angular';
import { ActionSheetProvider } from '../../../providers/action-sheet/action-sheet';
import { ApiProvider } from '../../../providers/api/api';
import { IncomingDataProvider } from '../../../providers/incoming-data/incoming-data';
import { Logger } from '../../../providers/logger/logger';
import { ProfileProvider } from '../../../providers/profile/profile';
import { TxFormatProvider } from '../../../providers/tx-format/tx-format';
import { WalletProvider } from '../../../providers/wallet/wallet';
import { BackupKeyPage } from '../../backup/backup-key/backup-key';

@Component({
  selector: 'page-deposit-add',
  templateUrl: 'deposit-add.html'
})
export class DepositAddPage {
  public DepositGroup: FormGroup;
  public wallet: any;
  public walletAddresses: any;
  public sendLength: number = 0;
  public depositLoading = false;
  public amountWithPercent: any;
  public amountWallet = 0;
  public depositMonth: string;
  public depositPercent: number;
  public maxAmount = 0;
  public tableMP: any;
  public months: string[] = [];
  public percents: number[] = [];

  constructor(
    private formBuilder: FormBuilder,
    private profileProvider: ProfileProvider,
    private walletProvider: WalletProvider,
    private actionSheetProvider: ActionSheetProvider,
    private incomingDataProvider: IncomingDataProvider,
    private txFormatProvider: TxFormatProvider,
    private alertCtrl: AlertController,
    private navCtrl: NavController,
    private httpClient: HttpClient,
    private apiProvider: ApiProvider,
    private logger: Logger
  ) {
    this.getMonthsRates();

    this.DepositGroup = this.formBuilder.group({
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
      Month: [this.months[1], Validators.compose([Validators.required])],
      Percent: [this.percents[1], Validators.compose([Validators.required])]
    });
  }

  public getMonthsRates() {
    const address = 'user/deposits/months-rates/';

    this.httpClient
      .get(this.apiProvider.getAddresses().deposit + address )
      .toPromise()
      .then(rates => {

        for (let rate in rates) {
          rates[rate] *= 100;
          this.percents.push(rates[rate]);
        }

        this.months = Object.keys(rates);
        this.depositMonth = this.months[1];
        this.depositPercent = this.percents[1];
        this.tableMP = rates;
      });
  }

  public async ionViewWillEnter(): Promise<void> {
    this.viewAlertAttention('confirmation of the deposit can take up to 1 business day.');

    const wallets = this.profileProvider.getWallets({
      showHidden: true,
      backedUp: true
    });

    const coinWallets: any = await this.walletProvider.getWalletsByCoin(wallets, 'duc');

    if ( coinWallets.count <= 0 ) {
      this.showModal('needbackup');
    } 
    
    this.walletAddresses = coinWallets.wallets;
  }

  private viewAlertAttention(message: string): void {
    const alert = this.alertCtrl.create({
      cssClass: 'voucher-alert',
      title: '<img src ="./assets/img/icon-attantion.svg" width="42px" height="42px">',
      message,
      buttons: [
        { text: 'Ok' }
      ]
    });

    alert.present();
  }

  public changePercentAndMoth(type: string): void {

    if ( type === 'month') {
      this.DepositGroup.controls.Percent.setValue(
        this.tableMP[this.DepositGroup.controls.Month.value]
      );
    } else {
      this.DepositGroup.controls.Month.setValue(
        Object.keys(this.tableMP).find(
          key => this.tableMP[key] === this.DepositGroup.controls.Percent.value
        )
      );
    }

    this.changeAmount();
  }

  public changeAmountToMax(): void {
    this.DepositGroup.controls.Amount.setValue(this.maxAmount);
    this.changeAmount();
  }

  public changeAmount(): void {
    const floatAmount = parseFloat(this.DepositGroup.value.Amount);
    
    if ( floatAmount < 0 ) {
      this.DepositGroup.controls.Amount.setValue('0');
    }

    let amount = floatAmount || 0;
    
    if ( floatAmount <= 0 ) {
      amount = 0;
    }

    const amountWithPercentValue = (
      amount *
      (parseFloat(this.DepositGroup.value.Percent) / 100) *
      (parseFloat(this.DepositGroup.value.Month) / 12)
    ).toFixed(4);

    this.amountWithPercent = amountWithPercentValue;
  }

  public openAddressList() {

    if ( !this.depositLoading ) {
      const infoSheet = this.actionSheetProvider.createInfoSheet(
        'convertor-address',
        { wallet: this.walletAddresses }
      );
      infoSheet.present();

      infoSheet.onDidDismiss(option => {
        if (option) {
          this.DepositGroup.value.Address = option;

          this.wallet = this.walletAddresses.find(wallet => wallet.address === option);
          this.sendMax();

          if ( this.wallet.needsBackup ) {
            this.navCtrl.push(BackupKeyPage, {
              keyId: this.wallet.keyId
            });
          }
        }
      });
    }
  }

  public async sendMax(): Promise<void> {
    const { token } = this.wallet.wallet.credentials;

    const amount = await this.walletProvider.getBalance(this.wallet.wallet, {
        tokenAddress: token 
          ? token.address 
          : ''
    });

    this.maxAmount = amount.availableAmount / 100000000;
  }

  private async generateDeposit(
    wallet: string,
    duc_address: string,
    lock_months: string,
  ): Promise<any> {
    const address = this.apiProvider.getAddresses().deposit + 'user/deposits/create/';

    return this.httpClient
      .post(address, {
        wallet,
        duc_address,
        lock_months,
      })
      .toPromise();
  }

  public async generateUserDeposit(): Promise<void> {
    this.depositLoading = true;
    
    const resultPrepare: any = await this.walletProvider.prepareAdd(this.walletAddresses, this.DepositGroup.value.Address);
    
    try {
      const deposit: any = await this.generateDeposit(
        resultPrepare.wallet.walletId,
        this.DepositGroup.value.Address,
        String(this.DepositGroup.value.Month)
      );
      
      if (deposit.ducAddress) {
        const addressView = this.walletProvider.getAddressView(
          resultPrepare.wallet.wallet.coin,
          resultPrepare.wallet.wallet.network,
          deposit.ducAddress,
          true
        );

        const parsedAmount = this.txFormatProvider.parseAmount(
          resultPrepare.wallet.wallet.coin.toLowerCase(),
          this.DepositGroup.value.Amount,
          resultPrepare.wallet.wallet.coin.toUpperCase()
        );

        const redirParms = {
          activePage: 'ScanPage',
          walletId: resultPrepare.wallet.wallet.id,
          amount: parsedAmount.amountSat
        };

        this.incomingDataProvider.redir(addressView, redirParms);
      }
    } catch(err) {
      this.showModal('network');
      this.logger.debug(err);
    }
  }

  private showModal(type: string): void {
    const modalAnswers = {
      network: {
        title: '<img src ="./assets/img/icon-attantion.svg" width="42px" height="42px">',
        text: 'Something went wrong, try again',
        button: 'OK',
        handler: () => {
          this.depositLoading = false;

          if ( type != 'network' ) {
            this.DepositGroup.value.Address = '';
            this.DepositGroup.value.Amount = '';
          }
        },
        enableBackdropDismiss: false
      },
      needbackup: {
        title: '<img src ="./assets/img/icon-attantion.svg" width="42px" height="42px">',
        text: 'Needs Backup',
        button: 'OK',
        handler: () => {
          this.navCtrl.pop();
        },
        enableBackdropDismiss: false
      }
    };

    const answers = modalAnswers[type] || modalAnswers['error'];

    const alert = this.alertCtrl.create({
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
