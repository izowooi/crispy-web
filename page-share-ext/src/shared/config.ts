export const DEFAULT_API_BASE = "http://localhost:52741";

export async function getApiBase(): Promise<string> {
  return new Promise((resolve) => {
    chrome.storage.sync.get({ apiBase: DEFAULT_API_BASE }, (items) => {
      resolve(items.apiBase as string);
    });
  });
}

export async function getApiKey(): Promise<string> {
  return new Promise((resolve) => {
    chrome.storage.sync.get({ apiKey: "" }, (items) => {
      resolve(items.apiKey as string);
    });
  });
}
