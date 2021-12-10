import fs from "fs/promises";

export async function loadIterKey() {
  const string = await loadFromFile("iterKey.txt");
  return string ? JSON.parse(string) : new Array(10);
}

export async function loadIterC() {
  const string = await loadFromFile("iterC.txt");
  console.log({ string });
  return string ? JSON.parse(string) : new Array(32);
}

export function uploadIterKey(iterKey) {
  return loadToFile("iterKey.txt", String(iterKey));
}

export function uploadIterC(iterC) {
  console.log({ iterC });
  return loadToFile("iterC.txt", String(iterC));
}

export function loadFromFile(fileName) {
  return fs.readFile(fileName, "binary");
}

export function loadToFile(fileName, data) {
  return fs.writeFile(fileName, data);
}
