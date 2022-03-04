import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { NavController, NavParams } from 'ionic-angular';
import { Nft } from '../../models/nft/nft.model';
import { WalletProvider } from '../../providers';
import { ApiProvider } from '../../providers/api/api';
import { Logger } from '../../providers/logger/logger';
import { NftDetailsPage } from '../nft-details/nft-details';

@Component({
  selector: 'page-seed',
  templateUrl: 'seed.html'
})

export class SeedPage {

  public nftData: Nft[];
  public wallet: any;
  public walletAddress: string;
  public loaded = false;
  public messageErr: string;

  constructor(
    private http: HttpClient,
    private navCtrl: NavController,
    private navParams: NavParams,
    private walletProvider: WalletProvider,
    private logger: Logger,
    private apiProvider: ApiProvider,
  ) {} 

  ionViewWillEnter(){
    this.wallet = this.navParams.data.wallet;
    this.walletProvider.getAddress(this.wallet, false).then(address => {
      this.walletAddress = address;
      this.getTokenMeta();
    });
  }

  public goToNFTDetails(nft: Nft){
    this.navCtrl.push(NftDetailsPage, { nft });
  }

  public getTokenMeta() {
    const url: string = this.apiProvider.getAddresses().nftSeed + this.walletAddress;
    this.http.get<Nft[]>(url).subscribe(
      (result: Nft[]) => {
        // sorted by time. 
        // new nft to the beginning of the array
        result.sort((a,b) => {
         const dataA: number = new Date(a.transaction.created).getTime();
         const datab: number = new Date(b.transaction.created).getTime();

         return datab - dataA;
        })
        this.nftData = result;
        this.loaded = true;
      },
      error => {
        this.loaded = true;
        this.logger.error('Response server: ', error);
      }
    );
  }
}


