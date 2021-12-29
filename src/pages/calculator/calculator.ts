import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Big } from 'big.js';
import { ModalController, NavController } from 'ionic-angular';
import * as _ from 'lodash';
import { TxDetailsModal } from '../../pages/tx-details/tx-details';
import { AppProvider } from '../../providers';
import { ApiProvider } from '../../providers/api/api';
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

  constructor(
    private navCtrl: NavController,
    private logger: Logger,
    private formBuilder: FormBuilder,
    private apiProvider: ApiProvider,
    private appProvider: AppProvider,
    private httpClient: HttpClient, // private moonPayProvider: MoonPayProvider
    private profileProvider: ProfileProvider,
    private walletProvider: WalletProvider,
    private timeProvider: TimeProvider,
    private modalCtrl: ModalController
  ) {
    this.formCoins.get = convertCoins['DUC']; // DUCX
    this.formCoins.send = convertSendCoins[0]; // DUC
    this.coin_info = coinInfo;
    this.convertGetCoins = convertGetCoins;
    this.convertSendCoins = convertSendCoins;
    this.appVersion = this.appProvider.info.version;
    this.logger.log('this.appVersion', this.appVersion);

    this.calculatorForm = this.formBuilder.group({
      getAmount: [
        0,
        Validators.compose([Validators.minLength(1), Validators.required,Validators.pattern(/^[0-9.]+$/)])
      ],
      sendAmount: [
        0,
        Validators.compose([Validators.minLength(1), Validators.required])
      ],
      getCoin: 'DUCX',
      sendCoin: 'DUC'
    });
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
        cb();
      })
      .catch(err => {
        if (err != 'HISTORY_IN_PROGRESS') {
          this.logger.warn('fetchTxHistory ERROR', err);
        }
        cb();
      });
  }
  
  public changeCoin(type) {
    
    this.selectInputType(type);

    if (type === 'Send') {
      this.formCoins.get = convertCoins[this.calculatorForm.value.sendCoin]; // changing the possible choice for getCoin
      this.calculatorForm.value.getCoin = this.formCoins.get.items[0]; // getCoin = the first possible coin to choose
    }

    this.isAvailableSwap = true;
    this.changeAmount(type)

    if (
      this.formCoins.get.name === 'DUCX' 
      && this.formCoins.send === 'DUC'
    ) {
      this.isAvailableSwap = Boolean(this.isAvailableDucSwap);
    }

    if (
      this.formCoins.get.name === 'WDUCX' 
      && this.formCoins.send === 'DUCX'
    ) {
      this.isAvailableSwap = Boolean(this.isAvailableDucSwap);
    }
  }

  public selectInputType(type) {
    this.lastChange = type;
  }

  public changeAmount(type) {
    const { getAmount, sendAmount } = this.calculatorForm.value;
    const { getCoin, sendCoin } = this.calculatorForm.value;

    const rate = this.rates[getCoin][sendCoin];
    const bgGetAmount = Big(Number(getAmount));
    const bgSendAmount = Big(Number(sendAmount));

    // if change getAmount then change sendAmount
    if (type === 'Get' && this.lastChange === 'Get') {
      let chNumber: any = bgGetAmount
        .times(rate)
        .toFixed();

      this.calculatorForm.value.sendAmount = chNumber;
  
    }

    // if change sendAmount then change getAmount
    if (type === 'Send' && this.lastChange === 'Send') {
      let chNumber: any = bgSendAmount
        .div(rate)
        .toFixed();
      
      this.calculatorForm.value.getAmount = chNumber;
    }

    this.calculatorForm.value.getCoin = this.formCoins.get.items[0];
  }

  public goToConvertPage() {
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
}