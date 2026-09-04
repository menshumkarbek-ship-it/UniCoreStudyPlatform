"use client";

import { useEffect, useState } from "react";
import DeviceShowcase from "@/components/DeviceShowcase";
import Footer from "@/components/Footer";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Globe2,
  GraduationCap,
  Sparkles,
  ClipboardCheck,
} from "lucide-react";

const services = [
  { icon: BookOpen, title: "Course Access", description: "Find lectures, reading materials, and learning resources organized for every class." },
  { icon: ClipboardCheck, title: "Assignment Hub", description: "Submit work, follow deadlines, and keep every academic task moving forward." },
  { icon: Sparkles, title: "Progress Insights", description: "See grades, milestones, and a clear picture of your growth throughout the term." },
];

const photoSlides = [
  { title: "Learn beyond the classroom", description: "Bring your university experience together in one connected learning space.", image: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1600&q=85" },
  { title: "Your ideas have a place here", description: "Collaborate with classmates, share perspectives, and make every lesson count.", image: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1600&q=85" },
  { title: "Build skills for what comes next", description: "Follow your progress and turn consistent study into lasting confidence.", image: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=1600&q=85" },
  { title: "A campus that stays with you", description: "Keep your courses, assignments, and academic goals close wherever you learn.", image: "https://images.unsplash.com/photo-1564981797816-1043664bf78d?auto=format&fit=crop&w=1600&q=85" },
  { title: "Make progress visible", description: "Stay organized, meet deadlines, and celebrate each step toward your goals.", image: "https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1600&q=85" },
];

export default function Home() {
  const [language, setLanguage] = useState("ENG");
  const [photoSlide, setPhotoSlide] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => setPhotoSlide((current) => (current + 1) % photoSlides.length), 3000);
    return () => window.clearInterval(timer);
  }, []);

  const changePhotoSlide = (direction: number) => setPhotoSlide((current) => (current + direction + photoSlides.length) % photoSlides.length);
  const currentPhotoSlide = photoSlides[photoSlide];

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f4f7fb] text-[#17233d]">
      <div className="pointer-events-none absolute -left-32 -top-36 h-[520px] w-[520px] rounded-full bg-[#dce9f8] opacity-70 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-48 right-[-100px] h-[500px] w-[500px] rounded-full bg-[#e5edf5] opacity-80 blur-3xl" />
      <div className="relative mx-auto flex min-h-screen max-w-[1440px] flex-col px-5 py-6 sm:px-8 lg:px-12">
        <header className="flex items-center justify-between rounded-2xl border border-white/80 bg-white/60 px-4 py-3 shadow-sm backdrop-blur sm:px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#15345b] text-white shadow-lg shadow-[#15345b]/20"><GraduationCap size={23} strokeWidth={1.8} /></div>
            <div><p className="text-lg font-bold tracking-tight text-[#15345b]">UniCore</p><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#71809a]">Learning platform</p></div>
          </div>
          <nav aria-label="Primary navigation" className="hidden items-center gap-7 md:flex">
            <a href="#home" className="text-[15px] font-semibold text-[#345477] transition hover:text-[#15345b]">Home</a>
            <a href="#use-case" className="text-[15px] font-medium text-[#71809a] transition hover:text-[#15345b]">Use Case</a>
            <a href="#app" className="text-[15px] font-medium text-[#71809a] transition hover:text-[#15345b]">App</a>
          </nav>
          <div className="flex items-center gap-2 sm:gap-3">
            <label className="flex items-center gap-1.5 rounded-lg border border-[#d7e1ec] bg-white/70 px-2 py-2 text-[#527397]" aria-label="Choose language">
              <Globe2 size={15} />
              <select value={language} onChange={(event) => setLanguage(event.target.value)} className="cursor-pointer bg-transparent text-[11px] font-bold text-[#3d5b7c] outline-none">
                <option value="RU">RU</option><option value="ENG">ENG</option><option value="KG">KG</option>
              </select>
            </label>
            <a href="/login" className="rounded-lg bg-[#153b68] px-3.5 py-2.5 text-sm font-bold text-white shadow-md shadow-[#153b68]/15 transition hover:bg-[#102f54] sm:px-5">App Login</a>
          </div>
        </header>

        <section id="home" aria-label="About UniCore" className="group relative mt-6 aspect-[16/8] min-h-[330px] overflow-hidden rounded-2xl shadow-xl shadow-[#29486a]/10 sm:aspect-[16/7] sm:min-h-0">
          <div className="absolute inset-0 bg-cover bg-center transition-all duration-700" style={{ backgroundImage: `url(${currentPhotoSlide.image})` }}>
            <div className="absolute inset-0 bg-gradient-to-r from-[#0d2747]/90 via-[#173d63]/65 to-[#173d63]/15" />
            <div className="relative flex h-full max-w-xl flex-col justify-center px-7 text-white sm:px-12"><p className="mb-3 text-[10px] font-bold uppercase tracking-[0.24em] text-[#b9d7f2]">UniCore / Student life</p><h2 className="max-w-md text-3xl font-semibold leading-tight tracking-[-0.03em] sm:text-5xl">{currentPhotoSlide.title}</h2><p className="mt-4 max-w-sm text-sm leading-6 text-blue-50/85 sm:text-base">{currentPhotoSlide.description}</p></div>
          </div>
          <button type="button" aria-label="Previous slide" onClick={() => changePhotoSlide(-1)} className="absolute left-4 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-black/20 text-white opacity-0 backdrop-blur transition hover:bg-black/40 group-hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-white/80"><ChevronLeft size={19} /></button>
          <button type="button" aria-label="Next slide" onClick={() => changePhotoSlide(1)} className="absolute right-4 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-black/20 text-white opacity-0 backdrop-blur transition hover:bg-black/40 group-hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-white/80"><ChevronRight size={19} /></button>
          <div className="absolute bottom-5 left-7 z-10 flex gap-2 sm:left-12" role="tablist" aria-label="Photo carousel slides">{photoSlides.map((slide, index) => <button key={slide.title} type="button" role="tab" aria-label={`Show slide ${index + 1}`} aria-selected={photoSlide === index} onClick={() => setPhotoSlide(index)} className={`h-1.5 rounded-full transition-all ${photoSlide === index ? "w-8 bg-white" : "w-1.5 bg-white/50 hover:bg-white/80"}`} />)}</div>
        </section>

        <section id="use-case" className="mt-8 aspect-[16/8] min-h-[390px] rounded-2xl border border-white/80 bg-white/75 p-7 shadow-[0_22px_70px_rgba(43,69,105,0.10)] backdrop-blur sm:aspect-[16/7] sm:min-h-0 sm:p-10 lg:p-14">
          <div className="mb-8 flex items-end justify-between gap-5"><div><p className="mb-3 text-[10px] font-bold uppercase tracking-[0.22em] text-[#527397]">One platform, every step</p><h2 className="text-3xl font-semibold tracking-[-0.03em] text-[#132c4e] sm:text-4xl">Everything you need to move forward.</h2></div><BookOpen className="hidden text-[#9ab0c6] sm:block" size={34} strokeWidth={1.3} /></div>
          <div id="app" className="grid gap-4 md:grid-cols-3">{services.map(({ icon: Icon, title, description }) => <article key={title} className="rounded-xl border border-[#dce5ee] bg-white/80 p-5 transition hover:-translate-y-1 hover:shadow-lg hover:shadow-[#55799d]/10 sm:p-6"><div className="mb-8 flex h-10 w-10 items-center justify-center rounded-lg bg-[#eaf1f8] text-[#285982]"><Icon size={20} /></div><h3 className="text-base font-semibold text-[#1a3556]">{title}</h3><p className="mt-2 text-sm leading-6 text-[#71809a]">{description}</p></article>)}</div>
        </section>
        <DeviceShowcase />
      </div>
      <Footer />
    </main>
  );
}
