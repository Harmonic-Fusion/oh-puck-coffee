"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { AppRoutes, ApiRoutes } from "@/app/routes";
import { Input } from "@/components/common/Input";
import { Textarea } from "@/components/common/Textarea";
import { Button } from "@/components/common/Button";
import { useToast } from "@/components/common/Toast";

const contactSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  subject: z.string().min(1, "Subject is required"),
  message: z.string().min(1, "Message is required"),
});

type ContactFormData = z.infer<typeof contactSchema>;

export default function ContactPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showToast } = useToast();
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
  });

  const onSubmit = async (data: ContactFormData) => {
    setIsSubmitting(true);
    try {
      const response = await fetch(ApiRoutes.contact.path, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Failed to send message");
      }

      showToast("success", "Message sent successfully!");
      reset();
    } catch (error) {
      showToast(
        "error",
        error instanceof Error ? error.message : "Failed to send message"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-stone-950">
      {/* Navigation */}
      <nav className="border-b border-stone-200 bg-white/80 backdrop-blur-sm dark:border-stone-800 dark:bg-stone-950/80">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link href={AppRoutes.home.path} className="flex items-center gap-2">
              <img
                src="/logos/logo_complex.png"
                alt="Coffee Tracker Logo"
                className="h-8 w-8"
              />
              <span className="text-xl font-bold text-stone-900 dark:text-stone-100">
                Coffee Tracker
              </span>
            </Link>
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold tracking-tight text-stone-900 dark:text-stone-100 sm:text-5xl">
          Contact Us
        </h1>
        <p className="mt-4 text-lg leading-8 text-stone-600 dark:text-stone-400">
          Have a question or feedback? We'd love to hear from you.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-10 space-y-6">
          <Input
            label="Name"
            {...register("name")}
            error={errors.name?.message}
            placeholder="Your name"
          />

          <Input
            label="Email"
            type="email"
            {...register("email")}
            error={errors.email?.message}
            placeholder="your.email@example.com"
          />

          <Input
            label="Subject"
            {...register("subject")}
            error={errors.subject?.message}
            placeholder="What's this about?"
          />

          <Textarea
            label="Message"
            rows={6}
            {...register("message")}
            error={errors.message?.message}
            placeholder="Tell us what's on your mind..."
          />

          <Button type="submit" size="lg" loading={isSubmitting} className="w-full">
            Send Message
          </Button>
        </form>
      </div>
    </div>
  );
}
