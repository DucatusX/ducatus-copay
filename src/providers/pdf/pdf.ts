import { Injectable } from '@angular/core';
import { Logger } from '../../providers/logger/logger';
// import { WalletProvider } from '..';

declare const cordova;

@Injectable()
export class PdfProvider {

  // private htmlTemplate = {
  //   'paperWallet': '<html><body><h1>paperWallet</h1></body></html>',
  // }

  constructor(
    private logger: Logger
    // private walletProvider: WalletProvider
  ) { }

  public printPaperWallet(params) {


    var options = {
      documentSize: 'A4',
      landscape: "portrait",
      type: "base64",
      fileName: "myPdfFile.pdf"
    };

    var pdfhtml = '<html><body> <h1>  Hello World  </h1> <p>your address: <%=params.address%></p> <p>your email: <%=params.email%></p> </body></html>';

    // cordova.pdf.fromData(pdfhtml, options)
    //   .then(function (base64) { })
    //   .catch((err) => console.err(err));

    const before = Date.now();

    document.addEventListener('deviceready', () => {
      this.logger.warn('DEVICE READY FIRED AFTER', (Date.now() - before), 'ms');

      cordova.pdf.fromData(pdfhtml, options)
        .then((sucess) => this.logger.warn('sucess: ', sucess))
        .catch((error) => this.logger.warn('error:', error));
    });

    this.logger.warn('print paper wallets', params);
  }

}
