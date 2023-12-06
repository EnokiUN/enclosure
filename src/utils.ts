import aliases from "./aliases";

export const toPascalCase = (text: string): string => {
  const alias = aliases[text.toLowerCase()];
  if (alias) {
    return alias;
  }
  return (' ' + text)
    .replace(/ ([a-z])/gi, (_, p1) => ` ${p1.toUpperCase()}`)
    .replace(/\/([a-z])/gi, (_, p1) => `/${p1.toUpperCase()}`)
    .trimStart()
    .replace(/( |_)The( |_)/g, ' the ')
    .replace(/( |_)And( |_)/g, ' and ')
    .replace(/( |_)Of( |_)/g, ' of ');
};
