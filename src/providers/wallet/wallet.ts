import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Events } from 'ionic-angular';
import * as _ from 'lodash';
import encoding from 'text-encoding';
import * as bip65 from 'bip65';
import * as bitcoin from 'bitcoinjs-lib';
import { AddressProvider } from '../address/address';
import { BwcErrorProvider } from '../bwc-error/bwc-error';
import { BwcProvider } from '../bwc/bwc';
import { ConfigProvider } from '../config/config';
import { Coin, CurrencyProvider } from '../currency/currency';
import { FeeProvider } from '../fee/fee';
import { FilterProvider } from '../filter/filter';
import { KeyProvider } from '../key/key';
import { LanguageProvider } from '../language/language';
import { Logger } from '../logger/logger';
import { OnGoingProcessProvider } from '../on-going-process/on-going-process';
import { PersistenceProvider } from '../persistence/persistence';
import { PopupProvider } from '../popup/popup';
import { RateProvider } from '../rate/rate';
import { TouchIdProvider } from '../touchid/touchid';
import { TxFormatProvider } from '../tx-format/tx-format';

export interface HistoryOptionsI {
  limitTx?: string;
  lowAmount?: number;
  force?: boolean;
  retry?: boolean; // TODO: not used
}

export interface WalletOptions {
  keyId: any;
  name: any;
  m: any;
  n: any;
  myName: any;
  networkName: string;
  bwsurl: any;
  singleAddress: any;
  coin: Coin;
  extendedPrivateKey: any;
  mnemonic: any;
  derivationStrategy: any;
  secret: any;
  account: any;
  passphrase: any;
  walletPrivKey: any;
  compliantDerivation: any;
  useLegacyCoinType?: boolean;
  useLegacyPurpose?: boolean;
}

export interface TransactionProposal {
  coin: string;
  amount: any;
  from: string;
  toAddress: any;
  outputs: Array<{
    toAddress: any;
    amount: any;
    message: string;
    data?: string;
  }>;
  inputs: any;
  fee: any;
  message: string;
  customData?: {
    service?: string;
    giftCardName?: string;
    shapeShift?: string;
    toWalletName?: any;
  };
  payProUrl: any;
  excludeUnconfirmedUtxos: boolean;
  feePerKb: number;
  feeLevel: string;
  dryRun: boolean;
  tokenAddress?: string;
  tokenId?: string;
  destinationTag?: string;
  invoiceID?: string;
  wDucxAddress?: string;
}

@Injectable()
export class WalletProvider {
  // Ratio low amount warning (fee/amount) in incoming TX
  private LOW_AMOUNT_RATIO: number = 0.15;
  // Ratio of "many utxos" warning in total balance (fee/amount)
  private TOTAL_LOW_WARNING_RATIO: number = 0.3;
  private WALLET_STATUS_MAX_TRIES: number = 5;
  private WALLET_STATUS_DELAY_BETWEEN_TRIES: number = 1.6 * 1000;
  private SOFT_CONFIRMATION_LIMIT: number = 12;
  private SAFE_CONFIRMATIONS: number = 6;
  private errors = this.bwcProvider.getErrors();
  private isPopupOpen: boolean;
  static progressFn = {};
  static statusUpdateOnProgress = {};
  static historyUpdateOnProgress = {};

  constructor(
    private logger: Logger,
    private bwcProvider: BwcProvider,
    private txFormatProvider: TxFormatProvider,
    private configProvider: ConfigProvider,
    private currencyProvider: CurrencyProvider,
    private persistenceProvider: PersistenceProvider,
    private bwcErrorProvider: BwcErrorProvider,
    private rateProvider: RateProvider,
    private filter: FilterProvider,
    private popupProvider: PopupProvider,
    private onGoingProcessProvider: OnGoingProcessProvider,
    private touchidProvider: TouchIdProvider,
    private events: Events,
    private feeProvider: FeeProvider,
    private translate: TranslateService,
    private addressProvider: AddressProvider,
    private languageProvider: LanguageProvider,
    private keyProvider: KeyProvider
  ) {
    this.logger.debug('WalletProvider initialized');
    this.isPopupOpen = false;
  }

  private getKeysWithFixes(parsedFile): Promise<any[]> {
    const Key = this.bwcProvider.getKey();

    return new Promise(resolve => {
      this.persistenceProvider.getKeys().then(keys => {
        const allKeys = keys
          ? keys
              .filter(k => !k.xPrivKeyEncrypted)
              .map(key => {
                const currentXPrivKey = this.bwcProvider.Client.Ducatuscore.HDPrivateKey(
                  key.xPrivKey
                ).toObject();
                const credentialsData = { ...parsedFile };
                credentialsData.useLegacyCoinType = undefined;
                credentialsData.useLegacyPurpose = undefined;

                if (currentXPrivKey.network === 'restore') {
                  currentXPrivKey.network = 'livenet';
                  currentXPrivKey.xprivkey = undefined;
                  currentXPrivKey.checksum = undefined;
                  const newXPrivKey = this.bwcProvider.Client.Ducatuscore.HDPrivateKey.fromObject(
                    currentXPrivKey
                  );
                  key.xPrivKey = newXPrivKey.toString();
                }

                const recoveryKey = Key.fromObj(key);
                const recoveryCredentials = recoveryKey.createCredentials(
                  parsedFile.passphrase,
                  credentialsData
                );

                return {
                  key: recoveryKey,
                  keyId: recoveryCredentials.keyId,
                  xPubKey: recoveryCredentials.xPubKey,
                  copayerId: recoveryCredentials.copayerId
                };
              })
          : [];
        resolve(allKeys);
      });
    });
  }

  public normalizeJSON(parsedFile): any {
    if (!parsedFile.xPubKey) {
      return new Promise(resolve => {
        resolve(parsedFile);
      });
    }

    const network = this.bwcProvider.Client.Ducatuscore.HDPublicKey.fromString(
      parsedFile.xPubKey
    ).network;

    if (!network || network.name !== 'restore') {
      return new Promise(resolve => {
        resolve(parsedFile);
      });
    }

    parsedFile.coin = 'duc';
    parsedFile.useLegacyCoinType = false;
    parsedFile.useLegacyPurpose = parsedFile.n > 1;
    parsedFile.singleAddress = parsedFile.useLegacyPurpose;

    const walletXPub = this.bwcProvider.Client.Ducatuscore.HDPublicKey.fromString(
      parsedFile.xPubKey
    ).toObject();
    walletXPub.network = 'livenet';
    walletXPub.xpubkey = undefined;
    walletXPub.checksum = undefined;
    const walletXPubStr = this.bwcProvider.Client.Ducatuscore.HDPublicKey.fromObject(
      walletXPub
    ).toString();

    parsedFile.xPubKey = walletXPubStr;

    parsedFile.publicKeyRing.forEach(oneRing => {
      const oldXPubKey = this.bwcProvider.Client.Ducatuscore.HDPublicKey.fromString(
        oneRing.xPubKey
      ).toObject();
      oldXPubKey.network = 'livenet';
      oldXPubKey.xpubkey = undefined;
      oldXPubKey.checksum = undefined;
      oneRing.xPubKey = this.bwcProvider.Client.Ducatuscore.HDPublicKey.fromObject(
        oldXPubKey
      ).toString();
    });

    const Key = this.bwcProvider.getKey();

    const fromSavedKey = existsKey => {
      return this.keyProvider.removeKey(existsKey.keyId).then(() => {
        return this.keyProvider.addKey(existsKey.key).then(() => {
          const credentialsData = { ...parsedFile };
          credentialsData.useLegacyCoinType = undefined;
          credentialsData.useLegacyPurpose = undefined;
          const newCredentials = existsKey.key
            .createCredentials(parsedFile.passphrase, credentialsData)
            .toObj();
          parsedFile.rootPath = newCredentials.rootPath;
          parsedFile.keyId = newCredentials.keyId;
          parsedFile.copayerId = newCredentials.copayerId;
          return this.persistenceProvider.setBackupGroupFlag(
            newCredentials.keyId
          );
        });
      });
    };

    const fromPrivate = () => {
      const recreateData: any = {};

      if (parsedFile.mnemonic) {
        recreateData.method = 'fromMnemonic';
        recreateData.data = parsedFile.mnemonic;
      } else {
        recreateData.method = 'fromExtendedPrivateKey';
        recreateData.data = parsedFile.xPrivKey;
      }

      const key = Key[recreateData.method](recreateData.data, {
        useLegacyCoinType: parsedFile.useLegacyCoinType,
        useLegacyPurpose: parsedFile.useLegacyPurpose,
        passphrase: parsedFile.passphrase
      });

      const credentialsData = { ...parsedFile };
      credentialsData.useLegacyCoinType = undefined;
      credentialsData.useLegacyPurpose = undefined;
      const newCredentials = key.createCredentials(
        parsedFile.passphrase,
        credentialsData
      );
      parsedFile.copayerId = newCredentials.copayerId;

      if (parsedFile.version && parsedFile.version !== 1) {
        return this.keyProvider.addKey(key).then(() => {
          parsedFile.keyId = key.id;

          return this.persistenceProvider.setBackupGroupFlag(key.id);
        });
      } else {
        parsedFile.xPrivKey = key.xPrivKey;

        return Promise.resolve();
      }
    };

    return new Promise((resolve, reject) => {
      this.getKeysWithFixes(parsedFile).then(savedKeys => {
        const existsKey = savedKeys.filter(k => {
          return k.xPubKey === walletXPubStr;
        })[0];

        if (existsKey) {
          fromSavedKey(existsKey).then(() => {
            resolve(null);
          }, reject);
        } else if (parsedFile.xPrivKey) {
          fromPrivate().then(() => {
            resolve(null);
          }, reject);
        }
      });
    });
  }

  public invalidateCache(wallet): void {
    if (wallet.cachedStatus) {
      wallet.cachedStatus.isValid = false;
    }

    if (wallet.completeHistory) {
      wallet.completeHistoryIsValid = false;
    }

    if (wallet.cachedActivity) {
      wallet.cachedActivity.isValid = false;
    }
  }

  public fetchStatus(wallet, opts): Promise<any> {
    return new Promise((resolve, reject) => {
      opts = opts || {};
      const walletId = wallet.id;

      const processPendingTxps = status => {
        const txps = status.pendingTxps;
        const now = Math.floor(Date.now() / 1000);

        _.each(txps, tx => {
          tx = this.txFormatProvider.processTx(wallet.coin, tx);
          // no future transactions...
          if (tx.createdOn > now)  {
            tx.createdOn = now;
          }

          tx.wallet = wallet;

          if (!tx.wallet) {
            this.logger.error('no wallet at txp?');
            
            return;
          }

          const action: any = _.find(tx.actions, {
            copayerId: tx.wallet.copayerId
          });

          if (!action && tx.status == 'pending') {
            tx.pendingForUs = true;
          }

          if (action && action.type == 'accept') {
            tx.statusForUs = 'accepted';
          } else if (action && action.type == 'reject') {
            tx.statusForUs = 'rejected';
          } else {
            tx.statusForUs = 'pending';
          }

          if (!tx.deleteLockTime) {
            tx.canBeRemoved = true;
          }
        });
        wallet.pendingTxps = txps;
      };

      const cacheBalance = (wallet, balance): void => {
        if (!balance) {
          return;
        }

        const configGet = this.configProvider.get();
        const config = configGet.wallet;
        const cache = wallet.cachedStatus;
        // Address with Balance
        cache.balanceByAddress = balance.byAddress;
        // Total wallet balance is same regardless of 'spend unconfirmed funds' setting.
        cache.totalBalanceSat = balance.totalAmount;
        // Spend unconfirmed funds
        if (config.spendUnconfirmed) {
          cache.lockedBalanceSat = balance.lockedAmount;
          cache.availableBalanceSat = balance.availableAmount;
          cache.totalBytesToSendMax = balance.totalBytesToSendMax;
          cache.pendingAmount = 0;
          cache.spendableAmount = balance.totalAmount - balance.lockedAmount;
        } else {
          cache.lockedBalanceSat = balance.lockedConfirmedAmount;
          cache.availableBalanceSat = balance.availableConfirmedAmount;
          cache.totalBytesToSendMax = balance.totalBytesToSendConfirmedMax;
          cache.pendingAmount =
            balance.totalAmount - balance.totalConfirmedAmount;
          cache.spendableAmount =
            balance.totalConfirmedAmount - balance.lockedAmount;
        }

        // Selected unit
        cache.unitToSatoshi = this.currencyProvider.getPrecision(
          wallet.coin
        ).unitToSatoshi;
        cache.satToUnit = 1 / cache.unitToSatoshi;
        // STR
        cache.totalBalanceStr = this.txFormatProvider.formatAmountStr(
          wallet.coin,
          cache.totalBalanceSat
        );
        cache.lockedBalanceStr = this.txFormatProvider.formatAmountStr(
          wallet.coin,
          cache.lockedBalanceSat
        );
        cache.availableBalanceStr = this.txFormatProvider.formatAmountStr(
          wallet.coin,
          cache.availableBalanceSat
        );
        cache.spendableBalanceStr = this.txFormatProvider.formatAmountStr(
          wallet.coin,
          cache.spendableAmount
        );
        cache.pendingBalanceStr = this.txFormatProvider.formatAmountStr(
          wallet.coin,
          cache.pendingAmount
        );

        cache.alternativeName = config.settings.alternativeName;
        cache.alternativeIsoCode = config.settings.alternativeIsoCode;

        this.rateProvider
          .whenRatesAvailable(wallet.coin)
          .then(() => {
            const availableBalanceAlternative = this.rateProvider.toFiat(
              cache.availableBalanceSat,
              cache.alternativeIsoCode,
              wallet.coin
            );
            const totalBalanceAlternative = this.rateProvider.toFiat(
              cache.totalBalanceSat,
              cache.alternativeIsoCode,
              wallet.coin
            );
            const pendingBalanceAlternative = this.rateProvider.toFiat(
              cache.pendingAmount,
              cache.alternativeIsoCode,
              wallet.coin
            );
            const lockedBalanceAlternative = this.rateProvider.toFiat(
              cache.lockedBalanceSat,
              cache.alternativeIsoCode,
              wallet.coin
            );
            const spendableBalanceAlternative = this.rateProvider.toFiat(
              cache.spendableAmount,
              cache.alternativeIsoCode,
              wallet.coin
            );
            const alternativeConversionRate = this.rateProvider.toFiat(
              100000000,
              cache.alternativeIsoCode,
              wallet.coin
            );

            cache.availableBalanceAlternative = this.filter.formatFiatAmount(
              availableBalanceAlternative
            );
            cache.totalBalanceAlternative = this.filter.formatFiatAmount(
              totalBalanceAlternative
            );
            cache.pendingBalanceAlternative = this.filter.formatFiatAmount(
              pendingBalanceAlternative
            );
            cache.lockedBalanceAlternative = this.filter.formatFiatAmount(
              lockedBalanceAlternative
            );
            cache.spendableBalanceAlternative = this.filter.formatFiatAmount(
              spendableBalanceAlternative
            );
            cache.alternativeConversionRate = this.filter.formatFiatAmount(
              alternativeConversionRate
            );

            cache.alternativeBalanceAvailable = true;

            cache.isRateAvailable = true;
          })
          .catch(err => {
            this.logger.warn('Could not get rates: ', err);
          });
      };

      const isStatusCached = (): boolean => {
        return wallet.cachedStatus && wallet.cachedStatus.isValid;
      };

      const cacheStatus = (status): void => {
        if (status.wallet && status.wallet.scanStatus == 'running') return;

        wallet.cachedStatus = status || {};
        const cache = wallet.cachedStatus;
        cache.statusUpdatedOn = Date.now();
        cache.isValid = true;
        cache.email = status.preferences 
          ? status.preferences.email 
          : null;

        cacheBalance(wallet, status.balance);
      };

      const checkAndUpdateAdddress = (): void => {
        // Check address
        this.isAddressUsed(wallet, wallet.cachedStatus.balance.byAddress).then(
          used => {
            const isSingleAddress =
              wallet.cachedStatus.wallet &&
              wallet.cachedStatus.wallet.singleAddress;

            if (used && !isSingleAddress) {
              this.logger.debug('Current Wallet address used. Creating new');
              // Force new address
              this.getAddress(wallet, true).catch(err => {
                this.logger.warn('Failed to create address: ', err);
              });
            }
          }
        );
      };

      const hasMeet = (s1, s2): boolean => {
        let diff = false;
        _.each(s1, (v, k) => {
          if (s2[k] == v) {
            diff = true;
          } else {
            this.logger.debug(
              `Status condition not meet: ${k} is ${s2[k]} not ${v}`
            );
            }
        });

        return diff;
      };

      const doFetchStatus = (tries: number = 0): Promise<any> => {
        return new Promise((resolve, reject) => {
          if (isStatusCached() && !opts.force && !opts.until) {
            this.logger.debug('Status cache hit for ' + wallet.id);
            // This will update exchange rates
            cacheStatus(wallet.cachedStatus);

            if (this.currencyProvider.isUtxoCoin(wallet.coin)) {
              checkAndUpdateAdddress();
            }

            processPendingTxps(wallet.cachedStatus);

            return resolve(wallet.cachedStatus);
          }

          tries = tries || 0;
          const { token } = wallet.credentials;

          wallet.getStatus(
            { tokenAddress: token ? token.address : '' },
            (err, status) => {
              if (err) {
                if (err instanceof this.errors.NOT_AUTHORIZED) {
                  return reject('WALLET_NOT_REGISTERED');
                }

                return reject(err);
              }

              if (opts.until) {
                if (
                  !hasMeet(opts.until, status.balance) &&
                  tries < this.WALLET_STATUS_MAX_TRIES
                ) {
                  this.logger.debug(
                    'Retrying update... ' +
                      walletId +
                      ' Try:' +
                      tries +
                      ' until:',
                    opts.until
                  );
                  return setTimeout(() => {
                    return resolve(doFetchStatus(++tries));
                  }, this.WALLET_STATUS_DELAY_BETWEEN_TRIES * tries);
                } else {
                  this.logger.debug(
                    '# Got Wallet Status for: ' + wallet.id + ' after meeting:',
                    opts.until
                  );
                }
              } else {
                this.logger.debug('# Got Wallet Status for: ' + wallet.id);
              }

              processPendingTxps(status);
              cacheStatus(status);

              wallet.scanning = status.wallet && status.wallet.scanStatus == 'running';

              return resolve(status);
            }
          );
        });
      };
      /* ========== Start =========== */
      if (opts.until && hasMeet(opts.until, wallet.cachedStatus.balance)) {
        this.logger.debug(
          'Status change already meet: ' + wallet.credentials.walletName
        );

        return resolve(wallet.cachedStatus);
      }

      if (WalletProvider.statusUpdateOnProgress[wallet.id] && !opts.until) {
        this.logger.info(
          '!! Status update already on progress for: ' +
            wallet.credentials.walletName
        );
        return reject('INPROGRESS');
      }

      WalletProvider.statusUpdateOnProgress[wallet.id] = true;

      doFetchStatus()
        .then(status => {
          WalletProvider.statusUpdateOnProgress[wallet.id] = false;
          resolve(status);
        })
        .catch(err => {
          WalletProvider.statusUpdateOnProgress[wallet.id] = false;
          return reject(err);
        });
    });
  }

  // Check address
  private isAddressUsed(wallet, byAddress): Promise<any> {
    return new Promise((resolve, reject) => {
      this.persistenceProvider
        .getLastAddress(wallet.id)
        .then(addr => {
          const used = _.find(byAddress, {
            address: addr
          });
          return resolve(used);
        })
        .catch(err => {
          return reject(err);
        });
    });
  }

  public getAddressView(
    coin: Coin,
    network: string,
    address: string,
    forcePrefix?
  ): string {
    if (coin != 'bch' && !forcePrefix) {
      return address;
    }

    const protoAddr = this.getProtoAddress(coin, network, address);
    
    return protoAddr;
  }

  public getProtoAddress(coin: Coin, network: string, address: string): string {
    const proto: string = this.getProtocolHandler(coin, network);
    const protoAddr: string = proto + ':' + address;

    return protoAddr;
  }

  public getAddress(wallet, forceNew: boolean): Promise<string> {
    return new Promise((resolve, reject) => {
      let walletId = wallet.id;
      const { token } = wallet.credentials;

      if (token) {
        walletId = wallet.id.replace(`-${token.address}`, '');
      }

      this.persistenceProvider
        .getLastAddress(walletId)
        .then((addr: string) => {
          if (addr) {
            // prevent to show legacy address
            const isBchLegacy = wallet.coin == 'bch' && addr.match(/^[CHmn]/);
            const isValid = this.addressProvider.isValid(addr);
            if (!forceNew && !isBchLegacy && isValid) {
              return resolve(addr);
            }
          }

          if (!wallet.isComplete()) {
            return reject(this.bwcErrorProvider.msg('WALLET_NOT_COMPLETE'));
          }

          if (wallet.needsBackup) {
            return reject(this.bwcErrorProvider.msg('WALLET_NEEDS_BACKUP'));
          }

          this.createAddress(wallet)
            .then(_addr => {
              this.persistenceProvider
                .storeLastAddress(walletId, _addr)
                .then(() => {
                  return resolve(_addr);
                })
                .catch(err => {
                  return reject(err);
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

  private createAddress(wallet): Promise<string> {
    return new Promise((resolve, reject) => {
      this.logger.info('Creating address for wallet:', wallet.id);

      wallet.createAddress({}, (err, addr) => {
        if (err) {
          let prefix = this.translate.instant('Could not create address');

          if (
            err instanceof this.errors.MAIN_ADDRESS_GAP_REACHED ||
            (err.message && err.message == 'MAIN_ADDRESS_GAP_REACHED')
          ) {
            this.logger.warn(this.bwcErrorProvider.msg(err, 'Server Error'));
            prefix = null;

            if (!this.isPopupOpen) {
              this.isPopupOpen = true;
              this.popupProvider
                .ionicAlert(
                  null,
                  this.bwcErrorProvider.msg('MAIN_ADDRESS_GAP_REACHED')
                )
                .then(() => {
                  this.isPopupOpen = false;
                });
            }

            wallet.getMainAddresses(
              {
                reverse: true,
                limit: 1
              },
              (err, addr) => {
                if (err) return reject(err);
                return resolve(addr[0].address);
              }
            );
          } else {
            const msg = this.bwcErrorProvider.msg(err, prefix);

            return reject(msg);
          }
        } else if (!this.addressProvider.isValid(addr.address)) {
          this.logger.error('Invalid address generated: ', addr.address);
          const msg = 'INVALID_ADDRESS';

          return reject(msg);
        } else {
          return resolve(addr.address);
        }
      });
    });
  }

  private getSavedTxs(walletId: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.persistenceProvider
        .getTxHistory(walletId)
        .then(txs => {
          let localTxs = [];

          if (_.isEmpty(txs)) {
            return resolve(localTxs);
          }

          localTxs = txs;
          return resolve(_.compact(localTxs));
        })
        .catch((err: Error) => {
          return reject(err);
        });
    });
  }

  private fetchTxsFromServer(
    wallet,
    skip: number,
    endingTxid: string,
    limit: number
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      let res = [];

      const result = {
        res,
        shouldContinue: res.length >= limit
      };

      const { token } = wallet.credentials;

      wallet.getTxHistory(
        {
          skip,
          limit,
          tokenAddress: token ? token.address : ''
        },
        (err: Error, txsFromServer) => {
          if (err) return reject(err);

          if (_.isEmpty(txsFromServer)) return resolve(result);

          res = _.takeWhile(txsFromServer, tx => {
            return tx.txid != endingTxid;
          });

          result.res = res;
          result.shouldContinue = res.length >= limit;

          return resolve(result);
        }
      );
    });
  }

  private updateLocalTxHistory(
    wallet,
    progressFn,
    opts: HistoryOptionsI = {}
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      opts = opts || {};
      const FIRST_LIMIT = 5;
      const LIMIT = 100;
      let requestLimit = FIRST_LIMIT;
      const walletId = wallet.credentials.walletId;
      WalletProvider.progressFn[walletId] = progressFn || (() => {});
      let foundLimitTx: any = [];

      const fixTxsUnit = (txs): void => {
        if (!txs || !txs[0] || !txs[0].amountStr) return;

        const cacheCoin: string = txs[0].amountStr.split(' ')[1];

        if (cacheCoin == 'bits') {
          this.logger.debug('Fixing Tx Cache Unit to: ' + wallet.coin);
          _.each(txs, tx => {
            tx.amountStr = this.txFormatProvider.formatAmountStr(
              wallet.coin,
              tx.amount
            );
            tx.feeStr = this.txFormatProvider.formatAmountStr(
              wallet.coin,
              tx.fees
            );
          });
        }
      };

      if (WalletProvider.historyUpdateOnProgress[wallet.id]) {
        this.logger.debug(
          '!! History update already on progress for: ' + wallet.id
        );

        if (progressFn) {
          WalletProvider.progressFn[walletId] = progressFn;
        }
        return reject('HISTORY_IN_PROGRESS'); // no callback call yet.
      }

      this.logger.debug(
        'Updating Transaction History for ' + wallet.credentials.walletName
      );

      WalletProvider.historyUpdateOnProgress[wallet.id] = true;

      this.getSavedTxs(walletId)
        .then(txsFromLocal => {
          fixTxsUnit(txsFromLocal);

          const confirmedTxs = this.removeAndMarkSoftConfirmedTx(txsFromLocal);
          const endingTxid = confirmedTxs[0] ? confirmedTxs[0].txid : null;
          const endingTs = confirmedTxs[0] ? confirmedTxs[0].time : null;
          // First update
          WalletProvider.progressFn[walletId](txsFromLocal, 0);
          wallet.completeHistory = txsFromLocal;
          // send update
          this.events.publish('Local/WalletHistoryUpdate', {
            walletId: wallet.id,
            complete: false
          });

          const getNewTxs = (
            newTxs,
            skip: number,
            tries: number = 0
          ): Promise<any> => {
            return new Promise((resolve, reject) => {
              this.fetchTxsFromServer(wallet, skip, endingTxid, requestLimit)
                .then(result => {
                  const res = result.res;
                  const shouldContinue = result.shouldContinue
                    ? result.shouldContinue
                    : false;

                  newTxs = newTxs.concat(
                    this.processNewTxs(wallet, _.compact(res))
                  );
                  WalletProvider.progressFn[walletId](
                    newTxs.concat(txsFromLocal),
                    newTxs.length
                  );
                  skip = skip + requestLimit;
                  this.logger.debug(
                    'Syncing TXs for:' +
                      walletId +
                      '. Got:' +
                      newTxs.length +
                      ' Skip:' +
                      skip,
                    ' EndingTxid:',
                    endingTxid,
                    ' Continue:',
                    shouldContinue
                  );
                  
                  if (opts.limitTx) {
                    foundLimitTx = _.find(newTxs.concat(txsFromLocal), {
                      txid: opts.limitTx as any
                    });
                    if (!_.isEmpty(foundLimitTx)) {
                      this.logger.debug('Found limitTX: ' + opts.limitTx);
                      return resolve([foundLimitTx]);
                    }
                  }
                  
                  if (!shouldContinue) {
                    this.logger.debug(
                      'Finished Sync: New / soft confirmed Txs: ' +
                        newTxs.length
                    );

                    return resolve(newTxs);
                  }

                  requestLimit = LIMIT;

                  return getNewTxs(newTxs, skip).then(txs => {
                    resolve(txs);
                  });
                })
                .catch(err => {
                  if (
                    err instanceof this.errors.CONNECTION_ERROR ||
                    (err.message && err.message.match(/5../))
                  ) {
                    if (tries > 1) return reject(err);

                    return setTimeout(() => {
                      return resolve(getNewTxs(newTxs, skip, ++tries));
                    }, 2000 + 3000 * tries);
                  } else {
                    return reject(err);
                  }
                });
            });
          };

          getNewTxs([], 0)
            .then(txs => {
              const array = _.compact(txs.concat(confirmedTxs));
              const newHistory = _.uniqBy(array, x => {
                return (x as any).txid;
              });

              const updateNotes = (): Promise<any> => {
                return new Promise((resolve, reject) => {
                  if (!endingTs) {
                    return resolve(null);
                  }
                  // this.logger.debug('Syncing notes from: ' + endingTs);
                  wallet.getTxNotes(
                    {
                      minTs: endingTs
                    },
                    (err, notes) => {
                      if (err) {
                        this.logger.warn('Could not get TxNotes: ', err);

                        return reject(err);
                      }
                      _.each(notes, note => {
                        // this.logger.debug('Note for ' + note.txid);
                        _.each(newHistory, (tx: any) => {
                          if (tx.txid == note.txid) {
                            // this.logger.debug(
                            //  '...updating note for ' + note.txid
                            // );
                            tx.note = note;
                          }
                        });
                      });
                      return resolve(null);
                    }
                  );
                });
              };

              const updateLowAmount = txs => {
                if (!opts.lowAmount) {
                  return;
                }

                _.each(txs, tx => {
                  tx.lowAmount = tx.amount < opts.lowAmount;
                });
              };

              if (this.currencyProvider.isUtxoCoin(wallet.coin)) {
                this.getLowAmount(wallet).then(fee => {
                  opts.lowAmount = fee;
                  updateLowAmount(txs);
                });
              }

              updateNotes()
                .then(() => {
                  // <HACK>
                  if (!_.isEmpty(foundLimitTx)) {
                    this.logger.debug(
                      'Tx history read until limitTx: ' + opts.limitTx
                    );

                    return resolve(newHistory);
                  }
                  // </HACK>
                  const historyToSave = JSON.stringify(newHistory);
                  _.each(txs, tx => {
                    tx.recent = true;
                  });
                  // Final update
                  if (walletId == wallet.credentials.walletId) {
                    wallet.completeHistory = newHistory;
                  }

                  return this.persistenceProvider
                    .setTxHistory(walletId, historyToSave)
                    .then(() => {
                      this.logger.debug(
                        'History sync & saved for ' +
                          wallet.id +
                          ' Txs: ' +
                          newHistory.length
                      );

                      return resolve(null);
                    })
                    .catch(err => {
                      return reject(err);
                    });
                })
                .catch(err => {
                  return reject(err);
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

  private processNewTxs(wallet, txs) {
    const now = Math.floor(Date.now() / 1000);
    const txHistoryUnique = {};
    const ret = [];
    wallet.hasUnsafeConfirmed = false;

    _.each(txs, tx => {
      tx = this.txFormatProvider.processTx(wallet.coin, tx);
      // no future transactions...
      if (tx.time > now) {
        tx.time = now;
      }

      if (tx.confirmations >= this.SAFE_CONFIRMATIONS) {
        tx.safeConfirmed = this.SAFE_CONFIRMATIONS + '+';
      } else {
        tx.safeConfirmed = false;
        wallet.hasUnsafeConfirmed = true;
      }

      if (tx.note) {
        delete tx.note.encryptedEditedByName;
        delete tx.note.encryptedBody;
      }

      if (!txHistoryUnique[tx.txid]) {
        ret.push(tx);
        txHistoryUnique[tx.txid] = true;
      } else {
        this.logger.debug('Ignoring duplicate TX in history: ' + tx.txid);
      }
    });

    return ret;
  }

  public removeAndMarkSoftConfirmedTx(txs): any[] {
    return _.filter(txs, tx => {
      if (tx.confirmations >= this.SOFT_CONFIRMATION_LIMIT) {
        return tx;
      }

      tx.recent = true;
    });
  }
  // Approx utxo amount, from which the uxto is economically redeemable
  public getLowAmount(wallet): Promise<any> {
    return new Promise((resolve, reject) => {
      this.getMinFee(wallet)
        .then(fee => {
          const minFee: number = fee;

          return resolve(minFee / this.LOW_AMOUNT_RATIO);
        })
        .catch(err => {
          return reject(err);
        });
    });
  }
  // Approx utxo amount, from which the uxto is economically redeemable
  public getMinFee(wallet, nbOutputs?: number): Promise<any> {
    return new Promise((resolve, reject) => {
      this.feeProvider
        .getFeeLevels(wallet.coin)
        .then(data => {
          const normalLevelRate = _.find(data.levels[wallet.network], level => {
            return level.level === 'normal';
          });
          const lowLevelRate: string = (
            normalLevelRate.feePerKb / 1000
          ).toFixed(0);
          const size = this.getEstimatedTxSize(wallet, nbOutputs);
          // parseInt('2e21',10) = 2
          // parseInt('2000000000000000000000',10) = 2e+21
          return resolve(
            size * parseInt(Number(lowLevelRate).toLocaleString('fullwide', { useGrouping: false }), 10)
          );
        })
        .catch(err => {
          return reject(err);
        });
    });
  }
  // These 2 functions were taken from
  // https://github.com/bitpay/bitcore-wallet-service/blob/master/lib/model/txproposal.js#L243
  private getEstimatedSizeForSingleInput(wallet): number {
    switch (wallet.credentials.addressType) {
      case 'P2PKH':
        return 147;
      default:
      case 'P2SH':
        return wallet.m * 72 + wallet.n * 36 + 44;
    }
  }

  public getEstimatedTxSize(
    wallet,
    nbOutputs?: number,
    nbInputs?: number
  ): number {
    // Note: found empirically based on all multisig P2SH inputs and within m & n allowed limits.
    nbOutputs = nbOutputs ? nbOutputs : 2; // Assume 2 outputs
    const safetyMargin = 0.02;
    const overhead = 4 + 4 + 9 + 9;
    const inputSize = this.getEstimatedSizeForSingleInput(wallet);
    const outputSize = 34;
    nbInputs = nbInputs ? nbInputs : 1; // Assume 1 input

    const size = overhead + inputSize * nbInputs + outputSize * nbOutputs;
    const result = (size * (1 + safetyMargin)).toFixed(0);
    
    return parseInt(Number(result).toLocaleString('fullwide', { useGrouping: false }), 10);
  }

  public getTxNote(wallet, txid: string): Promise<any> {
    return new Promise((resolve, reject) => {
      wallet.getTxNote(
        {
          txid
        },
        (err, note) => {
          if (err) { 
            return reject(err);
          }

          return resolve(note);
        }
      );
    });
  }

  public editTxNote(wallet, args): Promise<any> {
    return new Promise((resolve, reject) => {
      wallet.editTxNote(args, (err, res) => {
        if (err) {
          return reject(err);
        }

        return resolve(res);
      });
    });
  }

  public getTxp(wallet, txpid: string): Promise<any> {
    return new Promise((resolve, reject) => {
      wallet.getTx(txpid, (err, txp) => {
        if (err) { 
          return reject(err);
        }

        return resolve(txp);
      });
    });
  }

  private isHistoryCached(wallet): boolean {
    return wallet.completeHistory && wallet.completeHistoryIsValid;
  }

  public getTx(wallet, txid: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const finish = list => {
        const tx = _.find(list, {
          txid
        });

        if (!tx) {
          return reject('Could not get transaction');
        }

        return tx;
      };

      if (this.isHistoryCached(wallet)) {
        const tx = finish(wallet.completeHistory);
        
        return resolve(tx);
      } else {
        const opts = {
          limitTx: txid
        };
        this.fetchTxHistory(wallet, null, opts)
          .then(txHistory => {
            const tx = finish(txHistory);
            
            return resolve(tx);
          })
          .catch(err => {
            return reject(err);
          });
      }
    });
  }

  public fetchTxHistory(
    wallet,
    progressFn,
    opts: HistoryOptionsI = {}
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      opts = opts || {};

      if (!wallet.isComplete()) {
        return resolve(null);
      }

      if (this.isHistoryCached(wallet) && !opts.force) {
        this.logger.debug('Returning cached history for ' + wallet.id);
        
        return resolve(wallet.completeHistory);
      }

      this.updateLocalTxHistory(wallet, progressFn, opts)
        .then(txs => {
          WalletProvider.historyUpdateOnProgress[wallet.id] = false;
          
          if (opts.limitTx) {
            return resolve(txs);
          }

          wallet.completeHistoryIsValid = true;
          
          return resolve(wallet.completeHistory);
        })
        .catch(err => {
          if (err != 'HISTORY_IN_PROGRESS') {
            WalletProvider.historyUpdateOnProgress[wallet.id] = false;
            this.logger.warn(
              '!! Could not update history for ',
              wallet.id,
              err
            );
          }
          
          return reject(err);
        });
    });
  }

  public createTx(
    wallet,
    txp: Partial<TransactionProposal>
  ): Promise<TransactionProposal> {
    return new Promise((resolve, reject) => {
      
      if (_.isEmpty(txp) || _.isEmpty(wallet)) {
        return reject('MISSING_PARAMETER');
      }

      wallet.createTxProposal(txp, (err, createdTxp) => {
        if (err) {
          return reject(err);
        } else {
          this.logger.debug('Transaction created');
          
          return resolve(createdTxp);
        }
      });
    });
  }

  public publishTx(wallet, txp): Promise<any> {
    return new Promise((resolve, reject) => {
      if (_.isEmpty(txp) || _.isEmpty(wallet)) {
        return reject('MISSING_PARAMETER');
      }

      wallet.publishTxProposal(
        { txp },
        (err, publishedTx) => {
          if (err) {
            return reject(err);
          } else {
            this.logger.debug('Transaction published');
            
            return resolve(publishedTx);
          }
        }
      );
    });
  }

  public signTx(wallet, txp, password: string): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!wallet || !txp) {
        return reject('MISSING_PARAMETER');
      }

      const rootPath = wallet.getRootPath();
      const signatures = this.keyProvider.sign(
        wallet.credentials.keyId,
        rootPath,
        txp,
        password
      );

      try {
        wallet.pushSignatures(txp, signatures, (err, signedTxp) => {
          if (err) {
            this.logger.error('Transaction signed err: ', err);
            
            return reject(err);
          }
          
          return resolve(signedTxp);
        });
      } catch (e) {
        this.logger.error('Error at pushSignatures:', e);
        
        return reject(e);
      }
    });
  }

  public broadcastTx(wallet, txp): Promise<any> {
    return new Promise((resolve, reject) => {
      if (_.isEmpty(txp) || _.isEmpty(wallet)) {
        return reject('MISSING_PARAMETER');
      }

      if (txp.status != 'accepted') {
        return reject('TX_NOT_ACCEPTED');
      }

      wallet.broadcastTxProposal(txp, (err, broadcastedTxp, memo) => {
        if (err) {
          if (_.isArrayBuffer(err)) {
            const enc = new encoding.TextDecoder();
            err = enc.decode(err);
            this.removeTx(wallet, txp);
            
            return reject(err);
          } else {
            return reject(err);
          }
        }

        this.logger.info('Transaction broadcasted: ', broadcastedTxp.txid);
        if (memo) {
          this.logger.info('Memo: ', memo);
        }

        return resolve(broadcastedTxp);
      });
    });
  }

  public rejectTx(wallet, txp): Promise<any> {
    return new Promise((resolve, reject) => {
      if (_.isEmpty(txp) || _.isEmpty(wallet)) {
        return reject('MISSING_PARAMETER');
      }

      wallet.rejectTxProposal(txp, null, (err, rejectedTxp) => {
        if (err) {
          return reject(err);
        }

        this.logger.debug('Transaction rejected');
        
        return resolve(rejectedTxp);
      });
    });
  }

  public removeTx(wallet, txp): Promise<any> {
    return new Promise((resolve, reject) => {
      if (_.isEmpty(txp) || _.isEmpty(wallet)) {
        return reject('MISSING_PARAMETER');
      }

      wallet.removeTxProposal(txp, err => {
        this.logger.debug('Transaction removed');

        this.invalidateCache(wallet);
        this.events.publish('Local/TxAction', {
          walletId: wallet.id
        });
        
        return resolve(err);
      });
    });
  }
  // updates local and remote prefs for 1 wallet
  public updateRemotePreferencesFor(client, prefs): Promise<any> {
    return new Promise((resolve, reject) => {
      client.preferences = client.preferences || {};
      
      if (!_.isEmpty(prefs)) {
        _.assign(client.preferences, prefs);
      }

      this.logger.debug(
        'Saving remote preferences',
        client.credentials.walletName,
        JSON.stringify(client.preferences)
      );

      client.savePreferences(client.preferences, err => {
        if (err) {
          this.popupProvider.ionicAlert(
            this.bwcErrorProvider.msg(
              err,
              this.translate.instant('Could not save preferences on the server')
            )
          );
          
          return reject(err);
        }
        return resolve(null);
      });
    });
  }

  public updateRemotePreferences(clients): Promise<any> {
    if (!_.isArray(clients)) {
      clients = [clients];
    }
    // Set current preferences
    const config = this.configProvider.get();
    const prefs = {
      email: config.emailNotifications.email,
      language: this.languageProvider.getCurrent(),
      unit: 'btc' // deprecated
    };

    let updates = [];
    clients.forEach(c => {
      if (this.currencyProvider.isERCToken(c.credentials.coin)) {
        return;
      }

      updates.push(this.updateRemotePreferencesFor(c, prefs));
    });

    return Promise.all(updates);
  }

  public recreate(wallet): Promise<any> {
    return new Promise((resolve, reject) => {
      this.logger.info('Recreating wallet:', wallet.id);
      wallet.recreateWallet(err => {
        wallet.notAuthorized = false;
        
        if (err) {
          return reject(err);
        }

        return resolve(null);
      });
    });
  }

  public startScan(wallet): Promise<any> {
    return new Promise((resolve, reject) => {
      this.logger.info('Scanning wallet ' + wallet.id);
      
      if (!wallet.isComplete()) {
        return reject('Wallet incomplete: ' + wallet.name);
      }

      wallet.scanning = true;
      wallet.startScan(
        {
          includeCopayerBranches: true
        },
        err => {
          if (err) {
            return reject(err);
          }

          return resolve(null);
        }
      );
    });
  }

  public clearTxHistory(wallet): void {
    this.invalidateCache(wallet);
    this.persistenceProvider.removeTxHistory(wallet.id);
  }

  public expireAddress(walletId: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.logger.info('Cleaning Address ' + walletId);
      this.persistenceProvider
        .clearLastAddress(walletId)
        .then(() => {
          return resolve(null);
        })
        .catch(err => {
          return reject(err);
        });
    });
  }

  public getInfoByAddress(wallets, addressSelect, addressTo): Promise<any> {
    return new Promise((resolve, reject) => {
      const walletToSend = wallets.find(
        (t: { address: string }) => t.address === addressSelect
      );

      walletToSend.wallet.getInfoByAddress(addressTo, (err, info) => {
        if (err) {
          return reject(err);
        }

        return resolve(info);
      });
    });
  }

  public prepareAddFreeze(wallet: any, addressTo: any) {
    return new Promise(async resolve => {
      const publicKey = addressTo.publicKeys[0];

      resolve({
        wallet,
        walletId: addressTo.walletId,
        pubKey: publicKey,
        path: addressTo.path
      });
    });
  }

  public prepareAdd(wallets: any[], addressSelect: string) {
    return new Promise(async resolve => {
      const walletToSend = wallets.find(
        (t: { address: string }) => t.address === addressSelect
      );

      const info = this.bwcProvider.Client.Ducatuscore.HDPublicKey.fromString(
        walletToSend.wallet.credentials.xPubKey
      );

      const publicKey = await this.getMainAddresses(walletToSend.wallet, {
        doNotVerify: false
      }).then(result => {
        const address = result.find(t => {
          return t.address === addressSelect;
        });

        return info.derive(address.path).publicKey.toString();
      });

      const addressData = await this.getMainAddresses(walletToSend.wallet, {
        doNotVerify: false
      }).then(result => {
        return result.find(t => {
          return t.address === addressSelect;
        });
      });

      resolve({
        wallet: walletToSend,
        pubKey: publicKey,
        path: addressData.path
      });
    });
  }

  public getWalletsByCoin(wallets: any[], coin: string) {
    const walletsGroups = _.values(
      _.groupBy(
        _.filter(wallets, wallet => {
          return wallet.keyId != 'read-only';
        }),
        'keyId'
      )
    );

    return new Promise(resolve => {
      let coins: any[] = [];
      let wallets: any[] = [];
      let walletsRes: any[] = [];
      let walletsLength: number = 0;

      walletsGroups.forEach(keyID => {
        coins = _.concat(
          coins,
          keyID.filter(wallet => wallet.coin === coin.toLowerCase())
        );
      });

      wallets = coins.map(async wallet => {
        const address = await this.getAddress(wallet, false);
        
        return {
          walletId: wallet.credentials.walletId,
          requestPubKey: wallet.credentials.requestPubKey,
          wallet,
          address
        };
      });

      wallets.map(res => {
        res.then((result: any) => {
          walletsRes.push(result);
        });

        walletsLength++;
      });

      resolve({ 
        wallets: walletsRes, 
        count: walletsLength 
      });
    });
  }

  public async signFreeze(wallet: any, data: any, addressPath: boolean) {
    const network = bitcoin.networks.bitcoin;
    network.bip32.private = 0x019d9cfe;
    network.bip32.public = 0x019da462;
    network.pubKeyHash = 0x31;
    network.scriptHash = 0x33;
    network.wif = 0xb1;

    const hashType = bitcoin.Transaction.SIGHASH_ALL;
    var lockTime = bip65.encode({ utc: data.lock_time });

    const txb = new bitcoin.TransactionBuilder(network);
    txb.setVersion(1);
    txb.setLockTime(lockTime);
    txb.addInput(data.tx_hash, data.vout_number, 0xfffffffe);
    txb.addOutput(data.user_duc_address, data.sending_amount);

    const tx = txb.buildIncomplete();

    const privateWifKey = await this.getKeys(wallet)
      .then(async keys => {
        const xPrivKey = this.bwcProvider.Client.Ducatuscore.HDPrivateKey(
          keys.xPrivKey
        );

        const derivedPrivKey = xPrivKey.deriveNonCompliantChild(
          wallet.credentials.rootPath
        );

        const xpriv = this.bwcProvider.Client.Ducatuscore.HDPrivateKey(
          derivedPrivKey
        );

        const address = await this.getMainAddresses(wallet, {
          doNotVerify: false
        }).then(result => {
          return result.find(t => {
            return t.address === data.user_duc_address;
          });
        });

        if (addressPath) {
          return xpriv.deriveChild(address.path).privateKey.toWIF();
        } else {
          return xpriv.deriveChild(data.private_path).privateKey.toWIF();
        }
      })
      .catch(err => {
        if (
          err &&
          err.message != 'FINGERPRINT_CANCELLED' &&
          err.message != 'PASSWORD_CANCELLED'
        ) {
          err.message == 'WRONG_PASSWORD'
            ? this.logger.error(
                'sign: walletProvider getKeys error WRONG_PASSWORD',
                err
              )
            : this.logger.error('sign: walletProvider getKeys error', err);
        }
      });
    this.logger.log('privateWifKey', privateWifKey);

    const signatureHash = tx.hashForSignature(
      0,
      Buffer.from(data.redeem_script, 'hex'),
      hashType
    );

    const inputScriptFirstBranch = bitcoin.payments.p2sh({
      redeem: {
        input: bitcoin.script.compile([
          bitcoin.script.signature.encode(
            bitcoin.ECPair.fromWIF(privateWifKey, network).sign(signatureHash),
            hashType
          ),
          bitcoin.opcodes.OP_TRUE
        ]),
        output: Buffer.from(data.redeem_script, 'hex')
      }
    }).input;

    tx.setInputScript(0, inputScriptFirstBranch);
    
    return tx.toHex();
  }

  public getMainAddresses(wallet, opts): Promise<any> {
    return new Promise((resolve, reject) => {
      opts = opts || {};
      opts.reverse = true;
      wallet.getMainAddresses(opts, (err, addresses) => {
        if (err) {
          return reject(err);
        }

        return resolve(addresses);
      });
    });
  }

  public getBalance(wallet, opts): Promise<any> {
    return new Promise((resolve, reject) => {
      opts = opts || {};
      wallet.getBalance(opts, (err, resp) => {
        if (err) {
          return reject(err);
        }

        return resolve(resp);
      });
    });
  }

  public getLowUtxos(wallet): Promise<any> {
    return new Promise((resolve, reject) => {
      wallet.getUtxos(
        {
          coin: wallet.coin
        },
        (err, resp) => {
          if (err || !resp || !resp.length) {
            return reject(err ? err : 'No UTXOs');
          }

          this.getMinFee(wallet, resp.length)
            .then(fee => {
              const minFee = fee;
              const balance = _.sumBy(resp, 'satoshis');
              // for 2 outputs
              this.getLowAmount(wallet)
                .then(fee => {
                  const lowAmount = fee;
                  const lowUtxos = _.filter(resp, x => {
                    return x.satoshis < lowAmount;
                  });

                  const totalLow = _.sumBy(lowUtxos, 'satoshis');
                  
                  return resolve({
                    allUtxos: resp || [],
                    lowUtxos: lowUtxos || [],
                    totalLow,
                    warning: minFee / balance > this.TOTAL_LOW_WARNING_RATIO,
                    minFee
                  });
                })
                .catch(err => {
                  return reject(err);
                });
            })
            .catch(err => {
              return reject(err);
            });
        }
      );
    });
  }

  public getUtxos(wallet): Promise<any> {
    return new Promise((resolve, reject) => {
      wallet.getUtxos(
        {
          coin: wallet.coin
        },
        (err, resp) => {
          if (err || !resp || !resp.length) {
            return reject(err ? err : 'No UTXOs');
          }

          return resolve(resp);
        }
      );
    });
  }

  public reject(wallet, txp): Promise<any> {
    return new Promise((resolve, reject) => {
      this.rejectTx(wallet, txp)
        .then(txpr => {
          this.invalidateCache(wallet);
          this.events.publish('Local/TxAction', {
            walletId: wallet.id
          });

          return resolve(txpr);
        })
        .catch(err => {
          return reject(err);
        });
    });
  }

  public onlyPublish(wallet, txp): Promise<any> {
    return new Promise((resolve, reject) => {
      this.publishTx(wallet, txp)
        .then(() => {
          this.invalidateCache(wallet);
          this.events.publish('Local/TxAction', {
            walletId: wallet.id
          });
          return resolve(null);
        })
        .catch(err => {
          return reject(this.bwcErrorProvider.msg(err));
        });
    });
  }

  public prepare(wallet): Promise<any> {
    return new Promise((resolve, reject) => {
      this.touchidProvider
        .checkWallet(wallet)
        .then(() => {
          this.keyProvider
            .handleEncryptedWallet(wallet.credentials.keyId)
            .then((password: string) => {
              return resolve(password);
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

  private signAndBroadcast(wallet, publishedTxp, password): Promise<any> {
    return new Promise((resolve, reject) => {
      this.onGoingProcessProvider.set('signingTx');

      let expected =
        wallet.cachedStatus.balance.totalAmount -
        publishedTxp.amount -
        publishedTxp.fee;
      this.signTx(wallet, publishedTxp, password)
        .then(signedTxp => {
          this.invalidateCache(wallet);
          if (signedTxp.status == 'accepted') {
            this.onGoingProcessProvider.set('broadcastingTx');
            this.broadcastTx(wallet, signedTxp)
              .then(broadcastedTxp => {
                this.events.publish('Local/TxAction', {
                  walletId: wallet.id,
                  until: { totalAmount: expected }
                });

                return resolve(broadcastedTxp);
              })
              .catch(err => {
                return reject(this.bwcErrorProvider.msg(err));
              });
          } else {
            this.events.publish('Local/TxAction', {
              walletId: wallet.id
            });

            return resolve(signedTxp);
          }
        })
        .catch(err => {
          const msg =
            err && err.message
              ? err.message
              : this.translate.instant(
                  'The payment was created but could not be completed. Please try again from home screen'
                );
          this.logger.error('Sign error: ' + msg);
          this.events.publish('Local/TxAction', {
            walletId: wallet.id,
            until: { totalAmount: expected }
          });

          return reject(msg);
        });
    });
  }

  public publishAndSign(wallet, txp): Promise<any> {
    return new Promise((resolve, reject) => {
      // Already published?
      if (txp.status == 'pending') {
        this.prepare(wallet)
          .then((password: string) => {
            this.signAndBroadcast(wallet, txp, password)
              .then(broadcastedTxp => {
                return resolve(broadcastedTxp);
              })
              .catch(err => {
                return reject(err);
              });
          })
          .catch(err => {
            return reject(err);
          });
      } else {
        this.prepare(wallet)
          .then((password: string) => {
            this.onGoingProcessProvider.set('sendingTx');
            this.publishTx(wallet, txp)
              .then(publishedTxp => {
                this.signAndBroadcast(wallet, publishedTxp, password)
                  .then(broadcastedTxp => {
                    return resolve(broadcastedTxp);
                  })
                  .catch(err => {
                    return reject(err);
                  });
              })
              .catch(err => {
                return reject(err);
              });
          })
          .catch(err => {
            return reject(err);
          });
      }
    });
  }

  public signMultipleTxps(wallet, txps: any[]): Promise<any> {
    [].concat(txps);
    const promises = [];

    return this.prepare(wallet).then(async (password: string) => {
      _.each(txps, txp => {
        promises.push(
          this.signAndBroadcast(wallet, txp, password).catch(error => {
            this.logger.error(error);
            
            return error;
          })
        );
      });

      return Promise.all(promises);
    });
  }

  public getEncodedWalletInfo(wallet, password?: string): Promise<any> {
    return new Promise((resolve, reject) => {
      
      if (!wallet.credentials.keyId) {
        return resolve(null);
      }

      const derivationPath = this.keyProvider.getBaseAddressDerivationPath(
        wallet.credentials.keyId,
        {
          account: wallet.account,
          coin: wallet.coin,
          n: wallet.n,
          network: wallet.network
        }
      );
      const encodingType = {
        mnemonic: 1,
        xpriv: 2,
        xpub: 3
      };
      let info: any = {};

      const keys = this.getKeysWithPassword(wallet, password);

      if (!keys || (!keys.mnemonic && !keys.xPrivKey)) {
        return reject(
          this.translate.instant(
            'Exporting via QR not supported for this wallet'
          )
        );
      }

      if (keys.mnemonic) {
        info = {
          type: encodingType.mnemonic,
          data: keys.mnemonic
        };
      } else {
        info = {
          type: encodingType.xpriv,
          data: keys.xPrivKey
        };
      }

      const mnemonicHasPassphrase = this.keyProvider.mnemonicHasPassphrase(
        wallet.credentials.keyId
      );

      return resolve(
        info.type +
          '|' +
          info.data +
          '|' +
          wallet.credentials.network.toLowerCase() +
          '|' +
          derivationPath +
          '|' +
          mnemonicHasPassphrase +
          '|' +
          wallet.coin
      );
    });
  }

  public getKeysWithPassword(wallet, password: string) {
    try {
      return this.keyProvider.get(wallet.credentials.keyId, password);
    } catch (e) {
      this.logger.error(e);
    }
  }

  public setTouchId(walletsArray: any[], enabled: boolean): Promise<any> {
    const opts = {
      touchIdFor: {}
    };
    walletsArray.forEach(wallet => {
      opts.touchIdFor[wallet.id] = enabled;
    });
    const promise = this.touchidProvider.checkWallet(walletsArray[0]);
    
    return promise.then(() => {
      this.configProvider.set(opts);
      
      return Promise.resolve();
    });
  }

  public getKeys(wallet): Promise<any> {
    return new Promise((resolve, reject) => {
      this.prepare(wallet)
        .then((password: string) => {
          let keys;
          
          try {
            keys = this.getKeysWithPassword(wallet, password);
          } catch (e) {
            return reject(e);
          }

          return resolve(keys);
        })
        .catch(err => {
          return reject(err);
        });
    });
  }

  public getMnemonicAndPassword(wallet): Promise<any> {
    return new Promise((resolve, reject) => {
      this.prepare(wallet)
        .then((password: string) => {
          let keys;
          
          try {
            keys = this.getKeysWithPassword(wallet, password);
          } catch (e) {
            return reject(e);
          }

          const mnemonic = keys.mnemonic;
          
          return resolve({ mnemonic, password });
        })
        .catch(err => {
          return reject(err);
        });
    });
  }

  public getSendMaxInfo(wallet, opts): Promise<any> {
    return new Promise((resolve, reject) => {
      opts = opts || {};
      wallet.getSendMaxInfo(opts, (err, res) => {
        if (err) {
          return reject(err);
        }

        return resolve(res);
      });
    });
  }

  public getEstimateGas(wallet, opts): Promise<any> {
    return new Promise((resolve, reject) => {
      opts = opts || {};
      wallet.getEstimateGas(opts, (err, res) => {
        if (err) {
          return reject(err);
        }

        return resolve(res);
      });
    });
  }

  public getProtocolHandler(coin: Coin, network: string = 'livenet'): string {
    return this.currencyProvider.getProtocolPrefix(coin, network);
  }

  public copyCopayers(wallet: any, newWallet: any): Promise<any> {
    return new Promise((resolve, reject) => {
      let walletPrivKey = this.bwcProvider
        .getBitcore()
        .PrivateKey.fromString(wallet.credentials.walletPrivKey);
      let copayer = 1;
      let i = 0;

      _.each(wallet.credentials.publicKeyRing, item => {
        let name = item.copayerName || 'copayer ' + copayer++;
        
        newWallet._doJoinWallet(
          newWallet.credentials.walletId,
          walletPrivKey,
          item.xPubKey,
          item.requestPubKey,
          name,
          {
            coin: newWallet.credentials.coin
          },
          (err: any) => {
            // Ignore error is copayer already in wallet
            if (err && !(err instanceof this.errors.COPAYER_IN_WALLET))
              return reject(err);
            if (++i == wallet.credentials.publicKeyRing.length)
              return resolve(null);
          }
        );
      });
    });
  }
}
