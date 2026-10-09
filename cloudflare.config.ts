import { bindings, defineConfig, defineWorker } from "cf/config";

export default defineConfig({
  worker: defineWorker({
    name: "pinwego",
    entrypoint: "vinext/server/fetch-handler",
    compatibilityDate: "2026-10-09",
    compatibilityFlags: ["nodejs_compat"],
    assets: { notFoundHandling: "none" },
    workersDev: true,
    domains: ["pinwego.com", "www.pinwego.com"],
    env: {
      ASSETS: bindings.assets(),
    },
  }),
});
