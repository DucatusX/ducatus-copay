import { Coin } from '../currency/currency';

export interface ITx {
  amount: number;
  coin: Coin;
  name: string;
  recipientType: string;
  fromSelectInputs: boolean;
  txp: {};
  network: string;
  toAddress: string;
  origToAddress: string;
  inputs: any;
  sendMax: boolean;
  speedUpTx: boolean;
  feeRate?: number;
  useSendMax?: boolean;
  paypro?: any;
  totalInputsAmount?: number;
  tokenAddress?: string;
  totalAmount?: number;
  description?: string;
  destinationTag?: string; // xrp
  invoiceID?: string; // xrp
  payProUrl?: string;
  email?: string;
  color?: string;
  wDucxAddress?: string;
  spendUnconfirmed?: string;
  data?: string; // eth
  feeLevel?: string;
  feeLevelName?: string;
  sendMaxInfo?: any;
  speedUpTxInfo?: any;
  fee?: number;
}

export interface ITxBase {
  network: string;
  amount: number;
  toAddress: string;
  coin: Coin;
  useSendMax?: boolean;
  totalInputsAmount?: number;
  totalAmount?: number;
  description?: string;
  destinationTag?: string; // xrp
  paypro?: string;
  data?: string; // eth
  invoiceID?: string; // xrp
  payProUrl?: string;
  recipientType?: string;
  name?: string;
  email?: string;
  color?: string;
  tokenAddress?: string;
  wDucxAddress?: string;
  fromSelectInputs?: boolean;
  inputs?: any;
  requiredFeeRate?: any;
}
