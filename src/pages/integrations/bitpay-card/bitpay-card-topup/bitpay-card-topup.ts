import { Component, ViewChild } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { ModalController, NavController, NavParams } from 'ionic-angular';
import * as _ from 'lodash';
import { Logger } from '../../../../providers/logger/logger';

// Pages
import { FinishModalPage } from '../../../finish/finish';
import { BitPayCardPage } from '../bitpay-card';

// Provider
import { IABCardProvider, IncomingDataProvider } from '../../../../providers';
import { ActionSheetProvider } from '../../../../providers/action-sheet/action-sheet';
import { BitPayCardProvider } from '../../../../providers/bitpay-card/bitpay-card';
import { BitPayProvider } from '../../../../providers/bitpay/bitpay';
import { BwcErrorProvider } from '../../../../providers/bwc-error/bwc-error';
import { BwcProvider } from '../../../../providers/bwc/bwc';
import { ConfigProvider } from '../../../../providers/config/config';
import {
  Coin,
  CurrencyProvider
} from '../../../../providers/currency/currency';
import { ExternalLinkProvider } from '../../../../providers/external-link/external-link';
import { FeeProvider } from '../../../../providers/fee/fee';
import { OnGoingProcessProvider } from '../../../../providers/on-going-process/on-going-process';
import { PayproProvider } from '../../../../providers/paypro/paypro';
import { PlatformProvider } from '../../../../providers/platform/platform';
import { PopupProvider } from '../../../../providers/popup/popup';
import { ProfileProvider } from '../../../../providers/profile/profile';
import { TxFormatProvider } from '../../../../providers/tx-format/tx-format';
import {
  TransactionProposal,
  WalletProvider
} from '../../../../providers/wallet/wallet';

const FEE_TOO_HIGH_LIMIT_PER = 15;

@Component({
  selector: 'page-bitpay-card-topup',
  templateUrl: 'bitpay-card-topup.html'
})
export class BitPayCardTopUpPage {
  @ViewChild('slideButton')
  slideButton;

  public cardId;
  public useSendMax: boolean;
  public amount;
  public currency;
  public isCordova;
  public wallets;

  public totalAmountStr;
  public invoiceFee;
  public networkFee;
  public totalAmount;
  public wallet;
  public currencyIsoCode;
  public amountUnitStr;
  public lastFourDigits;
  public brand;
  public currencySymbol;
  public rate;
  private countDown;
  public paymentExpired: boolean;
  public remainingTimeStr: string;
  public isERCToken: boolean;

  private bitcoreCash;
  private createdTx;
  private configWallet;

  public isOpenSelector: boolean;

  constructor(
    private actionSheetProvider: ActionSheetProvider,
    private bitPayCardProvider: BitPayCardProvider,
    private bitPayProvider: BitPayProvider,
    private bwcErrorProvider: BwcErrorProvider,
    private bwcProvider: BwcProvider,
    private configProvider: ConfigProvider,
    private currencyProvider: CurrencyProvider,
    private externalLinkProvider: ExternalLinkProvider,
    public incomingDataProvider: IncomingDataProvider,
    private logger: Logger,
    private modalCtrl: ModalController,
    private navCtrl: NavController,
    private navParams: NavParams,
    private onGoingProcessProvider: OnGoingProcessProvider,
    private popupProvider: PopupProvider,
    private profileProvider: ProfileProvider,
    private txFormatProvider: TxFormatProvider,
    private walletProvider: WalletProvider,
    private translate: TranslateService,
    private platformProvider: PlatformProvider,
    private feeProvider: FeeProvider,
    private payproProvider: PayproProvider,
    private iabCardProvider: IABCardProvider
  ) {
    this.configWallet = this.configProvider.get().wallet;
    this.isCordova = this.platformProvider.isCordova;
    this.bitcoreCash = this.bwcProvider.getBitcoreCash();
  }

  ionViewDidLoad() {
    this.logger.info('Loaded: BitPayCardTopUpPage');
  }

  ionViewWillLeave() {
    this.navCtrl.swipeBackEnabled = true;
  }

  ionViewWillEnter() {
    this.isOpenSelector = false;
    this.navCtrl.swipeBackEnabled = false;

    this.cardId = this.navParams.data.id;
    this.useSendMax = this.navParams.data.useSendMax;
    this.currency = this.navParams.data.currency;
    this.amount = this.navParams.data.amount;

    let coin = Coin[this.currency] ? Coin[this.currency] : null;

    this.bitPayCardProvider
      .get({
        cardId: this.cardId,
        noBalance: true,
        noHistory: true
      })
      .then(card => {
        this.bitPayCardProvider.setCurrencySymbol(card[0]);
        this.brand = card[0].brand;
        this.lastFourDigits = card[0].lastFourDigits;
        this.currencySymbol = card[0].currencySymbol;
        this.currencyIsoCode = card[0].currency;

        this.wallets = this.profileProvider.getWallets({
          onlyComplete: true,
          coin,
          network: this.bitPayProvider.getEnvironment().network,
          hasFunds: true,
          minFiatCurrency: { amount: this.amount, currency: this.currency }
        });

        if (_.isEmpty(this.wallets)) {
          this.showErrorAndBack(
            null,
            this.translate.instant('No wallets available')
          );
          return;
        }

        this.showWallets(); // Show wallet selector
      });
  }

  private updateRates(coin: string) {
    this.bitPayCardProvider.getRatesFromCoin(
      coin.toUpperCase(),
      this.currencyIsoCode,
      (err, r) => {
        if (err) this.logger.error(err);
        this.rate = r.rate;
      }
    );
  }

  private _resetValues() {
    this.totalAmountStr = this.amount = this.invoiceFee = this.networkFee = this.totalAmount = this.wallet = null;
    this.createdTx = null;
  }

  private showErrorAndBack(title: string, msg) {
    if (this.isCordova) this.slideButton.isConfirmed(false);
    title = title ? title : this.translate.instant('Error');
    this.logger.error(msg);
    msg = msg && msg.errors ? msg.errors[0].message : msg;
    this.popupProvider.ionicAlert(title, msg).then(() => {
      this.navCtrl.pop();
    });
  }

  private showError(title: string, msg): Promise<any> {
    return new Promise(resolve => {
      if (this.isCordova) this.slideButton.isConfirmed(false);
      title = title || this.translate.instant('Error');
      this.logger.error(msg);
      msg = msg && msg.errors ? msg.errors[0].message : msg;
      this.popupProvider.ionicAlert(title, msg).then(() => {
        return resolve(null);
      });
    });
  }

  private satToFiat(coin: string, sat: number): Promise<any> {
    return new Promise(resolve => {
      this.txFormatProvider
        .toFiat(coin, sat, this.currencyIsoCode)
        .then((value: string) => {
          return resolve(value);
        });
    });
  }

  private publishAndSign(wallet, txp): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!wallet.canSign) {
        let err = this.translate.instant('No signing proposal: No private key');
        return reject(err);
      }

      this.walletProvider
        .publishAndSign(wallet, txp)
        .then(txp => {
          this.onGoingProcessProvider.clear();
          return resolve(txp);
        })
        .catch(err => {
          this.onGoingProcessProvider.clear();
          this.logger.warn('Paypro error: removing payment proposal');
          this.walletProvider.removeTx(wallet, txp).catch(() => {
            this.logger.warn('Could not delete payment proposal');
          });
          return reject(err);
        });
    });
  }

  private setTotalAmount(
    wallet,
    amountSat: number,
    invoiceFeeSat: number,
    networkFeeSat: number
  ) {
    const chain = this.currencyProvider.getChain(wallet.coin).toLowerCase();
    this.satToFiat(this.isERCToken ? wallet.coin : chain, amountSat).then(
      (a: string) => {
        this.amount = Number(a);

        this.satToFiat(chain, invoiceFeeSat).then((i: string) => {
          this.invoiceFee = Number(i);

          this.satToFiat(chain, networkFeeSat).then((n: string) => {
            this.networkFee = Number(n);
            this.totalAmount = this.amount + this.invoiceFee + this.networkFee;
          });
        });
      }
    );
  }

  private isCryptoCurrencySupported(wallet, invoice) {
    let COIN = wallet.coin.toUpperCase();
    if (!invoice['supportedTransactionCurrencies'][COIN]) return false;
    return invoice['supportedTransactionCurrencies'][COIN].enabled;
  }

  private createInvoice(data): Promise<any> {
    return new Promise((resolve, reject) => {
      this.bitPayCardProvider.topUp(this.cardId, data, (err, invoiceId) => {
        if (err) {
          return reject({
            title: 'Could not create the invoice',
            message: err
          });
        }

        this.bitPayCardProvider.getInvoice(invoiceId, (err, inv) => {
          if (err) {
            return reject({
              title: 'Could not get the invoice',
              message: err
            });
          }
          return resolve(inv);
        });
      });
    });
  }

  private createTx(wallet, invoice, message: string): Promise<any> {
    let COIN = wallet.coin.toUpperCase();
    return new Promise((resolve, reject) => {
      const paymentCode = this.currencyProvider.getPaymentCode(wallet.coin);
      const protocolUrl = invoice.paymentCodes[COIN][paymentCode];
      const payProUrl = this.incomingDataProvider.getPayProUrl(protocolUrl);

      if (!payProUrl) {
        return reject({
          title: this.translate.instant('Error in Payment Protocol'),
          message: this.translate.instant('Invalid URL')
        });
      }

      this.payproProvider
        .getPayProDetails(payProUrl, wallet.coin)
        .then(details => {
          const { instructions } = details;

          this.logger.debug(
            `PayProDetails instructions amount ${_.sumBy(
              instructions,
              'amount'
            )}`
          );
          let txp: Partial<TransactionProposal> = {
            coin: wallet.coin,
            amount: _.sumBy(instructions, 'amount'),
            toAddress: instructions[0].toAddress,
            outputs: [],
            message,
            customData: {
              service: 'debitcard'
            },
            payProUrl,
            excludeUnconfirmedUtxos: this.configWallet.spendUnconfirmed
              ? false
              : true
          };

          for (const instruction of instructions) {
            txp.outputs.push({
              toAddress: instruction.toAddress,
              amount: instruction.amount,
              message: instruction.message,
              data: instruction.data
            });
          }

          if (
            wallet.coin === 'xrp' &&
            instructions &&
            instructions[0] &&
            instructions[0].outputs &&
            instructions[0].outputs[0] &&
            instructions[0].outputs[0].invoiceID
          ) {
            txp.invoiceID = instructions[0].outputs[0].invoiceID;
          }

          if (wallet.credentials.token) {
            txp.tokenAddress = wallet.credentials.token.address;
          }

          if (details.requiredFeeRate) {
            const requiredFeeRate = !this.currencyProvider.isUtxoCoin(
              wallet.coin
            )
              ? details.requiredFeeRate
              : Math.ceil(details.requiredFeeRate * 1024);
            txp.feePerKb = requiredFeeRate;
            this.logger.debug(
              `PayProDetails requiredFeeRate: ${
                details.requiredFeeRate
              }. Txp feePerKb: ${txp.feePerKb}`
            );
            this.logger.debug(
              'Using merchant fee rate (for debit card):' + txp.feePerKb
            );
          } else {
            txp.feeLevel = this.feeProvider.getCoinCurrentFeeLevel(wallet.coin);
          }

          txp['origToAddress'] = txp.toAddress;

          if (wallet.coin && wallet.coin == 'bch') {
            txp.toAddress = this.bitcoreCash
              .Address(txp.toAddress)
              .toString(true);
            txp.outputs[0].toAddress = txp.toAddress;
          }

          return this.walletProvider
            .getAddress(this.wallet, false)
            .then(address => {
              txp.from = address;
              this.walletProvider
                .createTx(wallet, txp)
                .then(ctxp => {
                  return resolve(ctxp);
                })
                .catch(err => {
                  return reject({
                    title: this.translate.instant(
                      'Could not create transaction'
                    ),
                    message: this.bwcErrorProvider.msg(err)
                  });
                });
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

  private getSendMaxInfo(wallet): Promise<any> {
    return new Promise((resolve, reject) => {
      this.feeProvider
        .getFeeRate(
          wallet.coin,
          wallet.credentials.network,
          this.feeProvider.getCoinCurrentFeeLevel(wallet.coin)
        )
        .then(feePerKb => {
          this.walletProvider
            .getSendMaxInfo(wallet, {
              feePerKb,
              excludeUnconfirmedUtxos: !this.configWallet.spendUnconfirmed,
              returnInputs: true
            })
            .then(async resp => {
              if (this.currencyProvider.isERCToken(wallet.coin)) {
                const tokenAddress = wallet.credentials.token.address;
                try {
                  const {
                    availableAmount
                  } = await this.walletProvider.getBalance(wallet, {
                    tokenAddress
                  });
                  return resolve({
                    sendMax: true,
                    amount: availableAmount,
                    inputs: resp.inputs,
                    fee: resp.fee,
                    feePerKb
                  });
                } catch (err) {
                  return reject(err);
                }
              }
              return resolve({
                sendMax: true,
                amount: resp.amount,
                inputs: resp.inputs,
                fee: resp.fee,
                feePerKb
              });
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

  private calculateAmount(wallet): Promise<any> {
    let COIN = wallet.coin.toUpperCase();
    return new Promise((resolve, reject) => {
      // Global variables defined beforeEnter
      let a = this.amount;
      let c = this.currency;

      if (this.useSendMax) {
        // Workaround to get invoiceFeeSat and payProFeeSat to calculate newAmountSat for the invoice
        // getSendMaxInfo to get *maxAmountSat* and *maxAmountFeeSat*
        // Create 1usd invoice to get payProUrl and *invoiceFeeSat*
        // getPayProDetails to get requiredFeeRate and calculate *payProFeeSat*
        // Get *transactionFee* comparing *maxAmountFeeSat* and *payProFeeSat*
        // Calculate newAmountSat = maxAmountSat - invoiceFeeSat - transactionFee

        this.logger.debug(`Calculating wallet send max`);

        this.getSendMaxInfo(wallet)
          .then(maxValues => {
            const maxAmountSat = maxValues.amount;
            const maxAmountFeeSat = maxValues.feePerKb;

            this.logger.debug(
              `getSendMaxInfo -> maxAmountSat: ${maxAmountSat} - maxAmountFeeSat: ${maxAmountFeeSat}`
            );

            this.logger.debug(`Creating 1usd invoice`);

            this.createInvoice({
              amount: 1,
              currency: 'USD'
            })
              .then(inv => {
                // Check if COIN is enabled in this account
                if (!this.isCryptoCurrencySupported(wallet, inv)) {
                  return reject({
                    message: this.translate.instant(
                      'Top-up with this cryptocurrency is not enabled'
                    )
                  });
                }

                inv['minerFees'][COIN]['totalFee'] =
                  inv.minerFees[COIN].totalFee || 0;

                const invoiceFeeSat = inv.minerFees[COIN].totalFee;

                this.logger.debug(
                  `createInvoice -> invoiceFeeSat: ${invoiceFeeSat}`
                );

                const paymentCode = this.currencyProvider.getPaymentCode(
                  wallet.coin
                );
                const protocolUrl = inv.paymentCodes[COIN][paymentCode];
                const payProUrl = this.incomingDataProvider.getPayProUrl(
                  protocolUrl
                );

                if (!payProUrl) {
                  return reject({
                    title: this.translate.instant('Error in Payment Protocol'),
                    message: this.translate.instant('Invalid URL')
                  });
                }

                this.logger.debug(`createInvoice -> protocolUrl: ${payProUrl}`);

                this.logger.debug(`Getting paypro details`);

                this.payproProvider
                  .getPayProDetails(payProUrl, wallet.coin)
                  .then(details => {
                    const payProFeeSat = !this.currencyProvider.isUtxoCoin(
                      wallet.coin
                    )
                      ? details.requiredFeeRate
                      : Math.ceil(details.requiredFeeRate * 1024);

                    this.logger.debug(
                      `getPayProDetails -> payProFeeSat: ${payProFeeSat}`
                    );

                    let transactionFee =
                      payProFeeSat > maxAmountFeeSat
                        ? payProFeeSat
                        : maxAmountFeeSat;

                    this.logger.debug(`transactionFee: ${transactionFee}`);

                    let newAmountSat =
                      maxAmountSat - invoiceFeeSat - transactionFee;

                    if (newAmountSat <= 0) {
                      return reject({
                        message: this.translate.instant(
                          'Insufficient funds for fee'
                        )
                      });
                    }

                    this.logger.debug(
                      `Calculating newAmountSat (newAmountSat = maxAmountSat - invoiceFeeSat - transactionFee). newAmountSat: ${newAmountSat}`
                    );

                    return resolve({ amount: newAmountSat, currency: 'sat' });
                  });
              })
              .catch(err => {
                return reject(err);
              });
          })
          .catch(err => {
            return reject({
              title: null,
              message: err
            });
          });
      } else {
        return resolve({ amount: a, currency: c });
      }
    });
  }

  private checkFeeHigh(amount: number, fee: number) {
    let per = (fee / (amount + fee)) * 100;

    if (per > FEE_TOO_HIGH_LIMIT_PER) {
      const minerFeeInfoSheet = this.actionSheetProvider.createInfoSheet(
        'miner-fee'
      );
      minerFeeInfoSheet.present();
    }
  }

  private initializeTopUp(wallet, parsedAmount): void {
    let COIN = wallet.coin.toUpperCase();
    this.amountUnitStr = parsedAmount.amountUnitStr;

    var dataSrc: any = {
      amount: parsedAmount.amount,
      currency: parsedAmount.currency
    };

    if (this.navParams.get('v2')) {
      const { amount, currency, coin } = parsedAmount;

      dataSrc = {
        invoicePrice: amount,
        invoiceCurrency: currency,
        transactionCurrency: coin.toUpperCase(),
        v2: true
      };
    }
    this.onGoingProcessProvider.set('loadingTxInfo');

    this.logger.debug(
      `Creating invoice. amount: ${dataSrc.amount} - currency: ${
        dataSrc.currency
      }`
    );
    this.createInvoice(dataSrc)
      .then(invoice => {
        // Check if BTC or BCH is enabled in this account
        if (!this.isCryptoCurrencySupported(wallet, invoice)) {
          let msg = this.translate.instant(
            'Top-up with this cryptocurrency is not enabled'
          );
          this.showErrorAndBack(null, msg);
          return;
        }

        // Sometimes API does not return this element;
        invoice['minerFees'][COIN]['totalFee'] =
          invoice.minerFees[COIN].totalFee || 0;
        let invoiceFeeSat = invoice.minerFees[COIN].totalFee;

        this.logger.debug(`Invoice fee. invoiceFeeSat: ${invoiceFeeSat}`);

        let message = this.amountUnitStr + ' to ' + this.lastFourDigits;

        // Set expiration time for this invoice
        if (invoice['expirationTime'])
          this.paymentTimeControl(invoice['expirationTime']);

        this.createTx(wallet, invoice, message)
          .then(ctxp => {
            this.onGoingProcessProvider.clear();

            // Save TX in memory
            this.createdTx = ctxp;

            this.totalAmountStr = this.txFormatProvider.formatAmountStr(
              wallet.coin,
              ctxp.amount || parsedAmount.amountSat
            );

            if (this.currencyProvider.isUtxoCoin(wallet.coin)) {
              // Warn: fee too high
              this.checkFeeHigh(
                Number(parsedAmount.amountSat),
                Number(invoiceFeeSat) + Number(ctxp.fee)
              );
            }

            this.setTotalAmount(
              wallet,
              parsedAmount.amountSat,
              Number(invoiceFeeSat),
              ctxp.fee
            );
          })
          .catch(err => {
            this.onGoingProcessProvider.clear();
            this._resetValues();
            this.showError(err.title, err.message);
          });
      })
      .catch(err => {
        this.onGoingProcessProvider.clear();
        this.showErrorAndBack(err.title, err.message);
      });
  }

  public topUpConfirm(): void {
    if (!this.createdTx) {
      this.showError(
        null,
        this.translate.instant('Transaction has not been created')
      );
      return;
    }
    let title = this.translate.instant('Confirm');
    let message = 'Load ' + this.amountUnitStr;
    let okText = this.translate.instant('OK');
    let cancelText = this.translate.instant('Cancel');
    this.popupProvider
      .ionicConfirm(title, message, okText, cancelText)
      .then(ok => {
        if (!ok) {
          if (this.isCordova) this.slideButton.isConfirmed(false);
          return;
        }

        this.onGoingProcessProvider.set('topup');
        this.publishAndSign(this.wallet, this.createdTx)
          .then(() => {
            this.onGoingProcessProvider.clear();
            this.openFinishModal();
          })
          .catch(err => {
            this.onGoingProcessProvider.clear();
            this._resetValues();
            this.showError(
              this.translate.instant('Could not send transaction'),
              this.bwcErrorProvider.msg(err)
            );
          });
      });
  }

  protected paymentTimeControl(expires: string): void {
    const expirationTime = Math.floor(new Date(expires).getTime() / 1000);
    this.paymentExpired = false;
    this.setExpirationTime(expirationTime);

    this.countDown = setInterval(() => {
      this.setExpirationTime(expirationTime);
    }, 1000);
  }

  private setExpirationTime(expirationTime: number): void {
    const now = Math.floor(Date.now() / 1000);

    if (now > expirationTime) {
      this.paymentExpired = true;
      this.remainingTimeStr = this.translate.instant('Expired');
      if (this.countDown) {
        clearInterval(this.countDown);
      }
      return;
    }

    const totalSecs = expirationTime - now;
    const m = Math.floor(totalSecs / 60);
    const s = totalSecs % 60;
    this.remainingTimeStr = ('0' + m).slice(-2) + ':' + ('0' + s).slice(-2);
  }

  public onWalletSelect(wallet): void {
    this.wallet = wallet;
    this.isERCToken = this.currencyProvider.isERCToken(this.wallet.coin);
    if (this.countDown) {
      clearInterval(this.countDown);
    }

    if (!this.isERCToken) {
      // Update Rates
      this.updateRates(wallet.coin);
    }

    this.onGoingProcessProvider.set('retrievingInputs');
    this.calculateAmount(wallet)
      .then(val => {
        let parsedAmount = this.txFormatProvider.parseAmount(
          wallet.coin,
          val.amount,
          val.currency
        );
        this.initializeTopUp(wallet, { ...parsedAmount, coin: wallet.coin });
      })
      .catch(err => {
        this.onGoingProcessProvider.clear();
        this._resetValues();
        this.showError(err.title, err.message).then(() => {
          this.showWallets();
        });
      });
  }

  public showWallets(): void {
    this.isOpenSelector = true;
    let id = this.wallet ? this.wallet.credentials.walletId : null;
    const params = {
      wallets: this.wallets,
      selectedWalletId: id,
      title: this.translate.instant('From')
    };
    const walletSelector = this.actionSheetProvider.createWalletSelector(
      params
    );
    walletSelector.present();
    walletSelector.onDidDismiss(wallet => {
      if (!_.isEmpty(wallet)) this.onWalletSelect(wallet);
      this.isOpenSelector = false;
    });
  }

  private openFinishModal(): void {
    const finishComment =
      this.wallet.credentials.m === 1
        ? this.translate.instant('Funds were added to debit card')
        : this.translate.instant('Transaction initiated');
    let finishText = '';
    let modal = this.modalCtrl.create(
      FinishModalPage,
      { finishText, finishComment },
      { showBackdrop: true, enableBackdropDismiss: false }
    );
    modal.present();
    modal.onDidDismiss(async () => {
      if (this.navParams.get('v2')) {
        this.iabCardProvider.show();
        this.iabCardProvider.sendMessage({
          message: `topUpComplete?${this.cardId}`
        });
        await this.navCtrl.popToRoot({ animate: false });
      } else {
        await this.navCtrl.push(
          BitPayCardPage,
          { id: this.cardId },
          { animate: false }
        );
      }
    });
  }

  public openExternalLink(urlKey: string) {
    let url: string;
    let title: string;
    switch (urlKey) {
      case 'networkCost':
        url =
          'https://support.bitpay.com/hc/en-us/articles/115002990803-Why-Am-I-Being-Charged-an-Additional-Network-Cost-on-My-BitPay-Invoice-';
        title = this.translate.instant('Network Cost');
        break;
      case 'minerFee':
        url =
          'https://support.bitpay.com/hc/en-us/articles/115003393863-What-are-bitcoin-miner-fees-Why-are-miner-fees-so-high-';
        title = this.translate.instant('Miner Fee');
        break;
    }
    let message = this.translate.instant(
      'This information is available at the website.'
    );
    let okText = this.translate.instant('Open');
    let cancelText = this.translate.instant('Go Back');
    this.externalLinkProvider.open(
      url,
      true,
      title,
      message,
      okText,
      cancelText
    );
  }
}
