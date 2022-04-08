

export class FormControllerProvider {

  public transformValue (valueChange: string, decimals: number, oldValue: string) {
    let newValue: string = valueChange; // set the base value if you do not need to format
    const onlyNumberRegex = /[^,.0-9]/; 
        
    // 20 digit limit
    if (valueChange.length >= 20) {
      return oldValue;
    }

    // if the value is minus -322
    if (onlyNumberRegex.test(newValue)) {
      return oldValue;
    }

    // if the fractional part is present, then truncate to decimals
    // string 0.111111111111111111111 to 0.11111111 
    newValue = this.trimStrToDecimalsCoin(valueChange, decimals);
  
    // string  .32  to -> 0.32
    if (valueChange[0] === '.') {
      newValue = '0' + newValue;
    }

    // string 032 to -> 0.32
    if (valueChange.length > 1 && valueChange[0] === '0' && valueChange[1] != '.') {
      newValue = '0.' + valueChange.slice(1);
    }

    return newValue;
    } 

  public trimStrToDecimalsCoin(value: string,decimals: number): string {
    // if the fractional part is present, then truncate to decimals
    // string 0.111111111111111111111 to 0.11111111 
    const integerPartValue = value.split('.')[0]; // number to point
    const decimalsValue = value.split('.')[1]; // number after point

    if (decimalsValue) {
      return integerPartValue + '.' + decimalsValue.substring(0,decimals);
    }
    else {
      return value;
    }
  }
}