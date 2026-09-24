import { router } from "../router";

export function currentSearch(): URLSearchParams {
  return router.search;
}
export function replaceUrl(url: string) {
  router.replace(url);
}
export function currentHref() {
  return router.href;
}
export function isEmbedded() {
  return true;
}
