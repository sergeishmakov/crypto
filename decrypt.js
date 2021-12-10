import { bytesToHex, GOST_Kuz_Decript, hexToBytes } from "./utils.js";
import fs from "fs/promises";
import { loadFromFile } from "./files-service.js";

async function decrypt() {
  const string = await loadFromFile("input.txt");

  const decryptBlok = await GOST_Kuz_Decrypt(hexToBytes(string));

  await fs.writeFile("output.txt", bytesToHex(decryptBlok));
}

decrypt();
