import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Decimal} from 'decimal.js';
import { ModalController, NavController } from 'ionic-angular';
import * as _ from 'lodash';
import { Subscription } from 'rxjs';
import { TxDetailsModal } from '../../pages/tx-details/tx-details';
import { ActionSheetProvider, AppProvider } from '../../providers';
import { ApiProvider } from '../../providers/api/api';
import { availableCoins, CoinOpts } from '../../providers/currency/coin';
import { CoinsMap } from '../../providers/currency/currency';
import { FormControllerProvider} from '../../providers/form-contoller/form-controller';
import { Logger } from '../../providers/logger/logger';
import { ProfileProvider } from '../../providers/profile/profile';
import { TimeProvider } from '../../providers/time/time';
import { WalletProvider } from '../../providers/wallet/wallet';
import { CalculatorConvertPage } from './calculator-convert/calculator-convert';
import {
  coinInfo,
  convertCoins,
  convertGetCoins,
  convertSendCoins
} from './calculator-parameters';


@Component({
  selector: 'page-calculator',
  templateUrl: 'calculator.html'
})
export class CalculatorPage {
  public calculatorForm: FormGroup;
  public formCoins: any = [];
  public coin_info: any;
  public convertGetCoins: any;
  public convertSendCoins: any;
  public lastChange: any = 'Get';
  public isAvailableDucSwap: boolean = true;
  public isAvailableSwapWDUCXtoDUCX: boolean = true;
  public isAvailableSwap: boolean = true;
  public appVersion: string;
  public rates: any;
  public isShowSwapHistory: boolean = false;
  public swapHistory: any[] = [];
  public historyIsLoaded: boolean = false;
  public calculationError = false;
  public coins: CoinsMap<CoinOpts> = availableCoins;
  public oldValueForm: string; // past form value

  public subSendAmount$: Subscription;
  public subGetAmount$: Subscription;
  public subSendCoin$: Subscription;
  public subGetCoin$: Subscription;
  
  public valueGetForOneCoin: number = 0.10; // set value for 1 Duc -> 10.00 DucX

  constructor(
    private navCtrl: NavController,
    private logger: Logger,
    private formBuilder: FormBuilder,
    private apiProvider: ApiProvider,
    private appProvider: AppProvider,
    private httpClient: HttpClient, // private moonPayProvider: MoonPayProvider
    private profileProvider: ProfileProvider,
    private actionSheetProvider: ActionSheetProvider,
    private walletProvider: WalletProvider,
    private timeProvider: TimeProvider,
    private modalCtrl: ModalController,
    private formCtrl: FormControllerProvider
  ) {
    Decimal.set({ precision: 50 }); // calculation accuracy 
    this.formCoins.get = convertCoins['DUC']; // DUCX
    this.formCoins.send = convertSendCoins[0]; // DUC
    this.coin_info = coinInfo;
    this.convertGetCoins = convertGetCoins;
    this.convertSendCoins = convertSendCoins;
    this.appVersion = this.appProvider.info.version;
    this.logger.log('this.appVersion', this.appVersion);

    this.calculatorForm = this.formBuilder.group({
      getAmount: [
        "0",
        Validators.compose([Validators.minLength(1), Validators.required,Validators.pattern(/^[0-9.]+$/)])
      ],
      sendAmount: [
        "0",
        Validators.compose([Validators.minLength(1), Validators.required])
      ],
      getCoin: 'DUCX',
      sendCoin: 'DUC'
    });
    this.oldValueForm = this.calculatorForm.value;
  }

  ionViewWillEnter() {
    const wallets = this.profileProvider.getWallets({ showHidden: true });
   
    wallets.forEach((wallet, index) => {
      this.fetchTxHistory(wallet, () => {
        if ( wallets.length - 1 === index ) {
          this.historyIsLoaded = true;
        }
      });
    });

    this.subSendAmount$ = this.calculatorForm.get('sendAmount').valueChanges.subscribe( result => {
      this.handlingDataInput('sendAmount', 'sendCoin', 'getAmount', result);
    });

    this.subGetAmount$ = this.calculatorForm.get('getAmount').valueChanges.subscribe( result => {
      this.handlingDataInput('getAmount', 'getCoin', 'sendAmount', result);
    });

    this.subSendCoin$ = this.calculatorForm.get('sendCoin').valueChanges.subscribe( sendCoin => {
      this.formCoins.get = convertCoins[sendCoin]; // changing the possible choice for getCoin
      this.calculatorForm.get('getCoin').setValue(this.formCoins.get.items[0], { emitEvent: false });
      // update value when coin type changes
      const sendValue = this.calculatorForm.get('sendAmount').value;
      this.calculatorForm.get('sendAmount').setValue(sendValue);
    });

    this.subGetCoin$ = this.calculatorForm.get('getCoin').valueChanges.subscribe( () => {
      // update value when coin type changes
      const sendValue = this.calculatorForm.get('sendAmount').value;
      this.calculatorForm.get('sendAmount').setValue(sendValue);
    });

    this.rates = null;

    this.httpClient
      .get(this.apiProvider.getAddresses().ducatuscoins + '/api/v1/rates')
      .toPromise()
      .then(
        (result: { res_rates: any }) => {
          this.logger.debug('getting rates:', result);
          this.rates = {
            ...result,
            WDUCX: {
              DUCX: 1
            }
          };
        },
        err => {
          this.logger.debug('error in getting rates: ', err);
        }
      );

    this.httpClient
      .get(
        this.apiProvider.getAddresses().ducatuscoins +
          '/api/v1/exchange/status/'
      )
      .toPromise()
      .then((res: boolean) => {
        this.isAvailableDucSwap = res;
        this.isAvailableSwap = true;

        if (
          this.formCoins.get.name === 'DUCX' &&
          this.formCoins.send === 'DUC'
        ) {
          this.isAvailableSwap = Boolean(this.isAvailableDucSwap);
        }
      })
      .catch(() => {
        this.isAvailableDucSwap = false;
      });

    // WDUCX - DUXX

    this.logger.log(`APP VERSION: ${this.appVersion}`);
    this.logger.log(
      `REQUEST URL: ${this.apiProvider.getAddresses().swap.status}`
    );

    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json'
      })
    };

    this.httpClient
      .get(
        this.apiProvider.getAddresses().swap.status +
          '?version=' +
          this.appVersion,
        httpOptions
      )
      .toPromise()
      .then((res: boolean) => {
        this.logger.log('WDUCX - DUXX swap res', JSON.stringify(res));
        this.logger.log(`WDUCX - DUXX swap res:  ${res}`);
        this.isAvailableSwapWDUCXtoDUCX = res;
        this.isAvailableSwap = true;
        if (
          this.formCoins.get.name === 'WDUCX' &&
          this.formCoins.send === 'DUCX'
        ) {
          this.isAvailableSwap = Boolean(this.isAvailableSwapWDUCXtoDUCX);
        }
      })
      .catch((err: any) => {
        this.logger.log(err);
        this.logger.log(JSON.stringify(err));
        this.isAvailableSwapWDUCXtoDUCX = false;
      });
  }

  ngOnDestroy() {
    this.unsubscribeForm();
  }

  public getCalculatedFieldValue(value: string,editField: string) {
    const getCoin: string = this.calculatorForm.get('getCoin').value.toUpperCase();
    const sendCoin: string = this.calculatorForm.get('sendCoin').value.toUpperCase();
    const rate = this.rates[getCoin][sendCoin];
    let decimalsCoin: number;
    let bgCalculatedValue: string;

    if (editField === 'getAmount') {
      decimalsCoin = this.coins[sendCoin.toLowerCase()].unitInfo.unitDecimals;
      bgCalculatedValue = new Decimal(value)
        .times(rate)
        .toString();
    } 
    else {
      getCoin.toLowerCase() === 'wducx'
      ? decimalsCoin = 18
      : decimalsCoin = this.coins[getCoin.toLowerCase()].unitInfo.unitDecimals;

      bgCalculatedValue = new Decimal(value)
        .div(rate)
        .toString();
    }
    bgCalculatedValue =  this.formCtrl.trimStrToDecimalsCoin(bgCalculatedValue,decimalsCoin);

    return bgCalculatedValue;
  }

  public handlingDataInput
  (
    changeableInputName: string,
    changeableCoinName: string, 
    calculatedInputName: string, 
    changeableValue: string
  )
  {
    this.calculationError = false; // reset if the last attempt to calculate was unsuccessful
    let calculatedValue = '0'; // default 
    const changeableCoin = this.calculatorForm.get(changeableCoinName).value.toLowerCase();
    let valueDecimals: number;

    changeableCoin === 'wducx'
    ? valueDecimals = 18
    : valueDecimals = this.coins[changeableCoin].unitInfo.unitDecimals;

    const oldValue: string = this.calculatorForm.value[changeableInputName];
    let newValue = this.formCtrl.transformValue(changeableValue, valueDecimals, oldValue); // formatted input new value

    try {
      this.calculatorForm.get(changeableInputName).setValue( newValue,{ emitEvent: false });
      calculatedValue = this.getCalculatedFieldValue(newValue, changeableInputName);
      this.calculatorForm.get(calculatedInputName).setValue( calculatedValue, { emitEvent: false });
    } 
    catch (err) {
      this.logger.debug(err);

      if (!newValue) {
        this.calculatorForm.get(calculatedInputName).setValue('0', { emitEvent: false });
      }
      else {
        this.calculatorForm.get(changeableInputName).setValue( oldValue, { emitEvent: false });
        this.calculatorForm.get(calculatedInputName).setValue( newValue, { emitEvent: false });
      }

      this.calculationError = true;
    }
  }
  
  private fetchTxHistory = (wallet, cb) => {
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
    this.walletProvider
      .fetchTxHistory(wallet, progressFn)
      .then((txHistory = []) => {
        txHistory.forEach(tx => {
          if (tx.swap) {
            tx.wallet = _.cloneDeep(wallet);
            this.swapHistory.push(tx);
          } 
        });
        this.swapHistory = this.swapHistory.sort((a, b) => {
          return b.time - a.time;
        });
        
        cb();
      })
      .catch(err => {
        if (err != 'HISTORY_IN_PROGRESS') {
          this.logger.warn('fetchTxHistory ERROR', err);
        }
        cb();
      });
  }

  public goToConvertPage() {
    if (this.calculatorForm.value.getCoin === 'WDUCX') {
      const infoSheet = this.actionSheetProvider.createInfoSheet('wducx-select');
      infoSheet.present();
      return;
    }

    this.unsubscribeForm();

    this.navCtrl.push(CalculatorConvertPage, {
      get: this.calculatorForm.value.getCoin,
      send: this.calculatorForm.value.sendCoin,
      amountGet: this.calculatorForm.value.getAmount,
      amountSend: this.calculatorForm.value.sendAmount
    });
  }

  public showSwapHistory() {
    this.isShowSwapHistory = !this.isShowSwapHistory;
  }

  public itemTapped(tx) {
    this.goToTxDetails(tx);
  }

  public goToTxDetails(tx) {
    const txDetailModal = this.modalCtrl.create(TxDetailsModal, {
      walletId: tx.wallet.credentials.walletId,
      txid: tx.txid
    });
    txDetailModal.present();
  }

  public createdWithinPastDay(time) {
    return this.timeProvider.withinPastDay(time);
  }

  public unsubscribeForm() {
    this.subSendAmount$.unsubscribe();
    this.subGetAmount$.unsubscribe();
    this.subSendCoin$.unsubscribe();
    this.subGetCoin$.unsubscribe();
  }
}