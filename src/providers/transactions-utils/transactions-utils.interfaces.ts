export  interface ITxDefaultParameters {
  amount: number;
  coin: string;
  name: string;
  recipientType: string;
  useSendMax: boolean;
  fromWalletDetails: boolean;
  fromSelectInputs: boolean;
  txp: {};
}

export interface ITxDinamicParameters {
  network: string; 
  toAddress: string; 
  origToAddress: string; 
  data: string; 
  walletId: string; 
  spendUnConfirmed?: string; 
  feeLevel?: string;  
  feeLevelName?: string;   
 }
