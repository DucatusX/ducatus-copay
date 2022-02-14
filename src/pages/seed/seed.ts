import { HttpClient } from '@angular/common/http';
import { Component} from '@angular/core';
import { NavController, NavParams } from 'ionic-angular';
import { WalletProvider } from '../../providers';
import { ApiProvider } from '../../providers/api/api';
import { Logger } from '../../providers/logger/logger';
import { NftDetailsPage } from '../nft-details/nft-details';



@Component({
  selector: 'page-seed',
  templateUrl: 'seed.html'
})


export class SeedPage {

  public nftData;
  public wallet;
  public walletAddress;
  public loaded = false;
  public messageErr;

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


  public goToNFTDetails(nft){
    this.navCtrl.push(NftDetailsPage, { nft });
  }

  public getTokenMeta() {
    let headers = {
      'X-Api-Key': 'akEUBl92.mtoSPPzDAvNjo2WUmiVh9xUPNJROVUF9'
    };
    this.http.get(`${this.apiProvider.getAddresses().nftSeed}` + this.walletAddress, { headers }).subscribe(
      result => {
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


