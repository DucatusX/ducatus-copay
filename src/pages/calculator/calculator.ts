import * as _ from 'lodash';
import { ActionSheetProvider, AppProvider } from '../../providers';
import { ApiProvider } from '../../providers/api/api';
import { Component } from '@angular/core';
import { CalculatorConvertPage } from './calculator-convert/calculator-convert';
import { ICoinsInfo, coinsInfo } from './calculator-parameters';
import { Decimal } from 'decimal.js';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FormControllerProvider} from '../../providers/form-contoller/form-controller';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Logger } from '../../providers/logger/logger';
import { ModalController, NavController } from 'ionic-angular';
import { ProfileProvider } from '../../providers/profile/profile';
import { TxDetailsModal } from '../../pages/tx-details/tx-details';
import { TimeProvider } from '../../providers/time/time';
import { WalletProvider } from '../../providers/wallet/wallet';

@Component({
  selector: 'page-calculator',
  templateUrl: 'calculator.html'
})
export class CalculatorPage {
  public coinsInfo: ICoinsInfo[] = coinsInfo;
  public calculatorForm: FormGroup;
  public sendCoins: ICoinsInfo[];
  public sendCoin: ICoinsInfo;
  public getCoins: ICoinsInfo[];
  public getCoin: ICoinsInfo;
  public oldFormValue: any;
  public appVersion: string;
  public historyIsLoad: boolean;
  public rates: any;
  public isAvailableExchangeSwapStatus: boolean;
  public isAvailableBridgeStatus: boolean;
  public isAvailableSwap: boolean;
  public isShowSwapHistory: boolean;
  public swapHistory: any[];
  public valueGetForOneSendCoin: string;
  public isLoad: boolean = false;

  constructor(
    private navCtrl: NavController,
    private logger: Logger,
    private formBuilder: FormBuilder,
    private apiProvider: ApiProvider,
    private appProvider: AppProvider,
    private httpClient: HttpClient,
    private profileProvider: ProfileProvider,
    private walletProvider: WalletProvider,
    private timeProvider: TimeProvider,
    private modalCtrl: ModalController,
    private formCtrl: FormControllerProvider
  ) {
    this.isLoad = true;
    this.historyIsLoad = true;
    this.coinsInfo = coinsInfo;
    this.isAvailableExchangeSwapStatus = false;
    this.isAvailableBridgeStatus = false;
    this.isAvailableSwap = false;
    this.isShowSwapHistory = false;
    this.swapHistory = [];
    this.valueGetForOneSendCoin = '0.10';
    this.appVersion = this.appProvider.info.version;
    
    this.sendCoins = this.coinsInfo.filter(coin => coin.isSend);
    this.getCoins = this.coinsInfo.filter(coin => coin.isGet);
    this.sendCoin = this.coinsInfo.find(coin => coin.sendDefault);
    this.getCoin = this.coinsInfo.find(coin => coin.getDefault);
    
    this.setFormData({
      send: {
        amount: '0',
        coin: this.sendCoin
      },
      get: { 
        amount: '0',
        coin: this.getCoin
      }
    });
  }

  public ionViewWillEnter(): void {
    this.setDecimalPrecision();
    this.loadData();
  }

  public setDecimalPrecision() {
    Decimal.set({ precision: 50 });
  }

  public async loadData() {
    await this.setRates();
    await this.setExchangeStatus();
    await this.setBridgeStatus();

    this.isLoad = false;

    await this.loadTxHistory();

    this.historyIsLoad = false;
  }

  public setFormData({ send, get }): void {
    this.calculatorForm = this.formBuilder.group({
      sendCoin: send.coin,
      getCoin: get.coin,
      sendAmount: [
        send.amount,
        Validators.compose(
          [
            Validators.minLength(1), 
            Validators.required
          ]
        )
      ],
      getAmount: [
        get.amount,
        Validators.compose(
          [
            Validators.minLength(1), 
            Validators.required,Validators.pattern(/^[0-9.]+$/)
          ]
        )
      ]
    });
    
    this.oldFormValue = this.calculatorForm.value;
  }

  public async loadTxHistory(): Promise<void> {
    const wallets = this.profileProvider.getWallets({ showHidden: true });

    for (let i = 0; i < wallets.length; i++) {
      const wallet = wallets[i];

      await this.fetchTxHistory(wallet);
    }
  }

  public async setRates(): Promise<void> {
    const url = `${this.apiProvider.getAddresses().ducatuscoins}/api/v1/rates`;

    try {
      const rates  = await this.httpClient
        .get(url)
        .toPromise();

      this.rates = {
        ...rates,
        WDUCX: { DUCX: 1 }
      };
    } catch(error) {
      this.logger.debug('Error in getting rates: ', error);
    }
  }

  public async setExchangeStatus(): Promise<void> {
    const urlExchange = `${this.apiProvider.getAddresses().ducatuscoins}/api/v1/exchange/status/`;
  
    try {
      const isAvailableExchangeSwapStatus = Boolean(
        await this.httpClient
          .get(urlExchange)
          .toPromise()
      );

      if (isAvailableExchangeSwapStatus) {
        this.coinsInfo.map((coin) => {
          if (coin.symbol !== 'WDUCX') {
            coin.isAvailableSwap = true;
          }

          return coin;
        });
      }
      
      this.isAvailableSwap = isAvailableExchangeSwapStatus;
    } catch(error) {
        this.coinsInfo.map((coin) => {
          if (coin.symbol !== 'WDUCX') {
            coin.isAvailableSwap = false;
          }

          return coin;
        });

        this.isAvailableSwap = false;
    }
  }

  public async setBridgeStatus(): Promise<void> {
    const httpOptions = {
      headers: new HttpHeaders({ 'Content-Type': 'application/json'})
    };
    const urlBridge = `${this.apiProvider.getAddresses().swap.status}?version=${this.appVersion}`;

    try {
      const isAvailableBridgeStatus = Boolean(
        await this.httpClient
          .get(urlBridge, httpOptions)
          .toPromise()
      );

      if (isAvailableBridgeStatus) {
        this.coinsInfo.map((coin) => {
          if (coin.symbol === 'WDUCX') {
            coin.isAvailableSwap = true;
          }

          return coin;
        });
      }
    } catch(error) {
      this.coinsInfo.map((coin) => {
        if (coin.symbol === 'WDUCX') {
          coin.isAvailableSwap = false;
        }

        return coin;
      });
    }
  }

  private fetchTxHistory = async (wallet) => {
    const progressFn = ((_, newTxs) => {
      let args = {
        walletId: wallet.walletId,
        finished: false,
        progress: newTxs
      };
      // tslint:disable-next-line:no-console
      console.log(args);
    }).bind(this);

    // Fire a startup event, to allow UI to show the spinner
    try {
      const txHistory: any[] = await this.walletProvider.fetchTxHistory(wallet, progressFn);
      
      txHistory.forEach(tx => {
            
        if (tx.swap) {
          tx.wallet = _.cloneDeep(wallet);
          this.swapHistory.push(tx);
        } 
      });
      
      this.swapHistory = this.swapHistory.sort((a, b) => b.time - a.time);
    } catch(error) {
      if (error != 'HISTORY_IN_PROGRESS') {
        this.logger.warn('fetchTxHistory ERROR', error);
      }
    } 
  }

  public showSwapHistory(): void {
    this.isShowSwapHistory = !this.isShowSwapHistory;
  }

  public itemTapped(tx): void {
    this.goToTxDetails(tx);
  }

  public goToTxDetails(tx): void {
    const txDetailModal = this.modalCtrl.create(TxDetailsModal, {
      walletId: tx.wallet.credentials.walletId,
      txid: tx.txid
    });
    
    txDetailModal.present();
  }

  public createdWithinPastDay(time) {
    return this.timeProvider.withinPastDay(time);
  }

  public goToConvertPage() {
    this.navCtrl.push(CalculatorConvertPage, {
      getCoin: this.calculatorForm.value.getCoin,
      sendCoin: this.calculatorForm.value.sendCoin,
      getAmount: this.calculatorForm.value.getAmount,
      sendAmount: this.calculatorForm.value.sendAmount
    });
  }

  public changSendCoin(event: ICoinsInfo): void {
    const getCoinList = this.coinsInfo.filter((coin: ICoinsInfo) => {
      if (event.toSwap.includes(coin.symbol)) {
        return true;
      }

      return false;
    });

    this.getCoins = getCoinList;
    this.calculatorForm
      .get('getCoin')
      .setValue(getCoinList[0], { emitEvent: false });    

    this.onChangeCoin();
  }

  public changGetCoin(): void {
    this.onChangeCoin();
  }

  public setGetAmount(amount: string) {
    this.oldFormValue.getAmount = amount;

    this.calculatorForm
      .get('getAmount')
      .setValue( amount, { emitEvent: false });
  }

  public setSendAmount(amount: string) {
    this.oldFormValue.sendAmount = amount;
    
    this.calculatorForm
      .get('sendAmount')
      .setValue( amount, { emitEvent: false });
  }

  public changAmount(event, input: 'sendAmount'|'getAmount'): void {
    const isSend = (input === 'sendAmount');
    const value: string = event.value;
    const oldValue: string = this.oldFormValue[input];
    const coinPropertyName: string = input === 'sendAmount'
      ? 'sendCoin'
      : 'getCoin';

    if (value === oldValue) {
      // 'emitEvent: false' not work
      return;
    }
   
    const coin: any = this.calculatorForm.get(coinPropertyName).value;
    const formatValue = this.formCtrl.transformValue(value, oldValue, coin.decimals);

    if (isSend) {
      this.setSendAmount(formatValue);
    } else {
      this.setGetAmount(formatValue);
    }

    this.calculateChange(isSend);
  }

  public calculateChange(isSendInput) {
    const getCoin: any = this.calculatorForm.get('getCoin').value;
    const sendCoin: any = this.calculatorForm.get('sendCoin').value;
    const getAmount: string = this.calculatorForm.get('getAmount').value;
    const sendAmount: string = this.calculatorForm.get('sendAmount').value;
    const rate = this.rates[getCoin.symbol][sendCoin.symbol];
    let bgCalculatedValue: string;

    if (isSendInput) {
      
      if (sendAmount) {
        bgCalculatedValue = new Decimal(sendAmount)
          .div(rate)
          .toString();
        bgCalculatedValue = this.formCtrl.trimStrToDecimalsCoin(bgCalculatedValue, getCoin.decimals);
      } else {
        bgCalculatedValue = '0';
      }

      this.setGetAmount(bgCalculatedValue);
    } else {

      if (getAmount) {
        bgCalculatedValue = new Decimal(getAmount)
          .times(rate)
          .toString();
        bgCalculatedValue = this.formCtrl.trimStrToDecimalsCoin(bgCalculatedValue, sendCoin.decimals);
      } else {
        bgCalculatedValue = '0';
      }
      
      this.setSendAmount(bgCalculatedValue);
    }
  }

  public onChangeCoin() {
    const getCoin: any = this.calculatorForm.get('getCoin').value;
    const sendCoin: any = this.calculatorForm.get('sendCoin').value;
    const sendAmount: string = this.calculatorForm.get('sendAmount').value;
    const rate = this.rates[getCoin.symbol][sendCoin.symbol];
    let bgCalculatedValue: string;

    if (Number(sendAmount)) {
      bgCalculatedValue = new Decimal(sendAmount)
        .div(rate)
        .toFixed(getCoin.decimals)
        .toString()
        .replace(/[,.]?0+$/, '');
    } else {
      bgCalculatedValue = '0';
    }

    this.valueGetForOneSendCoin = new Decimal(1)
      .div(rate)
      .toFixed(getCoin.decimals)
      .replace(/[,.]?0+$/, '');

    this.setGetAmount(bgCalculatedValue);

    if (
      getCoin.isAvailableSwap
      && sendCoin.isAvailableSwap
    ) {
      this.isAvailableSwap = true;
    } else {
      this.isAvailableSwap = false;
    }
  }

}