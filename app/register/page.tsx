"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { signup, APIError } from "@/lib/field-eyes-api"
import { AlertCircle, Shield } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function RegisterPage() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [adminCode, setAdminCode] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const router = useRouter()
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (password !== confirmPassword) {
      setErrorMessage("Passwords don't match. Please make sure your passwords match.")
      return
    }

    if (password.length < 8) {
      setErrorMessage("Password must be at least 8 characters long.")
      return
    }

    setIsLoading(true)

    try {
      // Call the Field Eyes API signup endpoint
      await signup({
        name,
        email,
        password,
        admin_code: adminCode || undefined
      })
      
      // Show success message
      toast({
        title: "Registration successful",
        description: "Your account has been created. You can now log in.",
      })
      
      // Redirect to login page
      router.push("/login")
    } catch (error) {
      // Handle registration error
      console.error("Registration error:", error)
      
      if (error instanceof APIError) {
        // Handle specific HTTP status codes
        if (error.status === 400) {
          if (error.message.includes("already exists")) {
            setErrorMessage("A user with this email already exists. Please use a different email or try logging in.")
          } else if (error.message.includes("username") || error.message.includes("email") || error.message.includes("password")) {
            setErrorMessage(error.message || "Please fill in all required fields.")
          } else {
            setErrorMessage(error.message || "Invalid registration information. Please check your details.")
          }
        } else if (error.status === 500) {
          setErrorMessage("Server error. Please try again later.")
        } else {
          setErrorMessage(error.message || "Registration failed. Please try again.")
        }
      } else {
        setErrorMessage("An unexpected error occurred. Please try again.")
      }
      
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Create an account</CardTitle>
          <CardDescription>Enter your information to create an account</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {errorMessage && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" placeholder="John Doe" required value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                placeholder="name@example.com"
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                required
                type="password"
                placeholder="Minimum 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <Input
                id="confirm-password"
                required
                type="password"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-code" className="flex items-center gap-1">
                <Shield className="h-4 w-4" /> Admin Code (Optional)
              </Label>
              <Input
                id="admin-code"
                type="text"
                placeholder="Enter admin code if you have one"
                value={adminCode}
                onChange={(e) => setAdminCode(e.target.value)}
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button className="w-full bg-green-600 hover:bg-green-700" type="submit" disabled={isLoading}>
              {isLoading ? "Creating account..." : "Create account"}
            </Button>
            <div className="text-center text-sm">
              Already have an account?{" "}
              <Link className="text-green-600 hover:text-green-700" href="/login">
                Sign in
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
