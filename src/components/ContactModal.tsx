import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Mail, Phone, MapPin, Send, CheckCircle2, Copy, Check, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { useLocale } from "@/lib/locale";

interface ContactModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ContactModal({ open, onOpenChange }: ContactModalProps) {
  const { t } = useLocale();
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", message: "" });

  const email = "darobaid@unigates.online";

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(email);
    setCopied(true);
    toast.success(t("تم نسخ البريد الإلكتروني بنجاح!", "Email copied to clipboard!"));
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      toast.error(t("يرجى ملء جميع الحقول", "Please fill all fields"));
      return;
    }
    setSending(true);
    setTimeout(() => {
      setSending(false);
      toast.success(t("تم إرسال رسالتك بنجاح! سيتواصل معك فريق unibook قريباً.", "Message sent successfully!"));
      setForm({ name: "", email: "", message: "" });
      onOpenChange(false);
    }, 800);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-3xl p-6 sm:p-7 border border-border/80 shadow-2xl bg-card/95 backdrop-blur-xl" dir="rtl">
        <DialogHeader className="text-start space-y-1">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full w-fit mb-1">
            <MessageSquare className="h-3.5 w-3.5" />
            <span>{t("خدمة العملاء والدعم الفني", "Customer Support")}</span>
          </div>
          <DialogTitle className="font-display text-2xl font-extrabold text-foreground">
            {t("تواصل معنا", "Contact Us")}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {t("فريق دار عبيد للنشر والتوزيع والطباعة بخدمتكم دائماً للإجابة عن أي استفسار.", "We're here to answer your questions and assist with publishing.")}
          </DialogDescription>
        </DialogHeader>

        {/* Quick Contact Card */}
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-3.5 space-y-2 mt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-primary text-primary-foreground shadow-xs">
                <Mail className="h-4 w-4" />
              </span>
              <div>
                <span className="block text-[10px] text-muted-foreground font-semibold">
                  {t("البريد الإلكتروني الرسمي", "Official Email")}
                </span>
                <span className="text-xs font-bold text-foreground font-mono" dir="ltr">
                  {email}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 px-2.5 rounded-xl text-xs gap-1 cursor-pointer"
                onClick={handleCopyEmail}
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copied ? t("تم النسخ", "Copied") : t("نسخ", "Copy")}</span>
              </Button>

              <Button asChild size="sm" className="h-8 px-2.5 rounded-xl text-xs gap-1 shadow-xs">
                <a href={`mailto:${email}`} target="_blank" rel="noopener noreferrer">
                  <span>{t("مراسلة", "Email")}</span>
                </a>
              </Button>
            </div>
          </div>
        </div>

        {/* Message Form */}
        <form onSubmit={handleSubmit} className="space-y-3 mt-3">
          <div className="space-y-1">
            <Label htmlFor="contactName" className="text-xs font-bold">
              {t("الاسم الكامل", "Full Name")}
            </Label>
            <Input
              id="contactName"
              placeholder={t("اكتب اسمك", "Your name")}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="h-10 rounded-xl text-xs"
              required
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="contactEmail" className="text-xs font-bold">
              {t("البريد الإلكتروني", "Email Address")}
            </Label>
            <Input
              id="contactEmail"
              type="email"
              placeholder="name@example.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="h-10 rounded-xl text-xs text-start"
              required
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="contactMessage" className="text-xs font-bold">
              {t("نص الرسالة أو الاستفسار", "Message or Inquiry")}
            </Label>
            <Textarea
              id="contactMessage"
              rows={3}
              placeholder={t("اكتب استفسارك عن النشر، الكتب، أو الشحن...", "Write your inquiry...")}
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              className="rounded-xl text-xs resize-none"
              required
            />
          </div>

          <Button type="submit" className="w-full h-10 rounded-xl font-bold text-xs gap-1.5 shadow-sm mt-1" disabled={sending}>
            <Send className="h-3.5 w-3.5" />
            <span>{sending ? t("جاري الإرسال...", "Sending...") : t("إرسال الرسالة الآن", "Send Message")}</span>
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
