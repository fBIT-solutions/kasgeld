"use client";
import { QRCodeSVG } from 'qrcode.react';


export default function QRCodeComponent({ url }) {
    if (!url) return null;
  return (
    <div className="flex justify-center items-center my-4">
      <QRCodeSVG value={url} size={200} />
    </div>
  );
}
