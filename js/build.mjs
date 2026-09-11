import { bundle } from "./tools/bundle.mjs";
import { bundle_css } from "./tools/css.mjs";
import { node_modules_external } from "./tools/externals.mjs";

import fs from "fs";
import cpy from "cpy";

const BUNDLES = [
  {
    entryPoints: ["src/ts/index.ts"],
    plugins: [node_modules_external()],
    outfile: "dist/esm/index.js",
  },
  {
    entryPoints: ["src/ts/index.ts"],
    outfile: "dist/cdn/index.js",
  },
];

async function build() {
  fs.rmSync("dist", { recursive: true, force: true });
  fs.rmSync("../spaday_regular_layout/extension", {
    recursive: true,
    force: true,
  });

  // Bundle css (incl. spa.css, our shell-aligned theme — light + dark via the --spa-* tokens)
  await bundle_css("src/css");

  // Copy HTML
  await cpy("src/html/*", "dist/");

  // Copy images
  if (fs.existsSync("src/img")) {
    fs.mkdirSync("dist/img", { recursive: true });
    await cpy("src/img/*", "dist/img");
  }

  const theme = fs
    .readFileSync("node_modules/regular-layout/themes/lorax.css", "utf8")
    .replaceAll("regular-layout.lorax", "spaday-regular-layout.lorax");
  fs.mkdirSync("dist/css", { recursive: true });
  fs.writeFileSync("dist/css/lorax.css", theme);

  await Promise.all(BUNDLES.map(bundle)).catch(() => process.exit(1));

  // the exact version of every library this package serves, read by the Python package as its
  // ComponentPackage.provides, so spaday can reconcile it with the other packages on a page
  const { dependencies = {} } = JSON.parse(
    fs.readFileSync("package.json", "utf8"),
  );
  const served = Object.fromEntries(
    Object.keys(dependencies).map((name) => [
      name,
      JSON.parse(fs.readFileSync(`node_modules/${name}/package.json`, "utf8"))
        .version,
    ]),
  );
  fs.writeFileSync(
    "dist/versions.json",
    `${JSON.stringify(served, null, 2)}\n`,
  );

  // Copy servable assets to python extension (exclude esm/)
  fs.mkdirSync("../spaday_regular_layout/extension", { recursive: true });
  await cpy("dist/**/*", "../spaday_regular_layout/extension", {
    filter: (file) =>
      !file.relativePath.startsWith("esm/") &&
      !file.relativePath.startsWith("dist/esm/"),
  });
}

await build();
