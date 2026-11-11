import type { Metadata, Viewport } from "next";
import Pitch from "@/components/pitch/Pitch";

export const metadata: Metadata = {
  title: "SURA Dubai — Pitch",
  description: "SURA turns Dubai's 3D digital twin and the rules of every authority into defined sky roads for drones.",
};

export const viewport: Viewport = {
  themeColor: "#F3EDE2",
};

export default function PitchPage() {
  return <Pitch />;
}
