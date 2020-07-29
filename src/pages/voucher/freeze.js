const bitcoin = require('bitcoinjs-lib');
const bip65 = require('bip65');

const hashType = bitcoin.Transaction.SIGHASH_ALL;

export function makeFreeze(wifPrivateKey, options) {
  const time = options.lockTime;
  const tx_hash = options.tx_hash;
  const vout_number = options.vout_number;
  const redeem_script = options.redeem_script;
  const sending_amount = options.sending_amount;
  const user_duc_address = options.user_duc_address;

  wifPrivateKey = wifPrivateKey
    ? wifPrivateKey
    : 'TJYbxzCnVf4gyvCBTgAEjk9UhHG2wjTWTE8aoUCd9wwtipZZ53Xw';

  const network = bitcoin.networks.bitcoin;
  network.public = 0x019da462;
  network.private = 0x019d9cfe;
  network.pubKeyHash = 0x31;
  network.scriptHash = 0x33;
  network.wif = 0xb1;

  var lockTime = bip65.encode({ utc: time });

  const txb = new bitcoin.TransactionBuilder(network);
  txb.setVersion(1);
  txb.setLockTime(lockTime);

  txb.addInput(tx_hash, vout_number, 0xfffffffe);

  txb.addOutput(user_duc_address, sending_amount);

  const tx = txb.buildIncomplete();

  const signatureHash = tx.hashForSignature(
    0,
    Buffer.from(redeem_script, 'hex'),
    hashType
  );

  const keyPairAlice0 = bitcoin.ECPair.fromWIF(wifPrivateKey, network);

  console.log(keyPairAlice0);

  const inputScriptFirstBranch = bitcoin.payments.p2sh({
    redeem: {
      input: bitcoin.script.compile([
        bitcoin.script.signature.encode(
          keyPairAlice0.sign(signatureHash),
          hashType
        ),
        bitcoin.opcodes.OP_TRUE
      ]),
      output: Buffer.from(redeem_script, 'hex')
    }
  }).input;

  tx.setInputScript(0, inputScriptFirstBranch);
  alert(tx.toHex());

  return tx.toHex();
}
