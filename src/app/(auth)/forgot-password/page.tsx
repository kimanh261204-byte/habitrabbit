"use client";
import { useState } from "react";
import Link from "next/link";
import { Zap, Mail, ArrowLeft, CheckCircle2, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function ForgotPasswordPage() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/login`,
      });

      if (resetError) {
        setError(resetError.message);
        setLoading(false);
        return;
      }

      setSuccess(true);
    } catch {
      setError("Đã xảy ra lỗi không mong muốn. Vui lòng thử lại sau.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="w-full max-w-md mx-auto p-6 sm:p-8 bg-white rounded-3xl border border-gray-100 shadow-xl text-center space-y-4">
        <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Kiểm tra hộp thư của bạn</h2>
        <p className="text-xs text-gray-600 leading-relaxed">
          Chúng tôi đã gửi hướng dẫn đặt lại mật khẩu đến <strong>{email}</strong> nếu email tồn
          tại trong hệ thống.
        </p>
        <div className="pt-2">
          <Link href="/login">
            <Button variant="secondary" className="w-full">
              Quay lại Đăng nhập
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto p-6 sm:p-8 bg-white rounded-3xl border border-gray-100 shadow-xl space-y-6">
      <div className="text-center space-y-2">
        <Link href="/" className="inline-flex items-center gap-2 mb-2">
          <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center shadow-xs">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
            VocaFlow
          </span>
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Quên mật khẩu?</h1>
        <p className="text-xs text-gray-500">
          Nhập email của bạn để nhận liên kết đặt lại mật khẩu an toàn
        </p>
      </div>

      {error && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-2.5 text-xs text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleReset} className="space-y-4">
        <Input
          label="Email đã đăng ký"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          leftElement={<Mail className="w-4 h-4" />}
          required
          autoFocus
        />

        <Button type="submit" loading={loading} className="w-full mt-2">
          Gửi liên kết đặt lại
        </Button>
      </form>

      <div className="text-center pt-2 border-t border-gray-100">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 font-medium"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Quay lại trang Đăng nhập</span>
        </Link>
      </div>
    </div>
  );
}