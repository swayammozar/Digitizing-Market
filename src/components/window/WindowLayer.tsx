"use client";

import { useWindows } from "@/lib/windows";
import FolderWindow from "./FolderWindow";
import ProductWindow from "./ProductWindow";
import CartWindow from "./CartWindow";
import ServiceWindow from "./ServiceWindow";
import DownloadsWindow from "./DownloadsWindow";
import InfoWindow from "./InfoWindow";

export default function WindowLayer() {
  const windows = useWindows((s) => s.windows);

  return (
    <div className="pointer-events-none absolute inset-0">
      {windows.map((win) => (
        <div key={win.id} className="pointer-events-auto contents">
          {win.kind === "folder" && <FolderWindow win={win} />}
          {win.kind === "product" && <ProductWindow win={win} />}
          {win.kind === "cart" && <CartWindow win={win} />}
          {win.kind === "service" && <ServiceWindow win={win} />}
          {win.kind === "downloads" && <DownloadsWindow win={win} />}
          {win.kind === "page" && <InfoWindow win={win} />}
        </div>
      ))}
    </div>
  );
}
