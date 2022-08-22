import { Injectable } from '@angular/core';
import * as _ from 'lodash';
import { ActionSheetProvider } from '../action-sheet/action-sheet';
import { BwcProvider } from '../bwc/bwc';
import { ConfigProvider } from '../config/config';
import { FeeProvider } from '../fee/fee';
import { Logger } from '../logger/logger';
import { OnGoingProcessProvider } from '../on-going-process/on-going-process';
import { ProfileProvider } from '../profile/profile';
import { TxConfirmNotificationProvider } from '../tx-confirm-notification/tx-confirm-notification';
import { TransactionProposal, WalletProvider } from '../wallet/wallet';
import { ITxDefaultParameters, ITxDinamicParameters } from './transactions-utils.interfaces';

interface ITx extends ITxDinamicParameters, ITxDefaultParameters {}

@Injectable()
export class TransactionUtilsProvider {

  public coin = "ducx";
  public config;
  public bitcoreCash;
  public ducatuscore;
  public FEE_TOO_HIGH_LIMIT_PER: number;
  public tx: ITx;

  public txDefaultParameters: ITxDefaultParameters = {
    amount: 0,
    coin: "ducx",
    name: "DucatusX",
    recipientType: "wallet",
    useSendMax: false,
    fromWalletDetails: false,
    fromSelectInputs: false,
    txp: {}
  };

  constructor(
    private configProvider: ConfigProvider,
    private feeProvider: FeeProvider,
    private bwcProvider: BwcProvider,
    private onGoingProcessProvider: OnGoingProcessProvider,
    private logger: Logger,
    private walletProvider: WalletProvider,
    private actionSheetProvider: ActionSheetProvider,
    private txConfirmNotificationProvider: TxConfirmNotificationProvider,
    private profileProvider: ProfileProvider
  ) {
    this.bitcoreCash = this.bwcProvider.getBitcoreCash();
    this.ducatuscore = this.bwcProvider.getDucatuscore();
    this.FEE_TOO_HIGH_LIMIT_PER = 15;

    this.config = this.configProvider.get();
  }

  public setNetworkTx(object, network) {
    object.txProps.network = network;
  }

  public setToAddressTx(object, toAddress) {
    object.toAddress = toAddress;
    object.origToAddress = toAddress;
  }

  public setDataTx(object, data) {
    object.data = data;
  }

  public setWalletIdTx(object, walletId) {
    object.walletId = walletId;
  }

  public setSpendUnConfirmed(object, spendUnConfirmed) {
    object.spendUnConfirmed = spendUnConfirmed;
  }

  public setFeeTx(object) {
    const feeOpts = this.feeProvider.getFeeOpts();

    object.feeLevel = this.feeProvider.getCoinCurrentFeeLevel(this.txDefaultParameters.coin);
    object.feeLevelName = feeOpts[object.feeLevel];
  }

  public getTransactionInfo(wallet): Promise<Partial<TransactionProposal>> {
    return this.getTxp(_.clone(this.tx), wallet, true);
  }

  public initTx(
    network: string, 
    toAddress: string, 
    data: string, 
    walletId: string,
  ) {
    const wallet = this.profileProvider.getWallet(walletId);

    let txDinamicParameters: ITxDinamicParameters;
    
    // set transaction parameters that can change
    this.setNetworkTx(txDinamicParameters, network);
    this.setToAddressTx(txDinamicParameters, toAddress);
    this.setToAddressTx(txDinamicParameters, toAddress);
    this.setDataTx(txDinamicParameters, data);
    this.setWalletIdTx(txDinamicParameters, walletId);
    this.setSpendUnConfirmed(txDinamicParameters, this.config.spendUnConfirmed);
    this.setFeeTx(txDinamicParameters);

    this.tx = {...txDinamicParameters, ...this.txDefaultParameters};

    this.updateTx(this.tx, wallet, { dryRun: true });
  }

  public updateTx(tx, wallet, opts): Promise<any> {
    return new Promise((resolve, reject) => {
      this.tx = tx;

      // End of quick refresh, before wallet is selected.
      if (!wallet) {
        return resolve(null);
      }

      this.onGoingProcessProvider.set('calculatingFee');

      this.buildTxp(tx, wallet, opts)
        .then(() => {
          this.onGoingProcessProvider.clear();
          return resolve(null);
        })
        .catch(err => {
          this.onGoingProcessProvider.clear();
          return reject(err);
        });
      });
  }

  private buildTxp(tx, wallet, opts): Promise<any> {
    return new Promise((resolve, reject) => {
      this.getTxp(_.clone(tx), wallet, opts.dryRun)
        .then(txp => {
          if (txp.feeTooHigh) {
            this.showHighFeeSheet();
          }

          tx.txp[wallet.id] = txp;
          this.tx = tx;
          this.logger.debug(
            'Confirm. TX Fully Updated for wallet:' +
              wallet.id +
              ' Txp:' +
              txp.id
          );
          return resolve(null);
        })
        .catch(err => {
          if (err.message == 'Insufficient funds') {
            return reject('insufficient_funds');
          } else {
            return reject(err);
          }
        });
    });
  }

  public initPublish(wallet): Promise<void> {
    if (!this.tx || !wallet) return undefined;

    this.onGoingProcessProvider.set('creatingTx');

    return this.getTxp(_.clone(this.tx), wallet, false)
      .then(txp=>{
        this.logger.debug('Transaction Fee:', txp.fee);
        return this.publishAndSign(txp, wallet);
      })
      .then(()=> {
        this.logger.debug('Publish transaction successful');
      })
      .catch(err => {
        this.logger.error('Publish transaction failed', err);
      });
  }

  protected publishAndSign(txp, wallet): Promise<void> {
    return this.walletProvider
      .publishAndSign(wallet, txp)
      .then(txp => {
        this.onGoingProcessProvider.clear();
        if (
          this.config.confirmedTxsNotifications &&
          this.config.confirmedTxsNotifications.enabled
        ) {
          this.txConfirmNotificationProvider.subscribe(wallet, {
            txid: txp.txid
          });
        }
      })
      .catch(() => {
        this.onGoingProcessProvider.clear();
      });
  }

  protected getFeeRate(amount: number, fee: number) {
    return (fee / (amount + fee)) * 100;
  }

  protected isHighFee(amount: number, fee: number) {
    return this.getFeeRate(amount, fee) > this.FEE_TOO_HIGH_LIMIT_PER;
  }

  private getTxp(tx, wallet, dryRun: boolean): Promise<any> {
    return new Promise((resolve, reject) => {
      const txp: Partial<TransactionProposal> = {};
      txp.coin = wallet.coin;

      txp.outputs = [
        {
          toAddress: tx.toAddress,
          amount: tx.amount,
          message: tx.description,
          data: tx.data
        }
      ];

      txp.excludeUnconfirmedUtxos = !tx.spendUnconfirmed;
      txp.dryRun = dryRun;

      this.walletProvider.getAddress(wallet, false)
        .then(address => {
          txp.from = address;

          return this.walletProvider.createTx(wallet, txp);
        })
        .then(ctxp => {
          return resolve(ctxp);
        })
        .catch(err => {
          return reject(err);
        });
    });
  }

  protected showHighFeeSheet() {
    const minerFeeInfoSheet = this.actionSheetProvider.createInfoSheet(
      'miner-fee'
    );
    minerFeeInfoSheet.present();
  }
}