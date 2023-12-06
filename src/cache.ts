import { readFile, writeFile } from 'fs/promises';

export const getCached = async (name: string): Promise<Buffer | null> => {
  try {
    const data = await readFile(`cache/${name.replace(/ /gi, '_').replace(/\//gi, '___')}`);
    return data;
  }
  catch (err) {
    return null;
  }
}

export const cache = async (name: string, data: Buffer) => {
  try {
    await writeFile(`cache/${name.replace(/ /gi, '_').replace(/\//gi, '___')}`, data);
  } catch (err) {
  }
}

