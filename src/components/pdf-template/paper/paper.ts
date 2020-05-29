import { Component, ElementRef, Injectable, ViewChild } from '@angular/core';
import { DomProvider } from '../../../providers/dom/dom';

@Component({
  template: `
    <div id="paper-pdf" #paperpdf>
      <div class="content-top"> <img src="https://www.ducatuscoins.com/assets/img/printpaperwallet.png" /> </div>
      <div class="content-bottom">
        <div class="content-bottom-left">
          <p class="content-bottom-text"><b>Your public address</b></p>
          <div class="content-bottom-qrcode">{{this.params.svgAddress}}</div>
          <p class="content-bottom-address">{{this.params.wallet_address}}</p>
          <p class="content-bottom-text">to be used for receiving {{this.params.wallet_coin}}</p>
        </div>
        <div class="content-bottom-right">
          <p class="content-bottom-text"> <b>Your private wallet recovery key</b> </p>
          <div class="content-bottom-qrcode">{{this.params.svgKey}}</div>
          <p class="content-bottom-text">This key is all you needed to access your founds.</p>
        </div>
      </div>
    </body>
  `,
  styles: [`
      #paper-pdf {
        width: 100%;
        height: 100%;
      }
      .content-top {
        height: 300px;
        width: 100%;
        display: block;
        background-color: #ffffff;
      }

      .content-top img {
        height: 300px;
      }

      .content-bottom {
        background-color: #ffffff;
        max-height: 300px;
        min-height: 300px;
        height: 300px;
        padding: 0px 5px;
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0px 10px;
      }

      .content-bottom img {
        width: 120px;
        height: 120px;
      }

      .content-bottom-left {
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        padding: 20px;
        min-width: 50%;
        width: 50%;
        border-top: 10px solid #c3b59b;
        border-left: 10px solid #c3b59b;
        border-bottom: 10px solid #c3b59b;
        border-right: 5px solid #c3b59b;
      }

      .content-bottom-right {
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        padding: 20px;
        min-width: 50%;
        width: 50%;
        border-top: 10px solid #c3b59b;
        border-right: 10px solid #c3b59b;
        border-bottom: 10px solid #c3b59b;
        border-left: 5px solid #c3b59b;
      }

      .content-bottom-text {
        color: #8f3534;
        margin: 10px 0px;
        padding: 0px;
        font-size: 12px;
        text-align: center;
      }

      .content-bottom-right .content-bottom-text {
        width: 300px;
      }

      .content-bottom-address {
        background-color: #e6e7e8;
        border-radius: 10px;
        color: #000000;
        font-size: 12px;
        padding: 10px 5px;
        display: flex;
        justify-content: center;
        align-items: center;
        margin-top: 10px;
        margin-bottom: 0px;
        width: 320px;
      }

      .content-bottom-qrcode {
        border: 10px solid #f5eddd;
        border-radius: 5px;
      }

      img {
        min-width: 100%;
        min-height: 100%;
      }`]
})

@Injectable()
export class PaperPdfComponent {
  public params: any;

  constructor(
    private domProvider: DomProvider
  ) { }

  @ViewChild('paperpdf') paperpdf: ElementRef;

  ngOnInit() { }

  ngAfterViewInit() {
    console.log(this.paperpdf.nativeElement);
  }

  public makePdf(params) {
    this.params = params;

    console.log(this.paperpdf.nativeElement);
    console.log(this.params);
  }

  ngOnDestroy() { }
}
