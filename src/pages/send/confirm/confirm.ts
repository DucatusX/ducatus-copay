import { DecimalPipe } from '@angular/common';
import { Component, ViewChild } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import {
  App,
  Events,
  ModalController,
  NavController,
  NavParams
} from 'ionic-angular';
import * as _ from 'lodash';
import { Logger } from '../../../providers/logger/logger';

// Pages
import { FinishModalPage } from '../../finish/finish';
import { CoinbaseAccountPage } from '../../integrations/coinbase/coinbase-account/coinbase-account';
import { ScanPage } from '../../scan/scan';
import { TabsPage } from '../../tabs/tabs';
import { WalletDetailsPage } from '../../wallet-details/wallet-details';

// Providers
import { ActionSheetProvider } from '../../../providers/action-sheet/action-sheet';
import { AddressProvider } from '../../../providers/address/address';
import { AppProvider } from '../../../providers/app/app';
import { BwcErrorProvider } from '../../../providers/bwc-error/bwc-error';
import { BwcProvider } from '../../../providers/bwc/bwc';
import { ClipboardProvider } from '../../../providers/clipboard/clipboard';
import { CoinbaseProvider } from '../../../providers/coinbase/coinbase';
import { ConfigProvider } from '../../../providers/config/config';
import { Coin, CurrencyProvider } from '../../../providers/currency/currency';
import { ErrorsProvider } from '../../../providers/errors/errors';
import { ExternalLinkProvider } from '../../../providers/external-link/external-link';
import { FeeProvider } from '../../../providers/fee/fee';
import { IABCardProvider } from '../../../providers/in-app-browser/card';
import { OnGoingProcessProvider } from '../../../providers/on-going-process/on-going-process';
import { PlatformProvider } from '../../../providers/platform/platform';
import { PopupProvider } from '../../../providers/popup/popup';
import { ProfileProvider } from '../../../providers/profile/profile';
import { ReplaceParametersProvider } from '../../../providers/replace-parameters/replace-parameters';
import { TxConfirmNotificationProvider } from '../../../providers/tx-confirm-notification/tx-confirm-notification';
import { TxFormatProvider } from '../../../providers/tx-format/tx-format';
import {
  TransactionProposal,
  WalletProvider
} from '../../../providers/wallet/wallet';
@Component({
  selector: 'page-confirm',
  templateUrl: 'confirm.html'
})
export class ConfirmPage {
  @ViewChild('slideButton')
  slideButton;
  protected bitcoreCash;
  protected ducatuscore;

  public countDown = null;
  public CONFIRM_LIMIT_USD: number;
  protected FEE_TOO_HIGH_LIMIT_PER: number;

  public tx;
  public wallet;
  public token;
  public wallets;
  public noWalletMessage: string;
  public criticalError: boolean;
  public showAddress: boolean;
  public walletSelectorTitle: string;
  public buttonText: string;
  public successText: string;
  public paymentExpired: boolean;
  public remainingTimeStr: string;
  public hideSlideButton: boolean;
  public amount;
  public showMultiplesOutputs: boolean;
  public fromMultiSend: boolean;
  public fromSelectInputs: boolean;
  public recipients;
  public coin: Coin;
  public appName: string;
  public merchantFeeLabel: string;
  public addressFrom: string;

  // Config Related values
  public config;

  // Platform info
  public isCordova: boolean;

  // custom fee flag
  public usingCustomFee: boolean = false;
  public usingMerchantFee: boolean = false;

  public isOpenSelector: boolean;
  public fromWalletDetails: boolean;

  // Coinbase
  public fromCoinbase;

  public mainTitle: string;
  public isSpeedUpTx: boolean;

  constructor(
    protected addressProvider: AddressProvider,
    protected app: App,
    protected actionSheetProvider: ActionSheetProvider,
    protected bwcErrorProvider: BwcErrorProvider,
    protected bwcProvider: BwcProvider,
    protected configProvider: ConfigProvider,
    protected currencyProvider: CurrencyProvider,
    protected decimalPipe: DecimalPipe,
    protected errorsProvider: ErrorsProvider,
    protected externalLinkProvider: ExternalLinkProvider,
    protected feeProvider: FeeProvider,
    protected logger: Logger,
    protected modalCtrl: ModalController,
    protected navCtrl: NavController,
    protected navParams: NavParams,
    protected onGoingProcessProvider: OnGoingProcessProvider,
    protected platformProvider: PlatformProvider,
    protected profileProvider: ProfileProvider,
    protected popupProvider: PopupProvider,
    protected replaceParametersProvider: ReplaceParametersProvider,
    protected translate: TranslateService,
    protected txConfirmNotificationProvider: TxConfirmNotificationProvider,
    protected txFormatProvider: TxFormatProvider,
    protected walletProvider: WalletProvider,
    protected clipboardProvider: ClipboardProvider,
    protected events: Events,
    protected coinbaseProvider: CoinbaseProvider,
    protected appProvider: AppProvider,
    private iabCardProvider: IABCardProvider
  ) {
    this.token = this.navParams.data.token;
    this.wallet = this.profileProvider.getWallet(this.navParams.data.walletId);
    this.fromWalletDetails = this.navParams.data.fromWalletDetails;
    this.fromCoinbase = this.navParams.data.fromCoinbase;
    this.bitcoreCash = this.bwcProvider.getBitcoreCash();
    this.ducatuscore = this.bwcProvider.getDucatuscore();
    this.CONFIRM_LIMIT_USD = 20;
    this.FEE_TOO_HIGH_LIMIT_PER = 15;
    this.config = this.configProvider.get();
    this.isCordova = this.platformProvider.isCordova;
    this.hideSlideButton = false;
    this.showMultiplesOutputs = false;
    this.recipients = this.navParams.data.recipients;
    this.fromMultiSend = this.navParams.data.fromMultiSend;
    this.fromSelectInputs = this.navParams.data.fromSelectInputs;
    this.appName = this.appProvider.info.nameCase;
    this.isSpeedUpTx = this.navParams.data.speedUpTx;
  }

  ngOnInit() {
    // Overrides the ngOnInit logic of WalletTabsChild
  }

  ionViewWillLeave() {
    this.navCtrl.swipeBackEnabled = true;
  }

  ngOnDestroy() {
    this.events.unsubscribe('Local/TagScan', this.updateDestinationTag);
  }

  private updateDestinationTag: any = data => {
    this.tx.destinationTag = data.value;
  }

  ionViewDidLoad() {
    this.logger.info('Loaded: ConfirmPage');
    this.navCtrl.swipeBackEnabled = false;
    this.isOpenSelector = false;
    this.coin = this.navParams.data.coin;
    let networkName;
    let amount;
    this.setTitle();
    this.getAddressFrom();

    if ( 
      !this.navParams.data.network 
      && this.wallet 
      &&  this.wallet.network
    ) {
      this.navParams.data.network = this.wallet.network;
    }

    if (this.fromSelectInputs) {
      networkName = this.navParams.data.network;
      amount = this.navParams.data.amount
        ? this.navParams.data.amount
        : this.navParams.data.totalInputsAmount;
    } else if (this.fromMultiSend) {
      networkName = this.navParams.data.network;
      amount = this.navParams.data.totalAmount;
    } else {
      amount = this.navParams.data.amount;

      try {
        networkName = this.addressProvider.getCoinAndNetwork(
          this.navParams.data.toAddress,
          this.navParams.data.network || 'livenet'
        ).network;
      } catch (e) {
        const message = this.replaceParametersProvider.replace(
          this.translate.instant(
            '{{appName}} only supports Bitcoin Cash using new version numbers addresses.'
          ),
          { appName: this.appName }
        );
        const backText = this.translate.instant('Go back');
        const learnText = this.translate.instant('Learn more');
        this.popupProvider
          .ionicConfirm(null, message, backText, learnText)
          .then(back => {
            if (!back) {
              const url =
                'https://support.bitpay.com/hc/en-us/articles/115004671663';
              this.externalLinkProvider.open(url);
            }
            this.navCtrl.pop();
          });
        return;
      }
    }
    
    // parseInt('2e21',10) = 2
    // parseInt('2000000000000000000000',10) = 2e+21
    this.tx = {
      toAddress: this.navParams.data.toAddress,
      sendMax: this.navParams.data.useSendMax ? true : false,
      amount:
        this.navParams.data.useSendMax && this.isChain()
          ? 0
          : parseInt(
              Number(amount).toLocaleString('fullwide', { useGrouping: false }), 
              10
            ),
      description: this.navParams.data.description,
      destinationTag: this.navParams.data.destinationTag, // xrp
      paypro: this.navParams.data.paypro,
      data: this.navParams.data.data, // eth
      invoiceID: this.navParams.data.invoiceID, // xrp
      payProUrl: this.navParams.data.payProUrl,
      spendUnconfirmed: this.config.wallet.spendUnconfirmed,

      // Vanity tx info (not in the real tx)
      recipientType: this.navParams.data.recipientType,
      name: this.navParams.data.name,
      email: this.navParams.data.email,
      color: this.navParams.data.color,
      network: this.navParams.data.network
        ? this.navParams.data.network
        : networkName,
      coin: this.navParams.data.coin,
      txp: {},
      tokenAddress: this.navParams.data.tokenAddress,
      wDucxAddress: this.navParams.data.wDucxAddress,
      speedUpTx: this.isSpeedUpTx,
      fromSelectInputs: this.navParams.data.fromSelectInputs ? true : false,
      inputs: this.navParams.data.inputs
    };
    
    this.tx.origToAddress = this.tx.toAddress;

    if (this.navParams.data.requiredFeeRate) {
      this.usingMerchantFee = true;
      this.tx.feeRate = +this.navParams.data.requiredFeeRate;
    } else if (this.isSpeedUpTx) {
      this.usingCustomFee = true;
      this.tx.feeLevel = 'custom';
    } else {
      this.tx.feeLevel = this.feeProvider.getCoinCurrentFeeLevel(this.tx.coin);
    }

    if (this.tx.coin && this.tx.coin == 'bch' && !this.fromMultiSend) {
      this.tx.toAddress = this.bitcoreCash
        .Address(this.tx.toAddress)
        .toString(true);
    }

    this.getAmountDetails();

    const feeOpts = this.feeProvider.getFeeOpts();
    this.tx.feeLevelName = feeOpts[this.tx.feeLevel];
    this.showAddress = false;
    this.walletSelectorTitle = this.translate.instant('Send from');

    this.setWalletSelector(this.tx.coin, this.tx.network)
      .then(() => {
        this.afterWalletSelectorSet();
      })
      .catch(err => {
        this.showErrorInfoSheet(err.msg, err.title, true);
      });

    if (this.isCordova) {
      window.addEventListener('keyboardWillShow', () => {
        this.hideSlideButton = true;
      });

      window.addEventListener('keyboardWillHide', () => {
        this.hideSlideButton = false;
      });
    }
    this.events.subscribe('Local/TagScan', this.updateDestinationTag);
  }

  private setTitle(): void {
    if (this.fromCoinbase) {
      this.mainTitle = this.translate.instant('Confirm Deposit');
    } else if (this.isSpeedUpTx) {
      this.mainTitle = this.translate.instant('Confirm Speed Up');
    } else {
      this.mainTitle = this.translate.instant('Confirm Payment');
    }
  }

  private async getAddressFrom(): Promise<void> {
    await this.walletProvider.getAddress(this.wallet, false).then( address => {
      this.addressFrom = address;
    });
  }

  private getAmountDetails() {
    this.amount = this.decimalPipe.transform(
      this.tx.amount /
        this.currencyProvider.getPrecision(this.coin).unitToSatoshi,
      '1.2-18'
    );
  }

  private isChain() {
    const chain = this.currencyProvider.getAvailableChains();
    return chain.includes(this.coin);
  }

  public getChain(coin: Coin): string {
    return this.currencyProvider.getChain(coin).toLowerCase();
  }

  private afterWalletSelectorSet() {
    if (
      this.wallet &&
      this.tx.coin === this.wallet.coin &&
      this.tx.network === this.wallet.network
    ) {
      this.setWallet(this.wallet);
    } else if (this.wallets.length > 1) {
      return this.showWallets();
    } else if (this.wallets.length) {
      this.setWallet(this.wallets[0]);
    }
  }

  private setWalletSelector(coin: string, network: string): Promise<any> {
    if (
      this.wallet &&
      (this.wallet.network == network && this.wallet.coin == coin)
    ) {
      return Promise.resolve(null);
    }

    this.wallets = this.profileProvider.getWallets({
      onlyComplete: true,
      hasFunds: true,
      network,
      coin
    });

    if (_.isEmpty(this.wallets)) {
      const msg = this.translate.instant(
        'You are trying to send more funds than you have available. Make sure you do not have funds locked by pending transaction proposals.'
      );
      const title = this.translate.instant('No wallets available');
      return Promise.reject({ msg, title });
    }
    return Promise.resolve(null);
  }

  /* sets a wallet on the UI, creates a TXPs for that wallet */

  private setWallet(wallet): void {
    this.wallet = wallet;

    // If select another wallet
    this.tx.coin = this.wallet.coin;

    if (!this.usingCustomFee && !this.usingMerchantFee) {
      this.tx.feeLevel = this.feeProvider.getCoinCurrentFeeLevel(wallet.coin);
    }

    this.setButtonText(
      this.wallet.credentials.m > 1,
      !!this.tx.paypro,
      !!this.fromCoinbase,
      this.isSpeedUpTx
    );

    if (this.tx.paypro) this.paymentTimeControl(this.tx.paypro.expires);
    const exit =
      this.wallet || (this.wallets && this.wallets.length === 1) ? true : false;
    const feeOpts = this.feeProvider.getFeeOpts();
    this.tx.feeLevelName = feeOpts[this.tx.feeLevel];
    this.updateTx(this.tx, this.wallet, { dryRun: true }).catch(err => {
      const previousView = this.navCtrl.getPrevious().name;
      switch (err) {
        case 'insufficient_funds':
          if (this.showUseUnconfirmedMsg()) {
            this.showErrorInfoSheet(
              this.translate.instant(
                'You do not have enough confirmed funds to make this payment. Wait for your pending transactions to confirm or enable "Use unconfirmed funds" in Advanced Settings.'
              ),
              this.translate.instant('No enough confirmed funds'),
              exit
            );
          } else if (previousView === 'AmountPage') {
            // Do not allow user to change or use max amount if previous view is not Amount
            this.showInsufficientFundsInfoSheet();
          } else {
            this.showErrorInfoSheet(
              this.translate.instant(
                'You are trying to send more funds than you have available. Make sure you do not have funds locked by pending transaction proposals.'
              ),
              this.translate.instant('Insufficient funds'),
              exit
            );
          }
          break;
        default:
          this.showErrorInfoSheet(err);
          break;
      }
    });
  }

  private showUseUnconfirmedMsg(): boolean {
    return (
      this.wallet.cachedStatus &&
      this.wallet.cachedStatus.balance.totalAmount >=
        this.tx.amount + this.tx.feeRate &&
      !this.tx.spendUnconfirmed
    );
  }

  private setButtonText(
    isMultisig: boolean,
    isPayPro: boolean,
    isCoinbase: boolean,
    isSpeedUp: boolean
  ): void {
    if (isPayPro) {
      this.buttonText = this.isCordova
        ? this.translate.instant('Slide to pay')
        : this.translate.instant('Click to pay');
    } else if (isCoinbase) {
      this.buttonText = this.isCordova
        ? this.translate.instant('Slide to deposit')
        : this.translate.instant('Click to deposit');
      this.successText =
        this.wallet.credentials.n == 1
          ? this.translate.instant('Deposit success')
          : this.translate.instant('Deposit pending');
    } else if (isMultisig) {
      this.buttonText = this.isCordova
        ? this.translate.instant('Slide to accept')
        : this.translate.instant('Click to accept');
      this.successText =
        this.wallet.credentials.n == 1
          ? this.translate.instant('Payment Sent')
          : this.translate.instant('Proposal created');
    } else if (isSpeedUp) {
      this.buttonText = this.isCordova
        ? this.translate.instant('Slide to speed up')
        : this.translate.instant('Click to speed up');
      this.successText = this.translate.instant('Sped up successfully');
    } else {
      this.buttonText = this.isCordova
        ? this.translate.instant('Slide to send')
        : this.translate.instant('Click to send');
      this.successText = this.translate.instant('Payment Sent');
    }
  }

  protected paymentTimeControl(expires: string): void {
    const expirationTime = Math.floor(new Date(expires).getTime() / 1000);
    this.paymentExpired = false;
    this.setExpirationTime(expirationTime);

    const countDown = setInterval(() => {
      this.setExpirationTime(expirationTime, countDown);
    }, 1000);
  }

  private setExpirationTime(expirationTime: number, countDown?): void {
    const now = Math.floor(Date.now() / 1000);

    if (now > expirationTime) {
      this.paymentExpired = true;
      this.remainingTimeStr = this.translate.instant('Expired');
      if (countDown) {
        /* later */
        clearInterval(countDown);
      }
      return;
    }

    const totalSecs = expirationTime - now;
    const m = Math.floor(totalSecs / 60);
    const s = totalSecs % 60;
    this.remainingTimeStr = ('0' + m).slice(-2) + ':' + ('0' + s).slice(-2);
  }

  private updateTx(tx, wallet, opts): Promise<any> {
    return new Promise((resolve, reject) => {
      if (opts.clearCache) {
        tx.txp = {};
      }

      this.tx = tx;

      // End of quick refresh, before wallet is selected.
      if (!wallet) {
        return resolve(null);
      }

      this.onGoingProcessProvider.set('calculatingFee');
      this.feeProvider
        .getFeeRate(
          wallet.coin,
          tx.network,
          this.usingMerchantFee
            ? this.currencyProvider.getMaxMerchantFee(wallet.coin)
            : this.tx.feeLevel
        )
        .then(feeRate => {
          let msg;
          if (this.usingCustomFee) {
            msg = this.translate.instant('Custom');
            tx.feeLevelName = msg;
          } else if (this.usingMerchantFee) {
            const maxAllowedFee = feeRate * 5;
            this.logger.info(
              `Using Merchant Fee: ${
                tx.feeRate
              } vs. referent level (5 * feeRate) ${maxAllowedFee}`
            );
            const isUtxo = this.currencyProvider.isUtxoCoin(wallet.coin);
            if (
              tx.network != 'testnet' &&
              tx.feeRate > maxAllowedFee &&
              isUtxo
            ) {
              this.onGoingProcessProvider.set('calculatingFee');
              this.showHighFeeSheet();
            }

            msg = this.translate.instant(
              'This payment requires a miner fee of:'
            );
            this.merchantFeeLabel = msg;
          } else {
            const feeOpts = this.feeProvider.getFeeOpts();
            tx.feeLevelName = feeOpts[tx.feeLevel];
            tx.feeRate = feeRate;
          }
          // call getSendMaxInfo if was selected from amount view
          if (tx.sendMax && this.isChain()) {
            this.useSendMax(tx, wallet, opts)
              .then(() => {
                return resolve(null);
              })
              .catch(err => {
                return reject(err);
              });
          } 
          else if (tx.sendMax) {
            this.useSendMaxToken(tx, wallet, opts)
              .then(() => {
                return resolve(null);
              })
              .catch(err => {
                return reject(err);
              });
          }
          else if (tx.speedUpTx && this.isChain()) {
            this.speedUpTx(tx, wallet, opts)
              .then(() => {
                return resolve(null);
              })
              .catch(err => {
                return reject(err);
              });
          } 
          else {
            // txp already generated for this wallet?
            if (tx.txp[wallet.id]) {
              this.onGoingProcessProvider.clear();
              return resolve(null);
            }

            this.buildTxp(tx, wallet, opts)
              .then(() => {
                this.onGoingProcessProvider.clear();
                return resolve(null);
              })
              .catch(err => {
                this.onGoingProcessProvider.clear();
                return reject(err);
              });
          }
        })
        .catch(err => {
          this.logger.warn('Error getting fee rate', err);
          this.onGoingProcessProvider.clear();
          return reject(this.translate.instant('Error getting fee rate'));
        });
    });
  }

  private useSendMax(tx, wallet, opts) {
    return new Promise((resolve, reject) => {
      this.getSendMaxInfo(_.clone(tx), wallet)
        .then(sendMaxInfo => {
          if (sendMaxInfo) {
            this.logger.debug('Send max info', sendMaxInfo);

            if (sendMaxInfo.amount <= 0) {
              this.showErrorInfoSheet(
                this.translate.instant('Not enough funds for fee')
              );
              return resolve(null);
            }
            tx.sendMaxInfo = sendMaxInfo;
            tx.amount = tx.sendMaxInfo.amount;
            this.getAmountDetails();
          }
          this.showWarningSheet(wallet, sendMaxInfo);
          // txp already generated for this wallet?
          if (tx.txp[wallet.id]) {
            return resolve(null);
          }

          this.buildTxp(tx, wallet, opts)
            .then(() => {
              return resolve(null);
            })
            .catch(err => {
              return reject(err);
            });
        })
        .catch(() => {
          const msg = this.translate.instant(
            'Error getting SendMax information'
          );
          return reject(msg);
        });
    });
  }

  private useSendMaxToken(tx, wallet, opts): Promise<void> {
    return new Promise((resolve, reject) => {
      tx.amount = this.getSendMaxAmountToken();
      this.getAmountDetails();
  
      // txp already generated for this wallet?
      if (tx.txp[wallet.id]) {
        this.onGoingProcessProvider.clear();
        return resolve(null);
      }

      this.buildTxp(tx, wallet, opts)
        .then(() => {
          this.onGoingProcessProvider.clear();
          return resolve(null);
        })
        .catch(err => {
          this.onGoingProcessProvider.clear();
          return reject(err);
        });
    });
  }

  public speedUpTx(tx, wallet, opts) {
    return this.getSpeedUpTxInfo(_.clone(tx), wallet)
      .then(speedUpTxInfo => {
        if (speedUpTxInfo) {
          this.logger.debug('Speed Up info', speedUpTxInfo);

          if (speedUpTxInfo.amount <= 0) {
            this.showErrorInfoSheet(
              this.translate.instant('Not enough funds for fee')
            );
            return Promise.resolve(null);
          }
          tx.speedUpTxInfo = speedUpTxInfo;
        }

        return this.feeProvider
          .getSpeedUpTxFee(wallet.network, speedUpTxInfo.size)
          .then(speedUpTxFee => {
            speedUpTxInfo.fee = speedUpTxFee;
            this.showWarningSheet(wallet, speedUpTxInfo);
            return this.getInput(wallet).then(input => {
              tx.speedUpTxInfo.input = input;
              tx.amount = tx.speedUpTxInfo.input.satoshis - speedUpTxInfo.fee;

              this.tx.amount = tx.amount;
              this.getAmountDetails();
              return this.buildTxp(tx, wallet, opts);
            });
          })
          .catch(err => {
            const error = err
              ? err
              : this.translate.instant('Error getting Speed Up fee');
            return Promise.reject(error);
          });
      })
      .catch(err => {
        const error = err
          ? err
          : this.translate.instant('Error getting Speed Up information');
        return Promise.reject(error);
      });
  }

  protected getFeeRate(amount: number, fee: number) {
    return (fee / (amount + fee)) * 100;
  }

  protected isHighFee(amount: number, fee: number) {
    return this.getFeeRate(amount, fee) > this.FEE_TOO_HIGH_LIMIT_PER;
  }

  protected showHighFeeSheet() {
    const minerFeeInfoSheet = this.actionSheetProvider.createInfoSheet(
      'miner-fee'
    );
    minerFeeInfoSheet.present();
  }

  private buildTxp(tx, wallet, opts): Promise<any> {
    return new Promise((resolve, reject) => {
      this.getTxp(_.clone(tx), wallet, opts.dryRun)
        .then(txp => {
          if (this.currencyProvider.isUtxoCoin(tx.coin)) {
            const per = this.getFeeRate(txp.amount, txp.fee);
            txp.feeRatePerStr = per.toFixed(2) + '%';
            txp.feeTooHigh = this.isHighFee(txp.amount, txp.fee);
          }

          if (txp.feeTooHigh) {
            this.showHighFeeSheet();
          }

          tx.txp[wallet.id] = txp;
          this.tx = tx;
          this.logger.debug(
            'Confirm. TX Fully Updated for wallet:' +
              wallet.id +
              ' Txp:' +
              txp.id
          );
          return resolve(null);
        })
        .catch(err => {
          if (err.message == 'Insufficient funds') {
            return reject('insufficient_funds');
          } else {
            return reject(err);
          }
        });
    });
  }

  private getSendMaxInfo(tx, wallet): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!tx.sendMax) return resolve(null);

      this.onGoingProcessProvider.set('retrievingInputs');
      this.walletProvider
        .getSendMaxInfo(wallet, {
          feePerKb: tx.feeRate,
          excludeUnconfirmedUtxos: !tx.spendUnconfirmed,
          returnInputs: true
        })
        .then(res => {
          this.onGoingProcessProvider.clear();
          return resolve(res);
        })
        .catch(err => {
          this.onGoingProcessProvider.clear();
          this.logger.warn('Error getting send max info', err);
          return reject(err);
        });
    });
  }

  private getSendMaxAmountToken(): number {
    let maxAmountToken = this.wallet.cachedStatus.availableBalanceSat;
    
    return maxAmountToken;
  }

  private getSpeedUpTxInfo(tx, wallet): Promise<any> {
    if (!tx.speedUpTx) return Promise.resolve(null);

    this.onGoingProcessProvider.set('retrievingInputs');
    return this.walletProvider
      .getTx(wallet, this.navParams.data.txid)
      .then(res => {
        this.onGoingProcessProvider.clear();
        return Promise.resolve(res);
      })
      .catch(err => {
        this.onGoingProcessProvider.clear();
        this.logger.warn('Error getting speed up info', err);
        return Promise.reject(err);
      });
  }

  private showWarningSheet(wallet, info): void {
    if (!info) return;

    let msg, infoSheetType;

    if (this.tx.sendMax) {
      const warningMsg = this.verifyExcludedUtxos(wallet, info);
      msg = !_.isEmpty(warningMsg) ? warningMsg : '';
      infoSheetType = 'miner-fee-notice';
    } else {
      infoSheetType = 'speed-up-notice';
      msg = '';
    }

    const coinName = this.currencyProvider.getCoinName(wallet.coin);

    const { unitToSatoshi } = this.currencyProvider.getPrecision(this.tx.coin);

    const fee = info.fee / unitToSatoshi;

    const minerFeeNoticeInfoSheet = this.actionSheetProvider.createInfoSheet(
      infoSheetType,
      {
        coinName,
        fee,
        coin: this.tx.coin.toUpperCase(),
        msg
      }
    );
    minerFeeNoticeInfoSheet.present();
  }

  private verifyExcludedUtxos(_, sendMaxInfo) {
    const warningMsg = [];
    if (sendMaxInfo.utxosBelowFee > 0) {
      const amountBelowFeeStr =
        sendMaxInfo.amountBelowFee /
        this.currencyProvider.getPrecision(this.tx.coin).unitToSatoshi;
      const message = this.replaceParametersProvider.replace(
        this.translate.instant(
          'A total of {{amountBelowFeeStr}} {{coin}} were excluded. These funds come from UTXOs smaller than the network fee provided.'
        ),
        { amountBelowFeeStr, coin: this.tx.coin.toUpperCase() }
      );
      warningMsg.push(message);
    }

    if (sendMaxInfo.utxosAboveMaxSize > 0) {
      const amountAboveMaxSizeStr =
        sendMaxInfo.amountAboveMaxSize /
        this.currencyProvider.getPrecision(this.tx.coin).unitToSatoshi;
      const message = this.replaceParametersProvider.replace(
        this.translate.instant(
          'A total of {{amountAboveMaxSizeStr}} {{coin}} were excluded. The maximum size allowed for a transaction was exceeded.'
        ),
        { amountAboveMaxSizeStr, coin: this.tx.coin.toUpperCase() }
      );
      warningMsg.push(message);
    }
    return warningMsg.join('\n');
  }

  private getTxp(tx, wallet, dryRun: boolean): Promise<any> {
    return new Promise((resolve, reject) => {
      // ToDo: use a credential's (or fc's) function for this
      if (tx.description && !wallet.credentials.sharedEncryptingKey) {
        const msg = this.translate.instant(
          'Could not add message to imported wallet without shared encrypting key'
        );
        return reject(msg);
      }
      if (
        this.currencyProvider.isUtxoCoin(tx.coin) &&
        tx.amount > Number.MAX_SAFE_INTEGER
      ) {
        const msg = this.translate.instant('Amount too big');
        return reject(msg);
      }

      const txp: Partial<TransactionProposal> = {};
      // set opts.coin to wallet.coin
      txp.coin = wallet.coin;

      if (this.fromMultiSend) {
        txp.outputs = [];
        this.navParams.data.recipients.forEach(recipient => {
          if (tx.coin && tx.coin == 'bch') {
            recipient.toAddress = this.bitcoreCash
              .Address(recipient.toAddress)
              .toString(true);

            recipient.addressToShow = this.walletProvider.getAddressView(
              tx.coin,
              tx.network,
              recipient.toAddress
            );
          }

          if (tx.coin && tx.coin == 'duc') {
            recipient.toAddress = this.ducatuscore
              .Address(recipient.toAddress)
              .toString(true);

            recipient.addressToShow = this.walletProvider.getAddressView(
              tx.coin,
              tx.network,
              recipient.toAddress
            );
          }

          txp.outputs.push({
            toAddress: recipient.toAddress,
            amount: recipient.amount,
            message: tx.description,
            data: tx.data
          });
        });
      } else if (tx.paypro) {
        txp.outputs = [];
        const { instructions } = tx.paypro;
        for (const instruction of instructions) {
          txp.outputs.push({
            toAddress: instruction.toAddress,
            amount: instruction.amount,
            message: instruction.message,
            data: instruction.data
          });
        }
      } else {
        if (tx.fromSelectInputs) {
          const size = this.walletProvider.getEstimatedTxSize(
            wallet,
            1,
            tx.inputs.length
          );
          const result = (tx.feeRate / 1000).toFixed(0);
          const estimatedFee =
            size * parseInt(
              Number(result).toLocaleString('fullwide', { useGrouping: false }), 
              10
            );
          tx.fee = estimatedFee;
          tx.amount = tx.amount - estimatedFee;
        }

        txp.outputs = [
          {
            toAddress: tx.toAddress,
            amount: tx.amount,
            message: tx.description,
            data: tx.data
          }
        ];
      }
      txp.excludeUnconfirmedUtxos = !tx.spendUnconfirmed;
      txp.dryRun = dryRun;

      if (tx.sendMaxInfo) {
        txp.inputs = tx.sendMaxInfo.inputs;
        txp.fee = tx.sendMaxInfo.fee;
      } else if (tx.speedUpTx) {
        txp.inputs = [];
        txp.inputs.push(tx.speedUpTxInfo.input);
        txp.fee = tx.speedUpTxInfo.fee;
        txp.excludeUnconfirmedUtxos = true;
      } else if (tx.fromSelectInputs) {
        txp.inputs = tx.inputs;
        txp.fee = tx.fee;
      } else {
        if (this.usingCustomFee || this.usingMerchantFee) {
          txp.feePerKb = tx.feeRate;
        } else txp.feeLevel = tx.feeLevel;
      }

      txp.message = tx.description;

      if (tx.paypro) {
        txp.payProUrl = tx.payProUrl;
        tx.paypro.host = new URL(tx.payProUrl).host;
      }

      if (tx.recipientType == 'wallet') {
        txp.customData = {
          toWalletName: tx.name ? tx.name : null
        };
      } else if (tx.recipientType == 'coinbase') {
        txp.customData = {
          service: 'coinbase'
        };
      }

      if (tx.tokenAddress) {
        txp.tokenAddress = tx.tokenAddress;
        txp.wDucxAddress = tx.wDucxAddress;

        const originalChain = this.bwcProvider.getUtils().getChain(tx.coin);
        let chain;
        switch (originalChain) {
          case 'DUCX':
            chain = 'DRC20';
            break;
          default:
            chain = 'ERC20';
        }
        if (tx.wDucxAddress) {
          chain = 'TOB';
        }
        
        for (const output of txp.outputs) {
          if (!output.data) {
            output.data = this.bwcProvider
              .getCore()
              .Transactions.get({ chain })
              .encodeData({
                recipients: [
                  { address: output.toAddress, amount: output.amount }
                ],
                tokenAddress: tx.tokenAddress,
                wDucxAddress: tx.wDucxAddress
              });
          }
        }
      }

      if (wallet.coin === 'xrp') {
        txp.invoiceID = tx.invoiceID;
        txp.destinationTag = tx.destinationTag;
      }

      this.walletProvider
        .getAddress(this.wallet, false)
        .then(address => {
          txp.from = address;

          if (this.token && this.token.type === 'erc721') {
            txp.tokenAddress = this.token.base.address;
            txp.tokenId = this.token.selected.tokenId;

            for (const output of txp.outputs) {
              if (!output.data) {
                output.data = this.bwcProvider
                  .getCore()
                  .Transactions.get({ chain: 'ERC721' })
                  .encodeData({
                    recipients: [
                      {
                        address: output.toAddress,
                        amount: output.amount
                      }
                    ],
                    from: address,
                    tokenId: this.token.selected.tokenId,
                    tokenAddress: tx.tokenAddress
                  });
              }
            }
          }
          
          this.walletProvider
            .createTx(wallet, txp)
            .then(ctxp => {
              return resolve(ctxp);
            })
            .catch(err => {
              return reject(err);
            });
        })
        .catch(err => {
          return reject(err);
        });
    });
  }

  private getInput(wallet): Promise<any> {
    return this.walletProvider.getUtxos(wallet).then(utxos => {
      let biggestUtxo = 0;
      let input;
      _.forEach(utxos, (u, i) => {
        if (u.txid === this.navParams.data.txid) {
          if (u.amount > biggestUtxo) {
            biggestUtxo = u.amount;
            input = utxos[i];
          }
        } else {
          if (u.confirmations <= 0)
            throw new Error(
              this.translate.instant(
                'Some inputs you want to speed up have no confirmations. Please wait until they are confirmed and try again.'
              )
            );
        }
      });
      return input;
    });
  }

  private showInsufficientFundsInfoSheet(): void {
    const insufficientFundsInfoSheet = this.actionSheetProvider.createInfoSheet(
      'insufficient-funds'
    );
    insufficientFundsInfoSheet.present();
    insufficientFundsInfoSheet.onDidDismiss(option => {
      if (option || typeof option === 'undefined') {
        this.fromWalletDetails ? this.navCtrl.pop() : this.navCtrl.popToRoot();
      } else {
        this.tx.sendMax = true;
        this.setWallet(this.wallet);
      }
    });
  }

  public showErrorInfoSheet(
    error: Error | string,
    title?: string,
    exit?: boolean
  ): void {
    let msg: string;

    if (!error) {
      return;
    }

    this.logger.warn('ERROR:', error);
    
    if (this.isCordova) {
      this.slideButton.isConfirmed(false);
    }

    if (
      (error as Error).message === 'FINGERPRINT_CANCELLED' 
      || (error as Error).message === 'PASSWORD_CANCELLED'
    ) {
      return;
    }

    if ((error as Error).message === 'WRONG_PASSWORD') {
      this.errorsProvider.showWrongEncryptPasswordError();
      return;
    }
    
    // Currently the paypro error is the following string: 500 - "{}"
    if (error.toString().includes('64: dust')) {
      msg = this.translate.instant(
        'The transaction was rejected by network rules.(64: dust)'
      );
    } else if (error.toString().includes('500')) {
      msg = this.translate.instant(
        'Error 500 - There is a temporary problem, please try again later.'
      );
    }

    const infoSheetTitle = title ? title : this.translate.instant('Error');

    this.errorsProvider.showDefaultError(
      msg || this.bwcErrorProvider.msg(error),
      infoSheetTitle,
      () => {
        if (exit) {
          this.fromWalletDetails
            ? this.navCtrl.popToRoot()
            : this.navCtrl.last().name == 'ConfirmCardPurchasePage'
              ? this.navCtrl.pop()
              : this.app
                  .getRootNavs()[0]
                  .setRoot(TabsPage)
                  .then(() =>
                    this.app
                      .getRootNav()
                      .getActiveChildNav()
                      .select(1)
                  ); // using setRoot(TabsPage) as workaround when coming from scanner
        }
      }
    );
  }

  public toggleAddress(): void {
    this.showAddress = !this.showAddress;
  }

  public onWalletSelect(wallet): void {
    this.setWallet(wallet);
  }

  public approve(tx, wallet): Promise<void> {
    if (!tx || !wallet) return undefined;
    
    if (this.paymentExpired) {
      this.showErrorInfoSheet(
        this.translate.instant('This bitcoin payment request has expired.')
      );
      return undefined;
    }

    this.onGoingProcessProvider.set('creatingTx');
    
    return this.getTxp(_.clone(tx), wallet, false)
      .then(txp => {
        this.logger.debug('Transaction Fee:', txp.fee);
        
        return this.confirmTx(txp, wallet)
          .then((nok: boolean) => {
            if (nok) {
              if (this.isCordova) this.slideButton.isConfirmed(false);
              this.onGoingProcessProvider.clear();
              return;
            }
            this.publishAndSign(txp, wallet);
          });
      })
      .catch(err => {
        this.onGoingProcessProvider.clear();
        this.logger.warn('Error getting transaction proposal', err);
      });
  }

  private confirmTx(txp, wallet) {
    
    return new Promise<boolean>(resolve => {

      if (wallet.isPrivKeyEncrypted) {
        return resolve(false);
      }

      this.txFormatProvider.formatToUSD(wallet.coin, txp.amount)
        .then(val => {
          const amountUsd = parseFloat(val);
          
          if (amountUsd <= this.CONFIRM_LIMIT_USD) {
            return resolve(false);
          }
          
          const unit = txp.coin.toUpperCase();
          const amount = (
            this.tx.amount 
            / this.currencyProvider.getPrecision(txp.coin).unitToSatoshi
          ).toFixed(8);
          const name = wallet.name;
          const message = this.replaceParametersProvider.replace(
            this.translate.instant(
              'Sending {{amount}} {{unit}} from your {{name}} wallet'
            ),
            { amount, unit, name }
          );
          const okText = this.translate.instant('Confirm');
          const cancelText = this.translate.instant('Cancel');
            
          this.popupProvider
            .ionicConfirm(null, message, okText, cancelText)
            .then((ok: boolean) => {
              return resolve(!ok);
            });
        })
        .catch(err => {
          this.logger.warn('Error getting transaction proposal', err);
        });
    });
  }

  protected publishAndSign(txp, wallet) {
    if (!wallet.canSign) {
      return this.onlyPublish(txp, wallet);
    }

    return this.walletProvider
      .publishAndSign(wallet, txp)
      .then(txp => {
        this.onGoingProcessProvider.clear();
        if (
          this.config.confirmedTxsNotifications &&
          this.config.confirmedTxsNotifications.enabled
        ) {
          this.txConfirmNotificationProvider.subscribe(wallet, {
            txid: txp.txid
          });
        }
        let redir;
        if (txp.payProUrl && txp.payProUrl.includes('redir=wc')) {
          redir = 'wc';
        }
        return this.openFinishModal(false, { redir });
      })
      .catch(err => {
        if (this.isCordova) this.slideButton.isConfirmed(false);
        this.onGoingProcessProvider.clear();
        this.showErrorInfoSheet(err);
        if (txp.payProUrl) {
          this.logger.warn('Paypro error: removing payment proposal');
          this.walletProvider.removeTx(wallet, txp).catch(() => {
            this.logger.warn('Could not delete payment proposal');
          });
        }
      });
  }

  private onlyPublish(txp, wallet): Promise<void> {
    this.logger.info('No signing proposal: No private key');
    this.onGoingProcessProvider.set('sendingTx');
    return this.walletProvider
      .onlyPublish(wallet, txp)
      .then(() => {
        this.onGoingProcessProvider.clear();
        this.openFinishModal(true);
      })
      .catch(err => {
        this.onGoingProcessProvider.clear();
        this.showErrorInfoSheet(err);
      });
  }

  protected async openFinishModal(
    onlyPublish?: boolean,
    redirectionParam?: { redir: string }
  ) {
    const { redir } = redirectionParam;

    let params: {
      finishText: string;
      finishComment?: string;
      autoDismiss?: boolean;
    } = {
      finishText: this.successText,
      autoDismiss: !!redir
    };
    if (onlyPublish) {
      const finishText = this.translate.instant('Payment Published');
      const finishComment = this.translate.instant(
        'You could sign the transaction later in your wallet details'
      );
      params = { finishText, finishComment };
    }
    const modal = this.modalCtrl.create(FinishModalPage, params, {
      showBackdrop: true,
      enableBackdropDismiss: false,
      cssClass: 'finish-modal'
    });
    await modal.present();

    this.clipboardProvider.clearClipboardIfValidData([
      'PayPro',
      'BitcoinUri',
      'DucatusUri',
      'BitcoinCashUri',
      'EthereumUri',
      'RippleUri',
      'InvoiceUri'
    ]);

    this.navCtrl.popToRoot().then(_ => {
      if (this.fromCoinbase) {
        this.coinbaseProvider.logEvent({
          method: 'deposit',
          amount: this.amount,
          currency: this.coin
        });
        this.navCtrl.push(CoinbaseAccountPage, {
          id: this.fromCoinbase.accountId
        });
      } else {
        if (redir) {
          setTimeout(() => {
            this.iabCardProvider.sendMessage(
              {
                message: 'paymentBroadcasted'
              },
              () => {
                this.logger.log('card IAB -> payment broadcasting opening IAB');
              }
            );
            this.iabCardProvider.show();
          }, 1000);
        } else {
          this.navCtrl.push(WalletDetailsPage, {
            walletId: this.wallet.credentials.walletId
          });
        }
      }
    });
  }

  public chooseFeeLevel(): void {
    if (
      this.tx.coin === 'bch' ||
      this.tx.coin === 'xrp' ||
      this.usingMerchantFee ||
      this.tx.speedUpTxInfo
    )
      return;

    const txObject = {
      network: this.tx.network,
      coin: this.tx.coin,
      feeLevel: this.tx.feeLevel,
      noSave: true,
      customFeePerKB: this.usingCustomFee ? this.tx.feeRate : undefined,
      feePerSatByte: this.usingCustomFee ? this.tx.feeRate / 1000 : undefined
    };

    const chooseFeeLevelAction = this.actionSheetProvider.createChooseFeeLevel(
      txObject
    );
    chooseFeeLevelAction.present();
    chooseFeeLevelAction.onDidDismiss(data => {
      this.onFeeModalDismiss(data);
    });
  }

  private onFeeModalDismiss(data) {
    if (_.isEmpty(data)) return;

    this.logger.debug(
      'New fee level chosen:' + data.newFeeLevel + ' was:' + this.tx.feeLevel
    );
    this.usingCustomFee = data.newFeeLevel == 'custom' ? true : false;

    if (this.tx.feeLevel == data.newFeeLevel && !this.usingCustomFee) {
      return;
    }

    this.tx.feeLevel = data.newFeeLevel;
    const feeOpts = this.feeProvider.getFeeOpts();
    this.tx.feeLevelName = feeOpts[this.tx.feeLevel];
    if (this.usingCustomFee)
      this.tx.feeRate = parseInt(
        Number(data.customFeePerKB).toLocaleString('fullwide', { useGrouping: false }), 
        10
      );

    this.updateTx(this.tx, this.wallet, {
      clearCache: true,
      dryRun: true
    }).catch(err => {
      this.showErrorInfoSheet(err);
      this.logger.warn('Error updateTx', err);
    });
  }

  public showWallets(): void {
    this.isOpenSelector = true;
    const id = this.wallet ? this.wallet.credentials.walletId : null;
    const params = {
      wallets: this.wallets,
      selectedWalletId: id,
      title: this.walletSelectorTitle
    };
    const walletSelector = this.actionSheetProvider.createWalletSelector(
      params
    );
    walletSelector.present();
    walletSelector.onDidDismiss(wallet => {
      this.onSelectWalletEvent(wallet);
    });
  }

  private onSelectWalletEvent(wallet): void {
    if (!_.isEmpty(wallet)) this.onWalletSelect(wallet);
    this.isOpenSelector = false;
  }

  public close() {
    this.navCtrl.popToRoot();
  }

  public editMemo(memo: string) {
    const memoComponent = this.actionSheetProvider.createMemoComponent(memo);
    memoComponent.present();
    memoComponent.onDidDismiss(memo => {
      if (memo) this.tx.description = memo;
    });
  }

  public openScanner(): void {
    this.navCtrl.push(ScanPage, { fromConfirm: true });
  }
}
