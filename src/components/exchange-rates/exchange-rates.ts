import { Component } from '@angular/core';
import * as _ from 'lodash';
import * as moment from 'moment';
import {
  ConfigProvider,
  CurrencyProvider,
  ExchangeRatesProvider,
  Logger
} from '../../providers';
import { Coin } from '../../providers/currency/currency';

@Component({
  selector: 'exchange-rates',
  templateUrl: 'exchange-rates.html'
})
export class ExchangeRates {
  public isIsoCodeSupported: boolean;
  public lineChart: any;
  public isoCode: string;
  public lastDates = 6;
  public coins = [];
  public fiatCodes = [
    'USD',
    'INR',
    'GBP',
    'EUR',
    'CAD',
    'COP',
    'NGN',
    'BRL',
    'ARS',
    'AUD'
  ];

  constructor(
    private currencyProvider: CurrencyProvider,
    private exchangeRatesProvider: ExchangeRatesProvider,
    private configProvider: ConfigProvider,
    private logger: Logger
  ) {
    const availableCurrencys = this.currencyProvider.getAvaibleCurrencys();
    for (const coin of availableCurrencys) {
      const {
        backgroundColor,
        gradientBackgroundColor
      } = this.currencyProvider.getTheme(coin as Coin);
      const card = {
        unitCode: coin,
        historicalRates: [],
        currentPrice: 0,
        averagePrice: 0,
        backgroundColor,
        gradientBackgroundColor,
        name: this.currencyProvider.getCoinName(coin as Coin)
      };
      this.coins.push(card);
    }
    this.getPrices();
  }

  public getPrices() {
    this.setIsoCode();
    this.exchangeRatesProvider.getHistoricalRates(this.isoCode).subscribe(
      response => {
        _.forEach(this.coins, (coin, index) => {
          this.coins[index].historicalRates = response[coin.unitCode]
            ? response[coin.unitCode].reverse()
            : [];
          this.updateValues(index, coin.unitCode);
        });
      },
      err => {
        this.logger.error('Error getting rates:', err);
      }
    );
  }

  public updateCurrentPrice() {
    const lastRequest = this.coins[0].historicalRates[
      this.coins[0].historicalRates.length - 1
    ].ts;
    if (moment(lastRequest).isBefore(moment(), 'days')) {
      this.getPrices();
      return;
    }
    _.forEach(this.coins, (coin, i) => {
      this.exchangeRatesProvider
        .getCurrentRate(this.isoCode, coin.unitCode)
        .subscribe(
          response => {
            this.coins[i].historicalRates[
              this.coins[i].historicalRates.length - 1
            ] = response;
            this.updateValues(i, coin.unitCode);
          },
          err => {
            this.logger.error('Error getting current rate:', err);
          }
        );
    });
  }

  private updateValues(i: number, coin: string) {
    if (coin === 'usdc'){
      this.coins[i].currentPrice = 1
      return
    }

    const coinHistoricalRates = this.coins[i].historicalRates[
      this.coins[i].historicalRates.length - 1
    ];

    this.coins[i].currentPrice = coinHistoricalRates
      ? coinHistoricalRates.rate
      : 0;
    this.coins[i].averagePrice = coinHistoricalRates
      ? ((this.coins[i].currentPrice - this.coins[i].historicalRates[0].rate) *
          100) /
        this.coins[i].historicalRates[0].rate
      : 0;
  }

  private setIsoCode() {
    const alternativeIsoCode = this.configProvider.get().wallet.settings
      .alternativeIsoCode;
    this.isIsoCodeSupported = _.includes(this.fiatCodes, alternativeIsoCode);
    this.isoCode = this.isIsoCodeSupported ? alternativeIsoCode : 'USD';
  }

  public getDigitsInfo(coin: string) {
    switch (coin) {
      case 'xrp':
        return '1.4-4';
      case 'duc':
        return '1.3-3';
      default:
        return '1.2-2';
    }
  }
}
