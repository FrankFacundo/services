import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AxiosError } from "axios";
import {
  type ApiError,
  type Body_login_access_token_login_access_token_post as AccessToken,
  LoginService,
} from "../client";

const isLoggedIn = () => {
  return localStorage.getItem("access_token") !== null;
};

// Auth
const useAuth = () => {
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  // Login function
  const login = async (data: AccessToken) => {
    const response = await LoginService.accessTokenLoginAccessTokenPost({
      formData: data,
    });
    localStorage.setItem("access_token", response.access_token);

    // Get existing cookies
    const existingCookies = document.cookie;
    console.log("Existing cookies:");
    console.log(existingCookies);

    // // Append JWT to cookies
    // const newCookie = `token=${response.access_token}; path=/; max-age=${
    //   60 * 60 * 24
    // }; secure; samesite=strict`;
    // document.cookie = `${existingCookies}; ${newCookie}`;
    document.cookie = `token=${response.access_token}; path=/; max-age=${
      60 * 60 * 24
    }`;

    console.log(document.cookie);
  };

  const loginMutation = useMutation({
    mutationFn: login,
    onSuccess: () => {
      router.push("/");
    },
    onError: (err: ApiError) => {
      let errDetail = (err.body as any)?.detail;

      if (err instanceof AxiosError) {
        errDetail = err.message;
      }

      if (Array.isArray(errDetail)) {
        errDetail = "Something went wrong";
      }

      setError(errDetail);
    },
  });

  const logout = () => {
    localStorage.removeItem("access_token");
    router.push("/");
  };

  return { loginMutation, logout, error, resetError: () => setError(null) };
};

export { isLoggedIn };
export default useAuth;
