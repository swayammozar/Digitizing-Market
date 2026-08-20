"use client";

import { type WindowState } from "@/lib/windows";
import DownloadsLibrary from "../downloads/DownloadsLibrary";
import WindowFrame from "./WindowFrame";

export default function DownloadsWindow({ win }: { win: WindowState }) {
  return (
    <WindowFrame win={win} subtitle="Everything you have bought">
      <DownloadsLibrary />
    </WindowFrame>
  );
}
