import { Injectable } from '@angular/core';
import { Logger } from '../../providers/logger/logger';

declare const cordova;

@Injectable()
export class PdfProvider {

  // private htmlTemplate = {
  //   'paperWallet': '<html><body><h1>paperWallet</h1></body></html>',
  // }

  constructor(
    private logger: Logger
  ) { }

  public printPaperWallet(params?) {

    var options = {
      documentSize: 'A4',
      landscape: "portrait",
      type: "share",
      fileName: "ducatusWallet.pdf"
    };

    var pdfhtml = '<html> <style>.content-top{height: 300px; width: 100%; display: block; background-color: #ffffff;}.content-top img{height: 300px;}.content-bottom{background-color: #ffffff; max-height: 300px; min-height: 300px; height: 300px; padding: 0px 5px; width: 100%; display: flex; align-items: center; justify-content: center; margin: 0px 10px;}.content-bottom img{width: 120px; height: 120px;}.content-bottom-left{display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 20px; min-width: 50%; width: 50%; border-top: 10px solid #c3b59b; border-left: 10px solid #c3b59b; border-bottom: 10px solid #c3b59b; border-right: 5px solid #c3b59b;}.content-bottom-right{display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 20px; min-width: 50%; width: 50%; border-top: 10px solid #c3b59b; border-right: 10px solid #c3b59b; border-bottom: 10px solid #c3b59b; border-left: 5px solid #c3b59b;}.content-bottom-text{color: #8f3534; margin: 10px 0px; padding: 0px; font-size: 12px; text-align: center;}.content-bottom-right .content-bottom-text{width: 300px;}.content-bottom-address{background-color: #e6e7e8; border-radius: 10px; color: #000000; font-size: 12px; padding: 10px 5px; display: flex; justify-content: center; align-items: center; margin-top: 10px; margin-bottom: 0px; width: 320px;}.content-bottom-qrcode{border: 10px solid #f5eddd; border-radius: 5px;}img{min-width: 100%; min-height: 100%;}</style> <body> <div class="content-top"> <img src="https://www.ducatuscoins.com/assets/img/printpaperwallet.png"/> </div><div class="content-bottom"> <div class="content-bottom-left"> <p class="content-bottom-text"><b>Your public address</b></p><div class="content-bottom-qrcode"> <img src="https://www.ducatuscoins.com/assets/img/qr-1.png"/> </div><p class="content-bottom-address"> ' + params + ' </p><p class="content-bottom-text">to be used for receiving DUC</p></div><div class="content-bottom-right"> <p class="content-bottom-text"> <b>Your private wallet recovery key</b> </p><div class="content-bottom-qrcode"> <img src="https://www.ducatuscoins.com/assets/img/qr-2.png"/> </div><p class="content-bottom-text"> to be kept safely and NOT to be shared. This key enables access and withdrawal of your DUC and its safekeeping is your sole responsibility. </p></div></div></body></html>';

    const before = Date.now();

    document.addEventListener('deviceready', () => {
      this.logger.warn('DEVICE READY FIRED AFTER', (Date.now() - before), 'ms');

      cordova.plugins.pdf.fromData(pdfhtml, options)
        .then((sucess) => this.logger.warn('sucess: ', sucess))
        .catch((error) => this.logger.warn('error:', error));
    });
  }

}
