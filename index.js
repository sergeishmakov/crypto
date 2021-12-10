import {
  bytesToHex,
  GOST_Kuz_Decript,
  GOST_Kuz_Encript,
  GOST_Kuz_Expand_Key,
  hexToBytes,
} from "./utils.js";
import _ from "lodash";
import fs from "fs/promises";
import { iterC, iterKey } from "./constants.js";

const key1 = [
  0x77, 0x66, 0x55, 0x44, 0x33, 0x22, 0x11, 0x00, 0xff, 0xee, 0xdd, 0xcc, 0xbb,
  0xaa, 0x99, 0x88,
];
const key2 = [
  0xef, 0xcd, 0xab, 0x89, 0x67, 0x45, 0x23, 0x01, 0x10, 0x32, 0x54, 0x76, 0x98,
  0xba, 0xdc, 0xfe,
];

async function main() {
  const string = await fs.readFile("input.txt", "binary");

  const blk = hexToBytes(string);

  GOST_Kuz_Expand_Key(key1, key2);

  console.log(string, "\n", iterC);

  const encriptBlok = GOST_Kuz_Encript(blk);

  console.log(bytesToHex(encriptBlok), "\n");

  const decriptBlok = GOST_Kuz_Decript(encriptBlok);

  console.log(bytesToHex(decriptBlok));
}

main();
