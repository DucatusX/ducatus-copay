import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Decimal } from 'decimal.js';
import { ModalController, NavController } from 'ionic-angular';
import { TxDetailsModal } from '../../pages/tx-details/tx-details';
import { AppProvider } from '../../providers';
import { ApiProvider } from '../../providers/api/api';
import { FormControllerProvider} from '../../providers/form-contoller/form-controller';
import { Logger } from '../../providers/logger/logger';
import { ProfileProvider } from '../../providers/profile/profile';
import { TimeProvider } from '../../providers/time/time';
import { WalletProvider } from '../../providers/wallet/wallet';
import { SwapConvertPage } from './swap-convert/swap-convert';
import { coinsInfo, ICoinsInfo } from './swap-parameters';

@Component({
  selector: 'page-swap',
  templateUrl: 'swap.html'
})
export class SwapPage {
  public coinsInfo: ICoinsInfo[] = coinsInfo;
  public swapForm: FormGroup;
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
  public swapHistoryLimit: number;
  public chunkSize: number;
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
    this.swapHistoryLimit = 5;
    this.chunkSize = 10;
    this.valueGetForOneSendCoin = '0.10';
    this.appVersion = this.appProvider.info.version;

    // @ts-ignore
    this.sendCoin = this.coinsInfo.find(coin => coin.sendDefault);
    this.getCoin = this.coinsInfo.find(coin => coin.symbol === this.sendCoin.toSwap[0]);
    this.sendCoins = this.coinsInfo.filter(coin => coin.isSend);
    this.getCoins = this.coinsInfo.filter(coin => this.sendCoin.toSwap.includes(coin.symbol));
    
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
    this.swapForm = this.formBuilder.group({
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
    
    this.oldFormValue = this.swapForm.value;
  }

  public async loadTxHistory(): Promise<void> {
    const wallets = this.profileProvider.getWallets({ showHidden: true });
    let swapHistory: any[] = [];

    for (let i = 0; i < wallets.length; i++) {
      const wallet = wallets[i];
      const history: any [] = await this.fetchTxHistory(wallet);

      swapHistory = swapHistory.concat(history);
    }
   
    swapHistory = swapHistory.map((tx) => {
      const {
        wallet,
        confirmations,
        action,
        note,
        message,
        swap,
        amountStr,
        time,
        txid
      } = tx;
      
      return {
        walletId: wallet.credentials.walletId,
        txid,
        confirmations,
        action,
        note,
        message,
        swap,
        amountStr,
        time
      };
    });

    this.swapHistory = swapHistory.sort((a, b) => b.time - a.time);
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
      let txHistory: any[] = await this.walletProvider.fetchTxHistory(wallet, progressFn);
      txHistory = txHistory.map((tx) => {
        tx.wallet = wallet;

        return tx;
      });
      
      return txHistory.filter(tx => tx.swap);
    } catch(error) {
      if (error != 'HISTORY_IN_PROGRESS') {
        this.logger.warn('fetchTxHistory ERROR', error);
      }

      return [];
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
      walletId: tx.walletId,
      txid: tx.txid
    });
    
    txDetailModal.present();
  }

  public createdWithinPastDay(time) {
    return this.timeProvider.withinPastDay(time);
  }

  public goToConvertPage() {
    this.navCtrl.push(SwapConvertPage, {
      getCoin: this.swapForm.value.getCoin,
      sendCoin: this.swapForm.value.sendCoin,
      getAmount: this.swapForm.value.getAmount,
      sendAmount: this.swapForm.value.sendAmount
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
    this.swapForm
      .get('getCoin')
      .setValue(getCoinList[0], { emitEvent: false });    

    this.onChangeCoin();
  }

  public changGetCoin(): void {
    this.onChangeCoin();
  }

  public setGetAmount(amount: string) {
    this.oldFormValue.getAmount = amount;

    this.swapForm
      .get('getAmount')
      .setValue( amount, { emitEvent: false });
  }

  public setSendAmount(amount: string) {
    this.oldFormValue.sendAmount = amount;
    
    this.swapForm
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
   
    const coin: any = this.swapForm.get(coinPropertyName).value;
    const formatValue = this.formCtrl.transformValue(value, oldValue, coin.decimals);

    if (isSend) {
      this.setSendAmount(formatValue);
    } else {
      this.setGetAmount(formatValue);
    }

    this.calculateChange(isSend);
  }

  public calculateChange(isSendInput) {
    const getCoin: any = this.swapForm.get('getCoin').value;
    const sendCoin: any = this.swapForm.get('sendCoin').value;
    const getAmount: string = this.swapForm.get('getAmount').value;
    const sendAmount: string = this.swapForm.get('sendAmount').value;
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
    const getCoin: any = this.swapForm.get('getCoin').value;
    const sendCoin: any = this.swapForm.get('sendCoin').value;
    const sendAmount: string = this.swapForm.get('sendAmount').value;
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

    this.isAvailableSwap = (getCoin.isAvailableSwap && sendCoin.isAvailableSwap);
  }

  public loadTx(infiniteScroll) {
    if (this.swapHistoryLimit >= this.swapHistory.length) {
      infiniteScroll.complete();
      return;
    }

    this.swapHistoryLimit += this.chunkSize;
    this.chunkSize *= 2;
    infiniteScroll.complete();
  }
}