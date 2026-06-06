"use client";

import dynamic from "next/dynamic";
import { AppProvider } from "@/context/AppContext";
import { ToastProvider } from "@/components/ui/Toast";
import { ScreenRouter } from "@/components/screens/ScreenRouter";

/** Defer BottomNav — only needed on main screens, not onboarding */
const BottomNav = dynamic(
  () => import("@/components/navigation/BottomNav").then((m) => m.BottomNav),
  { ssr: false }
);

export default function Home() {
  return (
    <AppProvider>
      <ToastProvider>
        <div className="app-frame" role="main">
          <ScreenRouter />
          <BottomNav />
        </div>
      </ToastProvider>
    </AppProvider>
  );
}
