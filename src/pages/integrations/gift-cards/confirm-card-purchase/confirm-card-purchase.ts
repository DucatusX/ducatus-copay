import { Component } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import {
  App,
  Events,
  ModalController,
  NavController,
  NavParams
} from 'ionic-angular';
import * as _ from 'lodash';
import * as moment from 'moment';
import { Logger } from '../../../../providers/logger/logger';

// Pages
import { FinishModalPage } from '../../../finish/finish';
import { ConfirmPage } from '../../../send/confirm/confirm';
import { CardDetailsPage } from '../../gift-cards/card-details/card-details';
import { PurchasedCardsPage } from '../purchased-cards/purchased-cards';

// Provider
import { DecimalPipe } from '@angular/common';
import {
  AddressProvider,
  EmailNotificationsProvider,
  FeeProvider,
  IABCardProvider,
  IncomingDataProvider,
  TxConfirmNotificationProvider
} from '../../../../providers';
import { ActionSheetProvider } from '../../../../providers/action-sheet/action-sheet';
import { AppProvider } from '../../../../providers/app/app';
import { BwcErrorProvider } from '../../../../providers/bwc-error/bwc-error';
import { BwcProvider } from '../../../../providers/bwc/bwc';
import { ClipboardProvider } from '../../../../providers/clipboard/clipboard';
import { CoinbaseProvider } from '../../../../providers/coinbase/coinbase';
import { ConfigProvider } from '../../../../providers/config/config';
import { CurrencyProvider } from '../../../../providers/currency/currency';
import { ErrorsProvider } from '../../../../providers/errors/errors';
import { ExternalLinkProvider } from '../../../../providers/external-link/external-link';
import {
  getActivationFee,
  getVisibleDiscount,
  GiftCardProvider
} from '../../../../providers/gift-card/gift-card';
import {
  CardConfig,
  GiftCard
} from '../../../../providers/gift-card/gift-card.types';
import { OnGoingProcessProvider } from '../../../../providers/on-going-process/on-going-process';
import { PayproProvider } from '../../../../providers/paypro/paypro';
import { PlatformProvider } from '../../../../providers/platform/platform';
import { PopupProvider } from '../../../../providers/popup/popup';
import { ProfileProvider } from '../../../../providers/profile/profile';
import { ReplaceParametersProvider } from '../../../../providers/replace-parameters/replace-parameters';
import { TransactionUtilsProvider } from '../../../../providers/transactions-utils/transactions-utils';
import { TxFormatProvider } from '../../../../providers/tx-format/tx-format';
import {
  TransactionProposal,
  WalletProvider
} from '../../../../providers/wallet/wallet';

@Component({
  selector: 'confirm-card-purchase-page',
  templateUrl: 'confirm-card-purchase.html'
})
export class ConfirmCardPurchasePage extends ConfirmPage {
  public currency: string;
  private message: string;
  public invoiceId: string;
  public invoiceRates: any;
  private configWallet;
  public currencyIsoCode: string;

  public totalAmountStr: string;
  public invoiceFee: number;
  public networkFee: number;
  public totalAmount: number;
  public totalDiscount: number;
  public activationFee: number;
  public amountUnitStr: string;
  public network: string;
  public onlyIntegers: boolean;
  public isERCToken: boolean;

  public cardConfig: CardConfig;
  public displayNameIncludesGiftCard: boolean = false;

  constructor(
    addressProvider: AddressProvider,
    app: App,
    actionSheetProvider: ActionSheetProvider,
    bwcErrorProvider: BwcErrorProvider,
    bwcProvider: BwcProvider,
    configProvider: ConfigProvider,
    currencyProvider: CurrencyProvider,
    decimalPipe: DecimalPipe,
    errorsProvider: ErrorsProvider,
    feeProvider: FeeProvider,
    private giftCardProvider: GiftCardProvider,
    public incomingDataProvider: IncomingDataProvider,
    replaceParametersProvider: ReplaceParametersProvider,
    private emailNotificationsProvider: EmailNotificationsProvider,
    externalLinkProvider: ExternalLinkProvider,
    logger: Logger,
    modalCtrl: ModalController,
    navCtrl: NavController,
    navParams: NavParams,
    onGoingProcessProvider: OnGoingProcessProvider,
    popupProvider: PopupProvider,
    profileProvider: ProfileProvider,
    txConfirmNotificationProvider: TxConfirmNotificationProvider,
    txFormatProvider: TxFormatProvider,
    walletProvider: WalletProvider,
    translate: TranslateService,
    private payproProvider: PayproProvider,
    platformProvider: PlatformProvider,
    clipboardProvider: ClipboardProvider,
    events: Events,
    coinbaseProvider: CoinbaseProvider,
    appProvider: AppProvider,
    iabCardProvider: IABCardProvider,
    txUtilsProvider: TransactionUtilsProvider
  ) {
    super(
      addressProvider,
      app,
      actionSheetProvider,
      bwcErrorProvider,
      bwcProvider,
      configProvider,
      currencyProvider,
      decimalPipe,
      errorsProvider,
      externalLinkProvider,
      feeProvider,
      logger,
      modalCtrl,
      navCtrl,
      navParams,
      onGoingProcessProvider,
      platformProvider,
      profileProvider,
      popupProvider,
      replaceParametersProvider,
      translate,
      txConfirmNotificationProvider,
      txFormatProvider,
      walletProvider,
      clipboardProvider,
      events,
      coinbaseProvider,
      appProvider,
      iabCardProvider,
      txUtilsProvider
    );
    this.configWallet = this.configProvider.get().wallet;
  }

  async ngOnInit() {
    this.amount = this.navParams.data.amount;
    this.currency = this.navParams.data.currency;
    this.cardConfig = await this.giftCardProvider.getCardConfig(
      this.navParams.get('cardName')
    );
    this.displayNameIncludesGiftCard = this.cardConfig.displayName
      .toLowerCase()
      .includes('gift card');
    this.onlyIntegers = this.cardConfig.currency === 'JPY';
    this.activationFee = getActivationFee(this.amount, this.cardConfig);
  }

  ionViewDidLoad() {
    this.logger.info('Loaded: ConfirmCardPurchasePage');
  }

  ionViewWillEnter() {
    this.isOpenSelector = false;
    this.navCtrl.swipeBackEnabled = false;

    this.network = this.giftCardProvider.getNetwork();
    this.wallets = this.profileProvider.getWallets({
      onlyComplete: true,
      network: this.network,
      hasFunds: true,
      minFiatCurrency: { amount: this.amount, currency: this.currency }
    });
    if (_.isEmpty(this.wallets)) {
      this.showErrorInfoSheet(
        this.translate.instant('No wallets available'),
        null,
        true
      );
      return;
    }
    this.showWallets(); // Show wallet selector
  }

  public logGiftCardPurchaseEvent(
    isSlideConfirmFinished: boolean,
    transactionCurrency: string,
    giftData?: any
  ) {
    if (!isSlideConfirmFinished) {
      this.giftCardProvider.logEvent('giftcards_purchase_start', {
        brand: this.cardConfig.name,
        transactionCurrency
      });
      this.giftCardProvider.logEvent('add_to_cart', {
        brand: this.cardConfig.name,
        category: 'giftCards'
      });
    } else {
      this.giftCardProvider.logEvent('giftcards_purchase_finish', {
        brand: this.cardConfig.name,
        transactionCurrency
      });

      this.giftCardProvider.logEvent('set_checkout_option', {
        transactionCurrency,
        checkout_step: 1
      });

      this.giftCardProvider.logEvent('purchase', {
        value: giftData.amount,
        items: [
          {
            name: this.cardConfig.name,
            category: 'giftCards',
            quantity: 1
          }
        ]
      });
    }
  }

  public cancel() {
    this.navCtrl.popToRoot();
  }

  private checkFeeHigh(amount: number, fee: number) {
    if (this.isHighFee(amount, fee)) {
      this.showHighFeeSheet();
    }
  }

  public openExternalLink(url: string) {
    this.externalLinkProvider.open(url);
  }

  private resetValues() {
    this.totalAmountStr = this.invoiceFee = this.networkFee = this.totalAmount = this.wallet = null;
    this.tx = this.message = this.invoiceId = null;
  }

  async publishAndSign(wallet, txp) {
    if (!wallet.canSign) {
      const err = this.translate.instant('No signing proposal: No private key');
      return Promise.reject(err);
    }

    await this.walletProvider.publishAndSign(wallet, txp);
    return this.onGoingProcessProvider.clear();
  }

  private satToFiat(coin: string, sat: number) {
    return this.txFormatProvider.toFiat(coin, sat, this.currencyIsoCode, {
      rates: this.invoiceRates
    });
  }

  private async setTotalAmount(
    wallet,
    invoiceFeeSat: number,
    networkFeeSat: number
  ) {
    const invoiceFee = await this.satToFiat(wallet.coin, invoiceFeeSat);
    this.invoiceFee = Number(invoiceFee);

    const chain = this.currencyProvider.getChain(wallet.coin).toLowerCase();
    const networkFee = await this.satToFiat(chain, networkFeeSat);
    this.networkFee = Number(networkFee);
    this.totalAmount =
      this.amount -
      this.totalDiscount +
      this.activationFee +
      this.invoiceFee +
      this.networkFee;
  }

  private isCryptoCurrencySupported(wallet, invoice) {
    const COIN = wallet.coin.toUpperCase();
    return (
      (invoice['supportedTransactionCurrencies'][COIN] &&
        invoice['supportedTransactionCurrencies'][COIN].enabled) ||
      false
    );
  }

  private handleCreateInvoiceError(err) {
    let err_title = this.translate.instant('Error creating the invoice');
    let err_msg;
    const errMessage = err && ((err.error && err.error.message) || err.message);
    if (errMessage && errMessage.match(/suspended/i)) {
      err_title = this.translate.instant('Service not available');
      err_msg = this.translate.instant(
        `${
          this.cardConfig.displayName
        } gift card purchases are not available at this time. Please try again later.`
      );
    } else if (errMessage) {
      err_msg = errMessage;
    } else {
      err_msg = this.translate.instant(
        `Unable to complete your purchase at this time. Please try again later.`
      );
    }

    throw {
      title: err_title,
      message: err_msg
    };
  }

  public async createInvoice(data) {
    const cardOrder = await this.giftCardProvider
      .createBitpayInvoice(data)
      .catch(err => {
        throw this.handleCreateInvoiceError(err);
      });

    const accessKey = cardOrder && cardOrder.accessKey;
    const totalDiscount = cardOrder && cardOrder.totalDiscount;
    if (!accessKey) {
      throw {
        message: this.translate.instant('No access key defined')
      };
    }
    const invoice = await this.giftCardProvider
      .getBitPayInvoice(cardOrder.invoiceId)
      .catch(() => {
        throw {
          message: this.translate.instant('Could not get the invoice')
        };
      });
    return { invoice, accessKey, totalDiscount };
  }

  private async createTx(wallet, invoice, message: string) {
    const COIN = wallet.coin.toUpperCase();
    const paymentCode = this.currencyProvider.getPaymentCode(wallet.coin);
    const protocolUrl = invoice.paymentCodes[COIN][paymentCode];
    const payProUrl = this.incomingDataProvider.getPayProUrl(protocolUrl);

    if (!payProUrl) {
      throw {
        title: this.translate.instant('Error in Payment Protocol'),
        message: this.translate.instant('Invalid URL')
      };
    }

    const details = await this.payproProvider
      .getPayProDetails(payProUrl, wallet.coin)
      .catch(err => {
        throw {
          title: this.translate.instant('Error in Payment Protocol'),
          message: err
        };
      });
    const { instructions } = details;
    const txp: Partial<TransactionProposal> = {
      coin: wallet.coin,
      amount: _.sumBy(instructions, 'amount'),
      toAddress: instructions[0].toAddress,
      outputs: [],
      message,
      customData: {
        giftCardName: this.cardConfig.name,
        service: 'giftcards'
      },
      payProUrl,
      excludeUnconfirmedUtxos: this.configWallet.spendUnconfirmed ? false : true
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
      const requiredFeeRate = !this.currencyProvider.isUtxoCoin(wallet.coin)
        ? details.requiredFeeRate
        : Math.ceil(details.requiredFeeRate * 1024);
      txp.feePerKb = requiredFeeRate;
      this.logger.debug('Using merchant fee rate:' + txp.feePerKb);
    } else {
      txp.feeLevel = this.feeProvider.getCoinCurrentFeeLevel(wallet.coin);
    }

    txp['origToAddress'] = txp.toAddress;

    if (wallet.coin && wallet.coin == 'bch') {
      txp.toAddress = this.bitcoreCash.Address(txp.toAddress).toString(true);
      txp.outputs[0].toAddress = txp.toAddress;
    }

    return this.walletProvider
      .getAddress(this.wallet, false)
      .then(address => {
        txp.from = address;
        return this.walletProvider.createTx(wallet, txp);
      })
      .catch(err => {
        throw {
          title: this.translate.instant('Could not create transaction'),
          message: this.bwcErrorProvider.msg(err)
        };
      });
  }

  private async redeemGiftCard(initialCard: GiftCard) {
    this.onGoingProcessProvider.set('buyingGiftCard');
    const card = await this.giftCardProvider
      .createGiftCard(initialCard)
      .catch(() => ({ ...initialCard, status: 'FAILURE' }));

    await this.giftCardProvider.saveGiftCard(card);
    this.onGoingProcessProvider.clear();
    this.logger.debug('Saved new gift card with status: ' + card.status);
    this.logDiscountedPurchase();
    this.finish(card);
  }

  private logDiscountedPurchase() {
    if (!getVisibleDiscount(this.cardConfig)) return;
    const params = {
      ...this.giftCardProvider.getDiscountEventParams(this.cardConfig),
      discounted: true
    };
    this.giftCardProvider.logEvent('purchasedGiftCard', params);
  }

  private async promptEmail() {
    if (!this.cardConfig.emailRequired) {
      const notificationEmail = this.emailNotificationsProvider.getEmailIfEnabled();
      return Promise.resolve(notificationEmail);
    }
    const email = await this.giftCardProvider.getUserEmail();
    if (email) {
      return Promise.resolve(email);
    }
    return this.setEmail();
  }

  private async setEmail() {
    const emailComponent = this.actionSheetProvider.createEmailComponent();
    await emailComponent.present();
    return new Promise(resolve => {
      emailComponent.onDidDismiss(email => {
        if (email) {
          if (!this.giftCardProvider.emailIsValid(email)) {
            this.throwEmailRequiredError();
          }
          this.giftCardProvider.storeEmail(email);
          resolve(email);
        } else {
          this.throwEmailRequiredError();
        }
        this.isOpenSelector = false;
      });
    });
  }

  private throwEmailRequiredError() {
    const title = this.translate.instant('Error');
    const msg = this.translate.instant(
      'An email address is required for this purchase.'
    );
    this.onGoingProcessProvider.clear();
    this.showErrorInfoSheet(msg, title, true);
    throw new Error('email required');
  }

  private async initialize(wallet, email) {
    const COIN = wallet.coin.toUpperCase();
    this.currencyIsoCode = this.currency;
    const discount = getVisibleDiscount(this.cardConfig);
    const dataSrc = {
      amount: this.amount,
      currency: this.currency,
      discounts: discount ? [discount.code] : [],
      uuid: wallet.id,
      email,
      buyerSelectedTransactionCurrency: COIN,
      cardName: this.cardConfig.name
    };

    this.onGoingProcessProvider.set('loadingTxInfo');

    const data = await this.createInvoice(dataSrc).catch(err => {
      this.onGoingProcessProvider.clear();
      throw this.showErrorInfoSheet(err.message, err.title, true);
    });

    this.invoiceRates = lowercaseKeys(data.invoice.exchangeRates);

    const parsedAmount = this.txFormatProvider.parseAmount(
      wallet.coin,
      this.amount,
      this.currency,
      { onlyIntegers: this.onlyIntegers, rates: this.invoiceRates }
    );
    this.amountUnitStr = parsedAmount.amountUnitStr;

    const invoice = data.invoice;
    const accessKey = data.accessKey;
    this.totalDiscount = data.totalDiscount || 0;
    const amountSat = invoice.paymentSubtotals[COIN];

    if (!this.isCryptoCurrencySupported(wallet, invoice)) {
      this.onGoingProcessProvider.clear();
      let msg = this.translate.instant(
        'Purchases with this cryptocurrency are not enabled'
      );
      this.showErrorInfoSheet(msg, null, true);
      return;
    }

    // Sometimes API does not return this element;
    invoice['minerFees'][COIN]['totalFee'] =
      invoice.minerFees[COIN].totalFee || 0;
    let invoiceFeeSat = invoice.minerFees[COIN].totalFee;

    this.message = this.replaceParametersProvider.replace(
      this.translate.instant(`{{amountUnitStr}} Gift Card`),
      { amountUnitStr: this.amountUnitStr }
    );

    const ctxp = await this.createTx(wallet, invoice, this.message).catch(
      err => {
        this.onGoingProcessProvider.clear();
        this.resetValues();
        throw this.showErrorInfoSheet(err.message, err.title);
      }
    );

    this.onGoingProcessProvider.clear();

    // Save in memory
    this.tx = ctxp;
    this.invoiceId = invoice.id;

    const now = moment().unix() * 1000;

    this.tx.giftData = {
      currency: dataSrc.currency,
      date: now,
      amount: dataSrc.amount,
      uuid: dataSrc.uuid,
      accessKey,
      invoiceId: invoice.id,
      invoiceUrl: invoice.url,
      invoiceTime: invoice.invoiceTime,
      name: this.cardConfig.name
    };
    this.totalAmountStr = this.txFormatProvider.formatAmountStr(
      wallet.coin,
      ctxp.amount || amountSat
    );

    // Warn: fee too high
    if (this.currencyProvider.isUtxoCoin(wallet.coin)) {
      this.checkFeeHigh(
        Number(amountSat),
        Number(invoiceFeeSat) + Number(ctxp.fee)
      );
    }

    this.setTotalAmount(wallet, invoiceFeeSat, ctxp.fee);

    this.logGiftCardPurchaseEvent(false, COIN, dataSrc);
  }

  public async buyConfirm() {
    if (!this.tx) {
      this.showErrorInfoSheet(
        this.translate.instant('Transaction has not been created')
      );
      return;
    }
    await this.giftCardProvider.saveGiftCard({
      ...this.tx.giftData,
      status: 'UNREDEEMED'
    });

    return this.publishAndSign(this.wallet, this.tx)
      .then(() => {
        this.redeemGiftCard(this.tx.giftData);
        this.logGiftCardPurchaseEvent(
          true,
          this.wallet.coin.toUpperCase(),
          this.tx.giftData
        );
      })
      .catch(async err => this.handlePurchaseError(err));
  }

  public async handlePurchaseError(err) {
    this.onGoingProcessProvider.clear();
    await this.giftCardProvider.saveCard(this.tx.giftData, {
      remove: true
    });
    await this.walletProvider.removeTx(this.wallet, this.tx);
    const errorMessage = err && err.message;
    const canceledErrors = ['FINGERPRINT_CANCELLED', 'PASSWORD_CANCELLED'];
    if (canceledErrors.indexOf(errorMessage) !== -1) {
      return;
    }
    if (['NO_PASSWORD', 'WRONG_PASSWORD'].indexOf(errorMessage) === -1) {
      this.resetValues();
    }
    this.showErrorInfoSheet(
      this.bwcErrorProvider.msg(err),
      this.translate.instant('Could not send transaction')
    );
  }

  public async onWalletSelect(wallet) {
    this.wallet = wallet;
    this.isERCToken = this.currencyProvider.isERCToken(this.wallet.coin);
    const email = await this.promptEmail();
    await this.initialize(wallet, email).catch(() => {});
  }

  public showWallets(): void {
    this.isOpenSelector = true;
    let id = this.wallet ? this.wallet.credentials.walletId : null;
    const params = {
      wallets: this.wallets,
      selectedWalletId: id,
      title: this.translate.instant('Buy from')
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

  async finish(card: GiftCard) {
    card.status === 'SUCCESS'
      ? await this.showCard(card)
      : await this.showStatusModalAndPrepCard(card);
  }

  async showCard(card: GiftCard) {
    const modal = this.modalCtrl.create(CardDetailsPage, {
      card,
      showConfetti: card.status === 'SUCCESS',
      showCloseButton: true
    });
    await modal.present();
    await this.resetNav(card);
  }

  async showStatusModalAndPrepCard(card: GiftCard) {
    let finishComment: string;
    let cssClass: string;
    if (card.status == 'FAILURE') {
      finishComment = this.translate.instant(
        'Your purchase could not be completed.'
      );
      cssClass = 'danger';
    }
    if (card.status == 'PENDING') {
      finishComment = this.translate.instant('Your purchase is pending.');
      cssClass = 'warning';
    }

    let finishText = '';
    let modal = this.modalCtrl.create(
      FinishModalPage,
      { finishText, finishComment, cssClass },
      { showBackdrop: true, enableBackdropDismiss: false }
    );
    await modal.present();
    await this.resetNav(card);
    await this.navCtrl.push(CardDetailsPage, { card }, { animate: false });
  }

  async resetNav(card: GiftCard) {
    await this.navCtrl.popToRoot({ animate: false });

    const numActiveCards = await this.getNumActiveCards();
    if (numActiveCards > 1) {
      await this.navCtrl.push(
        PurchasedCardsPage,
        { cardName: card.name },
        { animate: false }
      );
    }
  }

  async getNumActiveCards(): Promise<number> {
    const allGiftCards = await this.giftCardProvider.getPurchasedCards(
      this.cardConfig.name
    );
    const currentGiftCards = allGiftCards.filter(c => !c.archived);
    return currentGiftCards.length;
  }
}

function lowercaseKeys(obj) {
  return Object.keys(obj).reduce((destination, key) => {
    destination[key.toLowerCase()] = obj[key];
    return destination;
  }, {});
}
