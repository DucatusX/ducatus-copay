export class FormControllerProvider {

  public transformValue (valueChange: string, oldValue: string, decimals: number) {
    let newValue: string = valueChange;
    const onlyNumberRegex: RegExp = /[^,.0-9]/; 

    if (onlyNumberRegex.test(newValue)) {
      return oldValue;
    }

    newValue = this.trimStrToDecimalsCoin(valueChange, decimals);
  
    // .32  to -> 0.32
    if (valueChange[0] === '.') {
      newValue = '0' + newValue;
    }

    // 032 to -> 0.32
    if (valueChange.length > 1 && valueChange[0] === '0' && valueChange[1] != '.') {
      newValue = '0.' + valueChange.slice(1);
    }

    return newValue;
  } 

  public trimStrToDecimalsCoin(value: string,decimals: number): string {
    const integerPartValue = value.split('.')[0]; 
    const decimalsValue = value.split('.')[1]; 

    if (decimalsValue) {
      return integerPartValue + '.' + decimalsValue.substring(0, decimals);
    }
    else {
      return value;
    }
  }
}