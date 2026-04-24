import { normalizeGraph } from '../constants';

export function encodeGraph(graph) {
  const json = JSON.stringify(normalizeGraph(graph));
  const bytes = new TextEncoder().encode(json);
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join('');
  return window.btoa(binary);
}

export function decodeGraph(encoded) {
  const binary = window.atob(encoded);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return normalizeGraph(JSON.parse(new TextDecoder().decode(bytes)));
}

export function readGraphFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const config = params.get('config');

  if (!config) {
    return null;
  }

  try {
    return decodeGraph(config);
  } catch {
    return null;
  }
}

export function buildShareUrl(graph) {
  const url = new URL(window.location.href);
  url.searchParams.set('config', encodeGraph(graph));
  return url.toString();
}
