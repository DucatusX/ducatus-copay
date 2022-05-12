import { Pipe, PipeTransform } from '@angular/core';
import { IncomingDataProvider } from '../providers/incoming-data/incoming-data';
@Pipe({
  name: 'shortenedAddress',
  pure: false
})
export class ShortenedAddressPipe implements PipeTransform {
  constructor(private incomingDataProvider: IncomingDataProvider) {}
  transform(address: string, length=8) {
    if (!address || address === ''){
       return '';
    }
    const addr = this.incomingDataProvider.extractAddress(address);
    if (addr && addr.length > 4) {
      const firstNumbers = addr.substr(0,length/2);
      const lastNumbers = addr.substr(addr.length - length/2, addr.length);
      const result = firstNumbers + '...' + lastNumbers;
      return result;
    } else {
      return '...';
    }
  }
}
