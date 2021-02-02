import { Injectable } from '@angular/core';
import { PlatformProvider } from '..';

declare const cordova;

@Injectable()
export class LiveChatProvider {
  private isAndroid: any;
  constructor(private platformProvider: PlatformProvider) {
    document.addEventListener(
      'deviceready',
      () => {
        window.open = cordova.InAppBrowser.open;
      },
      false
    );
    this.isAndroid = this.platformProvider.isAndroid;
  }

  public openLiveChat() {
    const location = this.isAndroid ? 'yes' : 'no';
    window.open(
      'https://direct.lc.chat/12589530/',
      '_blank',
      `location=${location},toolbarcolor=#23272A,closebuttoncaption=Сlose,closebuttoncolor=#d8373e,navigationbuttoncolor=#d8373e,fullscreen=no,toolbarposition=bottom,lefttoright=yes`
    );

    return true;
  }
}
