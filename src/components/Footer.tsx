"use client";

import { QRCodeSVG } from "qrcode.react";
import { GraduationCap } from "lucide-react";
import { useDictionary } from "@/i18n/locale-provider";

export default function Footer() {
  const dict = useDictionary();
  const useCases = [
    dict.common.footer.useCaseItems.blendedLearning,
    dict.common.footer.useCaseItems.app,
    dict.common.footer.useCaseItems.moocs,
    dict.common.footer.useCaseItems.business,
  ];

  return (
    <footer className="m-0 border-t border-slate-100 bg-white px-6 py-4 text-slate-500">
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4 md:gap-6">
          <div>
            <h2 className="mb-2 font-semibold text-slate-900">{dict.common.footer.useCases}</h2>
            <ul className="space-y-1.5 text-sm">
              {useCases.map((item) => <li key={item}><a href="#use-case" className="transition hover:text-cyan-600">{item}</a></li>)}
            </ul>
          </div>
          <div>
            <h2 className="mb-2 font-semibold text-slate-900">{dict.common.footer.aboutUs}</h2>
            <a href="#home" className="text-sm text-slate-500 transition hover:text-cyan-600">{dict.common.footer.officialWebsite}</a>
          </div>
          <div>
            <h2 className="mb-2 font-semibold text-slate-900">{dict.common.footer.app}</h2>
            <div className="inline-flex rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
              <QRCodeSVG value="https://tronsabak.edu.kg/mobile" size={88} bgColor="#ffffff" fgColor="#17233d" level="M" />
            </div>
            <p className="mt-2 text-xs text-slate-400">{dict.common.footer.scanQr}</p>
          </div>
          <div className="flex flex-col items-start">
            <h2 className="mb-2 font-semibold text-slate-900">{dict.common.appName}</h2>
            <div className="flex h-[104px] w-[104px] items-center justify-center rounded-2xl bg-[#15345b] text-white shadow-md shadow-[#15345b]/15">
              <GraduationCap size={50} strokeWidth={1.8} />
            </div>
            <p className="mt-2 text-sm font-medium text-slate-600 lg:text-base">{dict.common.footer.tagline}</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
