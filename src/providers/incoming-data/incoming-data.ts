import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Events } from 'ionic-angular';
import * as _ from 'lodash';
import { ActionSheetProvider } from '../action-sheet/action-sheet';
import { AppProvider } from '../app/app';
import { BwcProvider } from '../bwc/bwc';
import { Coin, CurrencyProvider } from '../currency/currency';
import { IABCardProvider } from '../in-app-browser/card';
import { Logger } from '../logger/logger';
import { PayproProvider } from '../paypro/paypro';
import { ProfileProvider } from '../profile/profile';

export interface RedirParams {
  activePage?: any;
  amount?: string;
  coin?: Coin;
  fromHomeCard?: boolean;
  walletId?: number;
  tokenAddress?: string;
  wDucxAddress?: string;
  useSendMax?: boolean;
}

export interface RedirParams {
  activePage?: any;
  amount?: string;
  coin?: Coin;
  fromHomeCard?: boolean;
  walletId?: number;
  tokenAddress?: string;
  wDucxAddress?: string;
  useSendMax?: boolean;
}

export interface ISendParams {
  addr: string;
  amount: string;
  message: string;
  coin: Coin;
  requiredFeeRate?: string;
  destinationTag?: string;
  tokenAddress?: string;
  wDucxAddress?: string;
  useSendMax?: boolean;
}

@Injectable()
export class IncomingDataProvider {
  private activePage: string;
  private walletId: number | false;

  constructor(
    private actionSheetProvider: ActionSheetProvider,
    private events: Events,
    private bwcProvider: BwcProvider,
    private currencyProvider: CurrencyProvider,
    private payproProvider: PayproProvider,
    private logger: Logger,
    private appProvider: AppProvider,
    private translate: TranslateService,
    private profileProvider: ProfileProvider,
    private iabCardProvider: IABCardProvider
  ) {
    this.logger.debug('IncomingDataProvider initialized');
  }

  public showMenu(data): void {
    const dataMenu = this.actionSheetProvider.createIncomingDataMenu({ data });
    dataMenu.present();
    dataMenu.onDidDismiss(data => this.finishIncomingData(data));
  }

  public finishIncomingData(data: any): void {
    let redirTo = null;
    let value = null;

    if (data) {
      redirTo = data.redirTo;
      value = data.value;
    }

    if (redirTo === 'AmountPage') {
      const coin = data.coin ? data.coin : 'btc';

      this.events.publish('finishIncomingDataMenuEvent', {
        redirTo,
        value,
        coin
      });
    } else if (redirTo === 'PaperWalletPage') {
      const nextView = {
        name: 'PaperWalletPage',
        params: { privateKey: value }
      };

      this.incomingDataRedir(nextView);
    } else {
      this.events.publish('finishIncomingDataMenuEvent', { redirTo, value });
    }
  }

  private isValidPayProNonBackwardsCompatible(data: string): boolean {
    data = this.sanitizeUri(data);

    return Boolean(/^(bitcoin|bitcoincash|ducatus|ducatusx|bchtest|ethereum|ripple)?:\?r=[\w+]/.exec(data));
  }

  private isValidBitPayInvoice(data: string): boolean {
    return Boolean(/^https:\/\/(www.)?(test.|staging.)?bitpay.com\/i\/\w+/.exec(data));
  }

  private isValidBitPayUri(data: string): boolean {
    data = this.sanitizeUri(data);

    if (!(data && data.indexOf('bitpay:') === 0)) {
      return false;
    }

    const address = this.extractAddress(data);
    
    if (!address) { 
      return false;
    }

    const params: URLSearchParams = new URLSearchParams(
      data.replace(`bitpay:${address}`, '')
    );

    const coin = params.get('coin');

    if (!coin) {
      return false;
    }

    return true;
  }

  private isValidBitcoinUri(data: string): boolean {
    data = this.sanitizeUri(data);

    return Boolean(this.bwcProvider.getBitcore().URI.isValid(data));
  }

  private isValidBitcoinCashUri(data: string): boolean {
    data = this.sanitizeUri(data);

    return Boolean(this.bwcProvider.getBitcoreCash().URI.isValid(data));
  }

  private isValidDucatusUri(data: string): boolean {
    data = this.sanitizeUri(data);

    return Boolean(this.bwcProvider.getDucatuscore().URI.isValid(data));
  }

  private isValidDucatusXUri(data: string): boolean {
    data = this.sanitizeUri(data);

    return Boolean(this.bwcProvider.getCore().Validation.validateUri('DUCX', data));
  }

  private isValidEthereumUri(data: string): boolean {
    data = this.sanitizeUri(data);

    return Boolean(this.bwcProvider.getCore().Validation.validateUri('ETH', data));
  }

  private isValidRippleUri(data: string): boolean {
    data = this.sanitizeUri(data);
    
    return Boolean(this.bwcProvider.getCore().Validation.validateUri('XRP', data));
  }

  public isValidBitcoinCashUriWithLegacyAddress(data: string): boolean {
    data = this.sanitizeUri(data);
    const isValid = this.bwcProvider
      .getBitcore()
      .URI.isValid(data.replace(/^(bitcoincash:|bchtest:)/, 'bitcoin:'));

    return Boolean(isValid);
  }

  private isValidPlainUrl(data: string): boolean {
    if (this.isValidBitPayInvoice(data)) {
      return false;
    }

    data = this.sanitizeUri(data);

    return Boolean(/^https?:\/\//.test(data));
  }

  private isValidBitcoinAddress(data: string): boolean {
    return Boolean(
      this.bwcProvider.getBitcore().Address.isValid(data, 'livenet') ||
      this.bwcProvider.getBitcore().Address.isValid(data, 'testnet')
    );
  }

  public isValidBitcoinCashLegacyAddress(data: string): boolean {
    return Boolean(
      this.bwcProvider.getBitcore().Address.isValid(data, 'livenet') ||
      this.bwcProvider.getBitcore().Address.isValid(data, 'testnet')
    );
  }

  private isValidBitcoinCashAddress(data: string): boolean {
    return Boolean(
      this.bwcProvider.getBitcoreCash().Address.isValid(data, 'livenet') ||
      this.bwcProvider.getBitcoreCash().Address.isValid(data, 'testnet')
    );
  }

  private isValidDucatusAddress(data: string): boolean {
    return Boolean(
      this.bwcProvider.getDucatuscore().Address.isValid(data, 'livenet') ||
      this.bwcProvider.getDucatuscore().Address.isValid(data, 'testnet')
    );
  }

  private isValidEthereumAddress(data: string): boolean {
    const isValid = this.bwcProvider
      .getCore()
      .Validation.validateAddress('ETH', 'livenet', data);
    
    return Boolean(isValid);
  }

  private isValidRippleAddress(data: string): boolean {
    const isValid = this.bwcProvider
      .getCore()
      .Validation.validateAddress('XRP', 'livenet', data);
    
      return Boolean(isValid);
  }

  private isValidCoinbaseUri(data: string): boolean {
    data = this.sanitizeUri(data);

    return Boolean(
      data 
      && data.indexOf(this.appProvider.info.name + '://coinbase') === 0
    );
  }

  private isValidShapeshiftUri(data: string): boolean {
    data = this.sanitizeUri(data);

    return Boolean(
      data 
      && data.indexOf(this.appProvider.info.name + '://shapeshift') === 0
    );
  }

  private isValidSimplexUri(data: string): boolean {
    data = this.sanitizeUri(data);

    return Boolean(
      data 
      && data.indexOf(this.appProvider.info.name + '://simplex') === 0
    );
  }

  private isValidInvoiceUri(data: string): boolean {
    data = this.sanitizeUri(data);

    return Boolean(
      data 
      && data.indexOf(this.appProvider.info.name + '://invoice') === 0
    );
  }

  private isValidBitPayCardUri(data: string): boolean {
    data = this.sanitizeUri(data);

    return Boolean(
      data 
      && data.indexOf('bitpay://bitpay') === 0
    );
  }

  private isValidJoinCode(data: string): boolean {
    data = this.sanitizeUri(data);

    return Boolean(
      data 
      && data.match(/^copay:[0-9A-HJ-NP-Za-km-z]{70,80}$/)
    );
  }

  private isValidJoinLegacyCode(data: string): boolean {
    return Boolean(
      data 
      && data.match(/^[0-9A-HJ-NP-Za-km-z]{70,80}$/)
    );
  }

  private isValidPrivateKey(data: string): boolean {
    return Boolean(
      data &&
      (data.substring(0, 2) == '6P' || this.checkPrivateKey(data))
    );
  }

  private isValidImportPrivateKey(data: string): boolean {
    return Boolean(
      data
      && (
        data.substring(0, 2) == '1|' 
        || data.substring(0, 2) == '2|' 
        || data.substring(0, 2) == '3|'
      )
    );
  }

  private handlePrivateKey(data: string, redirParams?: RedirParams): void {
    this.logger.debug('Incoming-data: private key');

    this.showMenu({
      data,
      type: 'privateKey',
      fromHomeCard: redirParams && redirParams.fromHomeCard || false
    });
  }

  private handlePayProNonBackwardsCompatible(data: string): void {
    this.logger.debug('Incoming-data: Payment Protocol with non-backwards-compatible request');
    const url = this.getPayProUrl(data);

    this.handleBitPayInvoice(url);
  }

  private async handleBitPayInvoice(invoiceUrl: string) {
    this.logger.debug('Incoming-data: Handling bitpay invoice');

    try {
      const disableLoader = true;
      const payProOptions = await this.payproProvider.getPayProOptions(invoiceUrl);

      const selected = payProOptions.paymentOptions.filter(
        option => option.selected
      );

      if (selected.length === 1) {
        // Confirm Page - selectedTransactionCurrency set to selected
        const [{ currency }] = selected;

        return this.goToPayPro(
          invoiceUrl,
          currency.toLowerCase(),
          payProOptions,
          disableLoader
        );
      } else {
        // Select Invoice Currency - No selectedTransactionCurrency set
        let hasWallets = {};
        let availableWallets = [];

        for (const option of payProOptions.paymentOptions) {
          const fundedWallets = this.profileProvider.getWallets({
            coin: option.currency.toLowerCase(),
            network: option.network,
            minAmount: option.estimatedAmount
          });

          if (fundedWallets.length === 0) {
            option.disabled = true;
          } else {
            hasWallets[option.currency.toLowerCase()] = fundedWallets.length;
            availableWallets.push(option);
          }
        }

        if (availableWallets.length === 1) {
          // Only one available wallet with balance
          const [{ currency }] = availableWallets;

          return this.goToPayPro(
            invoiceUrl,
            currency.toLowerCase(),
            payProOptions,
            disableLoader
          );
        }

        const stateParams = {
          payProOptions,
          hasWallets
        };
        let nextView = {
          name: 'SelectInvoicePage',
          params: stateParams
        };

        this.incomingDataRedir(nextView);
      }
    } catch (err) {
      this.events.publish('incomingDataError', err);
      this.logger.error(err);
    }
  }

  private handleBitPayUri(data: string, redirParams?: RedirParams): void {
    this.logger.debug('Incoming-data: BitPay URI');

    const amountFromRedirParams = redirParams && redirParams.amount || '';
    const addr = this.extractAddress(data);
    const params: URLSearchParams = new URLSearchParams(
      data.replace(`bitpay:${addr}`, '')
    );
    let amount = params.get('amount') || amountFromRedirParams;
    const coin: Coin = Coin[params.get('coin').toUpperCase()];
    const message = params.get('message');
    const requiredFeeRate = params.get('gasPrice');

    if (amount) {
      const { unitToSatoshi } = this.currencyProvider.getPrecision(coin);
      // parseInt('2e21',10) = 2
      // parseInt('2000000000000000000000',10) = 2e+21
      const result = (Number(amount) * unitToSatoshi).toFixed(0);
      amount = parseInt(
        Number(result).toLocaleString('fullwide', { useGrouping: false }),
        10
      ).toString();

      this.goSend({
        addr, 
        amount, 
        message, 
        coin, 
        requiredFeeRate
      });
    } else {
      this.goToAmountPage(addr, coin);
    }
  }

  private handleBitcoinUri(data: string, redirParams?: RedirParams): void {
    this.logger.debug('Incoming-data: Bitcoin URI');

    const amountFromRedirParams = redirParams && redirParams.amount || '';
    const coin = Coin.BTC;
    let parsed = this.bwcProvider.getBitcore().URI(data);
    let addr = parsed.address && parsed.address.toString() || '';
    let message = parsed.message;
    let amount = parsed.amount || amountFromRedirParams;

    if (parsed.r) {
      const payProUrl = this.getPayProUrl(parsed.r);
      this.goToPayPro(payProUrl, coin);
    } else this.goSend({
      addr, 
      amount, 
      message, 
      coin
    });
  }

  private handleBitcoinCashUri(data: string, redirParams?: RedirParams): void {
    this.logger.debug('Incoming-data: Bitcoin Cash URI');

    const amountFromRedirParams = redirParams && redirParams.amount || '';
    const coin = Coin.BCH;
    const parsed = this.bwcProvider.getBitcoreCash().URI(data);
    let addr = parsed.address && parsed.address.toString() || '';

    // keep address in original format
    if (parsed.address && data.indexOf(addr) < 0) {
      addr = parsed.address.toCashAddress();
    }

    let message = parsed.message;
    let amount = parsed.amount || amountFromRedirParams;

    if (parsed.r) {
      const payProUrl = this.getPayProUrl(parsed.r);

      this.goToPayPro(payProUrl, coin);
    } else {
      this.goSend({
        addr, 
        amount, 
        message, 
        coin
      });
    }
  }

  private handleDucatusUri(data: string, redirParams?: RedirParams): void {
    this.logger.debug('Incoming-data: Ducatus URI');

    const amountFromRedirParams = redirParams && redirParams.amount || '';
    const coin = Coin.DUC;
    const parsed = this.bwcProvider.getDucatuscore().URI(data);
    const addr: string = parsed.address && parsed.address.toString() || '';
    const message: string = parsed.message;
    const useSendMax: boolean = redirParams.useSendMax;
    const amount: string = parsed.amount || amountFromRedirParams;
    const sendParams: ISendParams = {
      addr,
      amount,
      message,
      coin,
      useSendMax
    };

    if (parsed.r) {
      this.goToPayPro(data, coin);
    } else {
      this.goSend(sendParams);
    }
  }

  private handleDucatusXUri(data: string, redirParams?: RedirParams): void {
    this.logger.debug('Incoming-data: DucatusX URI');

    const amountFromRedirParams = redirParams && redirParams.amount || '';
    const coin = Coin.DUCX;
    const value = /[\?\&]value=(\d+([\,\.]\d+)?)/i;
    const gasPrice = /[\?\&]gasPrice=(\d+([\,\.]\d+)?)/i;
    let parsedAmount;
    let requiredFeeRate;

    if (value.exec(data)) {
      parsedAmount = value.exec(data)[1];
    }

    if (gasPrice.exec(data)) {
      requiredFeeRate = gasPrice.exec(data)[1];
    }

    const addr = this.extractAddress(data);
    const message = '';
    const amount = parsedAmount || amountFromRedirParams;
    let tokenAddress = redirParams.tokenAddress;
    const wDucxAddress = redirParams.wDucxAddress;

    if (amount) {
      this.goSend({
        addr,
        amount,
        message,
        coin,
        requiredFeeRate,
        tokenAddress,
        wDucxAddress
      });
    } else {
      this.handleDucatusXAddress(addr, redirParams);
    }
  }

  private handleEthereumUri(data: string, redirParams?: RedirParams): void {
    this.logger.debug('Incoming-data: Ethereum URI');

    const amountFromRedirParams = redirParams && redirParams.amount || '';
    const coin = Coin.ETH;
    const value = /[\?\&]value=(\d+([\,\.]\d+)?)/i;
    const gasPrice = /[\?\&]gasPrice=(\d+([\,\.]\d+)?)/i;
    let parsedAmount;
    let requiredFeeRate;

    if (value.exec(data)) {
      parsedAmount = value.exec(data)[1];
    }

    if (gasPrice.exec(data)) {
      requiredFeeRate = gasPrice.exec(data)[1];
    }

    const addr = this.extractAddress(data);
    const message = '';
    const amount = parsedAmount || amountFromRedirParams;

    if (amount) {
      this.goSend({
        addr, 
        amount, 
        message, 
        coin, 
        requiredFeeRate
      });
    } else {
      this.handleEthereumAddress(addr, redirParams);
    }
  }

  private handleRippleUri(data: string, redirParams?: RedirParams): void {
    this.logger.debug('Incoming-data: Ripple URI');

    const amountFromRedirParams = redirParams && redirParams.amount || '';
    const coin = Coin.XRP;
    const amountParam = /[\?\&]amount=(\d+([\,\.]\d+)?)/i;
    const tagParam = /[\?\&]dt=(\d+([\,\.]\d+)?)/i;
    let parsedAmount;
    let destinationTag;
    let requiredFeeRate;

    if (amountParam.exec(data)) {
      const { unitToSatoshi } = this.currencyProvider.getPrecision(coin);
      parsedAmount = (
        Number(amountParam.exec(data)[1]) * unitToSatoshi
      ).toString();
    }
    if (tagParam.exec(data)) {
      destinationTag = tagParam.exec(data)[1];
    }

    const addr = this.extractAddress(data);
    const message = '';
    const amount = parsedAmount || amountFromRedirParams;

    if (amount) {
      this.goSend({
        addr,
        amount,
        message,
        coin,
        requiredFeeRate,
        destinationTag
      });
    } else {
      this.handleRippleAddress(addr, redirParams);
    }
  }

  private handleBitcoinCashUriLegacyAddress(data: string): void {
    this.logger.debug('Incoming-data: Bitcoin Cash URI with legacy address');

    const coin = Coin.BCH;
    const parsed = this.bwcProvider
      .getBitcore()
      .URI(data.replace(/^(bitcoincash:|bchtest:)/, 'bitcoin:'));

    const oldAddr = parsed.address && parsed.address.toString() || '';

    if (!oldAddr) {
      this.logger.error('Could not parse Bitcoin Cash legacy address');
    }

    const address = this.bwcProvider
      .getBitcore()
      .Address(oldAddr)
      .toObject();
    const addr = this.bwcProvider
      .getBitcoreCash()
      .Address.fromObject(address)
      .toString();
    const message = parsed.message;
    const amount = parsed.amount || '';

    // Translate address
    this.logger.warn('Legacy Bitcoin Address transalated to: ' + address);

    if (parsed.r) {
      const payProUrl = this.getPayProUrl(parsed.r);

      this.goToPayPro(payProUrl, coin);
    } else this.goSend({
      addr, 
      amount, 
      message, 
      coin
    });
  }

  private handlePlainUrl(data: string): void {
    this.logger.debug('Incoming-data: Plain URL');

    data = this.sanitizeUri(data);

    this.showMenu({
      data,
      type: 'url'
    });
  }

  private handlePlainBitcoinAddress(
    data: string,
    redirParams?: RedirParams
  ): void {
    this.logger.debug('Incoming-data: Bitcoin plain address');

    const coin = Coin.BTC;

    if (redirParams && redirParams.activePage === 'ScanPage') {
      this.showMenu({
        data,
        type: 'bitcoinAddress',
        coin
      });
    } else if (redirParams && redirParams.amount) {
      this.goSend({
        addr: data, 
        amount: redirParams.amount, 
        message: '', 
        coin
      });
    } else {
      this.goToAmountPage(data, coin);
    }
  }

  private handlePlainBitcoinCashAddress(
    data: string,
    redirParams?: RedirParams
  ): void {
    this.logger.debug('Incoming-data: Bitcoin Cash plain address');

    const coin = Coin.BCH;
    
    if (redirParams && redirParams.activePage === 'ScanPage') {
      this.showMenu({
        data,
        type: 'bitcoinAddress',
        coin
      });
    } else if (redirParams && redirParams.amount) {
      this.goSend({
        addr: data, 
        amount: redirParams.amount, 
        message: '', 
        coin
      });
    } else {
      this.goToAmountPage(data, coin);
    }
  }

  private handlePlainDucatusAddress(
    data: string,
    redirParams?: RedirParams
  ): void {
    this.logger.debug('Incoming-data: Ducatus plain address');

    const coin = Coin.DUC;

    if (redirParams && redirParams.activePage === 'ScanPage') {
      this.showMenu({
        data,
        type: 'ducatusAddress',
        coin
      });
    } else if (redirParams && redirParams.amount) {
      this.goSend({
        addr: data, 
        amount: redirParams.amount, 
        message: '', 
        coin
      });
    } else {
      this.goToAmountPage(data, coin);
    }
  }

  private handleDucatusXAddress(data: string, redirParams?: RedirParams): void {
    this.logger.debug('Incoming-data: DucatusX address');

    const coin = Coin.DUCX;

    if (redirParams && redirParams.activePage === 'ScanPage') {
      this.showMenu({
        data,
        type: 'ducatusxAddress',
        coin
      });
    } else if (redirParams && redirParams.amount) {
      this.goSend({
        addr: data, 
        amount: redirParams.amount, 
        message: '', 
        coin
      });
    } else {
      this.goToAmountPage(data, coin);
    }
  }

  private handleEthereumAddress(data: string, redirParams?: RedirParams): void {
    this.logger.debug('Incoming-data: Ethereum address');

    const coin = Coin.ETH;

    if (redirParams && redirParams.activePage === 'ScanPage') {
      this.showMenu({
        data,
        type: 'ethereumAddress',
        coin
      });
    } else if (redirParams && redirParams.amount) {
      this.goSend({
        addr: data, 
        amount: redirParams.amount, 
        message: '', 
        coin
      });
    } else {
      this.goToAmountPage(data, coin);
    }
  }

  private handleRippleAddress(data: string, redirParams?: RedirParams): void {
    this.logger.debug('Incoming-data: Ripple address');
    
    const coin = Coin.XRP;
    
    if (redirParams && redirParams.activePage === 'ScanPage') {
      this.showMenu({
        data,
        type: 'rippleAddress',
        coin
      });
    } else if (redirParams && redirParams.amount) {
      this.goSend({
        addr: data, 
        amount: redirParams.amount, 
        message: '', 
        coin
      });
    } else {
      this.goToAmountPage(data, coin);
    }
  }

  private goToImportByPrivateKey(data: string): void {
    this.logger.debug('Incoming-data (redirect): QR code export feature');

    const stateParams = { code: data };
    const nextView = {
      name: 'ImportWalletPage',
      params: stateParams
    };

    this.incomingDataRedir(nextView);
  }

  private goToJoinWallet(data: string): void {
    this.logger.debug('Incoming-data (redirect): Code to join to a wallet');

    let nextView, stateParams;

    const opts = {
      showHidden: true,
      canAddNewAccount: true
    };
    const wallets = this.profileProvider.getWallets(opts);
    const nrKeys = _.values(_.groupBy(wallets, 'keyId')).length;

    if (nrKeys === 0) {
      stateParams = { url: data };
      nextView = {
        name: 'JoinWalletPage',
        params: stateParams
      };
    } else if (nrKeys != 1) {
      stateParams = { url: data, isJoin: true };
      nextView = {
        name: 'AddWalletPage',
        params: stateParams
      };
    } else if (nrKeys === 1) {
      stateParams = { keyId: wallets[0].credentials.keyId, url: data };
      nextView = {
        name: 'JoinWalletPage',
        params: stateParams
      };
    }

    if (this.isValidJoinCode(data) || this.isValidJoinLegacyCode(data)) {
      this.incomingDataRedir(nextView);
    } else {
      this.logger.error('Incoming-data: Invalid code to join to a wallet');
    }
  }

  private goToBitPayCard(data: string): void {
    this.logger.debug('Incoming-data (redirect): BitPay Card URL');

    // Disable BitPay Card
    if (!this.appProvider.info._enabledExtensions.debitcard) {
      this.logger.warn('BitPay Card has been disabled for this build');

      return;
    }

    const secret = this.getParameterByName('secret', data);
    const email = this.getParameterByName('email', data);
    const otp = this.getParameterByName('otp', data);
    const reason = this.getParameterByName('r', data);

    switch (reason) {
      default:
      case '0':
        /* For BitPay card binding */
        const stateParams = { secret, email, otp };
        const nextView = {
          name: 'BitPayCardIntroPage',
          params: stateParams
        };
        this.incomingDataRedir(nextView);

        break;
    }
  }

  private goToCoinbase(data: string): void {
    this.logger.debug('Incoming-data (redirect): Coinbase URL');

    const code = this.getParameterByName('code', data);
    const stateParams = { code };
    const nextView = {
      name: 'CoinbasePage',
      params: stateParams
    };

    this.incomingDataRedir(nextView);
  }

  private goToShapeshift(data: string): void {
    this.logger.debug('Incoming-data (redirect): ShapeShift URL');

    const code = this.getParameterByName('code', data);
    const stateParams = { code };
    const nextView = {
      name: 'ShapeshiftPage',
      params: stateParams
    };

    this.incomingDataRedir(nextView);
  }

  private goToSimplex(data: string): void {
    this.logger.debug('Incoming-data (redirect): Simplex URL');

    const res = data.replace(new RegExp('&amp;', 'g'), '&');
    const success = this.getParameterByName('success', res);
    const paymentId = this.getParameterByName('paymentId', res);
    const quoteId = this.getParameterByName('quoteId', res);
    const userId = this.getParameterByName('userId', res);

    const stateParams = { success, paymentId, quoteId, userId };
    const nextView = {
      name: 'SimplexPage',
      params: stateParams
    };

    this.incomingDataRedir(nextView);
  }

  private goToInvoice(data: string): void {
    this.logger.debug('Incoming-data (redirect): Invoice URL');

    const invoiceUrl = this.getParameterByName('url', data);
    
    this.redir(invoiceUrl);
  }

  public redir(data: string, redirParams?: RedirParams): boolean {
    if (redirParams && redirParams.activePage) {
      this.activePage = redirParams.activePage;
      this.walletId = redirParams.walletId ? redirParams.walletId : false;
    }

    //  Handling of a bitpay invoice url
    if (this.isValidBitPayInvoice(data)) {
      this.handleBitPayInvoice(data);
      return true;

      // Payment Protocol with non-backwards-compatible request
    } else if (this.isValidPayProNonBackwardsCompatible(data)) {
      this.handlePayProNonBackwardsCompatible(data);
      return true;

      // Bitcoin  URI
    } else if (this.isValidBitcoinUri(data)) {
      this.handleBitcoinUri(data, redirParams);
      return true;

      // Bitcoin Cash URI
    } else if (this.isValidBitcoinCashUri(data)) {
      this.handleBitcoinCashUri(data, redirParams);
      return true;

      // Ducatus URI
    } else if (this.isValidDucatusUri(data)) {
      this.handleDucatusUri(data, redirParams);
      return true;

      // Ethereum URI
    } else if (this.isValidEthereumUri(data)) {
      this.handleEthereumUri(data, redirParams);
      return true;

      // DucatusX URI
    } else if (this.isValidDucatusXUri(data)) {
      this.handleDucatusXUri(data, redirParams);
      return true;

      // Ripple URI
    } else if (this.isValidRippleUri(data)) {
      this.handleRippleUri(data, redirParams);
      return true;

      // Bitcoin Cash URI using Bitcoin Core legacy address
    } else if (this.isValidBitcoinCashUriWithLegacyAddress(data)) {
      this.handleBitcoinCashUriLegacyAddress(data);
      return true;

      // Plain URL
    } else if (this.isValidPlainUrl(data)) {
      this.handlePlainUrl(data);
      return true;

      // Plain Address (Bitcoin)
    } else if (this.isValidBitcoinAddress(data)) {
      this.handlePlainBitcoinAddress(data, redirParams);
      return true;

      // Plain Address (Bitcoin Cash)
    } else if (this.isValidBitcoinCashAddress(data)) {
      this.handlePlainBitcoinCashAddress(data, redirParams);
      return true;

      // Plain Address (Ducatus)
    } else if (this.isValidDucatusAddress(data)) {
      this.handlePlainDucatusAddress(data, redirParams);
      return true;

      // Address (Ethereum)
    } else if (this.isValidEthereumAddress(data)) {
      this.handleEthereumAddress(data, redirParams);
      return true;

      // Address (Ripple)
    } else if (this.isValidRippleAddress(data)) {
      this.handleRippleAddress(data, redirParams);
      return true;

      // Coinbase
    } else if (this.isValidCoinbaseUri(data)) {
      this.goToCoinbase(data);
      return true;

      // ShapeShift
    } else if (this.isValidShapeshiftUri(data)) {
      this.goToShapeshift(data);
      return true;

      // Simplex
    } else if (this.isValidSimplexUri(data)) {
      this.goToSimplex(data);
      return true;

      // Invoice Intent
    } else if (this.isValidInvoiceUri(data)) {
      this.goToInvoice(data);
      return true;

      // BitPayCard Authentication
    } else if (this.isValidBitPayCardUri(data)) {
      this.goToBitPayCard(data);
      return true;

      // BitPay URI
    } else if (this.isValidBitPayUri(data)) {
      this.handleBitPayUri(data);
      return true;

      // Join
    } else if (this.isValidJoinCode(data) || this.isValidJoinLegacyCode(data)) {
      this.goToJoinWallet(data);
      return true;

      // Check Private Key
    } else if (this.isValidPrivateKey(data)) {
      this.handlePrivateKey(data, redirParams);
      return true;

      // Import Private Key
    } else if (this.isValidImportPrivateKey(data)) {
      this.goToImportByPrivateKey(data);
      return true;
    } else if (data.includes('wallet-card')) {
      const event = data.split('wallet-card/')[1];
      const [switchExp, payload] = (event || '').split('?');

      /*
       *
       * handler for wallet-card events
       *
       * leaving this as a switch in case events become complex and require wallet side and iab actions
       *
       * */
      switch (switchExp) {
        case 'pairing':
          const secret = payload.split('=')[1].split('&')[0];
          const params = {
            secret,
            withNotification: true
          };

          if (payload.includes('&code=')) {
            params['code'] = payload.split('&code=')[1];
          }

          this.iabCardProvider.pairing(params);

          break;

        case 'email-verified':
          this.iabCardProvider.show();
          this.iabCardProvider.sendMessage({
            message: 'email-verified'
          });

          break;

        case 'get-started':
          this.iabCardProvider.show();
          this.iabCardProvider.sendMessage({
            message: 'get-started'
          });

          break;

        case 'retry':
          this.iabCardProvider.show();
          this.iabCardProvider.sendMessage({
            message: 'retry'
          });
      }

      return true;
      // Anything else
    } else {
      if (redirParams && redirParams.activePage === 'ScanPage') {
        this.logger.debug('Incoming-data: Plain text');
        this.showMenu({
          data,
          type: 'text'
        });

        return true;
      } else {
        this.logger.warn('Incoming-data: Unknown information');

        return false;
      }
    }
  }

  public parseData(data: string): any {
    
    if (!data) return;
    
    if (this.isValidBitPayInvoice(data)) {
      return {
        data,
        type: 'InvoiceUri',
        title: this.translate.instant('Invoice URL')
      };
    } else if (this.isValidPayProNonBackwardsCompatible(data)) {
      return {
        data,
        type: 'PayPro',
        title: this.translate.instant('Payment URL')
      };
      // Bitcoin URI
    } else if (this.isValidBitcoinUri(data)) {
      return {
        data,
        type: 'BitcoinUri',
        title: this.translate.instant('Bitcoin URI')
      };
      // Bitcoin Cash URI
    } else if (this.isValidBitcoinCashUri(data)) {
      return {
        data,
        type: 'BitcoinCashUri',
        title: this.translate.instant('Bitcoin Cash URI')
      };
      // Ducatus URI
    } else if (this.isValidDucatusUri(data)) {
      return {
        data,
        type: 'DucatusUri',
        title: this.translate.instant('Ducatus URI')
      };
      // DucatusX URI 
    } else if(this.isValidDucatusXUri(data)){
      return{
        data,
        type: 'DucatusXUri',
        title: this.translate.instant('DucatusX URI')
      };
      // Ethereum URI 
    } else if (this.isValidEthereumUri(data)) {
      return {
        data,
        type: 'EthereumUri',
        title: this.translate.instant('Ethereum URI')
      };
      // Ripple URI
    } else if (this.isValidRippleUri(data)) {
      return {
        data,
        type: 'RippleUri',
        title: this.translate.instant('Ripple URI')
      };
      // Bitcoin Cash URI using Bitcoin Core legacy address
    } else if (this.isValidBitcoinCashUriWithLegacyAddress(data)) {
      return {
        data,
        type: 'BitcoinCashUri',
        title: this.translate.instant('Bitcoin Cash URI')
      };

      // Plain URL
    } else if (this.isValidPlainUrl(data)) {
      return {
        data,
        type: 'PlainUrl',
        title: this.translate.instant('Plain URL')
      };

      // Plain Address (Bitcoin)
    } else if (this.isValidBitcoinAddress(data)) {
      return {
        data,
        type: 'BitcoinAddress',
        title: this.translate.instant('Bitcoin Address')
      };
      // Plain Address (Bitcoin Cash)
    } else if (this.isValidBitcoinCashAddress(data)) {
      return {
        data,
        type: 'BitcoinCashAddress',
        title: this.translate.instant('Bitcoin Cash Address')
      };
      // Plain Address (Ducatus)
    } else if (this.isValidDucatusAddress(data)) {
      return {
        data,
        type: 'DucatusAddress',
        title: this.translate.instant('Ducatus Address')
      };
      // Plain Address (Ethereum same address DucatusX)
    } else if (this.isValidEthereumAddress(data)) {
      return {
        data,
        type: 'EthereumAddress',
        title: this.translate.instant('Address')
      };
      // Plain Address (Ripple)
    } else if (this.isValidRippleAddress(data)) {
      return {
        data,
        type: 'RippleAddress',
        title: this.translate.instant('XRP Address')
      };
      // Coinbase
    } else if (this.isValidCoinbaseUri(data)) {
      return {
        data,
        type: 'Coinbase',
        title: 'Coinbase URI'
      };
      // BitPayCard Authentication
    } else if (this.isValidBitPayCardUri(data)) {
      return {
        data,
        type: 'BitPayCard',
        title: 'BitPay Card URI'
      };
      // BitPay  URI
    } else if (this.isValidBitPayUri(data)) {
      return {
        data,
        type: 'BitPayUri',
        title: 'BitPay URI'
      };
      // Join
    } else if (this.isValidJoinCode(data) || this.isValidJoinLegacyCode(data)) {
      return {
        data,
        type: 'JoinWallet',
        title: this.translate.instant('Invitation Code')
      };
      // Check Private Key
    } else if (this.isValidPrivateKey(data)) {
      return {
        data,
        type: 'PrivateKey',
        title: this.translate.instant('Private Key')
      };
      // Import Private Key
    } else if (this.isValidImportPrivateKey(data)) {
      return {
        data,
        type: 'ImportPrivateKey',
        title: this.translate.instant('Import Words')
      };
      // Anything else
    } else {
      return;
    }
  }

  public extractAddress(data: string): string {
    const address = data.replace(/^[a-z]+:/i, '').replace(/\?.*/, '');
    const params = /([\?\&]+[a-z]+=(\d+([\,\.]\d+)?))+/i;

    return address.replace(params, '');
  }

  private sanitizeUri(data): string {
    // Fixes when a region uses comma to separate decimals
    let regex = /[\?\&]amount=(\d+([\,\.]\d+)?)/i;
    let match = regex.exec(data);
    if (!match || match.length === 0) {
      return data;
    }
    let value = match[0].replace(',', '.');
    let newUri = data.replace(regex, value);

    // mobile devices, uris like copay://xxx
    newUri.replace('://', ':');

    return newUri;
  }

  public getPayProUrl(data: string): string {
    return decodeURIComponent(
      data.replace(
        /(bitcoin|bitcoincash|ethereum|ripple|ducatus|ducatusx)?:\?r=/,
        ''
      )
    );
  }

  private getParameterByName(name: string, url: string): string {
    if (!url) {
      return undefined;
    }

    name = name.replace(/[\[\]]/g, '\\$&');
    const regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)'),
      results = regex.exec(url);

    if (!results) {
      return null;
    }

    if (!results[2]) {
      return '';
    }

    return decodeURIComponent(results[2].replace(/\+/g, ' '));
  }

  private checkPrivateKey(privateKey: string): boolean {
    // Check if it is a Transaction id to prevent errors
    const isPK: boolean = this.checkRegex(privateKey);

    if (!isPK) {
      return false;
    }

    try {
      this.bwcProvider.getBitcore().PrivateKey(privateKey, 'livenet');
    } catch (err) {
      return false;
    }

    return true;
  }

  private checkRegex(data: string): boolean {
    let PKregex = new RegExp(/^[5KL][1-9A-HJ-NP-Za-km-z]{50,51}$/);

    return Boolean(PKregex.exec(data));
  }

  private goSend(sendParams: ISendParams): void {
    if (sendParams.amount) {
      const stateParams: any = {
        amount: sendParams.amount,
        toAddress: sendParams.addr,
        description: sendParams.message,
        coin: sendParams.coin,
        requiredFeeRate: sendParams.requiredFeeRate,
        destinationTag: sendParams.destinationTag,
        walletId: this.walletId
      };

      if (sendParams.tokenAddress) {
        stateParams.tokenAddress = sendParams.tokenAddress;
      }

      if (sendParams.wDucxAddress) {
        stateParams.wDucxAddress = sendParams.wDucxAddress;
      }

      if (sendParams.useSendMax) {
        stateParams.useSendMax = sendParams.useSendMax;
      }

      const nextView = {
        name: 'ConfirmPage',
        params: stateParams
      };

      this.incomingDataRedir(nextView);
    } else {
      const stateParams = {
        toAddress: sendParams.addr,
        description: sendParams.message,
        coin: sendParams.coin
      };
      const nextView = {
        name: 'AmountPage',
        params: stateParams
      };

      this.incomingDataRedir(nextView);
    }
  }

  private goToAmountPage(toAddress: string, coin: Coin): void {
    const stateParams = {
      toAddress,
      coin
    };
    const nextView = {
      name: 'AmountPage',
      params: stateParams
    };

    this.incomingDataRedir(nextView);
  }

  public goToPayPro(
    url: string,
    coin: Coin,
    payProOptions?,
    disableLoader?: boolean
  ): void {
    this.payproProvider
      .getPayProDetails(url, coin, disableLoader)
      .then(details => {
        this.handlePayPro(details, payProOptions, url, coin);
      })
      .catch(err => {
        this.events.publish('incomingDataError', err);
        this.logger.error(err);
      });
  }

  private async handlePayPro(
    payProDetails,
    payProOptions,
    url,
    coin: Coin
  ): Promise<void> {
    if (!payProDetails) {
      this.logger.error('No wallets available');
      const error = this.translate.instant('No wallets available');
      this.events.publish('incomingDataError', error);

      return;
    }

    let invoiceID;
    let requiredFeeRate;

    if (payProDetails.requiredFeeRate) {
      requiredFeeRate = !this.currencyProvider.isUtxoCoin(coin)
        ? payProDetails.requiredFeeRate
        : Math.ceil(payProDetails.requiredFeeRate * 1024);
    }

    try {
      const { memo, network } = payProDetails;
      const disableLoader = true;

      if (!payProOptions) {
        payProOptions = await this.payproProvider.getPayProOptions(
          url,
          disableLoader
        );
      }

      const paymentOptions = payProOptions.paymentOptions;
      const { estimatedAmount } = paymentOptions.find(
        option => option.currency.toLowerCase() === coin
      );
      const instructions = payProDetails.instructions[0];
      const { outputs, toAddress, data } = instructions;

      if (coin === 'xrp' && outputs) {
        invoiceID = outputs[0].invoiceID;
      }

      const stateParams = {
        amount: estimatedAmount,
        toAddress,
        description: memo,
        data,
        invoiceID,
        paypro: payProDetails,
        coin,
        network,
        payProUrl: url,
        requiredFeeRate
      };
      const nextView = {
        name: 'ConfirmPage',
        params: stateParams
      };
      
      this.incomingDataRedir(nextView);
    } catch (err) {
      this.events.publish('incomingDataError', err);
      this.logger.error(err);
    }
  }

  private incomingDataRedir(nextView) {
    if (this.activePage === 'SendPage') {
      this.events.publish('SendPageRedir', nextView);
    } else {
      this.events.publish('IncomingDataRedir', nextView);
    }
  }
}
