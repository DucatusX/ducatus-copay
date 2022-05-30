import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import * as _ from 'lodash';
import env from '../../environments';
import { ApiProvider } from '../../providers/api/api';
import { CoinsMap, CurrencyProvider } from '../../providers/currency/currency';
import { Logger } from '../../providers/logger/logger';

@Injectable()
export class RateProvider {
  private alternatives;
  private rates = {} as CoinsMap<{}>;
  private ratesAvailable = {} as CoinsMap<boolean>;
  private rateServiceUrl = {} as CoinsMap<string>;

  private fiatRateAPIUrl =
    this.apiProvider.getAddresses().bitcore + '/bws/api/v1/fiatrates';

  constructor(
    private currencyProvider: CurrencyProvider,
    private http: HttpClient,
    private logger: Logger,
    private apiProvider: ApiProvider
  ) {
    this.logger.debug('RateProvider initialized');
    this.alternatives = {};
    for (const coin of this.currencyProvider.getAvailableCoins()) {
      this.rateServiceUrl[coin] = env.ratesAPI[coin];
      let usdValue;
      let ngnValue;
      const token = [
        'jamasy',
        'nuyasa',
        'sunoba',
        'dscmed',
        'pog1',
        'wde',
        'mdxb',
        'g.o.l.d.',
        'jwan',
        'tkf',
        'aa+',
        'usdc'
      ];

      if (coin === 'ducx') {
        usdValue = 0.6;
        ngnValue = 0.6;
      } else if (coin === 'duc') {
        usdValue = 0.06;
        ngnValue = 29.05;
      } else if (coin === 'g.o.l.d.') {
        usdValue = 0.01;
        ngnValue = 0.01;
      } else if (coin === 'jwan') {
        usdValue = 0.02;
        ngnValue = 0.02;
      } else if (coin === 'tkf') {
        usdValue = 0.25;
        ngnValue = 0.25;
      } else if (token.includes(coin)) {
        usdValue = 1;
        ngnValue = 1;
      } else {
        usdValue = this.rates[coin];
        ngnValue = this.rates[coin];
      }

      this.rates[coin] = {
        USD: usdValue,
        NGN: ngnValue
      };
      this.ratesAvailable[coin] = false;
      this.updateRates(coin);
    }
  }

  public updateRates(chain: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.getCoin(chain)
        .then(dataCoin => {
          _.each(dataCoin, currency => {
            if (currency && currency.code && currency.rate) {
              this.rates[chain][currency.code] = currency.rate;
              if (currency.name)
                this.alternatives[currency.code] = { name: currency.name };
            }
          });
          if (
            dataCoin[chain.toUpperCase()] &&
            dataCoin[chain.toUpperCase()].USD
          ) {
            this.rates[chain].USD = dataCoin[chain.toUpperCase()].USD;
          }
          this.ratesAvailable[chain] = true;
          resolve();
        })
        .catch(errorCoin => {
          this.logger.error(errorCoin);
          reject(errorCoin);
        });
    });
  }

  public getCoin(chain: string): Promise<any> {
    return new Promise(resolve => {
      if (
        [
          'jamasy',
          'nuyasa',
          'sunoba',
          'dscmed',
          'pog1',
          'wde',
          'mdxb',
          'g.o.l.d.',
          'jwan',
          'tkf',
          'aa+'
        ].includes(chain)
      ) {
        resolve([]);
      } else {
        this.http.get(this.rateServiceUrl[chain]).subscribe(data => {
          resolve(data);
        });
      }
    });
  }

  public getRate(code: string, chain?: string, opts?: { rates? }): number {
    const customRate =
      opts && opts.rates && opts.rates[chain] && opts.rates[chain][code];
    return customRate || this.rates[chain][code];
  }

  private getAlternatives(): any[] {
    const alternatives: any[] = [];
    for (let key in this.alternatives) {
      alternatives.push({ isoCode: key, name: this.alternatives[key].name });
    }
    return alternatives;
  }

  public isCoinAvailable(chain: string) {
    return this.ratesAvailable[chain];
  }

  public toFiat(
    satoshis: number,
    code: string,
    chain,
    opts?: { customRate?: number; rates? }
  ): number {
    if (!this.isCoinAvailable(chain)) {
      return null;
    }
    const customRate = opts && opts.customRate;
    const rate = customRate || this.getRate(code, chain, opts);
    
    return (
      satoshis *
      (1 / this.currencyProvider.getPrecision(chain).unitToSatoshi) *
      rate
    );
  }

  public fromFiat(
    amount: number,
    code: string,
    chain,
    opts?: { rates? }
  ): number {
    if (!this.isCoinAvailable(chain)) {
      return null;
    }
    return (
      (amount / this.getRate(code, chain, opts)) *
      this.currencyProvider.getPrecision(chain).unitToSatoshi
    );
  }

  public listAlternatives(sort: boolean) {
    const alternatives = this.getAlternatives();
    if (sort) {
      alternatives.sort((a, b) => {
        return a.name.toLowerCase() > b.name.toLowerCase() ? 1 : -1;
      });
    }
    return _.uniqBy(alternatives, 'isoCode');
  }

  public whenRatesAvailable(chain: string): Promise<any> {
    return new Promise(resolve => {
      if (this.ratesAvailable[chain]) resolve();
      else {
        if (chain) {
          this.updateRates(chain).then(() => {
            resolve();
          });
        }
      }
    });
  }

  public getHistoricFiatRate(
    currency: string,
    coin: string,
    ts: string
  ): Promise<any> {
    return new Promise(resolve => {
      const url =
        this.fiatRateAPIUrl + '/' + currency + '?coin=' + coin + '&ts=' + ts;
      this.http.get(url).subscribe(data => {
        resolve(data);
      });
    });
  }
}
