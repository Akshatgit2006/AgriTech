import { readdir } from "node:fs/promises";
const entries = await readdir(new URL("../api/", import.meta.url), {
  recursive: true,
});
const functions = entries.filter((x) => /\.(js|ts|mjs|cjs)$/.test(x));
if (functions.length >= 12)
  throw new Error(
    `Function budget exceeded: ${functions.length}. Must remain below 12.`,
  );
console.log(
  `API entry points: ${functions.length}/11 maximum. Confirm the deployment's generated functions in Vercel before release.`,
);
