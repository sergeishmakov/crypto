import { bytesToHex, GOST_Kuz_Decript, hexToBytes } from "./utils.js";
import fs from "fs/promises";

async function main() {
  const string = await fs.readFile("input.txt", "binary");

  const decryptBlok = await GOST_Kuz_Decript(hexToBytes(string));

  await fs.writeFile("output.txt", bytesToHex(decryptBlok));
}

main();
