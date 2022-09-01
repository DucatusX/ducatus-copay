import { Component } from "@angular/core";
import { Big } from 'big.js';
import { NavController } from "ionic-angular";
import * as _ from 'lodash';
import { Logger } from "../../providers/logger/logger";
import { OnGoingProcessProvider } from '../../providers/on-going-process/on-going-process';
import { ProfileProvider } from "../../providers/profile/profile";
import { IDeposit, StakeProvider } from "../../providers/stake/stake";
import { WalletProvider } from "../../providers/wallet/wallet";
import { StakeAddPage } from "./stake-add/stake-add";

@Component({
  selector: 'page-stake',
  templateUrl: 'stake.html'
})

export class StakePage {
  public walletsGroups = [];
  public wallets = [];
  public isApprove: boolean = false;
  public deposits: IDeposit[];
  public reward: number = 0;
  public rewards = [];
  public walletAddresses: string[];

  constructor(
    private navCtrl: NavController, 
    private profileProvider: ProfileProvider, 
    private walletProvider: WalletProvider,
    private stakeProvider: StakeProvider,
    private onGoingProcessProvider: OnGoingProcessProvider,
    private logger: Logger
  ) {}

  public async ngOnInit(): Promise<void> {
    const wallets = this.profileProvider.getWallets({ showHidden: true });
    this.walletsGroups = _.values(
      _.groupBy(
        _.filter(wallets, wallet => {
          return wallet.keyId != 'read-only';
        }),
        'keyId'
      )
    );
    this.wallets = await this.getWalletsInfoAddress('jwan');

      this.walletAddresses = this.wallets.map(wallet => wallet.address);

      this.stakeProvider.getAllDeposits(this.walletAddresses).then((result: any) => {
        this.deposits = result;
      })
      .catch((error) => {
        this.logger.debug(error);
      });

      this.stakeProvider.getReward(this.walletAddresses).then((res: number[])=>{
        this.rewards = res;

        this.reward = res.reduce((rewardAccum, reward) => rewardAccum + Number(reward),0);
        this.reward = Big(this.reward).div(100000000);
      });
    
  }

  public getDeposits(): void {
    this.stakeProvider.getAllDeposits(this.walletAddresses).then((result: any) => {
      this.deposits = result;
    })
    .catch((error) => {
      this.logger.debug(error);
    });
  }

  public claim() {
    this.stakeProvider.claimAll(this.wallets, this.rewards)
    .then((res) => {
      this.onGoingProcessProvider.clear();
      this.logger.debug(res);
    })
    .catch((err) =>{
      this.onGoingProcessProvider.clear();
      this.logger.debug(err);
    });
  }

  public withdrawn(
     address, 
     indexDeposit, 
     amount
  ) {
    const wallet = this.wallets.find( wallet => wallet.address === address);

    this.stakeProvider.unStakeDeposit(wallet.wallet.linkedEthWallet, indexDeposit, amount)
      .then((res) => {
        this.onGoingProcessProvider.clear();
        this.logger.debug(res);
      })
      .catch(err =>{
        this.onGoingProcessProvider.clear();
        this.logger.debug(err);
      });
  }

  private debounceGetDeposits = _.debounce(
    async () => {
      this.getDeposits();
    },
    5000,
    {
      leading: true
    }
  );

  public doRefresh(refresher): void {
    this.debounceGetDeposits();

    setTimeout(() => {
      refresher.complete();
    }, 2000);
  }


  private async getWalletsInfoAddress(coin: string): Promise<any> {
    let coins = [];
    const wallets = [];

    this.walletsGroups.forEach(keyID => {
      coins = _.concat(
        coins,
        keyID.filter(wallet => wallet.coin === coin.toLowerCase())
      );
    });

    for ( let i = 0; i < coins.length; i++ ) {
      const coin = coins[i];
      let address: string;

      try {
        address = await this.walletProvider.getAddress(coin, false);
      }
      catch {
       address = '';
      }

      wallets.push({ 
        wallet: coin, 
        address
      });
    }

    return wallets;
  }


  public goToStakeAdd() {
    this.navCtrl.push(StakeAddPage);
  }

}