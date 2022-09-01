import { Injectable } from '@angular/core';
import { Big } from 'big.js';
import * as _ from 'lodash';
import Web3 from 'web3';
import { Coin } from '../../providers';
import { ActionSheetProvider } from '../action-sheet/action-sheet';
import { ContractAddress } from '../contract-address/contract-address';
import { ProfileProvider } from '../profile/profile';
import { TransactionUtilsProvider } from '../transactions-utils/transactions-utils';
import { JWAN_STAKE_ABI } from './jwan-stake-abi';
import { JWAN_TOKEN_ABI } from './jwan-token-abi';


export interface IDeposit {
  amount: number | string;
  enteredAt: number | string;
  gotInYears: number | string;
}

interface IDepositInfo {
  address: string;
  amountDeposit: string | number;
}

@Injectable()
export class StakeProvider {
public addressUser: string;
public jwanStakeAddress: string;
public jwanTokenAddress: string;
public web3;
public jwanContractStake;
public jwanContractToken;
public rpcURL = "https://ducx-mainnet-node1.rocknblock.io/";
public depositData;
public approveData;
public unixYear: number = 300;

  constructor (
    private contractAddress: ContractAddress,
    private transactionUtilsProvider: TransactionUtilsProvider,
    private profileProvider: ProfileProvider,
    private actionSheetProvider: ActionSheetProvider
  ) {
    this.web3 = new Web3(this.rpcURL);
    this.jwanStakeAddress = this.contractAddress.getAddresses().jwanStakeAddress;
    this.jwanTokenAddress = this.contractAddress.getAddresses().jwanTokenAddress;
    this.jwanContractToken = new this.web3.eth.Contract(JWAN_TOKEN_ABI, this.jwanTokenAddress);
    this.jwanContractStake = new this.web3.eth.Contract(JWAN_STAKE_ABI, this.jwanStakeAddress);
    this.depositData = this.jwanContractStake.methods.deposit(this.etherToWei("100")).encodeABI();
    this.getYearTime().then((year: number) => {
      this.unixYear = year;
    });
  }

  public etherToWei(amount) {
    return this.web3.utils.toWei(amount, 'ether');
  }
  
  private callMethod <T>(contract, name, args = []): Promise<T> {
    return new Promise((resolve, reject) => {
      contract.methods[name].apply(null, args).call((err, res) => {
        if (err) {
          return reject(err);
        }
        resolve(res);
      });
    });
  }

  public getYearTime() {
    return this.callMethod(this.jwanContractStake, 'Year', []);
  }

  public getIndexesDeposits(userJwanAddress) {
    return this.callMethod(this.jwanContractStake, 'indexesForUser', [userJwanAddress]);
  }

  private getIndexesDepositsArray (userJwanAddreses: string []): Array<Promise<string>> {
    let promises: Array<Promise<string>> = [];
    userJwanAddreses.forEach(userJwanAddress => {
      promises.push(this.callMethod<string>(this.jwanContractStake, 'indexesForUser', [userJwanAddress]));
    });
    return promises;
  }

  private getDepositsForAddress (userJwanAddress: string, amountDeposited: string | number) {
    let promises: Array<Promise<IDeposit>> = [];
    let shema: any = [];
    let depositsResult: {
      promises: Array<Promise<IDeposit>>,
      shema: IDepositInfo[]
    } = { promises, shema };

    if(!amountDeposited) return depositsResult;

    for(let i = 0; i < amountDeposited; i++) {
      shema.push({userJwanAddress, amountDeposited: i});
      promises.push(this.callMethod<IDeposit>(this.jwanContractStake, 'userDeposit', [userJwanAddress, i]));
    }
    return depositsResult;
  }

  public getAllDeposits (userJwanAddreses) {
    return new Promise((resolve, reject) => {
      const userIndexPromises: Array<Promise<string>> = this.getIndexesDepositsArray(userJwanAddreses);
      let userIndexes: IDepositInfo[] = [];
      let userDepositsPromises: any = [];
      let userShemaDeposit: any = [];
      let userDepositsPromises2: any = [];
      
      Promise.all(userIndexPromises).then( indexes => {
        userIndexes = userJwanAddreses.map((address: string, index)=> { 
          return {
            address,
            amountDeposit: indexes[index]
          };
        });
        
        userIndexes.forEach( item => {
          let result = this.getDepositsForAddress(item.address, item.amountDeposit);
          userDepositsPromises.push(result.promises);
          userShemaDeposit.push(result.shema);
        });
        userDepositsPromises = userDepositsPromises.filter( item => {
          return item.length > 0;
        });

        userShemaDeposit = userShemaDeposit.filter( item => {
          return item.length > 0;
        });

        userShemaDeposit = userShemaDeposit.flat();

        userDepositsPromises.forEach( arrayPromise => {
          if (arrayPromise) {
            arrayPromise.forEach( promise => {
              userDepositsPromises2.push( promise );
            });
          }
        });

        return Promise.all(userDepositsPromises2);
      })
      .then((res) => {
        const depositsData = res.map((deposit, index) => {
          let depositData: any = _.clone(deposit);

          depositData.enteredAt = depositData.enteredAt * 1000;
          const currentTime = Date.now();
          const differenceTime = currentTime - Number(depositData.enteredAt);

          depositData.isReadyToWithdrawn = differenceTime > (this.unixYear * 1000) ? true : false;

          depositData.metaInfo = userShemaDeposit[index];
          return depositData;
        });

        resolve(depositsData);
      })
      .catch((err) => {
        reject(err);
      });
      
    });
  }

  public claimAll(userJwanWallets, userReward: any) {
    return new Promise<any>(async (resolve, reject) => {
      let sumUserReward = userReward.reduce((rewardAccum, reward) => rewardAccum + Number(reward),0);
      sumUserReward = Big(sumUserReward).div(100000000);
      const defaultFee = "41940000000000000";
      const countTransactions = userReward.filter((reward) => reward > 0).length;
      let feePrewiew = this.web3.utils.fromWei(defaultFee, 'ether') * countTransactions;
      let promises: any = [];

      const userChoise = await this.openActionSheet(feePrewiew, 'claim', sumUserReward);

      if (!userChoise) return;

      userReward.forEach((reward, index) => {
        if ( reward > 0) {
          promises.push(this.claimReward(userJwanWallets[index].wallet.linkedEthWallet));
        }
      });
      
      Promise.all(promises).then((result) => {
        resolve(result);
      })
      .catch((err) => {
        reject(err);
      });
    });
  }

  public openActionSheet(feePrewiew, title: string, amount?) {
    return new Promise<any>((resolve) => {
      const needsBackup = this.actionSheetProvider.createTxConfirm({feePrewiew, title, amount});
      needsBackup.present();
      needsBackup.onDidDismiss(res => {
        resolve(res);
      });
    });
  }

  public getReward(userJwanAddreses: string[]) {
    return new Promise((resolve, reject) => {
      let promises = [];
      userJwanAddreses.map(userJwanAddress => {
        promises.push(this.callMethod<number>(this.jwanContractStake, 'rewardForStakeBatch', [userJwanAddress]));
      });

      Promise.all(promises).then((res) => {
        resolve(res);
      })
      .catch(err => {
        reject(err);
      });
    });
  }

  public getGasPriceInWei(gasPrice) {
    return this.web3.utils.toHex(this.web3.utils.toWei(gasPrice, 'gwei'));
  }

  public toWei(amount) {
    return this.web3.utils.toWei(amount, 'ether');
  }

  public getApproveAmount(userJwanAddress): Promise<string> {
   return this.callMethod<string>(this.jwanContractToken, 'allowance', [userJwanAddress, this.jwanStakeAddress]);
  }
  
  public getWriteMetodContractData(contract,methodName, args): string {
   return contract.methods[methodName](...args).encodeABI();
  }

  public getApproveData(amount): string {
   return this.getWriteMetodContractData(this.jwanContractToken, 'approve', [this.jwanStakeAddress, this.web3.utils.toWei(amount , 'ether')]);

  } 

  public getDepositData(amount): string {
    const amountBg = Big(amount).times(100000000).toString();
    return this.getWriteMetodContractData(this.jwanContractStake, 'deposit', [amountBg]);
  }

  public getClaimRewardData(): string {
    return this.getWriteMetodContractData(this.jwanContractStake, 'claimBatch' , []);
  }

  public getUnstakeData(indexDeposit): string {
    return this.getWriteMetodContractData(this.jwanContractStake, 'withdraw' , [indexDeposit]);
  }

  public buildTxp(walletId, dataTx: string, toAddress: string, isContractCall = false) {
    const wallet = this.profileProvider.getWallet(walletId);

    const txParam = {
      network: 'livenet',
      amount: 0,
      toAddress,
      coin: Coin.DUCX,
      data: dataTx,
      name: "DucatusX",
      recipientType: "wallet",
      walletId,
      useSendMax: false,
      fromWalletDetails: true
    };

    let tx = this.transactionUtilsProvider
      .getTx(
        txParam,
        wallet
      );

    return this.transactionUtilsProvider
    .getTxp(
      _.clone(tx), 
      wallet, 
      false,
      null,
      null, 
      { 
        isContractCall,
        fromMultiSend: null,
        usingCustomFee: null,
        usingMerchantFee: null
      }
    );
  }

  public approve(amount, walletId) {
    const wallet = this.profileProvider.getWallet(walletId);
    const dataTx = this.getApproveData(amount);

    return  this.buildTxp(walletId, dataTx, this.jwanTokenAddress, false)
      .then(async (txp) => {
        const userChoise = await this.openActionSheet(this.web3.utils.fromWei(txp.fee, 'ether'), 'approve', amount);

        if (userChoise) {
          return this.transactionUtilsProvider.publishAndSign(txp, wallet);
        }
        else {
          return;
        }
      });
  }

  public claimReward(walletId) {
    const wallet = this.profileProvider.getWallet(walletId);

    const dataTx = this.getClaimRewardData();

    return this.buildTxp(walletId, dataTx, this.jwanStakeAddress, true)
    .then((txp) => {
      return this.transactionUtilsProvider.publishAndSign(txp, wallet);
    });
  }

  public unStakeDeposit(walletId, indexDeposit, amount) {
    const wallet = this.profileProvider.getWallet(walletId);

    const dataTx = this.getUnstakeData(indexDeposit);

    return this.buildTxp(walletId, dataTx, this.jwanStakeAddress, true)
    .then( async (txp) => {
      const userChoise = await this.openActionSheet(this.web3.utils.fromWei(txp.fee, 'ether'), 'approve', amount);

      if (userChoise) {
        return this.transactionUtilsProvider.publishAndSign(txp, wallet);
      }
      else {
        return;
      }
    });
  }

  public deposit(amount, walletId) {
    const wallet = this.profileProvider.getWallet(walletId);

    const dataTx = this.getDepositData(amount);

    return this.buildTxp(walletId, dataTx, this.jwanStakeAddress, true)
      .then(async (txp) => {
        const userChoise = await this.openActionSheet(this.web3.utils.fromWei(txp.fee, 'ether'), 'deposit', amount);

        if (userChoise) {
          return this.transactionUtilsProvider.publishAndSign(txp, wallet);
        }
        else {
          return;
        }
      });
  }

  public getTxData(contract, methodsName, args) {
    return contract.methods[methodsName].apply(null, args).encodeABI();
  }
}