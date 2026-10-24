"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Zap, Mail, Lock, AlertCircle, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        if (signInError.message.includes("Invalid login credentials")) {
          setError("Email hoặc mật khẩu không chính xác. Vui lòng thử lại.");
        } else {
          setError(signInError.message);
        }
        setLoading(false);
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Đã xảy ra lỗi không mong muốn. Vui lòng thử lại sau.");
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-6 sm:p-8 bg-white rounded-3xl border border-gray-100 shadow-xl space-y-6">
      {/* Brand header */}
      <div className="text-center space-y-2">
        <Link href="/" className="inline-flex items-center gap-2 mb-2">
          <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center shadow-xs">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
            VocaFlow
          </span>
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Chào mừng trở lại</h1>
        <p className="text-xs text-gray-500">Đăng nhập để tiếp tục hành trình học từ vựng của bạn</p>
      </div>

      {error && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-2.5 text-xs text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-4">
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          leftElement={<Mail className="w-4 h-4" />}
          required
          autoFocus
        />

        <div className="space-y-1">
          <Input
            label="Mật khẩu"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            leftElement={<Lock className="w-4 h-4" />}
            required
          />
          <div className="flex justify-end">
            <Link
              href="/forgot-password"
              className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
            >
              Quên mật khẩu?
            </Link>
          </div>
        </div>

        <Button type="submit" loading={loading} className="w-full mt-2" rightIcon={<ArrowRight className="w-4 h-4" />}>
          Đăng nhập
        </Button>
      </form>

      {/* Footer link */}
      <div className="text-center text-xs text-gray-500 pt-2 border-t border-gray-100">
        Chưa có tài khoản?{" "}
        <Link href="/register" className="font-semibold text-indigo-600 hover:text-indigo-700">
          Đăng ký miễn phí
        </Link>
      </div>
    </div>
  );
}