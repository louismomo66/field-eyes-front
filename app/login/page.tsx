"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Mail, Lock } from "lucide-react"
import { setToken } from "@/lib/auth"

export default function LoginPage() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    if (!username || !password) {
      setError("Please enter both email and password")
      return
    }

    try {
      const response = await fetch("http://localhost:9002/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: username,
          password: password,
        }),
      })

      if (!response.ok) {
        throw new Error("Invalid credentials")
      }

      const data = await response.json()
      
      // Store token using the auth utility
      setToken(data.token)

      // Small delay to ensure token is stored before redirect
      await new Promise(resolve => setTimeout(resolve, 100))
      router.push("/dashboard")
    } catch (err: any) {
      setError(err.message || "Failed to login")
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
        {/* Login Form Section */}
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

            {/* Login Card */}
            <div className="bg-white/95 rounded-2xl shadow-xl p-6 space-y-6">
              <h2 className="text-2xl font-semibold text-[#052816]">Welcome Back</h2>

              {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded text-sm">
                  {error}
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
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="pl-10 border-gray-300"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label htmlFor="password" className="text-sm text-gray-600">
                      Password
                    </label>
                    <Link
                      href="/forgot-password"
                      className="text-xs text-[#62A800] hover:text-[#4c8000]"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3">
                      <Lock className="h-5 w-5 text-[#62A800]" />
                    </div>
                    <Input
                      type="password"
                      id="password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 border-gray-300"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-[#62A800] hover:bg-[#4c8000] text-white py-2"
                >
                  Sign In
                </Button>

                <p className="text-center text-sm">
                  Don't have an account?{" "}
                  <Link href="/signup" className="text-[#62A800] hover:text-[#4c8000] font-medium">
                    Sign Up
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
              Smart Agricultural Monitoring
            </h2>
            <p className="text-xl text-white/90">
              Get real-time insights into your farm's performance with our advanced sensor technology and data analytics platform.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
