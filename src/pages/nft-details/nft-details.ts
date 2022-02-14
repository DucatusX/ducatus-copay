import { Component } from '@angular/core';
import { NavParams } from 'ionic-angular';


@Component({
  selector: 'page-nft-details',
  templateUrl: 'nft-details.html'
})


export class NftDetailsPage {

  public nftData;

  constructor( private navParams: NavParams){}
  
  ngOnInit(){
    this.nftData = this.navParams.data.nft;
  }

}