import { Component } from '@angular/core';
import { NavParams } from 'ionic-angular';
import { Nft } from '../../models/nft/nft.model';

@Component({
  selector: 'page-nft-details',
  templateUrl: 'nft-details.html'
})

export class NftDetailsPage {

  public nftData: Nft[];

  constructor( private navParams: NavParams){}
  
  ngOnInit(){
    this.nftData = this.navParams.data.nft;
  }

}