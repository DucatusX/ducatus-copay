import { Injectable } from '@angular/core';

import { ApiProvider } from '../../providers/api/api';
import { Logger } from '../../providers/logger/logger';

import BWC from '@ducatus/ducatus-wallet-client-rev';

@Injectable()
export class BwcProvider {
  public parseSecret = BWC.parseSecret;
  public Client = BWC;
  constructor(private logger: Logger, private apiProvider: ApiProvider) {
    this.logger.debug('BwcProvider initialized');
  }
  public getBitcore() {
    return BWC.Bitcore;
  }

  public getBitcoreCash() {
    return BWC.BitcoreCash;
  }

  public getDucatuscore() {
    return BWC.Ducatuscore;
  }

  public getCore() {
    return BWC.Core;
  }

  public getErrors() {
    return BWC.errors;
  }

  public getSJCL() {
    return BWC.sjcl;
  }

  public getUtils() {
    return BWC.Utils;
  }

  public getKey() {
    return BWC.Key;
  }

  public getPayProV2() {
    return BWC.PayProV2;
  }

  public upgradeCredentialsV1(x) {
    return BWC.upgradeCredentialsV1(x);
  }

  public upgradeMultipleCredentialsV1(x) {
    return BWC.upgradeMultipleCredentialsV1(x);
  }

  public getClient(walletData?, opts?) {
    opts = opts || {};

    // note opts use `bwsurl` all lowercase;
    let bwc = new BWC({
      baseUrl:
        opts.bwsurl || this.apiProvider.getAddresses().bitcore + '/bws/api',
      verbose: opts.verbose,
      timeout: 100000,
      transports: ['polling'],
      bp_partner: opts.bp_partner,
      bp_partner_version: opts.bp_partner_version
    });

    if (walletData) bwc.fromString(walletData);
    return bwc;
  }
}
