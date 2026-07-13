import { defineConfig } from "tsdown";

const tsdownConfig: ReturnType<typeof defineConfig> = defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  outDir: "dist",
  clean: true,
  fixedExtension: false,
  target: "es2022",
  dts: true,
  exports: {
    packageJson: false,
  },
  publint: {
    level: "error",
  },
});

export default tsdownConfig;
