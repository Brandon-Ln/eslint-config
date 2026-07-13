import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const [baseSha] = process.argv.slice(2);

if (!baseSha) {
  throw new Error("A pull request base SHA is required.");
}

const basePackageJson = execFileSync("git", ["show", `${baseSha}:package.json`], {
  encoding: "utf8",
});
const baseVersion = JSON.parse(basePackageJson).version;
const headVersion = JSON.parse(readFileSync("package.json", "utf8")).version;

if (baseVersion !== headVersion) {
  throw new Error(
    `Feature branches must not bump the package version (${baseVersion} -> ${headVersion}). Release from main with pnpm release instead.`,
  );
}
