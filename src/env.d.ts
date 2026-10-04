/// <reference types="astro/client" />
/// <reference types="vite-plugin-pwa/client" />
/// <reference types="vite-plugin-pwa/info" />

declare module "astro:actions" {
    export { ActionError, defineAction } from "astro/actions/runtime/server.js";
}

