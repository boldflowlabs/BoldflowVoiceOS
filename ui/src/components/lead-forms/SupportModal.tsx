"use client";

import { LifeBuoy } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAppConfig } from "@/context/AppConfigContext";
import { useAuth } from "@/lib/auth";
import { BRAND } from "@/lib/brand";

import { CaptchaChallenge } from "./CaptchaChallenge";
import { FormTrustLine } from "./FormTrustLine";
import { isValidEmail } from "./isPersonalEmail";
import { type LeadSource, SUPPORT_TOPIC_OPTIONS } from "./leadFieldOptions";
import { LeadModalShell } from "./LeadModalShell";
import { PhoneField } from "./PhoneField";
import { submitLead } from "./submitLead";

interface SupportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  source: LeadSource;
  onOpenEnterprise?: () => void;
}

export function SupportModal({ open, onOpenChange, source, onOpenEnterprise }: SupportModalProps) {
  const { user } = useAuth(); // logged-in identity (prefills the email and name fields)
  const { config } = useAppConfig();
  // Deployment provenance (analytics only): cloud → cloud_app, else oss_app.
  const origin = config?.deploymentMode === "cloud" ? "cloud_app" : "oss_app";
  // Logged-in user's email (Stack uses primaryEmail; local uses email) — prefilled, editable.
  const userEmail = user ? ("primaryEmail" in user ? user.primaryEmail ?? "" : user.email ?? "") : "";
  const userName = user && "displayName" in user && user.displayName ? user.displayName : "";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [topic, setTopic] = useState("general");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [phone, setPhone] = useState("");
  const [captchaActive, setCaptchaActive] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Prefill the email and name from the logged-in user when the modal opens (don't clobber edits).
  useEffect(() => {
    if (open) {
      if (userEmail) setEmail((e) => e || userEmail);
      if (userName) setName((n) => n || userName);
    }
  }, [open, userEmail, userName]);

  const reset = () => {
    setName("");
    setEmail("");
    setTopic("general");
    setSubject("");
    setMessage("");
    setPhone("");
    setCaptchaActive(false);
    setSubmitting(false);
  };

  // Required fields
  const baseValid =
    Boolean(name.trim()) &&
    isValidEmail(email) &&
    Boolean(message.trim());

  const canSubmit = baseValid && !submitting;

  // Validate, then pop the anti-spam check on top of the modal.
  const handleSubmit = () => {
    if (!baseValid) {
      toast.error("Please fill in your name, valid email, and message");
      return;
    }
    setCaptchaActive(true);
  };

  // Runs once the captcha popup is verified.
  const doSubmit = async () => {
    setCaptchaActive(false);
    setSubmitting(true);
    try {
      await submitLead({
        kind: "support",
        source,
        origin,
        payload: { name, email, topic, subject, message, phone },
      });
      toast.success("Support request sent! Our team will get back to you shortly.");
      reset();
      onOpenChange(false);
    } catch {
      toast.error("Something went wrong. Please try again or email us directly.");
      setSubmitting(false);
    }
  };

  return (
    <LeadModalShell
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
      icon={LifeBuoy}
      eyebrow="Help & Support"
      title="How can we help?"
      description="Have questions, feedback, or need help with your voice agent? Send us a message and our team will get back to you promptly."
      primary={{ label: "Send Message", onClick: handleSubmit, disabled: !canSubmit, loading: submitting }}
      secondary={{ label: "Cancel", onClick: () => onOpenChange(false), disabled: submitting }}
      helper={
        <div className="flex flex-col gap-1 text-center sm:flex-row sm:justify-center sm:gap-3">
          {onOpenEnterprise && (
            <button
              type="button"
              onClick={onOpenEnterprise}
              className="underline decoration-dashed underline-offset-4 hover:text-foreground"
            >
              Need enterprise SLA?
            </button>
          )}
          {BRAND.supportEmail && (
            <span>
              Direct email:{" "}
              <a
                href={`mailto:${BRAND.supportEmail}`}
                className="underline underline-offset-4 hover:text-foreground"
              >
                {BRAND.supportEmail}
              </a>
            </span>
          )}
        </div>
      }
      trustLine={<FormTrustLine />}
      overlay={captchaActive ? <CaptchaChallenge onVerified={doSubmit} onCancel={() => setCaptchaActive(false)} /> : undefined}
    >
      <div className="grid gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="support-name">Name</Label>
            <Input
              id="support-name"
              placeholder="Your full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="support-email">Email</Label>
            <Input
              id="support-email"
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="support-topic">Topic</Label>
            <Select value={topic} onValueChange={setTopic}>
              <SelectTrigger id="support-topic">
                <SelectValue placeholder="Select topic" />
              </SelectTrigger>
              <SelectContent>
                {SUPPORT_TOPIC_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="support-subject">Subject (Optional)</Label>
            <Input
              id="support-subject"
              placeholder="Brief summary of request"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="support-message">How can we help?</Label>
          <Textarea
            id="support-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Describe what you need help with, any error messages, or questions…"
            rows={4}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="support-phone">Phone (Optional)</Label>
          <PhoneField id="support-phone" value={phone} onChange={setPhone} />
        </div>
      </div>
    </LeadModalShell>
  );
}
