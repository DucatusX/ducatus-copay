import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { ActionSheetProvider } from '../../providers/action-sheet/action-sheet';
import { AddressProvider } from '../../providers/address/address';
import { AppProvider } from '../../providers/app/app';
import { BwcErrorProvider } from '../../providers/bwc-error/bwc-error';
import { BwcProvider } from '../../providers/bwc/bwc';
import { ClipboardProvider } from '../../providers/clipboard/clipboard';
import { CoinbaseProvider } from '../../providers/coinbase/coinbase';
import { ConfigProvider } from '../../providers/config/config';
import { CurrencyProvider } from '../../providers/currency/currency';
import { ErrorsProvider } from '../../providers/errors/errors';
import { ExternalLinkProvider } from '../../providers/external-link/external-link';
import { FeeProvider } from '../../providers/fee/fee';
import { OnGoingProcessProvider } from '../../providers/on-going-process/on-going-process';
import { PlatformProvider } from '../../providers/platform/platform';
import { PopupProvider } from '../../providers/popup/popup';
import { ProfileProvider } from '../../providers/profile/profile';
import { ReplaceParametersProvider } from '../../providers/replace-parameters/replace-parameters';
import { TxConfirmNotificationProvider } from '../../providers/tx-confirm-notification/tx-confirm-notification';
import { TxFormatProvider } from '../../providers/tx-format/tx-format';
import {
  TransactionProposal,
  WalletProvider
} from '../../providers/wallet/wallet';

import { ITx, ITxBase } from './transactions-utils.interfaces';

import { DecimalPipe } from '@angular/common';
import {
  App,
  Events,
  ModalController,
} from 'ionic-angular';
import { Logger } from '../../providers/logger/logger';

@Injectable()
export class TransactionUtilsProvider {
  protected bitcoreCash;
  protected ducatuscore;
  public isCordova: boolean;
  public config;
  public appName: string;

  constructor(
    protected addressProvider: AddressProvider,
    protected app: App,
    protected actionSheetProvider: ActionSheetProvider,
    protected bwcErrorProvider: BwcErrorProvider,
    protected bwcProvider: BwcProvider,
    protected configProvider: ConfigProvider,
    protected currencyProvider: CurrencyProvider,
    protected decimalPipe: DecimalPipe,
    protected errorsProvider: ErrorsProvider,
    protected externalLinkProvider: ExternalLinkProvider,
    protected feeProvider: FeeProvider,
    protected logger: Logger,
    protected modalCtrl: ModalController,
    protected onGoingProcessProvider: OnGoingProcessProvider,
    protected platformProvider: PlatformProvider,
    protected profileProvider: ProfileProvider,
    protected popupProvider: PopupProvider,
    protected replaceParametersProvider: ReplaceParametersProvider,
    protected translate: TranslateService,
    protected txConfirmNotificationProvider: TxConfirmNotificationProvider,
    protected txFormatProvider: TxFormatProvider,
    protected walletProvider: WalletProvider,
    protected clipboardProvider: ClipboardProvider,
    protected events: Events,
    protected coinbaseProvider: CoinbaseProvider,
    protected appProvider: AppProvider,
  ) {
    this.config = this.configProvider.get();
    this.isCordova = this.platformProvider.isCordova;
    this.appName = this.appProvider.info.nameCase;
  }

  private onlyPublish(txp, wallet): Promise<void> {
    this.logger.info('No signing proposal: No private key');
    this.onGoingProcessProvider.set('sendingTx');

    return this.walletProvider.onlyPublish(wallet, txp);
  }

  public publishAndSign(txp, wallet) {
    if (!wallet.canSign) {
      return this.onlyPublish(txp, wallet);
    }

    return this.walletProvider.publishAndSign(wallet, txp);
  }

  public getTx(
    txParams: ITxBase, 
    wallet: any,
    isSpeedUpTx?: boolean,
    fromMultiSend?: boolean,
    fromSelectInputs?: boolean
  ): ITx {
    let networkName: string;
    let tx: ITx;
    let amount: number;

    if (
      !txParams.network
      && wallet
      &&  wallet.network
    ) {
      txParams.network = wallet.network;
    }

    if (fromSelectInputs) {
      networkName = txParams.network;
      amount = txParams.amount
        ? txParams.amount
        : txParams.totalInputsAmount;
    } else if (fromMultiSend) {
      networkName = txParams.network;
      amount = txParams.totalAmount;
    } else {
      amount = txParams.amount;

      try {
        networkName = this.addressProvider.getCoinAndNetwork(
          txParams.toAddress,
          txParams.network || 'livenet'
        ).network;
      } catch (e) {
          this.logger.error(e);
      }
    }

    tx = {
      toAddress: txParams.toAddress,
      sendMax: txParams.useSendMax ? true : false,
      amount:
        txParams.useSendMax && this.isChain(txParams.coin)
          ? 0
          : parseInt(
              Number(amount).toLocaleString('fullwide', { useGrouping: false }), 
              10
            ),
      description: txParams.description,
      destinationTag: txParams.destinationTag, // xrp
      paypro: txParams.paypro,
      data: txParams.data, // eth
      invoiceID: txParams.invoiceID, // xrp
      payProUrl: txParams.payProUrl,
      spendUnconfirmed: this.config.wallet.spendUnconfirmed,

      // Vanity tx info (not in the real tx)
      recipientType: txParams.recipientType,
      name: txParams.name,
      email: txParams.email,
      color: txParams.color,
      network: txParams.network
        ? txParams.network
        : networkName,
      coin: txParams.coin,
      txp: {},
      tokenAddress: txParams.tokenAddress,
      wDucxAddress: txParams.wDucxAddress,
      speedUpTx: isSpeedUpTx,
      fromSelectInputs: txParams.fromSelectInputs ? true : false,
      inputs: txParams.inputs,
      origToAddress: txParams.toAddress,
    };

    if (txParams.requiredFeeRate) {
      tx.feeRate = +txParams.requiredFeeRate;
    } else if (isSpeedUpTx) {
      tx.feeLevel = 'custom';  
    } else {
      tx.feeLevel = this.feeProvider.getCoinCurrentFeeLevel(tx.coin);
    }

    if (tx.coin && tx.coin == 'bch' && !fromMultiSend) {
      tx.toAddress = this.bitcoreCash
        .Address(tx.toAddress)
        .toString(true);
    }

    const feeOpts = this.feeProvider.getFeeOpts();
    tx.feeLevelName = feeOpts[tx.feeLevel];

    return tx;
  }
 
  private isChain(coin) {
    const chain = this.currencyProvider.getAvailableChains();
    return chain.includes(coin);
  }

  public getTxp(
    tx: ITx, 
    wallet, 
    dryRun: boolean, 
    recipients?, 
    token? ,
    opts?: {
      fromMultiSend, 
      usingCustomFee, 
      usingMerchantFee
    }): Promise<any> {

    return new Promise((resolve, reject) => {
      // ToDo: use a credential's (or fc's) function for this
      if (tx.description && !wallet.credentials.sharedEncryptingKey) {
        const msg = this.translate.instant(
          'Could not add message to imported wallet without shared encrypting key'
        );
        return reject(msg);
      }
      if (
        this.currencyProvider.isUtxoCoin(tx.coin) &&
        tx.amount > Number.MAX_SAFE_INTEGER
      ) {
        const msg = this.translate.instant('Amount too big');
        return reject(msg);
      }

      const txp: Partial<TransactionProposal> = {};
      // set opts.coin to wallet.coin
      txp.coin = wallet.coin;

      if (opts.fromMultiSend) {
        txp.outputs = [];
        recipients.forEach(recipient => {
          if (tx.coin && tx.coin == 'bch') {
            recipient.toAddress = this.bitcoreCash
              .Address(recipient.toAddress)
              .toString(true);

            recipient.addressToShow = this.walletProvider.getAddressView(
              tx.coin,
              tx.network,
              recipient.toAddress
            );
          }

          if (tx.coin && tx.coin == 'duc') {
            recipient.toAddress = this.ducatuscore
              .Address(recipient.toAddress)
              .toString(true);

            recipient.addressToShow = this.walletProvider.getAddressView(
              tx.coin,
              tx.network,
              recipient.toAddress
            );
          }

          txp.outputs.push({
            toAddress: recipient.toAddress,
            amount: recipient.amount,
            message: tx.description,
            data: tx.data
          });
        });
      } else if (tx.paypro) {
        txp.outputs = [];
        const { instructions } = tx.paypro;
        for (const instruction of instructions) {
          txp.outputs.push({
            toAddress: instruction.toAddress,
            amount: instruction.amount,
            message: instruction.message,
            data: instruction.data
          });
        }
      } else {
        if (tx.fromSelectInputs) {
          const size = this.walletProvider.getEstimatedTxSize(
            wallet,
            1,
            tx.inputs.length
          );
          const result = (tx.feeRate / 1000).toFixed(0);
          const estimatedFee =
            size * parseInt(
              Number(result).toLocaleString('fullwide', { useGrouping: false }), 
              10
            );
          tx.fee = estimatedFee;
          tx.amount = tx.amount - estimatedFee;
        }

        txp.outputs = [
          {
            toAddress: tx.toAddress,
            amount: tx.amount,
            message: tx.description,
            data: tx.data
          }
        ];
      }
      txp.excludeUnconfirmedUtxos = !tx.spendUnconfirmed;
      txp.dryRun = dryRun;

      if (tx.sendMaxInfo) {
        txp.inputs = tx.sendMaxInfo.inputs;
        txp.fee = tx.sendMaxInfo.fee;
      } else if (tx.speedUpTx) {
        txp.inputs = [];
        txp.inputs.push(tx.speedUpTxInfo.input);
        txp.fee = tx.speedUpTxInfo.fee;
        txp.excludeUnconfirmedUtxos = true;
      } else if (tx.fromSelectInputs) {
        txp.inputs = tx.inputs;
        txp.fee = tx.fee;
      } else {
        if (opts.usingCustomFee || opts.usingMerchantFee) {
          txp.feePerKb = tx.feeRate;
        } else txp.feeLevel = tx.feeLevel;
      }

      txp.message = tx.description;

      if (tx.paypro) {
        txp.payProUrl = tx.payProUrl;
        tx.paypro.host = new URL(tx.payProUrl).host;
      }

      if (tx.recipientType == 'wallet') {
        txp.customData = {
          toWalletName: tx.name ? tx.name : null
        };
      } else if (tx.recipientType == 'coinbase') {
        txp.customData = {
          service: 'coinbase'
        };
      }

      if (tx.tokenAddress) {
        txp.tokenAddress = tx.tokenAddress;
        txp.wDucxAddress = tx.wDucxAddress;

        const originalChain = this.bwcProvider.getUtils().getChain(tx.coin);
        let chain;
        switch (originalChain) {
          case 'DUCX':
            chain = 'DRC20';
            break;
          default:
            chain = 'ERC20';
        }
        if (tx.wDucxAddress) {
          chain = 'TOB';
        }
        
        for (const output of txp.outputs) {
          if (!output.data) {
            output.data = this.bwcProvider
              .getCore()
              .Transactions.get({ chain })
              .encodeData({
                recipients: [
                  { address: output.toAddress, amount: output.amount }
                ],
                tokenAddress: tx.tokenAddress,
                wDucxAddress: tx.wDucxAddress
              });
          }
        }
      }

      if (wallet.coin === 'xrp') {
        txp.invoiceID = tx.invoiceID;
        txp.destinationTag = tx.destinationTag;
      }

      this.walletProvider
        .getAddress(wallet, false)
        .then(address => {
          txp.from = address;

          if (token && token.type === 'erc721') {
            txp.tokenAddress = token.base.address;
            txp.tokenId = token.selected.tokenId;

            for (const output of txp.outputs) {
              if (!output.data) {
                output.data = this.bwcProvider
                  .getCore()
                  .Transactions.get({ chain: 'ERC721' })
                  .encodeData({
                    recipients: [
                      {
                        address: output.toAddress,
                        amount: output.amount
                      }
                    ],
                    from: address,
                    tokenId: token.selected.tokenId,
                    tokenAddress: tx.tokenAddress
                  });
              }
            }
          }
          
          this.walletProvider
            .createTx(wallet, txp)
            .then(ctxp => {
              return resolve(ctxp);
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
}