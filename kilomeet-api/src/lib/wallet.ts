import { HDNodeWallet, Mnemonic } from 'ethers';
import { config } from './config.js';

// Ví custodial: mỗi user có địa chỉ dẫn xuất từ một mnemonic của server theo chỉ số.
// Không lưu private key từng người; server (operator) là bên ký mọi giao dịch.
const DEV_MNEMONIC = 'test test test test test test test test test test test junk';

let root: HDNodeWallet | null = null;

function rootNode(): HDNodeWallet {
  root ??= HDNodeWallet.fromMnemonic(
    Mnemonic.fromPhrase(config.WALLET_MNEMONIC || DEV_MNEMONIC),
    "m/44'/60'/0'/0",
  );
  return root;
}

export function walletAddressFor(index: number): string {
  return rootNode().deriveChild(index).address;
}
