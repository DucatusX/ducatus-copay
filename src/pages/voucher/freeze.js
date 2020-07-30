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

  const keyPairAlice0 = bitcoin.ECPair.fromWIF(wifPrivateKey, network);

  var lockTime = bip65.encode({ utc: time });

  const txb = new bitcoin.TransactionBuilder(network);
  // txb.setVersion(1);
  txb.__TX.version = 1;
  txb.setLockTime(lockTime);

  txb.addInput(tx_hash, vout_number, 0xfffffffe);

  txb.addOutput(user_duc_address, sending_amount);

  const tx = txb.buildIncomplete();

  const signatureHash = tx.hashForSignature(
    0,
    Buffer.from(redeem_script, 'hex'),
    hashType
  );

  // console.log(keyPairAlice0);

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
  // alert(tx.toHex());

  console.log(tx.toHex());
  // return tx.toHex();
}

// makeFreeze("TJYbxzCnVf4gyvCBTgAEjk9UhHG2wjTWTE8aoUCd9wwtipZZ53Xw", {
//   withdrawn: false,
//   lock_time: 1596022765,
//   redeem_script:
//     "6304ed5f215fb175672102a527dde3e0e5af511e620d34b03cb680195851653c6a6a23a906e520eeb976a2ad6821032b5b8c7ec1e4b3f96b6c418cadeb256d6af62aaa11e059d89bf8d996d8c7b3a9ac",
//   locked_duc_address: "MtbcbMZGDMygSXTVvb4zTjzqgysubo1XH4",
//   user_public_key:
//     "032b5b8c7ec1e4b3f96b6c418cadeb256d6af62aaa11e059d89bf8d996d8c7b3a9",
//   frozen_at: "2020-07-29T11:36:25.585501Z",
//   sending_amount: 1999900000,
//   tx_hash: "5e855c7e237db799693466e9994806e0b8f5b656d17010cb8cf8212c8ab0b089",
//   user_duc_address: "LmEQCVFshJgn9prgZf4NpRWs8LnqNNZ3Ze",
//   vout_number: 0,
// });
