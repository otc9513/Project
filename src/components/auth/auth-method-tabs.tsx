"use client";

import { useState } from "react";
import { EmailAuthForm } from "./email-auth-form";
import { PhoneAuthForm } from "./phone-auth-form";

export function AuthMethodTabs({ mode }: { mode: "login" | "register" }) {
  const [method, setMethod] = useState<"email" | "phone">("email");

  return (
    <div>
      <div className="mb-4 flex rounded-xl bg-gray-100 p-1 dark:bg-gray-800">
        <button
          type="button"
          onClick={() => setMethod("email")}
          className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${
            method === "email"
              ? "bg-white text-gray-900 shadow-sm dark:bg-gray-900 dark:text-white"
              : "text-gray-500 dark:text-gray-400"
          }`}
        >
          البريد الإلكتروني
        </button>
        <button
          type="button"
          onClick={() => setMethod("phone")}
          className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${
            method === "phone"
              ? "bg-white text-gray-900 shadow-sm dark:bg-gray-900 dark:text-white"
              : "text-gray-500 dark:text-gray-400"
          }`}
        >
          رقم الهاتف
        </button>
      </div>

      {method === "email" ? <EmailAuthForm mode={mode} /> : <PhoneAuthForm mode={mode} />}
    </div>
  );
}
