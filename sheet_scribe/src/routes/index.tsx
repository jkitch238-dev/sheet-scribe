import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { FolioApp } from "@/components/FolioApp";
import { useEditor } from "@/lib/store";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  useEffect(() => {
    void useEditor.persist.rehydrate();
    useEditor.getState().setHydrated(true);
  }, []);

  return <FolioApp />;
}
