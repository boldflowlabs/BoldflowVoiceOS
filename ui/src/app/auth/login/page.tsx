"use client";

import { Check, Copy, KeyRound, Mail } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { loginApiV1AuthLoginPost } from "@/client/sdk.gen";
import type { LoginRequest } from "@/client/types.gen";
import { BrandLogo } from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BRAND } from "@/lib/brand";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await loginApiV1AuthLoginPost({
        body: {
          email,
          password,
        } as LoginRequest,
      });
      if (res.error || !res.data) {
        const detail = (res.error as { detail?: string })?.detail;
        toast.error(detail || "Login failed");
        return;
      }
      await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: res.data.token, user: res.data.user }),
      });
      window.location.href = "/home";
    } catch {
      toast.error("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(BRAND.supportEmail);
    setCopied(true);
    toast.success("Support email copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const mailtoUrl = `mailto:${BRAND.supportEmail}?subject=${encodeURIComponent(
    `Password Reset Request — ${email || BRAND.name}`
  )}&body=${encodeURIComponent(
    `Hello Boldflow Labs Support,\n\nI need to reset the password for my account:\nEmail: ${email || "[Your Email Here]"}\n\nPlease help me recover access.\n\nThank you!`
  )}`;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex justify-center">
          <BrandLogo showTagline />
        </div>

        <Card className="rounded-xl border border-border bg-card shadow-xs">
          <CardHeader className="space-y-1 text-center pb-4">
            <CardTitle className="text-xl font-bold tracking-tight text-foreground">Sign in to console</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Enter your credentials to access your workspace
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-medium">Work Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-9.5 rounded-lg text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-xs font-medium">Password</Label>
                  <button
                    type="button"
                    onClick={() => setForgotOpen(true)}
                    className="text-xs font-medium text-primary hover:underline underline-offset-4 transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-9.5 rounded-lg text-sm"
                />
              </div>

              <Button type="submit" variant="default" className="w-full h-9.5 text-sm font-medium mt-2" disabled={loading}>
                {loading ? "Signing in..." : "Sign In"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Forgot Password / Account Recovery Wizard Modal */}
      <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="space-y-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">Password Reset & Recovery</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-1">
                Because this platform is fully managed by Boldflow Labs, client account passwords are securely provisioned and updated directly by your administrator.
              </DialogDescription>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="rounded-lg border border-border bg-muted/40 p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-foreground font-medium">
                  <Mail className="h-4 w-4 text-primary" />
                  <span>Support & Administrator Desk</span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyEmail}
                  className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                  <span>{copied ? "Copied" : "Copy"}</span>
                </button>
              </div>
              <p className="text-sm font-mono text-foreground font-semibold">
                {BRAND.supportEmail}
              </p>
            </div>

            <div className="space-y-2 text-muted-foreground text-[11.5px] leading-relaxed">
              <p className="font-medium text-foreground">How to recover your credentials:</p>
              <ul className="list-disc list-inside space-y-1 pl-1">
                <li>Send a quick request from your registered work email.</li>
                <li>The {BRAND.name} support desk will verify your organization ID.</li>
                <li>We will reset and deliver your new credentials securely.</li>
              </ul>
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:justify-between sm:items-center pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setForgotOpen(false)}
              className="w-full sm:w-auto text-xs"
            >
              Back to Sign In
            </Button>
            <Button
              variant="default"
              size="sm"
              asChild
              className="w-full sm:w-auto text-xs gap-1.5"
            >
              <a href={mailtoUrl}>
                <Mail className="h-3.5 w-3.5" />
                Contact Support Desk
              </a>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
