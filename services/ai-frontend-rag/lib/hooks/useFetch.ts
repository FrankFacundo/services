import { useEffect, useState } from "react";

interface FetchInstance {
  get: (url: string, headers?: HeadersInit) => Promise<Response>;
  post: (
    url: string,
    body: BodyInit | null | undefined,
    headers?: HeadersInit
  ) => Promise<Response>;
  put: (
    url: string,
    body: BodyInit | null | undefined,
    headers?: HeadersInit
  ) => Promise<Response>;
  delete: (url: string, headers?: HeadersInit) => Promise<Response>;
}

const fetchInstance: FetchInstance = {
  get: async (url, headers) => fetch(url, { method: "GET", headers }),
  post: async (url, body, headers) =>
    fetch(url, { method: "POST", body, headers }),
  put: async (url, body, headers) =>
    fetch(url, { method: "PUT", body, headers }),
  delete: async (url, headers) => fetch(url, { method: "DELETE", headers }),
};

export const useFetch = (): { fetchInstance: FetchInstance } => {
  const [instance, setInstance] = useState(fetchInstance);

  const baseURL = `${
    process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:25001"
  }`;
  const backendUrl = baseURL;

  useEffect(() => {
    setInstance({
      ...fetchInstance,
      get: async (url, headers) =>
        fetchInstance.get(`${backendUrl}${url}`, {
          ...headers,
        }),
      post: async (url, body, headers) =>
        fetchInstance.post(`${backendUrl}${url}`, body, {
          ...headers,
        }),
      put: async (url, body, headers) =>
        fetchInstance.put(`${backendUrl}${url}`, body, {
          ...headers,
        }),
      delete: async (url, headers) =>
        fetchInstance.delete(`${backendUrl}${url}`, {
          ...headers,
        }),
    });
  }, [backendUrl]);

  return { fetchInstance: instance };
};
