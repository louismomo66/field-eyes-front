"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Mail, Lock, Key } from "lucide-react"

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("")
  const [otp, setOtp] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  // Check if email was passed from forgot password page
  useEffect(() => {
    const emailParam = searchParams.get("email")
    if (emailParam) {
      setEmail(emailParam)
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (!email) {
      setError("Please enter your email address")
      return
    }

    if (!otp) {
      setError("Please enter the verification code")
      return
    }

    if (!newPassword) {
      setError("Please enter a new password")
      return
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters long")
      return
    }

    try {
      setLoading(true)
      const response = await fetch("http://localhost:9002/api/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          otp,
          new_password: newPassword,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to reset password")
      }

      setSuccess("Your password has been successfully reset")

      // Redirect to login after success
      setTimeout(() => {
        router.push("/login")
      }, 3000)
    } catch (err: any) {
      setError(err.message || "Failed to reset password")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen w-full">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: 'url("/african-man-harvesting-vegetables 1.png")' }}
      />
      
      {/* Overlay */}
      <div className="absolute inset-0 bg-[#052816] bg-opacity-70" />

      <div className="relative grid min-h-screen md:grid-cols-12">
        {/* Reset Password Form Section */}
        <div className="md:col-span-5 flex items-center justify-center p-4 md:p-8">
          <div className="w-full max-w-[500px] space-y-6">
            {/* Logo Section */}
            <div className="flex flex-col items-center space-y-2">
              <div className="h-20 w-40 relative">
                <Image
                  src="/Sponsor.png"
                  alt="FieldEyes Logo"
                  fill
                  className="object-contain"
                />
              </div>
              <p className="text-sm text-white/80">Sensors for Precision Agriculture</p>
            </div>

            {/* Reset Password Card */}
            <div className="bg-white/95 rounded-2xl shadow-xl p-6 space-y-6">
              <h2 className="text-2xl font-semibold text-[#052816]">Set New Password</h2>

              <p className="text-sm text-gray-600">
                Enter the verification code sent to your email along with your new password.
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

                <div className="space-y-1">
                  <label htmlFor="otp" className="text-sm text-gray-600">
                    Verification Code
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3">
                      <Key className="h-5 w-5 text-[#62A800]" />
                    </div>
                    <Input
                      type="text"
                      id="otp"
                      placeholder="Enter verification code"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      className="pl-10 border-gray-300"
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label htmlFor="newPassword" className="text-sm text-gray-600">
                    New Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3">
                      <Lock className="h-5 w-5 text-[#62A800]" />
                    </div>
                    <Input
                      type="password"
                      id="newPassword"
                      placeholder="Enter new password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="pl-10 border-gray-300"
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label htmlFor="confirmPassword" className="text-sm text-gray-600">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3">
                      <Lock className="h-5 w-5 text-[#62A800]" />
                    </div>
                    <Input
                      type="password"
                      id="confirmPassword"
                      placeholder="Confirm new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
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
                  {loading ? "Resetting..." : "Reset Password"}
                </Button>

                <p className="text-center text-sm">
                  <Link href="/forgot-password" className="text-[#62A800] hover:text-[#4c8000] font-medium">
                    Didn't receive a code?
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
              Create New Password
            </h2>
            <p className="text-xl text-white/90">
              Enter the verification code sent to your email and set a new password for your account.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
} 