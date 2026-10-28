import { UploadForm } from "@/components/UploadForm";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-md px-4 pt-10 pb-16">
      <h1 className="text-4xl font-extrabold tracking-tight">LessonCast</h1>
      <p className="mt-3 text-lg leading-relaxed text-dust">
        Photograph a textbook page. LessonCast turns it into a short illustrated video lesson, narrated in
        French or Pidgin, ready to send to parents on WhatsApp.
      </p>
      <UploadForm />
    </main>
  );
}
