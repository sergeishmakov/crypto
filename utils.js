import { BLOCK_SIZE, lVec, Pi, reversePi } from "./constants.js";
import _ from "lodash";
import { loadIterC, loadIterKey, uploadIterC } from "./files-service.js";

// Сложение 2х двоичных векторов по модулю 2
export function GOST_Kuz_X(a, b) {
  const c = [];

  for (let i = 0; i < BLOCK_SIZE; i++) c.push(a[i] ^ b[i]);

  return c;
}

// S-преобразование
export function GOST_Kuz_S(inData) {
  const outData = [];

  for (let i = 0; i < BLOCK_SIZE; i++) {
    let data = inData[i];
    if (data < 0) data = data + 256;

    outData[i] = Pi[data];
  }

  return outData;
}

// функция умножения чисел в конечном поле (или поле Галуа) над неприводимым полиномом x^8 + x^7 + x^6 + x + 1.
export function GOST_Kuz_GF_mul(a, b) {
  let c = 0;
  let hiBit;

  for (let i = 0; i < 8; i++) {
    if ((b & 1) == 1) c = a ^ c;
    hiBit = a & 0x80;
    a = a << 1;
    if (hiBit < 0) a = a ^ 0xc3; // Полином x^8 + x^7 + x^6 + x + 1
    b = b >> 1;
  }
  return c;
}

// Функция сдвига регистра
export function GOST_Kuz_R(state) {
  let a15 = 0;
  let internal = _.range(16);

  for (let i = 15; i >= 0; i--) {
    // Сдвиг байт в сторону младшего разряда
    if (i == 0) internal[15] = state[i];
    // в сторону старшего
    else internal[i - 1] = state[i];

    a15 = a15 ^ GOST_Kuz_GF_mul(state[i], lVec[i]);
  }

  // Пишем в полсдений байт результат сложения
  internal[15] = a15;
  return internal;
}

// Сдвиг регистра 16 раз
export function GOST_Kuz_L(inData) {
  let outData = _.range(inData.length);
  let internal = inData;

  for (let i = 0; i < 16; i++) {
    internal = GOST_Kuz_R(internal);
  }

  outData = internal;
  return outData;
}

// Обратное преобразование(используется для расшифровки)
export function GOST_Kuz_reverse_S(inData) {
  let outData = _.range(inData.length);

  for (let i = 0; i < BLOCK_SIZE; i++) {
    let data = inData[i];
    if (data < 0) {
      data = data + 256;
    }
    outData[i] = reversePi[data];
  }
  return outData;
}

export function GOST_Kuz_reverse_R(state) {
  let a0 = state[15];
  let internal = _.range(16);

  for (let i = 1; i < 16; i++) {
    internal[i] = state[i - 1];
    a0 = a0 ^ GOST_Kuz_GF_mul(internal[i], lVec[i]);
  }
  internal[0] = a0;
  return internal;
}

export function GOST_Kuz_reverse_L(inData) {
  let outData = _.range(inData.length);
  let internal = inData;

  for (let i = 0; i < 16; i++) internal = GOST_Kuz_reverse_R(internal);

  outData = internal;

  return outData;
}

// функция расчета констант
async function GOST_Kuz_Get_C() {
  const iterNum = _.range(32).map(() => _.range(BLOCK_SIZE));

  const iterC = await loadIterC();

  for (let i = 0; i < 32; i++) {
    for (let j = 0; j < BLOCK_SIZE; j++) iterNum[i][j] = 0;
    iterNum[i][0] = i + 1;
  }

  for (let i = 0; i < 32; i++) {
    iterC[i] = GOST_Kuz_L(iterNum[i]);
  }
  return uploadIterC(iterC);
}

// Одна итерация развертывания ключа (раундового), функция, выполняющая преобразования ячейки Фейстеля
export function GOST_Kuz_F(inKey1, inKey2, iterConst) {
  let internal;
  let outKey2 = inKey1;

  internal = GOST_Kuz_X(inKey1, iterConst);
  internal = GOST_Kuz_S(internal);
  internal = GOST_Kuz_L(internal);

  const outKey1 = GOST_Kuz_X(internal, inKey2);

  let key = _.range(2);
  key[0] = outKey1;
  key[1] = outKey2;
  return key;
}

// Развертывание(генерация) ключей
export async function GOST_Kuz_Expand_Key(key1, key2) {
  const iterKey = await loadIterKey();

  // Предыдущая пара ключей
  let iter12 = _.range(2);
  // Текущая пара ключей
  let iter34 = _.range(2);

  // Вычисляем итерационные константы
  await GOST_Kuz_Get_C();

  const iterC = await loadIterC();

  // Первые 2 итерационных ключа равны паре мастер-ключа
  iterKey[0] = key1;
  iterKey[1] = key2;

  iter12[0] = key1;
  iter12[1] = key2;

  for (let i = 0; i < 4; i++) {
    iter34 = GOST_Kuz_F(iter12[0], iter12[1], iterC[0 + 8 * i]);
    iter12 = GOST_Kuz_F(iter34[0], iter34[1], iterC[1 + 8 * i]);
    iter34 = GOST_Kuz_F(iter12[0], iter12[1], iterC[2 + 8 * i]);
    iter12 = GOST_Kuz_F(iter34[0], iter34[1], iterC[3 + 8 * i]);
    iter34 = GOST_Kuz_F(iter12[0], iter12[1], iterC[4 + 8 * i]);
    iter12 = GOST_Kuz_F(iter34[0], iter34[1], iterC[5 + 8 * i]);
    iter34 = GOST_Kuz_F(iter12[0], iter12[1], iterC[6 + 8 * i]);
    iter12 = GOST_Kuz_F(iter34[0], iter34[1], iterC[7 + 8 * i]);

    iterKey[2 * i + 2] = iter12[0];
    iterKey[2 * i + 3] = iter12[1];
  }
  uploadIterKey(iterKey);
}

export async function GOST_Kuz_Encrypt(blk) {
  let outBlk = blk;
  const iterKey = loadIterKey();

  for (let i = 0; i < 9; i++) {
    outBlk = GOST_Kuz_X(iterKey[i], outBlk);
    outBlk = GOST_Kuz_S(outBlk);
    outBlk = GOST_Kuz_L(outBlk);
  }
  outBlk = GOST_Kuz_X(outBlk, iterKey[9]);

  await uploadIterKey(iterKey);

  return outBlk;
}

export async function GOST_Kuz_Decrypt(blk) {
  const iterKey = loadIterKey();

  let outBlk = GOST_Kuz_X(blk, iterKey[9]);

  for (let i = 8; i >= 0; i--) {
    outBlk = GOST_Kuz_reverse_L(outBlk);
    outBlk = GOST_Kuz_reverse_S(outBlk);
    outBlk = GOST_Kuz_X(iterKey[i], outBlk);
  }
  await uploadIterKey(iterKey);

  return outBlk;
}

export function hexToBytes(hex) {
  for (var bytes = [], c = 0; c < hex.length; c += 2)
    bytes.push(parseInt(hex.substr(c, 2), 16));
  return bytes;
}

export function bytesToHex(bytes) {
  for (var hex = [], i = 0; i < bytes.length; i++) {
    var current = bytes[i] < 0 ? bytes[i] + 256 : bytes[i];
    hex.push((current >>> 4).toString(16));
    hex.push((current & 0xf).toString(16));
  }
  return _.chunk(hex, 16)
    .map((l) => l.reverse())
    .reverse()
    .flat()
    .join("");
}
