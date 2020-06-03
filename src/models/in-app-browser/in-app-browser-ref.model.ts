/// <reference types="cordova-plugin-inappbrowser-withcamera" />

import { Subject } from 'rxjs';
export interface InAppBrowserRef extends InAppBrowser {
  events$?: Subject<Event>;
  error?: boolean;
}
