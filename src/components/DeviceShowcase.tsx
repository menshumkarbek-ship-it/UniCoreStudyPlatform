"use client";

import { useEffect, useState } from "react";
import { BarChart3, BookOpen, Check, ChevronLeft, ChevronRight, ClipboardCheck, GraduationCap, MapPin, PlayCircle, Star, Users } from "lucide-react";

const slides = [
  { eyebrow: "Learn without limits", title: "Class on the Go", description: "Keep fragmented study, homework, and quizzes connected across PC, tablet, and mobile. TronClass helps students learn anywhere across Kyrgyzstan.", icon: BookOpen },
  { eyebrow: "Presence, simplified", title: "Instant Smart Attendance", description: "Make every class count with fast, reliable check-ins and real-time attendance visibility for instructors and students.", icon: ClipboardCheck },
  { eyebrow: "Progress at a glance", title: "Real-time Gradebook", description: "See feedback, grades, and learning milestones in one clear view, so every student knows what to focus on next.", icon: BarChart3 },
];

function LaptopMockup() {
  return (
    <div className="absolute left-[4%] top-[9%] w-[76%] -rotate-2 rounded-xl border border-slate-200 bg-white p-1.5 shadow-2xl shadow-slate-900/20 sm:p-2">
      <div className="flex h-5 items-center gap-1 rounded-t-lg bg-slate-100 px-2 sm:h-7"><span className="h-1.5 w-1.5 rounded-full bg-red-300 sm:h-2 sm:w-2" /><span className="h-1.5 w-1.5 rounded-full bg-amber-300 sm:h-2 sm:w-2" /><span className="h-1.5 w-1.5 rounded-full bg-emerald-300 sm:h-2 sm:w-2" /><div className="ml-2 h-2 flex-1 rounded-full bg-white sm:h-3" /></div>
      <div className="flex aspect-[16/10] overflow-hidden rounded-b-lg bg-slate-50">
        <aside className="hidden w-[18%] flex-col gap-2 border-r border-slate-100 bg-white p-2 sm:flex"><div className="mb-2 flex items-center gap-1 text-[7px] font-bold text-cyan-700"><span className="flex h-3 w-3 items-center justify-center rounded bg-cyan-500 text-white"><GraduationCap size={8} /></span> Tron</div>{[BookOpen, BarChart3, Users].map((Icon, i) => <div key={i} className={`h-3 rounded px-1 ${i === 0 ? "bg-cyan-50 text-cyan-600" : "text-slate-300"}`}><Icon size={9} /></div>)}</aside>
        <div className="flex-1 p-2 sm:p-3"><div className="mb-2 flex justify-between"><div><div className="h-2 w-16 rounded bg-slate-800 sm:w-24" /><div className="mt-1 h-1.5 w-10 rounded bg-slate-200 sm:w-16" /></div><div className="h-5 w-5 rounded-full bg-cyan-100" /></div><div className="grid grid-cols-3 gap-1.5 sm:gap-2"><div className="col-span-2 rounded bg-white p-1.5 shadow-sm sm:p-2"><div className="flex items-end justify-between"><span className="text-[7px] font-semibold text-slate-400">Weekly progress</span><span className="text-[8px] font-bold text-emerald-500">+18%</span></div><div className="mt-2 flex h-12 items-end gap-1 sm:h-20">{[35, 52, 43, 66, 58, 78, 88].map((height, i) => <div key={i} className={`flex-1 rounded-t-sm ${i === 6 ? "bg-cyan-500" : "bg-cyan-100"}`} style={{ height: `${height}%` }} />)}</div></div><div className="rounded bg-white p-1.5 shadow-sm sm:p-2"><span className="text-[7px] font-semibold text-slate-400">Courses</span><div className="mt-2 space-y-1.5"><div className="h-1.5 w-full rounded bg-emerald-200" /><div className="h-1.5 w-4/5 rounded bg-amber-200" /><div className="h-1.5 w-3/5 rounded bg-cyan-200" /></div></div></div><div className="mt-2 grid grid-cols-3 gap-1.5 sm:gap-2"><div className="h-8 rounded bg-white shadow-sm sm:h-12" /><div className="h-8 rounded bg-white shadow-sm sm:h-12" /><div className="h-8 rounded bg-white shadow-sm sm:h-12" /></div></div>
      </div>
    </div>
  );
}

function TabletMockup() {
  return (
    <div className="absolute right-[1%] top-[30%] z-10 w-[45%] -rotate-3 rounded-2xl border-4 border-slate-100 bg-white p-1 shadow-xl shadow-slate-900/20 sm:p-1.5">
      <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-slate-50"><div className="flex items-center justify-between border-b border-slate-100 bg-white px-2 py-1.5 sm:px-3 sm:py-2"><div className="flex items-center gap-1 text-[7px] font-bold text-slate-600 sm:text-[9px]"><ChevronLeft size={10} /> Lecture 04</div><Star size={10} className="text-amber-400" /></div><div className="p-2 sm:p-3"><div className="flex h-12 items-center justify-center rounded-lg bg-cyan-100 text-cyan-700 sm:h-20"><PlayCircle size={22} strokeWidth={1.5} /></div><div className="mt-2 h-2 w-3/4 rounded bg-slate-700" /><div className="mt-1 h-1.5 w-full rounded bg-slate-200" /><div className="mt-1 h-1.5 w-4/5 rounded bg-slate-200" /><div className="mt-3 flex items-center justify-between rounded-lg bg-white p-1.5 shadow-sm"><span className="text-[7px] font-semibold text-slate-500">Assignment 04</span><span className="rounded bg-emerald-50 px-1.5 py-1 text-[6px] font-bold text-emerald-600">OPEN</span></div></div></div>
    </div>
  );
}

function PhoneMockup({ slide }: { slide: number }) {
  return (
    <div className="absolute bottom-[-9%] left-[10%] z-20 w-[26%] min-w-[92px] max-w-[150px] -rotate-6 rounded-[1.5rem] border-4 border-slate-200 bg-white p-1.5 shadow-2xl shadow-slate-900/30 sm:rounded-[2rem] sm:p-2">
      <div className="relative aspect-[9/19] overflow-hidden rounded-[1.15rem] bg-slate-50 sm:rounded-[1.5rem]"><div className="absolute left-1/2 top-1 z-10 h-2 w-10 -translate-x-1/2 rounded-full bg-slate-800 sm:h-3 sm:w-14" /><div className="bg-cyan-600 px-2 pb-3 pt-6 text-white sm:px-3 sm:pb-5 sm:pt-9"><div className="flex items-center justify-between"><span className="text-[8px] font-semibold sm:text-[11px]">{slide === 1 ? "Attendance" : slide === 2 ? "My grades" : "Good morning"}</span><div className="h-3 w-3 rounded-full bg-white/30" /></div>{slide === 0 && <><p className="mt-3 text-[7px] text-cyan-100 sm:mt-6 sm:text-[9px]">Today&apos;s learning</p><p className="mt-1 text-[10px] font-bold sm:text-sm">CS101 Algorithms</p></>}</div><div className="p-2 sm:p-3">{slide === 1 ? <><div className="flex flex-col items-center rounded-xl bg-emerald-50 p-2 text-center sm:p-3"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-white sm:h-12 sm:w-12"><Check size={18} /></span><span className="mt-2 text-[7px] font-bold text-emerald-700 sm:text-[10px]">You&apos;re checked in!</span></div><div className="mt-2 flex items-center gap-1 text-[7px] text-slate-400"><MapPin size={9} /> Room A-204</div></> : slide === 2 ? <><div className="rounded-xl bg-white p-2 shadow-sm"><p className="text-[7px] text-slate-400">Current average</p><p className="mt-1 text-xl font-bold text-slate-700 sm:text-3xl">92<span className="text-xs">%</span></p><div className="mt-2 h-1.5 rounded-full bg-emerald-100"><div className="h-full w-[92%] rounded-full bg-emerald-500" /></div></div><div className="mt-2 space-y-1.5"><div className="h-2 rounded bg-slate-200" /><div className="h-2 w-4/5 rounded bg-slate-200" /></div></> : <><button type="button" className="mt-3 flex w-full items-center justify-center rounded-lg bg-cyan-600 py-2 text-[7px] font-bold text-white sm:mt-5 sm:py-3 sm:text-[9px]">Open lecture</button><div className="mt-3 flex items-center gap-1 text-[7px] text-slate-400 sm:mt-5"><ClipboardCheck size={9} /> Due tomorrow</div></>}</div></div>
    </div>
  );
}

export default function DeviceShowcase() {
  const [activeSlide, setActiveSlide] = useState(0);
  const slide = slides[activeSlide];
  const SlideIcon = slide.icon;

  useEffect(() => {
    const timer = window.setInterval(() => setActiveSlide((current) => (current + 1) % slides.length), 5000);
    return () => window.clearInterval(timer);
  }, []);

  const moveSlide = (direction: number) => setActiveSlide((current) => (current + direction + slides.length) % slides.length);

  return (
    <section aria-label="TronClass platform showcase" className="mx-auto max-w-7xl px-6 py-16 lg:grid lg:grid-cols-12 lg:items-center lg:gap-12 lg:py-20">
      <div className="relative col-span-7 mx-auto h-[330px] w-full max-w-2xl sm:h-[440px] lg:h-[500px]"><div className="absolute inset-x-[4%] top-[4%] h-[84%] rounded-[2rem] bg-gradient-to-br from-cyan-50 via-white to-slate-100" /><LaptopMockup /><TabletMockup /><PhoneMockup slide={activeSlide} /><div className="absolute bottom-[2%] right-[5%] z-30 flex items-center gap-2 rounded-xl border border-white bg-white/90 px-2.5 py-2 shadow-lg shadow-slate-900/10 sm:px-3"><span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600"><Users size={13} /></span><div><p className="text-[8px] font-bold text-slate-700 sm:text-[10px]">2,400+ learners</p><p className="text-[7px] text-slate-400 sm:text-[8px]">learning together</p></div></div></div>
      <div className="col-span-5 mt-10 lg:mt-0"><div className="mb-5 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-cyan-600"><SlideIcon size={16} /> {slide.eyebrow}</div><div className="min-h-[180px] transition-opacity duration-300"><h2 className="text-4xl font-bold tracking-tight text-slate-800 lg:text-5xl">{slide.title}</h2><p className="mt-5 max-w-lg text-base leading-7 text-slate-500">{slide.description}</p></div><a href="#app" className="mt-7 inline-flex items-center gap-2 rounded-lg border-2 border-cyan-600 px-5 py-3 text-sm font-bold text-cyan-700 transition hover:bg-cyan-600 hover:text-white">Download APP <ChevronRight size={17} /></a><div className="mt-10 flex items-center gap-5"><div className="flex items-center gap-2"><button type="button" aria-label="Previous showcase slide" onClick={() => moveSlide(-1)} className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-cyan-500 hover:text-cyan-600"><ChevronLeft size={17} /></button><button type="button" aria-label="Next showcase slide" onClick={() => moveSlide(1)} className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-cyan-500 hover:text-cyan-600"><ChevronRight size={17} /></button></div><div className="flex gap-2" role="tablist" aria-label="Showcase slides">{slides.map((item, index) => <button key={item.title} type="button" role="tab" aria-label={`Show ${item.title}`} aria-selected={activeSlide === index} onClick={() => setActiveSlide(index)} className={`h-2 rounded-full transition-all ${activeSlide === index ? "w-8 bg-cyan-600" : "w-2 bg-slate-300 hover:bg-slate-400"}`} />)}</div><span className="text-xs font-semibold text-slate-400">0{activeSlide + 1} / 0{slides.length}</span></div></div>
    </section>
  );
}
