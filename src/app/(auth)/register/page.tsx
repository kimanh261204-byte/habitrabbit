"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Zap, Mail, Lock, User, AlertCircle, ArrowRight, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function RegisterPage() {
  const router = useRouter();
  const supabase = createClient();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("Mật khẩu phải có ít nhất 6 ký tự.");
      return;
    }

    setLoading(true);

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: name.trim(),
          },
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }

      // If user session is returned immediately (email confirmation disabled)
      if (data?.session) {
        router.push("/dashboard");
        router.refresh();
      } else {
        setSuccess(true);
      }
    } catch {
      setError("Đã xảy ra lỗi không mong muốn. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="w-full max-w-md mx-auto p-6 sm:p-8 bg-white rounded-3xl border border-gray-100 shadow-xl text-center space-y-4">
        <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Đăng ký thành công!</h2>
        <p className="text-xs text-gray-600 leading-relaxed">
          Chúng tôi đã gửi một email xác thực đến <strong>{email}</strong>. Vui lòng kiểm tra hộp
          thư (kể cả mục Spam) để kích hoạt tài khoản của bạn.
        </p>
        <div className="pt-2">
          <Link href="/login">
            <Button className="w-full">Đến trang Đăng nhập</Button>
          </Link>
        </div>
      </div>
    );
  }

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
        <h1 className="text-2xl font-bold text-gray-900">Tạo tài khoản mới</h1>
        <p className="text-xs text-gray-500">Bắt đầu học từ vựng tiếng Anh cá nhân hóa bằng AI</p>
      </div>

      {error && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-2.5 text-xs text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleRegister} className="space-y-4">
        <Input
          label="Họ và tên"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nguyễn Văn A"
          leftElement={<User className="w-4 h-4" />}
          required
          autoFocus
        />

        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          leftElement={<Mail className="w-4 h-4" />}
          required
        />

        <Input
          label="Mật khẩu"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Tối thiểu 6 ký tự"
          leftElement={<Lock className="w-4 h-4" />}
          required
        />

        <Button type="submit" loading={loading} className="w-full mt-2" rightIcon={<ArrowRight className="w-4 h-4" />}>
          Tạo tài khoản miễn phí
        </Button>
      </form>

      {/* Footer link */}
      <div className="text-center text-xs text-gray-500 pt-2 border-t border-gray-100">
        Đã có tài khoản?{" "}
        <Link href="/login" className="font-semibold text-indigo-600 hover:text-indigo-700">
          Đăng nhập ngay
        </Link>
      </div>
    </div>
  );
}