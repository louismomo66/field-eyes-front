"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Mail } from "lucide-react"
import { getAssetPath, withBasePath } from "@/lib/utils"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (!email) {
      setError("Please enter your email address")
      return
    }

    try {
      setLoading(true)
      // HARDCODED CONFIGURATION TO FIX DOMAIN MISMATCH
      let API_URL = "https://field-eyes-api.field-eyes.com/api";

      if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
        API_URL = "http://localhost:9002/api";
      }
      const response = await fetch(`${API_URL}/forgot-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to send reset instructions")
      }

      setSuccess("Password reset instructions have been sent to your email")

      // Navigate to reset password page after a delay
      setTimeout(() => {
        router.push(withBasePath(`/reset-password?email=${encodeURIComponent(email)}`))
      }, 2000)
    } catch (err: any) {
      setError(err.message || "Failed to send reset instructions")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen w-full">
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url("${getAssetPath("/african-man-harvesting-vegetables 1.png")}")` }}
      />

      {/* Overlay */}
      <div className="absolute inset-0 bg-[#052816] bg-opacity-70" />

      <div className="relative grid min-h-screen md:grid-cols-12">
        {/* Forgot Password Form Section */}
        <div className="md:col-span-5 flex items-center justify-center p-4 md:p-8">
          <div className="w-full max-w-[500px] space-y-6">
            {/* Logo Section */}
            <div className="flex flex-col items-center space-y-2">
              <div className="h-20 w-40 relative">
                <Image
                  src={getAssetPath("/Sponsor.png")}
                  alt="FieldEyes Logo"
                  fill
                  sizes="(max-width: 768px) 100vw, 160px"
                  className="object-contain"
                />
              </div>
              <p className="text-sm text-white/80">Sensors for Precision Agriculture</p>
            </div>

            {/* Forgot Password Card */}
            <div className="bg-white/95 rounded-2xl shadow-xl p-6 space-y-6">
              <h2 className="text-2xl font-semibold text-[#052816]">Reset Password</h2>

              <p className="text-sm text-gray-600">
                Enter your email address below and we'll send you instructions to reset your password.
              </p>

              {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded text-sm">
                  {error}
                </div>
              )}

              {success && (
                <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-2 rounded text-sm">
                  {success}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label htmlFor="email" className="text-sm text-gray-600">
                    Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3">
                      <Mail className="h-5 w-5 text-[#62A800]" />
                    </div>
                    <Input
                      type="email"
                      id="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 border-gray-300"
                      disabled={loading}
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-[#62A800] hover:bg-[#4c8000] text-white py-2"
                  disabled={loading}
                >
                  {loading ? "Sending..." : "Reset Password"}
                </Button>

                <p className="text-center text-sm">
                  <Link href={withBasePath("/login")} className="text-[#62A800] hover:text-[#4c8000] font-medium">
                    Back to Login
                  </Link>
                </p>
              </form>
            </div>
          </div>
        </div>

        {/* Right Content Section */}
        <div className="hidden md:col-span-7 md:flex items-center justify-center p-8">
          <div className="text-center max-w-2xl">
            <h2 className="text-4xl font-bold text-white mb-4">
              Reset Your Password
            </h2>
            <p className="text-xl text-white/90">
              We'll help you get back into your account. Enter your email address to receive password reset instructions.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
