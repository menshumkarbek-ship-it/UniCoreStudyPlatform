import { QRCodeSVG } from "qrcode.react";
import { GraduationCap } from "lucide-react";

const useCases = [
  "Blended Learning",
  "APP",
  "MOOCs/SPOCs Module",
  "TronClass for Business",
];

export default function Footer() {
  return (
    <footer className="m-0 border-t border-slate-100 bg-white px-6 py-8 text-slate-500">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-3 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#15345b] text-white shadow-md shadow-[#15345b]/15">
              <GraduationCap size={24} strokeWidth={1.8} />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900">TronClass</span>
          </div>
          <p className="text-lg font-medium text-slate-600 lg:text-xl">Making Teaching and Learning Easier</p>
        </div>

        <div className="border-t border-slate-100 pt-5">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8">
            <div>
              <h2 className="mb-4 font-semibold text-slate-900">Use Cases</h2>
              <ul className="space-y-3 text-sm">
                {useCases.map((item) => (
                  <li key={item}><a href="#use-case" className="transition hover:text-cyan-600">{item}</a></li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="mb-4 font-semibold text-slate-900">About Us</h2>
              <a href="#home" className="text-sm text-slate-500 transition hover:text-cyan-600">Official WebSite</a>
            </div>
            <div>
              <h2 className="mb-4 font-semibold text-slate-900">APP</h2>
              <div className="inline-flex rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                <QRCodeSVG value="https://tronsabak.edu.kg/mobile" size={120} bgColor="#ffffff" fgColor="#17233d" level="M" />
              </div>
              <p className="mt-3 text-xs text-slate-400">Scan to open the mobile portal</p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
