"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { User, Mail, Lock } from "lucide-react"
import { signup } from "@/lib/field-eyes-api"

export default function SignupPage() {
  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    if (!username) {
      setError("Username is required")
      setLoading(false)
      return
    }

    if (!email) {
      setError("Email is required")
      setLoading(false)
      return
    }

    if (!password) {
      setError("Password is required")
      setLoading(false)
      return
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      setLoading(false)
      return
    }

    try {
      await signup({
        name: username,
        email,
        password,
      })

      // Small delay to ensure token is stored before redirect
      await new Promise(resolve => setTimeout(resolve, 100))
      router.push("/dashboard")
    } catch (err: any) {
      setError(err.message || "Failed to create account")
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
        {/* Signup Form Section */}
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

            {/* Signup Card */}
            <div className="bg-white/95 rounded-2xl shadow-xl p-6 space-y-6">
              <h2 className="text-2xl font-semibold text-[#052816]">Create Account</h2>

              {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label htmlFor="username" className="text-sm text-gray-600">
                    Username
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3">
                      <User className="h-5 w-5 text-[#62A800]" />
                    </div>
                    <Input
                      type="text"
                      id="username"
                      placeholder="Choose a username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="pl-10 border-gray-300"
                    />
                  </div>
                </div>

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
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label htmlFor="password" className="text-sm text-gray-600">
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3">
                      <Lock className="h-5 w-5 text-[#62A800]" />
                    </div>
                    <Input
                      type="password"
                      id="password"
                      placeholder="Create a password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 border-gray-300"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label htmlFor="confirmPassword" className="text-sm text-gray-600">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3">
                      <Lock className="h-5 w-5 text-[#62A800]" />
                    </div>
                    <Input
                      type="password"
                      id="confirmPassword"
                      placeholder="Confirm your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-10 border-gray-300"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-[#62A800] hover:bg-[#4c8000] text-white py-2"
                >
                  Create Account
                </Button>

                <p className="text-center text-sm">
                  Already have an account?{" "}
                  <Link href="/login" className="text-[#62A800] hover:text-[#4c8000] font-medium">
                    Sign In
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
              Join Our Growing Network
            </h2>
            <p className="text-xl text-white/90">
              Create an account to access real-time insights into your farm's performance with our advanced sensor technology and analytics platform.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
} 