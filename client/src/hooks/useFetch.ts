import { useAuth } from "@clerk/clerk-react";

function getFetchOptions(token: string | null, options?: RequestInit) {
    const fetchOptions: RequestInit = {
        ...options,
        headers: {
            ...options?.headers,
            Authorization: `Bearer ${token}`
        }
    }
    return fetchOptions;
}
export default function useFetch() {
    // Use `useAuth()` to access the `getToken()` method
    const { getToken } = useAuth()

    const customFetch = async (input: RequestInfo | URL, options?: RequestInit): Promise<Response> => {
        // Use `getToken()` to get the current session token
        const token = await getToken();
        return fetch(input, getFetchOptions(token, options));
    }

    const authenticatedFetch = async (url: string, options?: RequestInit) => {
        // Use `getToken()` to get the current session token
        const token = await getToken();
        const response = await fetch(url, getFetchOptions(token, options));
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data?.msg ?? 'Something went wrong')
        }
        return data;
    }

    return { customFetch, authenticatedFetch }
}